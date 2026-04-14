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

    const orgIds = orgs.map((o) => o._id);

    // 1. Get user counts
    const userCounts = await User.aggregate([
      { $match: { organization_id: { $in: orgIds }, user_type: "ORG_USER" } },
      { $group: { _id: "$organization_id", count: { $sum: 1 } } },
    ]);
    const countMap: Record<string, number> = {};
    for (const uc of userCounts) {
      if (uc._id) {
        countMap[uc._id.toString()] = uc.count;
      }
    }

    // 2. Find the primary Admin for each organization
    const adminRoles = await Role.find({ level: "ADMIN", organization_id: { $in: orgIds } }).lean();
    const adminRoleIds = adminRoles.map(r => r._id);
    const admins = await User.find(
      { role_id: { $in: adminRoleIds }, user_type: "ORG_USER" },
      "name email organization_id"
    ).lean();

    const adminMap: Record<string, any> = {};
    for (const a of admins) {
      const orgId = a?.organization_id?.toString();
      if (orgId && !adminMap[orgId]) {
        adminMap[orgId] = a; // Map the first admin found
      }
    }

    const result = orgs.map((org) => ({
      ...org,
      user_count: countMap[(org._id as any).toString()] ?? 0,
      admin: adminMap[(org._id as any).toString()] || null, // Inject admin data
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
        organization_id: org._id,
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
// ── PATCH /api/super-admin/organizations ─────────────────────────────────────
export async function PATCH(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || !isSuperAdmin(session)) {
      return NextResponse.json({ success: false, message: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const {
      orgId, name, slug, plan_id, status, is_blackpoint_enabled,
      admin_name, admin_email, admin_password
    } = body;

    if (!orgId) return NextResponse.json({ success: false, message: "orgId is required." }, { status: 400 });

    await dbConnect();

    // 1. Slug uniqueness check if slug is being changed
    if (slug) {
      const existingOrg = await Organization.findOne({ slug, _id: { $ne: orgId } }).lean();
      if (existingOrg) return NextResponse.json({ success: false, message: "Slug already taken by another organization" }, { status: 409 });
    }

    // 2. Update Organization
    const updateData: any = {};
    if (name) updateData.name = name;
    if (slug) updateData.slug = slug;
    if (plan_id !== undefined) updateData.plan_id = plan_id || null;
    if (status) updateData.status = status;
    if (typeof is_blackpoint_enabled === "boolean") updateData.is_blackpoint_enabled = is_blackpoint_enabled;

    // If plan changed, fetch new max_users to sync
    if (plan_id) {
      const plan = await SubscriptionPlan.findById(plan_id).lean();
      if (plan) updateData.max_users = plan.max_users;
    }

    const updatedOrg = await Organization.findByIdAndUpdate(orgId, { $set: updateData }, { new: true })
      .populate("plan_id", "name price max_users")
      .lean();

    if (!updatedOrg) return NextResponse.json({ success: false, message: "Organization not found." }, { status: 404 });

    // 3. Update Admin User (if admin fields were provided)
    let updatedAdmin = null;
    if (admin_name || admin_email || admin_password) {
      const adminRole = await Role.findOne({ level: "ADMIN", organization_id: orgId });
      if (adminRole) {
        const adminUser = await User.findOne({ organization_id: orgId, role_id: adminRole._id });
        if (adminUser) {
          // Check email uniqueness
          if (admin_email && admin_email !== adminUser.email) {
            const emailExists = await User.findOne({ email: admin_email, _id: { $ne: adminUser._id } });
            if (emailExists) return NextResponse.json({ success: false, message: "Admin email already in use" }, { status: 409 });
            adminUser.email = admin_email;
          }
          if (admin_name) adminUser.name = admin_name;
          if (admin_password && admin_password.length >= 6) {
            adminUser.passwordHash = await bcrypt.hash(admin_password, 12);
          }
          await adminUser.save();
          updatedAdmin = { _id: adminUser._id, name: adminUser.name, email: adminUser.email };
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: "Organization updated successfully.",
      data: { ...updatedOrg, admin: updatedAdmin },
    });
  } catch (error: any) {
    console.error("PATCH /api/super-admin/organizations Error:", error);
    return NextResponse.json({ success: false, message: "Server error" }, { status: 500 });
  }
}