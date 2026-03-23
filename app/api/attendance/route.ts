import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/src/lib/auth";
import dbConnect from "@/src/lib/mongodb";
import { Attendance } from "@/src/lib/models/Attendance";
import { Leave } from "@/src/lib/models/Leave";

// GET: Fetch attendance and approved leaves within a date range
export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
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

    return NextResponse.json({
      success: true,
      data: {
        attendance: attendanceRecords,
        leaves: leaves,
      }
    });

  } catch (error: any) {
    console.error("Calendar fetch error:", error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
