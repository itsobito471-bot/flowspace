import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/src/lib/auth";
import dbConnect from "@/src/lib/mongodb";
import { Leave } from "@/src/lib/models/Leave";
import { CompanySettings } from "@/src/lib/models/Settings";
import mongoose from "mongoose";

/**
 * GET /api/leave/balance?userId=<id>
 *
 * Returns the leave quota + used + remaining for the specified user
 * (or the session user if userId is omitted).
 * Admin may pass ?userId= to look up any employee's balance.
 *
 * Response shape:
 *  { success, data: { quota, used_days, pending_days, remaining, year } }
 *
 * Performance:
 *  - Single MongoDB aggregation pipeline (no N+1)
 *  - CompanySettings fetched with .lean() + .select()
 *  - Index on Leave: { user_id:1, status:1 } + { start_date:1, end_date:1 }  ← already exists
 */
export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !(session.user as any)?.id) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    const sessionUserId = (session.user as any).id;
    const isAdmin = (session.user as any)?.role?.level === "ADMIN";

    const { searchParams } = new URL(request.url);
    const queryUserId = searchParams.get("userId");

    // Only admins may look up another user's balance
    const targetUserId =
      isAdmin && queryUserId ? queryUserId : sessionUserId;

    await dbConnect();

    const year = new Date().getFullYear();
    const yearStart = new Date(`${year}-01-01T00:00:00.000Z`);
    const yearEnd   = new Date(`${year + 1}-01-01T00:00:00.000Z`);

    // Run both queries in parallel
    const [settingsDoc, [agg]] = await Promise.all([
      CompanySettings.findOne({ year })
        .select("annual_leave_quota")
        .lean()
        .exec(),

      // Aggregate approved & pending leave days for this user in the current year
      // We use $sum of ($dateDiff + 1) for each matching doc — no JS iteration
      Leave.aggregate([
        {
          $match: {
            user_id: new mongoose.Types.ObjectId(targetUserId),
            status: { $in: ["APPROVED", "PENDING"] },
            start_date: { $gte: yearStart, $lt: yearEnd },
          },
        },
        {
          $group: {
            _id: "$status",
            totalDays: {
              $sum: {
                $add: [
                  {
                    $dateDiff: {
                      startDate: "$start_date",
                      endDate: "$end_date",
                      unit: "day",
                    },
                  },
                  1, // inclusive
                ],
              },
            },
          },
        },
      ]).exec(),
    ]);

    const quota: number = (settingsDoc as any)?.annual_leave_quota ?? 20;

    // Rebuild from aggregation groups
    let used_days = 0;
    let pending_days = 0;
    if (Array.isArray(agg)) {
      for (const row of agg as any[]) {
        if (row._id === "APPROVED") used_days = row.totalDays;
        if (row._id === "PENDING")  pending_days = row.totalDays;
      }
    }

    const remaining = Math.max(0, quota - used_days);

    return NextResponse.json({
      success: true,
      data: { quota, used_days, pending_days, remaining, year },
    });
  } catch (error: any) {
    console.error("[GET /api/leave/balance]", error);
    return NextResponse.json({ success: false, message: "Server error" }, { status: 500 });
  }
}
