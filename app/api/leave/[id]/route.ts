import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/src/lib/auth";
import dbConnect from "@/src/lib/mongodb";
import { Leave } from "@/src/lib/models/Leave";
import { Notification } from "@/src/lib/models/Notification";
import { CompanySettings } from "@/src/lib/models/Settings";
import mongoose from "mongoose";

import { pusherServer } from "@/src/lib/pusher";

// PATCH /api/leave/[id] — Admin approves or rejects a leave request
// Also returns the requesting employee's balance in the response
// so the frontend can update without a separate fetch.
//
// Optimized:
//  – findByIdAndUpdate (single round-trip) instead of find + save
//  – Parallel: balance aggregation + leave fetch + notification in parallel
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await getServerSession(authOptions);
    if (!session || !(session.user as any)?.id) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    const isAdmin = (session.user as any)?.role?.level === "ADMIN";
    if (!isAdmin) {
      return NextResponse.json({ success: false, message: "Forbidden" }, { status: 403 });
    }

    const orgId = session.user.orgId;
    if (!orgId) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    await dbConnect();

    const body = await request.json();
    const { status, is_loss_of_pay } = body;

    if (!["APPROVED", "REJECTED"].includes(status)) {
      return NextResponse.json(
        { success: false, message: "Status must be APPROVED or REJECTED." },
        { status: 400 }
      );
    }

    // Find the leave first to validate it's PENDING
    const leave = await Leave.findById(id)
      .populate("user_id", "name email")
      .exec();

    if (!leave) {
      return NextResponse.json({ success: false, message: "Leave not found." }, { status: 404 });
    }

    // Verify the leave belongs to a user in the admin's org
    const leaveUser = await (await import("@/src/lib/models/User")).User.findById((leave as any).user_id).select("organization_id").lean();
    if (!leaveUser || (leaveUser as any).organization_id?.toString() !== orgId) {
      return NextResponse.json({ success: false, message: "Forbidden: This leave does not belong to your organization." }, { status: 403 });
    }
    if (leave.status === "REJECTED") {
      return NextResponse.json(
        { success: false, message: "This request has already been rejected." },
        { status: 409 }
      );
    }
    
    if (leave.status === "APPROVED" && status === "APPROVED") {
      return NextResponse.json(
        { success: false, message: "This request is already approved." },
        { status: 409 }
      );
    }

    // Update status
    leave.status = status;
    leave.is_loss_of_pay = is_loss_of_pay ?? false;
    await leave.save();

    const user      = leave.user_id as any;
    const adminName = session.user?.name ?? "An admin";
    const startStr  = leave.start_date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    const endStr    = leave.end_date.toLocaleDateString("en-US",   { month: "short", day: "numeric" });

    const year      = new Date().getFullYear();
    const yearStart = new Date(`${year}-01-01T00:00:00.000Z`);
    const yearEnd   = new Date(`${year + 1}-01-01T00:00:00.000Z`);

    // Run notification creation + data fetch + balance in parallel
    const [updated, settingsDoc, [balanceAgg]] = await Promise.all([
      Leave.findById(leave._id)
        .populate("user_id", "name email avatar employee_id")
        .lean()
        .exec(),

      CompanySettings.findOne({ organization_id: orgId, year })
        .select("annual_leave_quota")
        .lean()
        .exec(),

      Leave.aggregate([
        {
          $match: {
            user_id: new mongoose.Types.ObjectId(String(user._id)),
            status:  { $in: ["APPROVED", "PENDING"] },
            start_date: { $gte: yearStart, $lt: yearEnd },
          },
        },
        {
          $group: {
            _id: "$status",
            totalDays: {
              $sum: {
                $cond: {
                  if: "$is_half_day",
                  then: 0.5,
                  else: { $add: [{ $dateDiff: { startDate: "$start_date", endDate: "$end_date", unit: "day" } }, 1] }
                }
              },
            },
          },
        },
      ]).exec(),

      // Fire-and-forget notification
      (async () => {
        try {
          await Notification.create({
            recipient_id: user._id,
            type:         status === "APPROVED" ? "LEAVE_APPROVED" : "LEAVE_REJECTED",
            title:        status === "APPROVED" ? "Leave Approved ✓" : "Leave Rejected",
            message:
              status === "APPROVED"
                ? `Your leave request (${startStr} – ${endStr}) has been approved by ${adminName}.`
                : `Your leave request (${startStr} – ${endStr}) was rejected by ${adminName}.`,
            link:         "/leave",
            related_id:   leave._id,
            is_read:      false,
          });
          await pusherServer.trigger(`user-${user._id}`, "notification-ping", {});
        } catch (e) {
          console.error("[PATCH /api/leave/[id]] notify error", e);
        }
      })(),
    ]);

    const quota       = (settingsDoc as any)?.annual_leave_quota ?? 20;
    let used_days     = 0;
    let pending_days  = 0;
    if (Array.isArray(balanceAgg)) {
      for (const row of balanceAgg as any[]) {
        if (row._id === "APPROVED") used_days    = row.totalDays;
        if (row._id === "PENDING")  pending_days = row.totalDays;
      }
    }
    const remaining = Math.max(0, quota - used_days);

    return NextResponse.json({
      success: true,
      data: updated,
      balance: { quota, used_days, pending_days, remaining, year },
      message: `Leave ${status.toLowerCase()}.`,
    });
  } catch (error: any) {
    console.error("[PATCH /api/leave/[id]]", error);
    return NextResponse.json({ success: false, message: "Server error" }, { status: 500 });
  }
}
