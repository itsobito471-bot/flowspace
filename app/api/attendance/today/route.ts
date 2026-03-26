import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/src/lib/auth";
import dbConnect from "@/src/lib/mongodb";
import { Attendance } from "@/src/lib/models/Attendance";
import { Leave } from "@/src/lib/models/Leave";
import { CompanySettings } from "@/src/lib/models/Settings";
import mongoose from "mongoose";
import { BlackPoint } from "@/src/lib/models/BlackPoint";

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
    const allTodayRecords = await Attendance.find({
      user_id: (session.user as any).id,
      date: today,
    }).sort({ check_in: 1 }).lean();

    const record = allTodayRecords.length > 0 ? allTodayRecords[allTodayRecords.length - 1] : null;

    let total_previous_seconds = 0;
    if (allTodayRecords.length > 1) {
      for (let i = 0; i < allTodayRecords.length - 1; i++) {
        const r = allTodayRecords[i];
        if (r.check_in && r.check_out) {
          total_previous_seconds += Math.floor((new Date(r.check_out).getTime() - new Date(r.check_in).getTime()) / 1000);
        }
      }
    }

    const settings = await CompanySettings.findOne({ year: today.getFullYear() }).lean();
    const allow_multi_checkins = settings?.allow_multi_checkins || false;

    return NextResponse.json({ success: true, data: record, allow_multi_checkins, total_previous_seconds });
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
    const orgId = session.user.orgId;
    const today = getTodayDate();
    const now = new Date();

    if (action === "CHECK_IN") {
      let record = await Attendance.findOne({ user_id: userId, date: today }).sort({ check_in: -1 });
      if (record && record.check_in) {
        if (record.check_out === null) {
          return NextResponse.json({ success: false, message: "Already currently checked in." }, { status: 400 });
        } else {
          // They checked out previously today
          const settings = await CompanySettings.findOne({ year: today.getFullYear() }).lean();
          if (!settings || !settings.allow_multi_checkins) {
            return NextResponse.json({ success: false, message: "Already checked in today. Multiple check-ins are disabled." }, { status: 400 });
          } else {
            // Multiple check-ins allowed: Create a NEW attendance record for the new session
            const newRecord = await Attendance.create({
              user_id: userId,
              date: today,
              check_in: now,
              status: "PRESENT",
              organization_id: orgId as string,
            });

            // Re-calculate total_previous_seconds so the frontend has up-to-date data after POST
            const allTodayRecords = await Attendance.find({ user_id: userId, date: today }).sort({ check_in: 1 }).lean();
            let total_previous_seconds = 0;
            if (allTodayRecords.length > 1) {
              for (let i = 0; i < allTodayRecords.length - 1; i++) {
                const r = allTodayRecords[i];
                if (r.check_in && r.check_out) {
                  total_previous_seconds += Math.floor((new Date(r.check_out).getTime() - new Date(r.check_in).getTime()) / 1000);
                }
              }
            }

            return NextResponse.json({ success: true, data: newRecord, total_previous_seconds });
          }
        }
      }

      if (!record) {
        record = await Attendance.create({
          user_id: userId,
          date: today,
          check_in: now,
          status: "PRESENT",
          organization_id: orgId as string,
        });
      } else {
        record.check_in = now;
        await record.save();
      }
      return NextResponse.json({ success: true, data: record });

    } else if (action === "CHECK_OUT") {
      const record = await Attendance.findOne({ user_id: userId, date: today }).sort({ check_in: -1 });
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
