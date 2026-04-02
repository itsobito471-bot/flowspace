import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/src/lib/auth";
import dbConnect from "@/src/lib/mongodb";
import { Board } from "@/src/lib/models/Board";
import { Task } from "@/src/lib/models/Task";

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });

    const orgId = session.user.orgId as string;
    const userId = (session.user as any).id as string;
    const userType = (session.user as any).userType as string;

    await dbConnect();
    
    // Access control: only assigned boards accessible, unless SUPER_ADMIN
    const query: any = { organization_id: orgId };
    if (userType !== "SUPER_ADMIN") {
      query.$or = [
        { creator_id: userId },
        { members: userId }
      ];
    }

    let boards = await Board.find(query).sort({ createdAt: 1 }).lean();

    // Auto-create a default board if none exists
    if (!boards || boards.length === 0) {
      const defaultBoard = await Board.create({
        name: "General Board",
        organization_id: orgId,
        creator_id: userId,
        members: [userId]
      });
      
      // Assign orphaned tasks to this board if any
      await Task.updateMany(
        { organization_id: orgId, board_id: { $exists: false } }, 
        { $set: { board_id: defaultBoard._id } }
      );
      await Task.updateMany(
        { organization_id: orgId, board_id: null }, 
        { $set: { board_id: defaultBoard._id } }
      );
      
      boards = [defaultBoard.toObject()];
    }

    return NextResponse.json({ success: true, data: boards });
  } catch (error: any) {
    console.error("GET Boards Error:", error);
    return NextResponse.json({ success: false, message: "Server error" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });

    const userRole = (session.user as any)?.role?.level;
    const userType = (session.user as any)?.userType as string;
    const isAdmin = userRole === "ADMIN" || userType === "SUPER_ADMIN";

    if (!isAdmin) {
      return NextResponse.json({ success: false, message: "Only Admins can create Boards." }, { status: 403 });
    }

    const orgId = session.user.orgId as string;
    const userId = (session.user as any).id as string;
    const body = await request.json();
    
    await dbConnect();

    const newBoard = await Board.create({
      ...body,
      organization_id: orgId,
      creator_id: userId,
      members: body.members || [userId]
    });

    return NextResponse.json({ success: true, data: newBoard });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: "Server error" }, { status: 500 });
  }
}

