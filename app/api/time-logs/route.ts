import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/src/lib/auth";
import dbConnect from "@/src/lib/mongodb";
import { TaskTimeLog } from "@/src/lib/models/TaskTimeLog";
import { Task } from "@/src/lib/models/Task";

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    const orgId = session.user.orgId;
    const userId = (session.user as any).id;

    if (!orgId || !userId) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    await dbConnect();

    const body = await request.json();
    const {
      task_id,
      duration_seconds,
      start_time,
      end_time,
      notes,
      tags = [],
      is_billable_overtime = false,
    } = body;

    if (duration_seconds === undefined || isNaN(duration_seconds) || duration_seconds <= 0) {
      return NextResponse.json({ success: false, message: "Invalid duration" }, { status: 400 });
    }

    if (!start_time || !end_time) {
      return NextResponse.json({ success: false, message: "Start time and end time are required" }, { status: 400 });
    }

    // Create the time log
    const log = await TaskTimeLog.create({
      user_id: userId,
      task_id: task_id || undefined,
      duration_seconds: Number(duration_seconds),
      start_time: new Date(start_time),
      end_time: new Date(end_time),
      notes: notes?.trim() || "",
      tags: Array.isArray(tags) ? tags.map(t => String(t).trim()).filter(Boolean) : [],
      is_billable_overtime: Boolean(is_billable_overtime),
      approval_status: "PENDING",
      organization_id: orgId,
    });

    // If task_id is present, increment the tracked_time on the core Task model
    if (task_id) {
      await Task.findByIdAndUpdate(task_id, {
        $inc: { tracked_time: Number(duration_seconds) },
      });
    }

    return NextResponse.json({ success: true, data: log }, { status: 201 });
  } catch (error: any) {
    console.error("POST /api/time-logs Error:", error);
    return NextResponse.json({ success: false, message: "Server error" }, { status: 500 });
  }
}

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    const orgId = session.user.orgId;
    const userId = (session.user as any).id;
    const userRole = (session.user as any)?.role?.level;

    if (!orgId || !userId) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    await dbConnect();

    // Ensure User model is registered
    const { User } = await import("@/src/lib/models/User");

    const { searchParams } = new URL(request.url);
    const pendingOvertimeOnly = searchParams.get("pendingOvertime") === "true";
    const search = searchParams.get("search") || "";
    const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
    const limit = Math.max(1, Math.min(100, parseInt(searchParams.get("limit") ?? "10", 10)));

    let query: any = { organization_id: orgId };

    if (pendingOvertimeOnly) {
      if (userRole !== "ADMIN") {
        return NextResponse.json({ success: false, message: "Forbidden" }, { status: 403 });
      }
      query.approval_status = "PENDING";
      // query.is_billable_overtime = true;

      if (search.trim()) {
        const matchingUsers = await User.find({
          organization_id: orgId,
          $or: [
            { name: { $regex: search.trim(), $options: "i" } },
            { email: { $regex: search.trim(), $options: "i" } }
          ]
        }, "_id").lean();
        const userIds = matchingUsers.map(u => u._id);
        query.user_id = { $in: userIds };
      }
    } else {
      query.user_id = userId;
      // Show only overtime-submitted logs in the employee's own view
      // (overtimeOnly flag handled below; we no longer filter by is_billable_overtime
      //  so employees can see all their submissions)
      if (search.trim()) {
        query.$or = [
          { notes: { $regex: search.trim(), $options: "i" } },
          { tags: { $in: [new RegExp(search.trim(), "i")] } }
        ];
      }
    }

    const totalCount = await TaskTimeLog.countDocuments(query);

    // Fetch logs, populating both the task title and the user name/email/avatar
    const logs = await TaskTimeLog.find(query)
      .populate("task_id", "title")
      .populate("user_id", "name email avatar")
      .sort({ start_time: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();

    return NextResponse.json({
      success: true,
      data: logs,
      pagination: {
        total: totalCount,
        page,
        limit,
        totalPages: Math.ceil(totalCount / limit)
      }
    });
  } catch (error: any) {
    console.error("GET /api/time-logs Error:", error);
    return NextResponse.json({ success: false, message: "Server error" }, { status: 500 });
  }
}
