import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/src/lib/auth";
import dbConnect from "@/src/lib/mongodb";
import { Notification } from "@/src/lib/models/Notification";

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

// PATCH /api/notifications — mark one or all as read
// Body: { id?: string, markAll?: boolean }
export async function PATCH(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !(session.user as any)?.id) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    await dbConnect();
    const userId = (session.user as any).id;
    const body = await request.json().catch(() => ({}));

    if (body.markAll) {
      await Notification.updateMany(
        { recipient_id: userId, is_read: false },
        { $set: { is_read: true } }
      );
      return NextResponse.json({ success: true, message: "All notifications marked as read" });
    }

    if (body.id) {
      await Notification.findOneAndUpdate(
        { _id: body.id, recipient_id: userId },
        { $set: { is_read: true } }
      );
      return NextResponse.json({ success: true, message: "Notification marked as read" });
    }

    return NextResponse.json({ success: false, message: "No action specified" }, { status: 400 });
  } catch (error: any) {
    console.error("[PATCH /api/notifications]", error);
    return NextResponse.json({ success: false, message: "Server error" }, { status: 500 });
  }
}
