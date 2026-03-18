import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/src/lib/auth";
import dbConnect from "@/src/lib/mongodb";
import { User } from "@/src/lib/models/User";
import { Attendance } from "@/src/lib/models/Attendance";

function getTodayDate() {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !(session.user as any)?.id) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    await dbConnect();
    const today = getTodayDate();

    // Get all active users
    const users = await User.find({ is_active: true })
      .select("_id name email avatar role_id")
      .lean();
    
    // Get today's attendance logs
    const attendances = await Attendance.find({ date: today }).lean();

    const teamStatus = users.map(user => {
      const record = attendances.find(a => String(a.user_id) === String(user._id));
      
      let status = "OFFLINE";
      if (record?.check_in && !record?.check_out) status = "ONLINE";
      if (record?.check_in && record?.check_out) status = "COMPLETED";

      return {
        id: user._id,
        name: user.name,
        avatar: user.avatar,
        status,
        checkIn: record?.check_in || null,
        checkOut: record?.check_out || null
      };
    });

    return NextResponse.json({ success: true, data: teamStatus });
  } catch (error: any) {
    console.error("GET /api/attendance/team Error:", error);
    return NextResponse.json({ success: false, message: "Server error" }, { status: 500 });
  }
}
