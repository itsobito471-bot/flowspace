import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/src/lib/auth";
import dbConnect from "@/src/lib/mongodb";
import { User } from "@/src/lib/models/User";
import { Notification } from "@/src/lib/models/Notification";
import "@/src/lib/models/Role"; // Ensure Role schema is registered

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    const orgId = session.user.orgId;
    const userId = (session.user as any).id;
    const userName = session.user.name || "An employee";

    if (!orgId || !userId) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    await dbConnect();
    
    // Find all admins in this organization
    const admins = await User.find({ organization_id: orgId }).populate("role_id").lean();
    const adminIds = admins
      .filter((u: any) => (u.role_id as any)?.level === "ADMIN" || u.user_type === "SUPER_ADMIN")
      .map((u: any) => u._id);

    if (adminIds.length > 0) {
      const notes = adminIds.map((adminId) => ({
        recipient_id: adminId,
        type: "OVERTIME_STARTED",
        title: "Overtime Session Started",
        message: `${userName} has started tracking an overtime session.`,
        link: "/overtime",
        is_read: false,
      }));
      await Notification.insertMany(notes);
    }

    return NextResponse.json({ success: true, message: "Admins notified" });
  } catch (error: any) {
    console.error("POST /api/time-logs/notify-started Error:", error);
    return NextResponse.json({ success: false, message: "Server error" }, { status: 500 });
  }
}
