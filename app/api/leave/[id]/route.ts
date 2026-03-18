import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/src/lib/auth";
import dbConnect from "@/src/lib/mongodb";
import { Leave } from "@/src/lib/models/Leave";
import { Notification } from "@/src/lib/models/Notification";

// PATCH /api/leave/[id] — Admin approves or rejects a leave request
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await getServerSession(authOptions);
    if (!session || !(session.user as any)?.id) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    const isAdmin = (session.user as any)?.role?.level === "ADMIN";
    if (!isAdmin) {
      return NextResponse.json({ success: false, message: "Forbidden" }, { status: 403 });
    }

    await dbConnect();

    const body = await request.json();
    const { status, is_loss_of_pay } = body;

    if (!["APPROVED", "REJECTED"].includes(status)) {
      return NextResponse.json(
        { success: false, message: "Status must be APPROVED or REJECTED." },
        { status: 400 }
      );
    }

    const leave = await Leave.findById(id)
      .populate("user_id", "name email")
      .exec();

    if (!leave) {
      return NextResponse.json({ success: false, message: "Leave not found." }, { status: 404 });
    }

    if (leave.status !== "PENDING") {
      return NextResponse.json(
        { success: false, message: "This request has already been actioned." },
        { status: 409 }
      );
    }

    leave.status = status;
    leave.is_loss_of_pay = is_loss_of_pay ?? false;
    await leave.save();

    const user = leave.user_id as any;
    const adminName = session.user?.name ?? "An admin";
    const startStr = leave.start_date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    const endStr = leave.end_date.toLocaleDateString("en-US", { month: "short", day: "numeric" });

    // Notify the requesting employee
    await Notification.create({
      recipient_id: user._id,
      type: status === "APPROVED" ? "LEAVE_APPROVED" : "LEAVE_REJECTED",
      title: status === "APPROVED" ? "Leave Approved ✓" : "Leave Rejected",
      message:
        status === "APPROVED"
          ? `Your leave request (${startStr} – ${endStr}) has been approved by ${adminName}.`
          : `Your leave request (${startStr} – ${endStr}) was rejected by ${adminName}.`,
      link: "/leave",
      related_id: leave._id,
      is_read: false,
    });

    const updated = await Leave.findById(leave._id)
      .populate("user_id", "name email avatar employee_id")
      .lean();

    return NextResponse.json({ success: true, data: updated, message: `Leave ${status.toLowerCase()}.` });
  } catch (error: any) {
    console.error("[PATCH /api/leave/[id]]", error);
    return NextResponse.json({ success: false, message: "Server error" }, { status: 500 });
  }
}
