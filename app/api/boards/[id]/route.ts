import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/src/lib/auth";
import dbConnect from "@/src/lib/mongodb";
import { Board } from "@/src/lib/models/Board";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });

    const userRole = (session.user as any)?.role?.level;
    const userType = (session.user as any)?.userType as string;
    const isAdmin = userRole === "ADMIN" || userType === "SUPER_ADMIN";

    if (!isAdmin) {
      return NextResponse.json({ success: false, message: "Only Admins can edit boards." }, { status: 403 });
    }

    const { id } = await params;
    const orgId = session.user.orgId as string;
    const body = await request.json();

    await dbConnect();

    const allowedUpdates: any = {};
    if (body.name !== undefined) allowedUpdates.name = body.name;
    if (body.members !== undefined) allowedUpdates.members = body.members;
    if (body.statuses !== undefined) allowedUpdates.statuses = body.statuses;
    if (body.approval_status !== undefined) allowedUpdates.approval_status = body.approval_status;

    const updated = await Board.findOneAndUpdate(
      { _id: id, organization_id: orgId },
      { $set: allowedUpdates },
      { new: true }
    ).lean();

    if (!updated) return NextResponse.json({ success: false, message: "Board not found" }, { status: 404 });

    return NextResponse.json({ success: true, data: updated });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: "Server error" }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });

    const userRole = (session.user as any)?.role?.level;
    const userType = (session.user as any)?.userType as string;
    const isAdmin = userRole === "ADMIN" || userType === "SUPER_ADMIN";

    if (!isAdmin) {
      return NextResponse.json({ success: false, message: "Only Admins can delete boards." }, { status: 403 });
    }

    const { id } = await params;
    const orgId = session.user.orgId as string;
    await dbConnect();

    await Board.findOneAndDelete({ _id: id, organization_id: orgId });

    return NextResponse.json({ success: true, message: "Board deleted." });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: "Server error" }, { status: 500 });
  }
}
