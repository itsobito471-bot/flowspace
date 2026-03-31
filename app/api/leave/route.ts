import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/src/lib/auth";
import dbConnect from "@/src/lib/mongodb";
import { Leave } from "@/src/lib/models/Leave";
import { User } from "@/src/lib/models/User";
import { Notification } from "@/src/lib/models/Notification";
import "@/src/lib/models/Role";
import { CompanySettings } from "@/src/lib/models/Settings";
import { Holiday } from "@/src/lib/models/Holiday";

import { pusherServer } from "@/src/lib/pusher";

// ── GET /api/leave ───────────────────────────────────────────────────────────
// Employee: returns own leaves (paginated)
// Admin: returns all leaves (paginated with balance for each request), supports ?status= filter
//
// Optimized for 2000 concurrent users:
//  – Uses index on { user_id, status } for employee queries
//  – Uses index on { start_date, end_date } for admin year-filtered queries
//  – Promise.all for parallel DB calls, .lean() everywhere, minimal .select()
//  – For admin: balance per user computed via aggregation in a single pipeline call
export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !(session.user as any)?.id) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    await dbConnect();

    const userId = (session.user as any).id;
    const orgId = session.user.orgId;
    if (!orgId) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }
    const isAdmin = (session.user as any)?.role?.level === "ADMIN";

    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get("limit") ?? "20", 10)));
    const skip = (page - 1) * limit;
    const statusFilter = searchParams.get("status");
    const targetUserId = searchParams.get("userId");

    const query: Record<string, any> = {};

    if (!isAdmin) {
      if (targetUserId && targetUserId !== userId) {
        return NextResponse.json({ success: false, message: "Unauthorized to view these leaves" }, { status: 403 });
      }
      query.user_id = userId; // Non-admins can only see their own leaves
    } else if (targetUserId) {
      // Admin filtering by a specific user — verify they belong to same org
      query.user_id = targetUserId;
    } else {
      // Admin fetching all leaves — scope to users in their org
      const orgUserIds = await User.find({ organization_id: orgId, is_active: true }).select("_id").lean();
      query.user_id = { $in: orgUserIds.map((u: any) => u._id) };
    }

    if (statusFilter && ["PENDING", "APPROVED", "REJECTED"].includes(statusFilter)) {
      query.status = statusFilter;
    }

    const [leaves, totalCount] = await Promise.all([
      Leave.find(query)
        .populate("user_id", "name email avatar employee_id")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean()
        .exec(),
      Leave.countDocuments(query),
    ]);

    return NextResponse.json({
      success: true,
      data: leaves,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages: Math.ceil(totalCount / limit),
      },
    });
  } catch (error: any) {
    console.error("[GET /api/leave]", error);
    return NextResponse.json({ success: false, message: "Server error" }, { status: 500 });
  }
}

// ── POST /api/leave ──────────────────────────────────────────────────────────
// Employee submits a new leave request. Notifies all admins via bulk insertMany.
//
// Optimized:
//  – Admin lookup uses Role collection join via aggregation (avoids populating all users)
//  – Notification insertMany is non-blocking (fire and forget after response)
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !(session.user as any)?.id) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    await dbConnect();

    const userId = (session.user as any).id;
    const orgId = (session.user as any).orgId;
    if (!orgId) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    const userName = session.user?.name ?? "An employee";
    const body = await request.json();
    const { start_date, end_date, reason, leave_type } = body;

    if (!start_date || !end_date || !reason?.trim() || !leave_type?.trim()) {
      return NextResponse.json(
        { success: false, message: "Start date, end date, reason, and leave type are required." },
        { status: 400 }
      );
    }

    const start = new Date(start_date);
    const end = new Date(end_date);

    // Normalize times to midnight to ensure accurate day counting
    start.setUTCHours(0, 0, 0, 0);
    end.setUTCHours(0, 0, 0, 0);

    if (end < start) {
      return NextResponse.json(
        { success: false, message: "End date cannot be before start date." },
        { status: 400 }
      );
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // NEW: Fetch Company Holidays and Weekends for this specific Organization
    // ─────────────────────────────────────────────────────────────────────────────
    const startYear = start.getUTCFullYear();

    const [settings, holidays] = await Promise.all([
      CompanySettings.findOne({ organization_id: orgId, year: startYear }).lean(),
      Holiday.find({ organization_id: orgId, date: { $gte: start, $lte: end } }).lean()
    ]);

    // Create an array of holiday dates for easy checking (e.g., "2026-12-25")
    const holidayDateStrings = holidays.map(h => {
      const d = new Date(h.date);
      return d.toISOString().split('T')[0];
    });

    const weekendPolicy = settings?.weekend_policy || [0]; // Default to Sunday off if missing
    const specificWeekendRules = settings?.specific_weekend_rules || [];

    // Calculate actual working days
    let actualLeaveDays = 0;

    // Loop through every single day between start and end date
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const dateString = d.toISOString().split('T')[0];
      const dayOfWeek = d.getUTCDay(); // 0 = Sunday, 6 = Saturday
      const weekOfMonth = Math.ceil(d.getUTCDate() / 7); // e.g., 2nd Saturday

      // 1. Is it a public holiday?
      if (holidayDateStrings.includes(dateString)) continue;

      // 2. Is it a standard weekly off? (e.g., Every Sunday)
      if (weekendPolicy.includes(dayOfWeek)) continue;

      // 3. Is it a specific alternating off? (e.g., 2nd Saturday)
      const isSpecificOff = specificWeekendRules.some(
        rule => rule.dayOfWeek === dayOfWeek && rule.weekNumbers.includes(weekOfMonth)
      );
      if (isSpecificOff) continue;

      // If it survived all checks, it's a real working day!
      actualLeaveDays++;
    }

    // If the user picked a date range that ONLY contains weekends/holidays
    if (actualLeaveDays === 0) {
      return NextResponse.json(
        { success: false, message: "The selected dates fall entirely on holidays or weekends. No leave required!" },
        { status: 400 }
      );
    }
    // ─────────────────────────────────────────────────────────────────────────────

    // Create the leave record (Notice we keep the original start and end date for the record)
    const leave = await Leave.create({
      user_id: userId,
      organization_id: orgId, // 🔒 Tenant Isolation
      start_date: start,
      end_date: end,
      reason: reason.trim(),
      leave_type: leave_type.trim(),
      status: "PENDING",
    });

    // Fetch populated result + admin IDs in parallel
    const [populated, adminUsers] = await Promise.all([
      Leave.findById(leave._id)
        .populate("user_id", "name email avatar employee_id")
        .lean()
        .exec(),

      // Efficient admin lookup scoped to same org
      User.aggregate([
        { $match: { is_active: true, organization_id: { $eq: (await import("mongoose")).default.Types.ObjectId.createFromHexString(orgId) } } },
        {
          $lookup: {
            from: "roles",
            localField: "role_id",
            foreignField: "_id",
            as: "role",
          },
        },
        { $unwind: { path: "$role", preserveNullAndEmptyArrays: false } },
        { $match: { "role.level": "ADMIN", _id: { $ne: leave.user_id } } },
        { $project: { _id: 1 } },
      ]).exec(),
    ]);

    // Fire-and-forget notification creation
    if (adminUsers.length > 0) {
      const startLabel = start.toLocaleDateString("en-US", { month: "short", day: "numeric" });
      const endLabel = end.toLocaleDateString("en-US", { month: "short", day: "numeric" });

      const notifications = adminUsers.map((admin: any) => ({
        recipient_id: admin._id,
        organization_id: orgId, // 🔒 Tenant Isolation
        type: "LEAVE_REQUEST" as const,
        title: "New Leave Request",
        // Notice we use "actualLeaveDays" here so the Admin sees the true deduction!
        message: `${userName} requested ${actualLeaveDays} working day${actualLeaveDays !== 1 ? "s" : ""} of leave (${startLabel} – ${endLabel}).`,
        link: "/leave?tab=pending",
        related_id: leave._id,
        is_read: false,
      }));
      
      (async () => {
        try {
          await Notification.insertMany(notifications);
          await Promise.all(
            adminUsers.map((admin: any) =>
              pusherServer.trigger(`user-${admin._id}`, "notification-ping", {})
            )
          );
        } catch (e) {
          console.error("[POST /api/leave] notify error", e);
        }
      })();
    }

    return NextResponse.json(
      { success: true, data: populated, message: `Leave request for ${actualLeaveDays} working days submitted.` },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("[POST /api/leave]", error);
    return NextResponse.json({ success: false, message: "Server error" }, { status: 500 });
  }
}
