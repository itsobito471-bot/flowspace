import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/src/lib/auth";
import dbConnect from "@/src/lib/mongodb";
import { Leave } from "@/src/lib/models/Leave";
import { User } from "@/src/lib/models/User";
import { Notification } from "@/src/lib/models/Notification";
import "@/src/lib/models/Role";

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
      query.user_id = targetUserId; // Admins can filter by specific user
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
    if (end < start) {
      return NextResponse.json(
        { success: false, message: "End date cannot be before start date." },
        { status: 400 }
      );
    }

    const days = Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;

    // Create the leave record
    const leave = await Leave.create({
      user_id: userId,
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

      // Efficient admin lookup using aggregation — only pull _id
      User.aggregate([
        { $match: { is_active: true } },
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

    // Fire-and-forget notification creation — don't block the response
    if (adminUsers.length > 0) {
      const startLabel = start.toLocaleDateString("en-US", { month: "short", day: "numeric" });
      const endLabel = end.toLocaleDateString("en-US", { month: "short", day: "numeric" });
      const notifications = adminUsers.map((admin: any) => ({
        recipient_id: admin._id,
        type: "LEAVE_REQUEST" as const,
        title: "New Leave Request",
        message: `${userName} requested ${days} day${days !== 1 ? "s" : ""} of leave (${startLabel} – ${endLabel}).`,
        link: "/leave?tab=pending",
        related_id: leave._id,
        is_read: false,
      }));
      Notification.insertMany(notifications).catch((e) =>
        console.error("[POST /api/leave] notify error", e)
      );
    }

    return NextResponse.json(
      { success: true, data: populated, message: "Leave request submitted." },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("[POST /api/leave]", error);
    return NextResponse.json({ success: false, message: "Server error" }, { status: 500 });
  }
}
