import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/src/lib/auth";
import dbConnect from "@/src/lib/mongodb";
import { Leave } from "@/src/lib/models/Leave";
import { CompanySettings } from "@/src/lib/models/Settings";
import mongoose from "mongoose";

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
    const targetUserId = isAdmin && queryUserId ? queryUserId : sessionUserId;

    await dbConnect();

    const year = new Date().getFullYear();
    const yearStart = new Date(`${year}-01-01T00:00:00.000Z`);
    const yearEnd = new Date(`${year + 1}-01-01T00:00:00.000Z`);

    // Run both queries in parallel
    const [settingsDoc, aggArray] = await Promise.all([
      CompanySettings.findOne({ year })
        .select("leave_types")
        .lean()
        .exec(),

      // Aggregate approved & pending leave days, grouped by BOTH status AND leave_type
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
            // Group by a compound key so we can separate Sick Leave vs Casual Leave
            _id: { status: "$status", leave_type: "$leave_type" },
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
                  1, // inclusive days
                ],
              },
            },
          },
        },
      ]).exec(),
    ]);

    // Extract the leave categories defined by the Admin
    const leaveTypes: { name: string; quota: number }[] = (settingsDoc as any)?.leave_types || [];

    // Map through the categories and calculate the balances for each one
    const balances = leaveTypes.map((category) => {
      let used_days = 0;
      let pending_days = 0;

      if (Array.isArray(aggArray)) {
        for (const row of aggArray) {
          // If the aggregation row matches the current category we are calculating
          if (row._id.leave_type === category.name) {
            if (row._id.status === "APPROVED") used_days = row.totalDays;
            if (row._id.status === "PENDING") pending_days = row.totalDays;
          }
        }
      }

      return {
        type: category.name,
        quota: category.quota,
        used_days,
        pending_days,
        remaining: Math.max(0, category.quota - used_days),
      };
    });

    return NextResponse.json({
      success: true,
      data: {
        year,
        balances, // This is now an array of breakdown objects!
      },
    });
  } catch (error: any) {
    console.error("[GET /api/leave/balance]", error);
    return NextResponse.json({ success: false, message: "Server error" }, { status: 500 });
  }
}