import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/src/lib/auth";
import dbConnect from "@/src/lib/mongodb";
import { Task } from "@/src/lib/models/Task";
import mongoose from "mongoose";

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      console.log("GET /api/tasks/my-assigned: No session found");
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    const orgId = session.user.orgId;
    const userId = (session.user as any).id;

    console.log("GET /api/tasks/my-assigned: Session User ID:", userId, "Org ID:", orgId);

    if (!orgId || !userId) {
      console.log("GET /api/tasks/my-assigned: Missing orgId or userId in session");
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
    const limit = Math.max(1, Math.min(100, parseInt(searchParams.get("limit") ?? "10", 10)));

    await dbConnect();

    // Query tasks where the user is an assignee and belongs to the active organization
    // Using explicit mongoose.Types.ObjectId to ensure correct MongoDB query parsing
    const query: any = {
      assignee_ids: new mongoose.Types.ObjectId(userId),
      organization_id: new mongoose.Types.ObjectId(orgId),
    };

    const tasks = await Task.find(query)
      .skip((page - 1) * limit)
      .limit(limit + 1)
      .sort({ updatedAt: -1 })
      .lean();

    console.log(`GET /api/tasks/my-assigned: Found ${tasks.length} matching tasks for query:`, JSON.stringify(query));

    const hasMore = tasks.length > limit;
    const paginatedTasks = hasMore ? tasks.slice(0, limit) : tasks;

    return NextResponse.json({
      success: true,
      tasks: paginatedTasks,
      hasMore,
    });
  } catch (error: any) {
    console.error("GET /api/tasks/my-assigned Error:", error);
    return NextResponse.json({ success: false, message: "Server error" }, { status: 500 });
  }
}

