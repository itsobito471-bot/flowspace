import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/src/lib/auth";
import dbConnect from "@/src/lib/mongodb";
import { Organization } from "@/src/lib/models/Organization";
import { SubscriptionPlan } from "@/src/lib/models/SubscriptionPlan";
import { User } from "@/src/lib/models/User";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    const orgId = session?.user?.orgId;

    if (!session || !orgId) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    await dbConnect();

    // Register SubscriptionPlan schema by referencing it
    const planModel = SubscriptionPlan;

    const org = await Organization.findById(orgId).populate("plan_id").lean();
    if (!org) {
      return NextResponse.json({ success: false, message: "Organization not found" }, { status: 404 });
    }

    // Count ORG_USERs to match organization dashboard/table count
    const employeeCount = await User.countDocuments({
      organization_id: orgId,
      user_type: "ORG_USER",
    });

    const planName = (org.plan_id as any)?.name || "Starter Plan";
    const maxUsers = org.max_users || (org.plan_id as any)?.max_users || 10;

    return NextResponse.json({
      success: true,
      data: {
        planName,
        employeeCount,
        maxUsers,
      },
    });
  } catch (error: any) {
    console.error("GET /api/organization/usage error:", error);
    return NextResponse.json({ success: false, message: "Server error" }, { status: 500 });
  }
}
