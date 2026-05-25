import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/src/lib/auth";
import dbConnect from "@/src/lib/mongodb";
import { Notification } from "@/src/lib/models/Notification";
import { pusherServer } from "@/src/lib/pusher";

// GET /api/notifications — fetch unread + recent notifications for the session user
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !(session.user as any)?.id) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    await dbConnect();

    const notifications = await Notification.find({
      recipient_id: (session.user as any).id,
    })
      .sort({ createdAt: -1 })
      .limit(30)
      .lean();

    const unreadCount = notifications.filter((n) => !n.is_read).length;

    return NextResponse.json({ success: true, data: notifications, unreadCount });
  } catch (error: any) {
    console.error("[GET /api/notifications]", error);
    return NextResponse.json({ success: false, message: "Server error" }, { status: 500 });
  }
}

// PATCH /api/notifications — mark one, all, or related task notifications as read
// Body: { id?: string, markAll?: boolean, relatedId?: string }
export async function PATCH(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !(session.user as any)?.id) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    await dbConnect();
    const userId = (session.user as any).id;
    const body = await request.json().catch(() => ({}));

    let actionTaken = false;

    if (body.markAll) {
      await Notification.updateMany(
        { recipient_id: userId, is_read: false },
        { $set: { is_read: true } }
      );
      actionTaken = true;
    } else if (body.relatedId) {
      await Notification.updateMany(
        { recipient_id: userId, related_id: body.relatedId, is_read: false },
        { $set: { is_read: true } }
      );
      actionTaken = true;
    } else if (body.id) {
      await Notification.findOneAndUpdate(
        { _id: body.id, recipient_id: userId },
        { $set: { is_read: true } }
      );
      actionTaken = true;
    }

    if (actionTaken) {
      // Trigger Pusher notification ping to sync bell/UI components
      try {
        await pusherServer.trigger(`user-${userId}`, "notification-ping", {});
      } catch (err) {
        console.error("[PATCH /api/notifications] pusher trigger error:", err);
      }
      return NextResponse.json({ success: true, message: "Notifications updated successfully" });
    }

    return NextResponse.json({ success: false, message: "No action specified" }, { status: 400 });
  } catch (error: any) {
    console.error("[PATCH /api/notifications]", error);
    return NextResponse.json({ success: false, message: "Server error" }, { status: 500 });
  }
}
