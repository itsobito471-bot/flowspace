import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/src/lib/auth";
import dbConnect from "@/src/lib/mongodb";
import { WFHRequest } from "@/src/lib/models/WFHRequest";
import { Notification } from "@/src/lib/models/Notification";
import { pusherServer } from "@/src/lib/pusher";
import mongoose from "mongoose";

// ── PATCH /api/wfh-requests/[id]  (Admin: approve or reject)
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
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
      new mongoose.Types.ObjectId(id),
      { status },
      { returnDocument: "after" }
    );

    if (!updated) {
      return NextResponse.json({ success: false, message: "WFH request not found." }, { status: 404 });
    }

    const adminName = session.user?.name ?? "An admin";
    const dateStr = new Date(updated.date).toLocaleDateString("en-US", { month: "short", day: "numeric" });

    // Fire-and-forget notification
    (async () => {
      try {
        await Notification.create({
          recipient_id: updated.user_id,
          type: status === "APPROVED" ? "WFH_APPROVED" : "WFH_REJECTED",
          title: status === "APPROVED" ? "WFH Approved ✓" : "WFH Rejected",
          message:
            status === "APPROVED"
              ? `Your WFH request for ${dateStr} has been approved by ${adminName}.`
              : `Your WFH request for ${dateStr} was rejected by ${adminName}.`,
          link: "/leave?type=wfh",
          related_id: updated._id,
          is_read: false,
        });
        await pusherServer.trigger(`user-${updated.user_id}`, "notification-ping", {});
      } catch (e) {
        console.error("[PATCH /api/wfh-requests/[id]] notify error", e);
      }
    })();

    return NextResponse.json({ success: true, data: updated });
  } catch (error: any) {
    console.error("[PATCH /api/wfh-requests/:id]", error);
    return NextResponse.json({ success: false, message: "Server error" }, { status: 500 });
  }
}

// ── DELETE /api/wfh-requests/[id]  (Employee can cancel their own PENDING request)
export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const session = await getServerSession(authOptions);
    if (!session || !(session.user as any)?.id) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    await dbConnect();
    const userId = (session.user as any).id as string;
    const roleLevel = (session.user as any)?.role?.level as string;
    const isAdmin = roleLevel === "ADMIN" || roleLevel === "SUPER_ADMIN";

    const wfhRequest = await WFHRequest.findById(id);
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
