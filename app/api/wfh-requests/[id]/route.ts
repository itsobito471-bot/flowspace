import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/src/lib/auth";
import dbConnect from "@/src/lib/mongodb";
import { WFHRequest } from "@/src/lib/models/WFHRequest";
import mongoose from "mongoose";

// ── PATCH /api/wfh-requests/[id]  (Admin: approve or reject)
export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !(session.user as any)?.id) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    const roleLevel = (session.user as any)?.role?.level as string;
    const isAdmin = roleLevel === "ADMIN" || roleLevel === "SUPER_ADMIN";
    if (!isAdmin) {
      return NextResponse.json({ success: false, message: "Forbidden" }, { status: 403 });
    }

    await dbConnect();

    const body = await request.json();
    const { status } = body;

    if (!["APPROVED", "REJECTED"].includes(status)) {
      return NextResponse.json({ success: false, message: "Status must be APPROVED or REJECTED." }, { status: 400 });
    }

    const updated = await WFHRequest.findByIdAndUpdate(
      new mongoose.Types.ObjectId(params.id),
      { status },
      { new: true }
    );

    if (!updated) {
      return NextResponse.json({ success: false, message: "WFH request not found." }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: updated });
  } catch (error: any) {
    console.error("[PATCH /api/wfh-requests/:id]", error);
    return NextResponse.json({ success: false, message: "Server error" }, { status: 500 });
  }
}

// ── DELETE /api/wfh-requests/[id]  (Employee can cancel their own PENDING request)
export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !(session.user as any)?.id) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    await dbConnect();
    const userId = (session.user as any).id as string;
    const roleLevel = (session.user as any)?.role?.level as string;
    const isAdmin = roleLevel === "ADMIN" || roleLevel === "SUPER_ADMIN";

    const wfhRequest = await WFHRequest.findById(params.id);
    if (!wfhRequest) {
      return NextResponse.json({ success: false, message: "WFH request not found." }, { status: 404 });
    }

    // Employees can only delete their own PENDING requests
    if (!isAdmin) {
      if (String(wfhRequest.user_id) !== userId) {
        return NextResponse.json({ success: false, message: "Forbidden." }, { status: 403 });
      }
      if (wfhRequest.status !== "PENDING") {
        return NextResponse.json({ success: false, message: "Only pending requests can be cancelled." }, { status: 400 });
      }
    }

    await wfhRequest.deleteOne();
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("[DELETE /api/wfh-requests/:id]", error);
    return NextResponse.json({ success: false, message: "Server error" }, { status: 500 });
  }
}
