import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/src/lib/auth";
import dbConnect from "@/src/lib/mongodb";
import { Attendance } from "@/src/lib/models/Attendance";
import { CompanySettings } from "@/src/lib/models/Settings";
import mongoose from "mongoose";

// Helper to get normalized "today" date (midnight local time or UTC based, let's use UTC start of day)
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
    const record = await Attendance.findOne({
      user_id: (session.user as any).id,
      date: today,
    }).lean();

    return NextResponse.json({ success: true, data: record });
  } catch (error: any) {
    console.error("GET Attendance Error:", error);
    return NextResponse.json({ success: false, message: "Server error" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !(session.user as any)?.id) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    await dbConnect();
    const body = await request.json();
    const { action } = body; // "CHECK_IN" | "CHECK_OUT"

    const userId = (session.user as any).id;
    const today = getTodayDate();
    const now = new Date();

    if (action === "CHECK_IN") {
      let record = await Attendance.findOne({ user_id: userId, date: today });
      if (record && record.check_in) {
        if (record.check_out === null) {
          return NextResponse.json({ success: false, message: "Already currently checked in." }, { status: 400 });
        } else {
          // They checked out previously today
          const settings = await CompanySettings.findOne({ year: today.getFullYear() }).lean();
          if (!settings || !settings.allow_multi_checkins) {
            return NextResponse.json({ success: false, message: "Already checked in today. Multiple check-ins are disabled." }, { status: 400 });
          } else {
            // Multiple check-ins allowed: Clear the check-out time so they are online again
            record.check_out = null;
            await record.save();
            return NextResponse.json({ success: true, data: record });
          }
        }
      }

      if (!record) {
        record = await Attendance.create({
          user_id: userId,
          date: today,
          check_in: now,
          status: "PRESENT",
        });
      } else {
        record.check_in = now;
        await record.save();
      }
      return NextResponse.json({ success: true, data: record });

    } else if (action === "CHECK_OUT") {
      const record = await Attendance.findOne({ user_id: userId, date: today });
      if (!record || !record.check_in) {
        return NextResponse.json({ success: false, message: "Cannot check out without checking in." }, { status: 400 });
      }
      if (record.check_out) {
        return NextResponse.json({ success: false, message: "Already checked out today." }, { status: 400 });
      }

      record.check_out = now;
      await record.save();
      return NextResponse.json({ success: true, data: record });
    }

    return NextResponse.json({ success: false, message: "Invalid action." }, { status: 400 });

  } catch (error: any) {
    console.error("POST Attendance Error:", error);
    return NextResponse.json({ success: false, message: "Server error" }, { status: 500 });
  }
}
