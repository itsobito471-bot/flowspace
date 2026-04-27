import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/src/lib/auth";
import dbConnect from "@/src/lib/mongodb";
import { BlackPoint } from "@/src/lib/models/BlackPoint";
import { Organization } from "@/src/lib/models/Organization";
import mongoose from "mongoose";

// ── GET /api/blackpoints ─────────────────────────────────────────────────────
// Employee: returns own points only.
// Admin:    accepts ?userId=<id> query param to view any employee in same org.
export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    const userId = (session.user as any).id as string;
    const orgId = session.user.orgId as string;
    const isAdmin = (session.user as any)?.role?.level === "ADMIN";

    await dbConnect();

    // 🔒 Verify the org has the blackpoint module enabled
    const org = await Organization.findById(orgId).lean();
    if (!org?.is_blackpoint_enabled) {
      return NextResponse.json({ success: false, message: "Black Point module is not enabled for your organization." }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const targetUserId = isAdmin ? (searchParams.get("userId") ?? userId) : userId;

    if (!mongoose.Types.ObjectId.isValid(targetUserId)) {
      return NextResponse.json({ success: false, message: "Invalid userId." }, { status: 400 });
    }

    const points = await BlackPoint.find({
      user_id: new mongoose.Types.ObjectId(targetUserId),
      organization_id: new mongoose.Types.ObjectId(orgId), // 🔒 Tenant isolation
    })
      .sort({ date: -1 })
      .lean();

    const totalUnresolved = points
      .filter((p) => !p.is_resolved)
      .reduce((sum, p) => sum + p.points, 0);

    return NextResponse.json({ success: true, data: points, totalUnresolved });
  } catch (error: any) {
    console.error("[GET /api/blackpoints]", error);
    return NextResponse.json({ success: false, message: "Server error" }, { status: 500 });
  }
}

// ── POST /api/blackpoints ────────────────────────────────────────────────────
// ADMIN ONLY: Manually add a demerit point for an employee in the same org.
// Body: { userId: string, reason: string, points?: number }
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    const isAdmin = (session.user as any)?.role?.level === "ADMIN";
    if (!isAdmin) {
      return NextResponse.json({ success: false, message: "Forbidden. Admin access required." }, { status: 403 });
    }

    const orgId = session.user.orgId as string;

    await dbConnect();

    // 🔒 Verify the org has the blackpoint module enabled
    const org = await Organization.findById(orgId).lean();
    if (!org?.is_blackpoint_enabled) {
      return NextResponse.json({ success: false, message: "Black Point module is not enabled for your organization." }, { status: 403 });
    }

    const body = await request.json();
    const { userId, reason, points = 1 } = body;

    if (!userId || !reason) {
      return NextResponse.json({ success: false, message: "userId and reason are required." }, { status: 400 });
    }
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return NextResponse.json({ success: false, message: "Invalid userId." }, { status: 400 });
    }
    if (typeof points !== "number" || points < 1) {
      return NextResponse.json({ success: false, message: "points must be a positive number." }, { status: 400 });
    }

    const newPoint = await BlackPoint.create({
      user_id: new mongoose.Types.ObjectId(userId),
      organization_id: new mongoose.Types.ObjectId(orgId), // 🔒 Tenant isolation
      points,
      reason: reason.trim(),
      type: "MANUAL",
      date: new Date(),
      is_resolved: false,
    });

    // ── Instant Deduction Engine for Manual Points ──
    const year = new Date().getFullYear();
    const settings = await (await import("@/src/lib/models/Settings")).CompanySettings.findOne({
      organization_id: orgId,
      year,
    }).lean();

    const manualEnabled = settings?.penalty_rules?.manual_penalty_enabled ?? false;
    const manualThreshold = settings?.penalty_rules?.manual_points_for_leave_deduction ?? 3;

    if (manualEnabled) {
      const unresolvedManuals = await BlackPoint.find({
        user_id: new mongoose.Types.ObjectId(userId),
        organization_id: new mongoose.Types.ObjectId(orgId),
        is_resolved: false,
        type: "MANUAL",
      }).lean();

      const totalManualPoints = unresolvedManuals.reduce((sum, p) => sum + p.points, 0);

      if (totalManualPoints >= manualThreshold) {
        const pointIds = unresolvedManuals.map(p => p._id);
        const availableLeaveTypes = (settings?.leave_types || []).map((lt: any) => ({
          name: lt.name,
          quota: lt.default_allowance || 0,
        }));
        
        const { processPenaltyDeduction } = await import("@/src/lib/services/penaltyService");
        await processPenaltyDeduction(
          userId,
          orgId,
          totalManualPoints,
          pointIds as mongoose.Types.ObjectId[],
          year,
          availableLeaveTypes,
          "Manual deduction"
        );
      }
    }

    return NextResponse.json({ success: true, data: newPoint }, { status: 201 });
  } catch (error: any) {
    console.error("[POST /api/blackpoints]", error);
    return NextResponse.json({ success: false, message: "Server error" }, { status: 500 });
  }
}
