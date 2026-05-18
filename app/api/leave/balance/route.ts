import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/src/lib/auth";
import dbConnect from "@/src/lib/mongodb";
import { Leave } from "@/src/lib/models/Leave";
import { User } from "@/src/lib/models/User";
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
    const [userDoc, settingsDoc, aggArray] = await Promise.all([
      User.findById(targetUserId).lean().exec(),
      CompanySettings.findOne({ year }).select("leave_types").lean().exec(),

      // Aggregate approved & pending leave days, grouped by BOTH status AND leave_type_id
      Leave.aggregate([
        {
          $match: {
            user_id: new mongoose.Types.ObjectId(targetUserId),
            status: { $in: ["APPROVED", "PENDING"] },
            start_date: { $gte: yearStart, $lt: yearEnd },
            is_unpaid: { $ne: true } // Exclude unpaid leaves from balance
          },
        },
        {
          $group: {
            _id: { status: "$status", leave_type_id: "$leave_type_id" },
            totalDays: {
              $sum: {
                $cond: {
                  if: "$is_half_day",
                  then: 0.5,
                  else: {
                    $add: [
                      {
                        $dateDiff: {
                          startDate: "$start_date",
                          endDate: "$end_date",
                          unit: "day",
                        },
                      },
                      1,
                    ],
                  }
                }
              },
            },
          },
        },
      ]).exec(),
    ]);

    if (!userDoc) {
      return NextResponse.json({ success: false, message: "User not found" }, { status: 404 });
    }

    // Extract the leave categories defined by the Admin
    const leaveTypes = (settingsDoc as any)?.leave_types || [];
    let userBalances = (userDoc as any).leave_balances || [];

    // Fallback for existing users who haven't been provisioned yet
    if (userBalances.length === 0) {
      userBalances = leaveTypes.map((t: any) => ({
        leave_type_id: t._id,
        total_allowance: t.default_allowance || t.quota || 0,
        consumed: 0
      }));
    }

    // Map through the user's personal leave balances
    const balances = userBalances.map((ub: any) => {
      let used_days = 0;
      let pending_days = 0;

      if (Array.isArray(aggArray)) {
        for (const row of aggArray) {
          if (String(row._id.leave_type_id) === String(ub.leave_type_id)) {
            if (row._id.status === "APPROVED") used_days = row.totalDays;
            if (row._id.status === "PENDING") pending_days = row.totalDays;
          }
        }
      }

      // Find name from global settings
      const st = leaveTypes.find((t: any) => String(t._id) === String(ub.leave_type_id));

      return {
        id: ub.leave_type_id,
        type: st ? st.name : "Unknown",
        quota: ub.total_allowance,
        used_days,
        pending_days,
        remaining: Math.max(0, ub.total_allowance - used_days),
      };
    });

    return NextResponse.json({
      success: true,
      data: {
        year,
        balances, // This is now an array of breakdown objects based on user's personal balances!
      },
    });
  } catch (error: any) {
    console.error("[GET /api/leave/balance]", error);
    return NextResponse.json({ success: false, message: "Server error" }, { status: 500 });
  }
}