import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/src/lib/auth";
import dbConnect from "@/src/lib/mongodb";
import { User } from "@/src/lib/models/User";
import { Attendance } from "@/src/lib/models/Attendance";
import { Leave } from "@/src/lib/models/Leave";
import { BlackPoint } from "@/src/lib/models/BlackPoint";

function getTodayDate() {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    const orgId = session?.user?.orgId;

    if (!session || !orgId) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    await dbConnect();

    const today = getTodayDate();
    const endOfToday = new Date(today);
    endOfToday.setUTCHours(23, 59, 59, 999);

    const [totalEmployees, presentCount, leaves, lateCount] = await Promise.all([
      User.countDocuments({ organization_id: orgId, user_type: "ORG_USER", is_active: true }),
      Attendance.countDocuments({ organization_id: orgId, date: today, status: { $in: ["PRESENT", "HALF_DAY"] } }),
      Leave.countDocuments({
        organization_id: orgId,
        status: "APPROVED",
        start_date: { $lte: endOfToday },
        end_date: { $gte: today }
      }),
      BlackPoint.countDocuments({ organization_id: orgId, date: today, type: "AUTO_LATE" })
    ]);

    const absentCount = Math.max(0, totalEmployees - (presentCount + leaves));

    return NextResponse.json({
      success: true,
      data: {
        totalEmployees,
        onLeave: leaves,
        present: presentCount,
        late: lateCount,
        absent: absentCount
      }
    });

  } catch (error: any) {
    console.error("Dashboard Widget API Error:", error);
    return NextResponse.json({ success: false, message: "Server error" }, { status: 500 });
  }
}
