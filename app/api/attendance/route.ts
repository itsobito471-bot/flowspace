import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/src/lib/auth";
import dbConnect from "@/src/lib/mongodb";
import { Attendance } from "@/src/lib/models/Attendance";
import { Leave } from "@/src/lib/models/Leave";
import { CompanySettings } from "@/src/lib/models/Settings";
import { Holiday } from "@/src/lib/models/Holiday";

// GET: Fetch attendance and approved leaves within a date range
export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    const orgId = session.user.orgId;
    if (!orgId) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const startDateStr = searchParams.get("startDate");
    const endDateStr = searchParams.get("endDate");
    let targetUserId = searchParams.get("userId");

    if (!startDateStr || !endDateStr) {
      return NextResponse.json({ success: false, message: "Missing startDate or endDate parameters" }, { status: 400 });
    }

    const isAdmin = (session.user as any).role?.level === "ADMIN";

    if (!targetUserId) {
      // If no target user provided, default to current user
      targetUserId = (session.user as any).id;
    } else {
      // If target user provided, but requester is not admin and trying to view someone else
      if (targetUserId !== (session.user as any).id && !isAdmin) {
        return NextResponse.json({ success: false, message: "Forbidden" }, { status: 403 });
      }
      // Admins can only view users within their own org
      if (isAdmin && targetUserId !== (session.user as any).id) {
        await dbConnect();
        const targetUser = await (await import("@/src/lib/models/User")).User.findById(targetUserId).select("organization_id").lean();
        if (!targetUser || (targetUser as any).organization_id?.toString() !== orgId) {
          return NextResponse.json({ success: false, message: "Forbidden: User not in your organization." }, { status: 403 });
        }
      }
    }

    await dbConnect();

    const start = new Date(startDateStr);
    const end = new Date(endDateStr);

    // 1. Fetch Attendance Records
    // Support multiple check-ins: we might have multiple docs for the same date if the schema allows,
    // or just array inside. Our schema uses distinct docs if multi check-in, or just one doc per date.
    // In our attendance API earlier we unset check_out to allow multiple, or maybe we just recreate?
    // Wait, the Attendance schema has `date`, `check_in`, `check_out`. If multi-checkin, are there multiple records per date or one array?
    // Let's check how the previous change works.
    const attendanceRecords = await Attendance.find({
      user_id: targetUserId,
      date: { $gte: start, $lte: end },
    }).sort({ check_in: 1 }).lean();

    // 2. Fetch Approved Leaves
    // Leaves have `start_date` and `end_date` (as strings or Dates, usually stored as strings in YYYY-MM-DD or ISODate)
    // We want any leave that overlaps with our requested range.
    // Assuming start_date and end_date are stored as Date objects or strings, let's query where status = "APPROVED"
    const leaves = await Leave.find({
      user_id: targetUserId,
      status: "APPROVED",
      $or: [
        { start_date: { $lte: endDateStr }, end_date: { $gte: startDateStr } },
      ]
    }).lean();

    // 3. Fetch Settings and Holidays (org-scoped)
    const currentYear = start.getFullYear();
    const settings = await CompanySettings.findOne({ organization_id: orgId, year: currentYear }).lean();
    const weekends = (settings as any)?.weekend_policy || [0]; // default Sunday

    // Holidays within the requested date range (for calendar coloring)
    const holidays = await Holiday.find({
      organization_id: orgId,
      date: { $gte: start, $lte: end }
    }).lean();

    // All holidays for the full year (for the summary widget)
    const yearStart = new Date(Date.UTC(currentYear, 0, 1));
    const yearEnd = new Date(Date.UTC(currentYear, 11, 31, 23, 59, 59));
    const allYearHolidays = await Holiday.find({
      organization_id: orgId,
      date: { $gte: yearStart, $lte: yearEnd }
    }).sort({ date: 1 }).lean();

    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);
    const passedHolidays = allYearHolidays.filter(h => new Date(h.date) <= today).length;

    const holidaySummary = {
      total: allYearHolidays.length,
      passed: passedHolidays,
      remaining: allYearHolidays.length - passedHolidays,
      upcoming: allYearHolidays
        .filter(h => new Date(h.date) >= today)
        .slice(0, 3)
        .map(h => ({ title: h.title, date: h.date, type: h.type })),
    };

    // Generate dummy leaves for weekends and holidays
    const finalLeaves = [...leaves];
    const currentDate = new Date(start);
    
    // Create a map to easily check if attendance exists on a specific day string
    const attendanceMap = new Set(
      attendanceRecords.map(r => new Date(r.date).toISOString().split('T')[0])
    );

    while (currentDate <= end) {
      const dayStr = currentDate.toISOString().split('T')[0];
      const hasAttendance = attendanceMap.has(dayStr);

      // Always inject public holidays — they show regardless of attendance
      const holidayMatch = holidays.find(h => new Date(h.date).toISOString().split('T')[0] === dayStr);
      if (holidayMatch) {
        finalLeaves.push({
          _id: holidayMatch._id.toString(),
          start_date: new Date(currentDate),
          end_date: new Date(currentDate),
          leave_type: holidayMatch.title,
          status: "APPROVED"
        } as any);
      }
      // Only inject Weekend label if no attendance that day AND not already a holiday
      else if (!hasAttendance && weekends.includes(currentDate.getDay())) {
        finalLeaves.push({
          _id: `weekend-${dayStr}`,
          start_date: new Date(currentDate),
          end_date: new Date(currentDate),
          leave_type: "Weekend",
          status: "APPROVED"
        } as any);
      }

      currentDate.setDate(currentDate.getDate() + 1);
    }

    return NextResponse.json({
      success: true,
      data: {
        attendance: attendanceRecords,
        leaves: finalLeaves,
        holidaySummary,
      }
    });

  } catch (error: any) {
    console.error("Calendar fetch error:", error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
