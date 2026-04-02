import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/src/lib/auth";
import dbConnect from "@/src/lib/mongodb";
import { BoardPage } from "@/src/lib/models/BoardPage";
import { Task } from "@/src/lib/models/Task";

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });

    const orgId = session.user.orgId as string;
    const { searchParams } = new URL(request.url);
    const boardId = searchParams.get("boardId");

    await dbConnect();
    
    if (!boardId) {
      return NextResponse.json({ success: false, message: "boardId required" }, { status: 400 });
    }

    let pages = await BoardPage.find({ organization_id: orgId, board_id: boardId }).sort({ createdAt: 1 }).lean();

    // Auto-create a default page if none exists for this board
    if (!pages || pages.length === 0) {
      const defaultPage = await BoardPage.create({
        name: "Main List",
        board_id: boardId,
        organization_id: orgId,
      });
      
      // Assign orphaned tasks that have board_id but no page_id
      await Task.updateMany(
        { organization_id: orgId, board_id: boardId, page_id: { $exists: false } }, 
        { $set: { page_id: defaultPage._id } }
      );
      await Task.updateMany(
        { organization_id: orgId, board_id: boardId, page_id: null }, 
        { $set: { page_id: defaultPage._id } }
      );
      
      pages = [defaultPage.toObject()];
    }

    return NextResponse.json({ success: true, data: pages });
  } catch (error: any) {
    console.error("GET BoardPages Error:", error);
    return NextResponse.json({ success: false, message: "Server error" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });

    const orgId = session.user.orgId as string;
    const userId = (session.user as any).id as string;
    const userRole = (session.user as any)?.role?.level;
    const userType = (session.user as any)?.userType as string;
    const isAdmin = userRole === "ADMIN" || userType === "SUPER_ADMIN";

    const body = await request.json();
    
    await dbConnect();

    const newPage = await BoardPage.create({
      ...body,
      organization_id: orgId,
      requested_by: userId,
      // Admins auto-approve their own creations; employees create PENDING requests
      approval_status: isAdmin ? "APPROVED" : "PENDING",
    });

    return NextResponse.json({ success: true, data: newPage });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: "Server error" }, { status: 500 });
  }
}

