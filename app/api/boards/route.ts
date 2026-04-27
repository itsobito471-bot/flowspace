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

    const userRole = (session.user as any)?.role?.level;
    const isAdmin = userRole === "ADMIN" || userType === "SUPER_ADMIN";

    await dbConnect();
    
    // Access control: only assigned boards accessible, unless ADMIN or SUPER_ADMIN
    const query: any = { organization_id: orgId };
    if (!isAdmin) {
      query.$or = [
        { creator_id: userId },
        { members: userId }
      ];
    }

    let boards = await Board.find(query).sort({ createdAt: 1 }).lean();

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

    const orgId = session.user.orgId as string;
    const userId = (session.user as any).id as string;
    const body = await request.json();
    
    await dbConnect();

    const newBoard = await Board.create({
      ...body,
      organization_id: orgId,
      creator_id: userId,
      members: body.members || [userId],
      approval_status: isAdmin ? "APPROVED" : "PENDING",
    });

    return NextResponse.json({ success: true, data: newBoard });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: "Server error" }, { status: 500 });
  }
}

