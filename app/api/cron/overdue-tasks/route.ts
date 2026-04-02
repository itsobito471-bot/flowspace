import { NextResponse } from "next/server";
import dbConnect from "@/src/lib/mongodb";
import { Task } from "@/src/lib/models/Task";
import { Notification } from "@/src/lib/models/Notification";

/**
 * GET/POST /api/cron/overdue-tasks
 * This route should be pinged by Vercel Cron.
 * It checks all tasks where status is not "DONE" and due_date < now,
 * and alerts all assignee_ids via Notification.
 */
export async function GET(request: Request) {
  try {
    const authHeader = request.headers.get("authorization");
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      // In production, ensure CRON_SECRET is set
      if (process.env.NODE_ENV === "production") {
        return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
      } else {
        console.warn("No CRON_SECRET matched during dev/local. Proceeding anyway...");
      }
    }

    await dbConnect();
    const now = new Date();

    // Find all incomplete tasks past their due_date
    const overdueTasks = await Task.find({
      status: { $ne: "DONE" },
      due_date: { $lt: now, $ne: null },
    }).lean();

    if (overdueTasks.length === 0) {
      return NextResponse.json({ success: true, message: "No overdue tasks found." });
    }

    const notificationsToCreate: any[] = [];
    const updatedTaskIds: string[] = [];

    for (const task of overdueTasks) {
      if (!task.assignee_ids || task.assignee_ids.length === 0) continue;

      for (const assigneeId of task.assignee_ids) {
        notificationsToCreate.push({
          recipient_id: assigneeId,
          type: "TASK_OVERDUE",
          title: "🚨 Task Overdue!",
          message: `The task "${task.title}" was due on ${task.due_date ? new Date(task.due_date).toLocaleDateString() : 'its deadline'}.`,
          link: `/tasks?id=${task._id}`,
          is_read: false,
          related_id: task._id,
        });
      }
      updatedTaskIds.push(task._id.toString());
    }

    if (notificationsToCreate.length > 0) {
      await Notification.insertMany(notificationsToCreate);
    }

    return NextResponse.json({ 
      success: true, 
      message: `Processed ${updatedTaskIds.length} overdue tasks with ${notificationsToCreate.length} notifications dispatched.` 
    });
  } catch (error: any) {
    console.error("Overdue Cron Error:", error);
    return NextResponse.json({ success: false, message: "Server error" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  return GET(request);
}
