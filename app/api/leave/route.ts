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
// Admin: returns all leaves (paginated), supports ?status= filter
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
    const statusFilter = searchParams.get("status"); // PENDING | APPROVED | REJECTED | null (all)

    const query: any = isAdmin ? {} : { user_id: userId };
    if (statusFilter && ["PENDING", "APPROVED", "REJECTED"].includes(statusFilter)) {
      query.status = statusFilter;
    }

    const [leaves, totalCount] = await Promise.all([
      Leave.find(query)
        .populate("user_id", "name email avatar employee_id")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
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
// Employee submits a new leave request
// After creation, notify all admins
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
    const { start_date, end_date, reason } = body;

    if (!start_date || !end_date || !reason?.trim()) {
      return NextResponse.json(
        { success: false, message: "Start date, end date, and reason are required." },
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

    // Calculate working days (very simple: calendar days between dates)
    const days = Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;

    const leave = await Leave.create({
      user_id: userId,
      start_date: start,
      end_date: end,
      reason: reason.trim(),
      status: "PENDING",
    });

    // Populate for response
    const populated = await Leave.findById(leave._id)
      .populate("user_id", "name email avatar employee_id")
      .lean();

    // Notify all admins
    const admins = await User.find({ is_active: true })
      .populate("role_id", "level")
      .lean();

    const adminUsers = admins.filter(
      (u: any) => u.role_id?.level === "ADMIN" && String(u._id) !== userId
    );

    if (adminUsers.length > 0) {
      const notifications = adminUsers.map((admin: any) => ({
        recipient_id: admin._id,
        type: "LEAVE_REQUEST" as const,
        title: "New Leave Request",
        message: `${userName} has requested ${days} day${days !== 1 ? "s" : ""} of leave (${start.toLocaleDateString("en-US", { month: "short", day: "numeric" })} – ${end.toLocaleDateString("en-US", { month: "short", day: "numeric" })}).`,
        link: "/leave?tab=pending",
        related_id: leave._id,
        is_read: false,
      }));
      await Notification.insertMany(notifications);
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
