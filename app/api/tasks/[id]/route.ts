import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/src/lib/auth";
import dbConnect from "@/src/lib/mongodb";
import { Task } from "@/src/lib/models/Task";
import { Notification } from "@/src/lib/models/Notification";
import { Board } from "@/src/lib/models/Board";
import { User } from "@/src/lib/models/User";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const orgId = session.user.orgId as string;

    await dbConnect();
    const task = await Task.findOne({ _id: id, organization_id: orgId })
      .populate("creator_id", "name email avatar")
      .populate("assignee_ids", "name email avatar")
      .lean();

    if (!task) return NextResponse.json({ success: false, message: "Not found" }, { status: 404 });

    return NextResponse.json({ success: true, data: task });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: "Server error" }, { status: 500 });
  }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const orgId = session.user.orgId as string;
    const userId = (session.user as any).id as string;

    const body = await request.json();
    await dbConnect();

    const existingTask = await Task.findOne({ _id: id, organization_id: orgId });
    if (!existingTask) return NextResponse.json({ success: false, message: "Not found" }, { status: 404 });

    const oldAssignees = new Set((existingTask.assignee_ids || []).map((aid: any) => aid.toString()));

    const updatedTask = await Task.findOneAndUpdate(
      { _id: id, organization_id: orgId },
      { $set: body },
      { new: true }
    ).populate("assignee_ids", "name email avatar");

    if (!updatedTask) return NextResponse.json({ success: false, message: "Failed to update" }, { status: 500 });

    if (body.assignee_ids && Array.isArray(body.assignee_ids)) {
      const newAssignees = body.assignee_ids.filter(
        (aid: string) => !oldAssignees.has(aid.toString()) && aid.toString() !== userId
      );
      if (newAssignees.length > 0) {
        const notes = newAssignees.map((assigneeId: string) => ({
          recipient_id: assigneeId,
          type: "TASK_ASSIGNED",
          title: "New Task Assignment",
          message: `You have been assigned to task: ${updatedTask.title}`,
          link: `/tasks?id=${updatedTask._id}`,
          is_read: false,
          related_id: updatedTask._id,
        }));
        await Notification.insertMany(notes);
      }
    }

    return NextResponse.json({ success: true, data: updatedTask });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: "Server error" }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const orgId = session.user.orgId as string;
    const userId = (session.user as any).id as string;
    await dbConnect();

    const taskToDelete = await Task.findOne({ _id: id, organization_id: orgId });
    if (!taskToDelete) return NextResponse.json({ success: false, message: "Not found" }, { status: 404 });

    async function findAllSubtaskIds(parentId: string): Promise<string[]> {
      const subtasks = await Task.find({ parent_task_id: parentId }, "_id").lean();
      let ids = subtasks.map((t: any) => t._id.toString());
      for (const st of subtasks) {
        ids = ids.concat(await findAllSubtaskIds((st._id as any).toString()));
      }
      return ids;
    }

    const allDescendantIds = await findAllSubtaskIds(taskToDelete._id.toString());
    if (allDescendantIds.length > 0) {
      await Task.deleteMany({ _id: { $in: allDescendantIds } });
    }
    await Task.deleteOne({ _id: taskToDelete._id });

    if (taskToDelete.board_id) {
      const board = await Board.findById(taskToDelete.board_id).lean();
      if (board) {
        const admins = await User.find({ organization_id: orgId }).populate("role_id").lean();
        const adminIds = admins
          .filter((u: any) => (u.role_id as any)?.level === "ADMIN" || u.user_type === "SUPER_ADMIN")
          .map((u: any) => u._id.toString());

        const recipientIds = new Set(adminIds);
        if (board.creator_id) recipientIds.add(board.creator_id.toString());
        recipientIds.delete(userId);

        const notes = Array.from(recipientIds).map(recId => ({
          recipient_id: recId,
          type: "TASK_DELETED",
          title: "Task Deleted",
          message: `Task "${taskToDelete.title}" was deleted by ${session.user.name}.`,
          link: `/tasks`,
          is_read: false,
        }));
        if (notes.length > 0) await Notification.insertMany(notes);
      }
    }

    return NextResponse.json({ success: true, message: "Deleted successfully" });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: "Server error" }, { status: 500 });
  }
}
