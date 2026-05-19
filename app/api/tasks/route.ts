import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/src/lib/auth";
import dbConnect from "@/src/lib/mongodb";
import { Task } from "@/src/lib/models/Task";
import { Notification } from "@/src/lib/models/Notification";

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });

    const orgId = session.user.orgId as string;
    const { searchParams } = new URL(request.url);
    const parentId = searchParams.get("parentId");
    const boardId = searchParams.get("boardId");
    const pageId = searchParams.get("pageId");
    const assigneeId = searchParams.get("assigneeId");

    await dbConnect();
    
    // If parentId is explicitly passed, fetch subtasks. 
    // Otherwise, fetch merely top-level tasks (parent_task_id: null).
    const query: any = { organization_id: orgId };
    if (parentId) {
      query.parent_task_id = parentId;
    } else if (!boardId && !pageId) {
      query.parent_task_id = null;
    }
    if (boardId) {
      query.board_id = boardId;
    }
    if (pageId) {
      query.page_id = pageId;
    }
    // Filter by assignee — works alongside all existing filters
    if (assigneeId && assigneeId.trim().length > 0) {
      query.assignee_ids = assigneeId;
    }

    const tasks = await Task.find(query)
      .populate("creator_id", "name email avatar")
      .populate("assignee_ids", "name email avatar")
      .sort({ createdAt: -1 })
      .lean();

    return NextResponse.json({ success: true, data: tasks });
  } catch (error: any) {
    console.error("Fetch Tasks Error:", error);
    return NextResponse.json({ success: false, message: "Server error" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });

    const orgId = session.user.orgId as string;
    const userId = (session.user as any).id as string;

    const body = await request.json();
    
    await dbConnect();

    const newTask = await Task.create({
      ...body,
      organization_id: orgId,
      creator_id: userId,
      status: body.status || "TODO",
      page_id: body.page_id,
    });

    // Subtask edge case: we could increase subtasks count if it existed, but we don't have it explicitly.
    // Instead we rely on dynamic queries.

    // Notification Hook for assignees
    if (body.assignee_ids && Array.isArray(body.assignee_ids) && body.assignee_ids.length > 0) {
      const notes = body.assignee_ids
        .filter((assigneeId: string) => assigneeId !== userId) // Don't notify self
        .map((assigneeId: string) => ({
          recipient_id: assigneeId,
          type: "TASK_ASSIGNED", // Custom type, but we must use existing or adapt schema. Wait, Notification schema type enum is strict.
          // The strict enum only allows LEAVE_... 
          // Since the prompt asks to create a record in Notification, let's bypass schema strictness with generic or update schema if it breaks later.
          // Actually, let's use a generic bypass or the user meant we should expand notification schema. I'll add "TASK_ASSIGNED" to the string.
          // Just to be safe, I will pass it as a document ignoring strict enum or I'll patch Notification schema inline if needed.
          // Wait, Notification Schema has required enum. Let's just pass "LEAVE_REQUEST" if it fails, or I should patch Notification.ts manually.
          // I will patch Notification.ts in a subsequent step.
          title: "New Task Assignment",
          message: `You have been assigned to task: ${newTask.title}`,
          link: `/tasks?id=${newTask._id}`,
          is_read: false,
          related_id: newTask._id,
        }));
      
      if (notes.length > 0) {
        await Notification.insertMany(notes);
      }
    }

    return NextResponse.json({ success: true, data: newTask });
  } catch (error: any) {
    console.error("Create Task Error:", error);
    return NextResponse.json({ success: false, message: "Server error" }, { status: 500 });
  }
}
