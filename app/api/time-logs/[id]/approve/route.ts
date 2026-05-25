import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/src/lib/auth";
import dbConnect from "@/src/lib/mongodb";
import { TaskTimeLog } from "@/src/lib/models/TaskTimeLog";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    const orgId = session.user.orgId;
    const userRole = (session.user as any)?.role?.level;

    // Check if user is admin
    if (userRole !== "ADMIN") {
      return NextResponse.json({ success: false, message: "Forbidden" }, { status: 403 });
    }

    if (!orgId) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    await dbConnect();

    const body = await request.json();
    const { approval_status, rejection_comment } = body;

    if (!["APPROVED", "REJECTED"].includes(approval_status)) {
      return NextResponse.json(
        { success: false, message: "approval_status must be APPROVED or REJECTED" },
        { status: 400 }
      );
    }

    if (approval_status === "REJECTED" && (!rejection_comment || !rejection_comment.trim())) {
      return NextResponse.json(
        { success: false, message: "Rejection comment is required when rejecting overtime." },
        { status: 400 }
      );
    }

    const updateObj: any = { approval_status };
    if (approval_status === "REJECTED") {
      updateObj.rejection_comment = rejection_comment;
    } else {
      updateObj.rejection_comment = "";
    }

    // Find the log and update it, ensuring it belongs to the admin's organization
    const log = await TaskTimeLog.findOneAndUpdate(
      { _id: id, organization_id: orgId },
      { $set: updateObj },
      { new: true }
    );

    if (!log) {
      return NextResponse.json({ success: false, message: "Time log not found" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: `Time log successfully ${approval_status.toLowerCase()}`,
      data: log,
    });
  } catch (error: any) {
    console.error("PATCH /api/time-logs/[id]/approve Error:", error);
    return NextResponse.json({ success: false, message: "Server error" }, { status: 500 });
  }
}
