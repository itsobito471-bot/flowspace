import { NextResponse } from "next/server";
import dbConnect from "@/src/lib/mongodb";
import { User } from "@/src/lib/models/User";
import { Attendance } from "@/src/lib/models/Attendance";
import { Leave } from "@/src/lib/models/Leave";
import { CompanySettings } from "@/src/lib/models/Settings";
import { BlackPoint } from "@/src/lib/models/BlackPoint";
import { getServerSession } from "next-auth";
import { authOptions } from "@/src/lib/auth";

export async function GET(request: Request) {
  try {
    await dbConnect();

    // 1. Authorize Admin
    const session = await getServerSession(authOptions);
    if (!session || !session.user || !session.user.orgId) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    const userRole = (session.user as any)?.role?.level;
    if (userRole !== "ADMIN" && userRole !== "SUPER_ADMIN") {
      return NextResponse.json({ success: false, message: "Forbidden" }, { status: 403 });
    }

    const myOrgId = session.user.orgId;

    // 2. Parse Query Params
    const { searchParams } = new URL(request.url);
    const monthRaw = searchParams.get("month");
    const yearRaw = searchParams.get("year");

    if (!monthRaw || !yearRaw) {
      return NextResponse.json({ success: false, message: "Missing month or year params" }, { status: 400 });
    }

    const month = parseInt(monthRaw, 10);
    const year = parseInt(yearRaw, 10);

    // 1-indexed month mapping
    const startDate = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0));
    const endDate = new Date(Date.UTC(year, month, 0, 23, 59, 59, 999));

    // 3. Parallel fetch all required collections for the organization
    const [users, orgSettings, attendances, leaves, blackPoints] = await Promise.all([
      User.find({ organization_id: myOrgId }).populate("role_id").lean(),
      CompanySettings.findOne({ organization_id: myOrgId }).sort({ year: -1 }).lean(),
      Attendance.find({
        organization_id: myOrgId,
        date: { $gte: startDate, $lte: endDate }
      }).lean(),
      Leave.find({
        organization_id: myOrgId,
        status: "APPROVED",
        // Overlapping requested month window
        start_date: { $lte: endDate },
        end_date: { $gte: startDate }
      }).lean(),
      BlackPoint.find({
        organization_id: myOrgId,
        date: { $gte: startDate, $lte: endDate }
      }).lean()
    ]);

    // Calculate Standard Hours if Overtime is applicable
    let standardHours = 8; // fallback
    if (orgSettings?.is_overtime_applicable && orgSettings.work_start_time && orgSettings.work_end_time) {
      const [startH, startM] = orgSettings.work_start_time.split(":").map(Number);
      const [endH, endM] = orgSettings.work_end_time.split(":").map(Number);
      standardHours = (endH + endM / 60) - (startH + startM / 60);
    }

    // 4. Aggregation Loop
    const reportData = users.map((user: any) => {
      const uId = user._id.toString();

      // Filter this user's attendances
      const userAttendances = attendances.filter(a => a.user_id.toString() === uId);
      
      const presentDays = userAttendances.filter(a => a.status === "PRESENT" || a.status === "HALF_DAY").length;
      const absentDays = userAttendances.filter(a => a.status === "ABSENT").length;

      // Filter this user's leaves
      const userLeaves = leaves.filter(l => l.user_id.toString() === uId);
      
      let leaveDaysTaken = 0;
      let lopDaysTaken = 0;

      for (const leave of userLeaves) {
        // Find exactly how many days of this leave fall into THIS specific month
        const lStart = new Date(leave.start_date);
        const lEnd = new Date(leave.end_date);
        
        const overlapStart = lStart > startDate ? lStart : startDate;
        const overlapEnd = lEnd < endDate ? lEnd : endDate;
        
        const daysInMonth = Math.round((overlapEnd.getTime() - overlapStart.getTime()) / (1000 * 60 * 60 * 24)) + 1;
        
        if (daysInMonth > 0) {
          if (leave.is_loss_of_pay) {
            lopDaysTaken += daysInMonth;
          } else {
            leaveDaysTaken += daysInMonth;
          }
        }
      }

      // Filter BlackPoints (Lates/Early)
      const userPoints = blackPoints.filter(b => b.user_id.toString() === uId);
      const timesLate = userPoints.filter(b => b.type === "AUTO_LATE").length;
      const timesEarlyOut = userPoints.filter(b => b.type === "AUTO_EARLY_CHECKOUT").length;
      const manualDemerits = userPoints.filter(b => b.type === "MANUAL").reduce((acc, curr) => acc + curr.points, 0);

      // Overtime Calculation
      let totalOvertimeHours = 0;
      if (orgSettings?.is_overtime_applicable) {
        userAttendances.forEach(att => {
          if (att.check_in && att.check_out) {
            const inTime = new Date(att.check_in).getTime();
            const outTime = new Date(att.check_out).getTime();
            const hoursWorked = (outTime - inTime) / (1000 * 60 * 60);

            if (hoursWorked > standardHours) {
              totalOvertimeHours += (hoursWorked - standardHours);
            }
          }
        });
      }

      // Return unified row for Excel
      return {
        "Employee ID": user.employee_id || "N/A",
        "Name": user.name,
        "Email": user.email,
        "Role": user.role_id?.title || "N/A",
        "Department": user.role_id?.department || "N/A",
        "Days Present": presentDays,
        "Days Absent": absentDays,
        "Late Check-ins": timesLate,
        "Early Checkouts": timesEarlyOut,
        "Manual Demerit Points": manualDemerits,
        "Paid Leave Days Used": leaveDaysTaken,
        "Loss Of Pay (LOP) Days": lopDaysTaken,
        "Overtime (Hours)": Number(totalOvertimeHours.toFixed(2))
      };
    });

    return NextResponse.json({ success: true, data: reportData });
    
  } catch (error: any) {
    console.error("[GET /api/reports/monthly]", error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
