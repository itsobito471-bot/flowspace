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

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !(session.user as any)?.id) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    await dbConnect();
    const today = getTodayDate();

    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") ?? "24", 10)));
    const skip = (page - 1) * limit;

    // Get paginated active users + total count in parallel
    const [users, totalCount] = await Promise.all([
      User.find({ is_active: true })
        .select("_id name email avatar role_id")
        .sort({ name: 1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      User.countDocuments({ is_active: true }),
    ]);

    // Get today's attendance logs only for the current page's users
    const userIds = users.map(u => u._id);
    const attendances = await Attendance.find({ date: today, user_id: { $in: userIds } }).lean();

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
        checkOut: record?.check_out || null,
      };
    });

    return NextResponse.json({
      success: true,
      data: teamStatus,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages: Math.ceil(totalCount / limit),
      },
    });
  } catch (error: any) {
    console.error("GET /api/attendance/team Error:", error);
    return NextResponse.json({ success: false, message: "Server error" }, { status: 500 });
  }
}
