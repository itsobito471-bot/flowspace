import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/src/lib/auth";
import dbConnect from "@/src/lib/mongodb";
import { Organization } from "@/src/lib/models/Organization";
import { SubscriptionPlan } from "@/src/lib/models/SubscriptionPlan";
import { User } from "@/src/lib/models/User";
import { Role } from "@/src/lib/models/Role";
import bcrypt from "bcryptjs";

function isSuperAdmin(session: any): boolean {
  return session?.user?.userType === "SUPER_ADMIN";
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || !isSuperAdmin(session)) {
      return NextResponse.json({ success: false, message: "Forbidden" }, { status: 403 });
    }

    await dbConnect();

    const orgs = await Organization.find({})
      .populate("plan_id", "name price max_users")
      .sort({ createdAt: -1 })
      .lean();

    // Attach admin (ORG_USER with ADMIN role) count per org
    const orgIds = orgs.map((o) => o._id);
    const userCounts = await User.aggregate([
      { $match: { organization_id: { $in: orgIds }, user_type: "ORG_USER" } },
      { $group: { _id: "$organization_id", count: { $sum: 1 } } },
    ]);

    const countMap: Record<string, number> = {};
    for (const uc of userCounts) {
      countMap[uc._id.toString()] = uc.count;
    }

    const result = orgs.map((org) => ({
      ...org,
      user_count: countMap[(org._id as any).toString()] ?? 0,
    }));

    return NextResponse.json({ success: true, data: result });
  } catch (error: any) {
    console.error("GET /api/super-admin/organizations Error:", error);
    return NextResponse.json({ success: false, message: "Server error" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || !isSuperAdmin(session)) {
      return NextResponse.json({ success: false, message: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const { org_name, slug, plan_id, admin_name, admin_email, admin_password } = body;

    if (!org_name || !slug || !admin_name || !admin_email || !admin_password) {
      return NextResponse.json(
        { success: false, message: "org_name, slug, admin_name, admin_email and admin_password are required" },
        { status: 400 }
      );
    }

    await dbConnect();

    // Validate plan exists if provided
    if (plan_id) {
      const plan = await SubscriptionPlan.findById(plan_id).lean();
      if (!plan) {
        return NextResponse.json({ success: false, message: "Subscription plan not found" }, { status: 404 });
      }
    }

    // Slug uniqueness check
    const existingOrg = await Organization.findOne({ slug }).lean();
    if (existingOrg) {
      return NextResponse.json({ success: false, message: "Slug already taken" }, { status: 409 });
    }

    // Email uniqueness check
    const existingUser = await User.findOne({ email: admin_email }).lean();
    if (existingUser) {
      return NextResponse.json({ success: false, message: "Admin email already in use" }, { status: 409 });
    }

    // Get max_users from plan for denormalisation
    let max_users = 10;
    if (plan_id) {
      const plan = await SubscriptionPlan.findById(plan_id).lean();
      if (plan) max_users = plan.max_users;
    }

    // 1. Create the Organization
    const org = await Organization.create({
      name: org_name,
      slug,
      plan_id: plan_id || null,
      max_users,
      status: "ACTIVE",
    });

    // 2. Find or create an ADMIN role for this org
    //    We re-use a global ADMIN role if one already exists; otherwise create one.
    let adminRole = await Role.findOne({ level: "ADMIN" });
    let roleCreatedNow = false;
    if (!adminRole) {
      adminRole = await Role.create({
        title: "System Administrator",
        department: "Management",
        level: "ADMIN",
      });
      roleCreatedNow = true;
    }

    // 3. Create the first Admin user — rollback if this fails
    let adminUser;
    try {
      const passwordHash = await bcrypt.hash(admin_password, 12);
      adminUser = await User.create({
        name: admin_name,
        email: admin_email,
        passwordHash,
        organization_id: org._id,
        user_type: "ORG_USER",
        role_id: adminRole._id,   // ← highest-priority ADMIN role assigned here
      });
    } catch (userErr) {
      // Rollback: delete org and any role we just created
      await Organization.findByIdAndDelete(org._id);
      if (roleCreatedNow) await Role.findByIdAndDelete(adminRole._id);
      console.error("User creation failed, org rolled back:", userErr);
      return NextResponse.json({ success: false, message: "Failed to create admin user. Org creation rolled back." }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      data: {
        organization: org,
        admin: { id: adminUser._id, name: adminUser.name, email: adminUser.email },
      },
    }, { status: 201 });
  } catch (error: any) {
    console.error("POST /api/super-admin/organizations Error:", error);
    return NextResponse.json({ success: false, message: "Server error" }, { status: 500 });
  }
}

// ── PATCH /api/super-admin/organizations ─────────────────────────────────────
// Toggle is_blackpoint_enabled for a specific org.
// Body: { orgId: string, is_blackpoint_enabled: boolean }
export async function PATCH(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || !isSuperAdmin(session)) {
      return NextResponse.json({ success: false, message: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const { orgId, is_blackpoint_enabled } = body;

    if (!orgId || typeof is_blackpoint_enabled !== "boolean") {
      return NextResponse.json({ success: false, message: "orgId and is_blackpoint_enabled (boolean) are required." }, { status: 400 });
    }

    await dbConnect();

    const updated = await Organization.findByIdAndUpdate(
      orgId,
      { $set: { is_blackpoint_enabled } },
      { new: true }
    ).lean();

    if (!updated) {
      return NextResponse.json({ success: false, message: "Organization not found." }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: `Black Point module ${is_blackpoint_enabled ? "enabled" : "disabled"} for ${updated.name}.`,
      data: updated,
    });
  } catch (error: any) {
    console.error("PATCH /api/super-admin/organizations Error:", error);
    return NextResponse.json({ success: false, message: "Server error" }, { status: 500 });
  }
}
