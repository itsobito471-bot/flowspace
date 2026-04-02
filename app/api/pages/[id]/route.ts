import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/src/lib/auth";
import dbConnect from "@/src/lib/mongodb";
import { BoardPage } from "@/src/lib/models/BoardPage";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });

    const userRole = (session.user as any)?.role?.level;
    const userType = (session.user as any)?.userType as string;
    const isAdmin = userRole === "ADMIN" || userType === "SUPER_ADMIN";

    if (!isAdmin) {
      return NextResponse.json({ success: false, message: "Only Admins can approve or reject projects." }, { status: 403 });
    }

    const { id } = await params;
    const orgId = session.user.orgId as string;
    const body = await request.json();

    await dbConnect();

    const updated = await BoardPage.findOneAndUpdate(
      { _id: id, organization_id: orgId },
      { $set: { approval_status: body.approval_status } },
      { new: true }
    );

    if (!updated) return NextResponse.json({ success: false, message: "Project not found" }, { status: 404 });

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
      return NextResponse.json({ success: false, message: "Only Admins can delete projects." }, { status: 403 });
    }

    const { id } = await params;
    const orgId = session.user.orgId as string;
    await dbConnect();

    await BoardPage.findOneAndDelete({ _id: id, organization_id: orgId });

    return NextResponse.json({ success: true, message: "Project deleted." });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: "Server error" }, { status: 500 });
  }
}
