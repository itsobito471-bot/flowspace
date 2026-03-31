/**
 * POST /api/cron/process-blackpoints
 *
 * Consequence engine: finds every user with unresolved Black Points >=
 * `penalty_rules.points_for_leave_deduction`, creates an auto "Loss of Pay"
 * leave record for 1 day, then marks those specific Black Point docs as
 * `is_resolved: true` so they can never be counted twice.
 *
 * Secure with a CRON_SECRET environment variable so only an authorised
 * scheduler (e.g. Vercel Cron, GitHub Actions) can trigger this endpoint.
 */

import { NextResponse } from "next/server";
import dbConnect from "@/src/lib/mongodb";
import { BlackPoint } from "@/src/lib/models/BlackPoint";
import { CompanySettings } from "@/src/lib/models/Settings";
import { Organization } from "@/src/lib/models/Organization";
import { Leave } from "@/src/lib/models/Leave";
import { processPenaltyDeduction } from "@/src/lib/services/penaltyService";
import mongoose from "mongoose";

export async function POST(request: Request) {
  try {
    // ── Security: verify cron secret ──────────────────────────────────────
    const authHeader = request.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ success: false, message: "Forbidden" }, { status: 403 });
    }

    await dbConnect();

    // ── 1. Find all orgs with blackpoint module enabled ───────────────────
    const enabledOrgs = await Organization.find({ is_blackpoint_enabled: true }).lean();
    if (enabledOrgs.length === 0) {
      return NextResponse.json({ success: true, message: "No orgs have Black Point module enabled.", processed: 0 });
    }

    let totalResolved = 0;
    const results: Array<{ orgId: string; userId: string; pointsResolved: number }> = [];

    for (const org of enabledOrgs) {
      const orgId = (org._id as mongoose.Types.ObjectId).toString();

      // Fetch this org's year settings to get the threshold
      const year = new Date().getFullYear();
      const settings = await CompanySettings.findOne({
        organization_id: org._id,
        year,
      }).lean();

      // Fallback to legacy config or specific attendance config
      const isEnabled = settings?.penalty_rules?.attendance_penalty_enabled ?? settings?.penalty_rules?.is_enabled ?? false;
      const threshold = settings?.penalty_rules?.attendance_points_for_leave_deduction ?? settings?.penalty_rules?.points_for_leave_deduction ?? 3;

      if (!isEnabled) {
        continue; // Skip this organization entirely for attendance
      }

      // ── 2. Aggregate unresolved Attendance points, grouped by user ─────────────────
      const aggregated = await BlackPoint.aggregate<{
        _id: mongoose.Types.ObjectId;          // user_id
        totalPoints: number;
        pointIds: mongoose.Types.ObjectId[];
      }>([
        {
          $match: {
            organization_id: new mongoose.Types.ObjectId(orgId),
            is_resolved: false,
            // Only auto attendance types
            type: { $in: ["AUTO_LATE", "AUTO_EARLY_CHECKOUT"] },
          },
        },
        {
          $group: {
            _id: "$user_id",
            totalPoints: { $sum: "$points" },
            pointIds: { $push: "$_id" },
          },
        },
        {
          $match: { totalPoints: { $gte: threshold } },
        },
      ]);

      const availableLeaveTypes = settings?.leave_types || [];

      for (const userAgg of aggregated) {
        const userId = userAgg._id;

        // ── 3. Deduct via shared service ──────────────────────────────
        await processPenaltyDeduction(
          userId.toString(),
          orgId,
          userAgg.totalPoints,
          userAgg.pointIds,
          year,
          availableLeaveTypes,
          "Automatic deduction"
        );

        totalResolved += userAgg.pointIds.length;
        results.push({
          orgId,
          userId: userId.toString(),
          pointsResolved: userAgg.pointIds.length,
        });
      }
    }

    return NextResponse.json({
      success: true,
      message: `Processed ${results.length} user(s). ${totalResolved} Black Point record(s) resolved.`,
      results,
    });
  } catch (error: any) {
    console.error("[POST /api/cron/process-blackpoints]", error);
    return NextResponse.json({ success: false, message: "Server error" }, { status: 500 });
  }
}
