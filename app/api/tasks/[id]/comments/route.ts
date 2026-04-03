import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/src/lib/auth";
import dbConnect from "@/src/lib/mongodb";
import { Task } from "@/src/lib/models/Task";
import { TaskComment } from "@/src/lib/models/TaskComment";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const orgId = session.user.orgId as string;
    await dbConnect();

    const task = await Task.findOne({ _id: id, organization_id: orgId });
    if (!task) return NextResponse.json({ success: false, message: "Task not found" }, { status: 404 });

    const comments = await TaskComment.find({ task_id: id })
      .populate("author_id", "name avatar email")
      .populate("mentions", "name avatar")
      .sort({ createdAt: 1 })
      .lean();

    return NextResponse.json({ success: true, data: comments });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: "Server error" }, { status: 500 });
  }
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const orgId = session.user.orgId as string;
    const userId = (session.user as any).id as string;
    const { content, parent_id, mentions } = await request.json();

    if (!content || !content.trim())
      return NextResponse.json({ success: false, message: "Content is required" }, { status: 400 });

    await dbConnect();
    const task = await Task.findOne({ _id: id, organization_id: orgId });
    if (!task) return NextResponse.json({ success: false, message: "Task not found" }, { status: 404 });

    const comment = await TaskComment.create({
      task_id: id,
      author_id: userId,
      content: content.trim(),
      parent_id: parent_id || null,
      mentions: mentions || [],
      reactions: [],
    });

    const populatedComment = await TaskComment.findById(comment._id)
      .populate("author_id", "name avatar")
      .populate("mentions", "name avatar");

    return NextResponse.json({ success: true, data: populatedComment });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: "Server error" }, { status: 500 });
  }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });

    const userId = (session.user as any).id as string;
    const { commentId, emoji } = await request.json();

    if (!commentId || !emoji) return NextResponse.json({ success: false, message: "Missing data" }, { status: 400 });

    await dbConnect();

    const comment = await TaskComment.findById(commentId);
    if (!comment) return NextResponse.json({ success: false, message: "Comment not found" }, { status: 404 });

    const reactionIndex = comment.reactions.findIndex((r: any) => r.emoji === emoji);

    if (reactionIndex > -1) {
      const userIndex = comment.reactions[reactionIndex].users.indexOf(userId as any);
      if (userIndex > -1) {
        comment.reactions[reactionIndex].users.splice(userIndex, 1);
        if (comment.reactions[reactionIndex].users.length === 0) {
          comment.reactions.splice(reactionIndex, 1);
        }
      } else {
        comment.reactions[reactionIndex].users.push(userId as any);
      }
    } else {
      comment.reactions.push({ emoji, users: [userId as any] });
    }

    await comment.save();
    
    // re-fetch to get author_id populated properly
    const populatedComment = await TaskComment.findById(comment._id)
      .populate("author_id", "name avatar")
      .populate("mentions", "name avatar");

    return NextResponse.json({ success: true, data: populatedComment });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: "Server error" }, { status: 500 });
  }
}
