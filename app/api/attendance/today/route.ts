import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/src/lib/auth";
import dbConnect from "@/src/lib/mongodb";
import { Attendance } from "@/src/lib/models/Attendance";
import { CompanySettings } from "@/src/lib/models/Settings";
import { Organization } from "@/src/lib/models/Organization";
import { Holiday } from "@/src/lib/models/Holiday";
import { BlackPoint } from "@/src/lib/models/BlackPoint";
import mongoose from "mongoose";

// Helper to get normalized "today" date (midnight UTC)
function getTodayDate() {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

/**
 * Converts a "HH:MM" time string into a Date object set to TODAY's date.
 * Times in settings are stored in local terms; for penalty logic we compare
 * against UTC wall-clock, so we produce a UTC-based Date here.
 */
function timeStringToDate(timeStr: string, referenceDate: Date): Date {
  const [hours, minutes] = timeStr.split(":").map(Number);
  const d = new Date(referenceDate);
  d.setUTCHours(hours, minutes, 0, 0);
  return d;
}

/**
 * Checks if the given date is a weekend according to company weekend_policy.
 * weekend_policy is an array of day-of-week numbers (0=Sun, 6=Sat).
 */
function isWeekend(date: Date, weekendPolicy: number[]): boolean {
  return weekendPolicy.includes(date.getUTCDay());
}

// ── GET /api/attendance/today ────────────────────────────────────────────────
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

    const orgId = session.user.orgId as string;
    const settings = await CompanySettings.findOne({
      organization_id: new mongoose.Types.ObjectId(orgId),
      year: today.getUTCFullYear(),
    }).lean();
    const allow_multi_checkins = settings?.allow_multi_checkins || false;

    return NextResponse.json({ success: true, data: record, allow_multi_checkins, total_previous_seconds });
  } catch (error: any) {
    console.error("GET Attendance Error:", error);
    return NextResponse.json({ success: false, message: "Server error" }, { status: 500 });
  }
}

// ── POST /api/attendance/today ───────────────────────────────────────────────
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !(session.user as any)?.id) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    await dbConnect();
    const body = await request.json();
    const { action } = body; // "CHECK_IN" | "CHECK_OUT"

    const userId = (session.user as any).id as string;
    const orgId = session.user.orgId as string;
    const today = getTodayDate();
    const now = new Date();

    // ── Load settings (scoped to org + year) ────────────────────────────────
    const settings = await CompanySettings.findOne({
      organization_id: new mongoose.Types.ObjectId(orgId),
      year: today.getUTCFullYear(),
    }).lean();

    // ── 🔒 Load org to check if black-point module is enabled ────────────────
    const org = await Organization.findById(orgId).lean();
    const blackpointEnabled = !!org?.is_blackpoint_enabled;
    const penaltyEnabled = blackpointEnabled && !!settings?.penalty_rules?.is_enabled;

    // ── Pre-Check: holiday / weekend exception ───────────────────────────────
    let isExceptionDay = false;
    if (penaltyEnabled) {
      const weekendPolicy = settings?.weekend_policy ?? [0]; // default: Sunday
      if (isWeekend(now, weekendPolicy)) {
        isExceptionDay = true;
      } else {
        // Check public holidays for this org
        const holiday = await Holiday.findOne({
          organization_id: new mongoose.Types.ObjectId(orgId),
          date: today, // date is stored at midnight UTC
        }).lean();
        if (holiday) {
          isExceptionDay = true;
        }
      }
    }

    // ── CHECK-IN logic ───────────────────────────────────────────────────────
    if (action === "CHECK_IN") {
      let record = await Attendance.findOne({ user_id: userId, date: today }).sort({ check_in: -1 });

      if (record && record.check_in) {
        if (record.check_out === null) {
          return NextResponse.json({ success: false, message: "Already currently checked in." }, { status: 400 });
        } else {
          // They checked out previously today — multi-checkin scenario
          if (!settings || !settings.allow_multi_checkins) {
            return NextResponse.json({ success: false, message: "Already checked in today. Multiple check-ins are disabled." }, { status: 400 });
          }
          const newRecord = await Attendance.create({
            user_id: userId,
            date: today,
            check_in: now,
            status: "PRESENT",
            organization_id: orgId,
          });

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

      if (!record) {
        record = await Attendance.create({
          user_id: userId,
          date: today,
          check_in: now,
          status: "PRESENT",
          organization_id: orgId,
        });
      } else {
        record.check_in = now;
        await record.save();
      }

      // ── 🚨 Late Check-In Trap ────────────────────────────────────────────
      if (penaltyEnabled && !isExceptionDay && settings?.work_start_time) {
        const graceMins = settings.penalty_rules?.late_grace_period_mins ?? 15;
        const workStart = timeStringToDate(settings.work_start_time, today);
        const deadline = new Date(workStart.getTime() + graceMins * 60 * 1000);

        if (now > deadline) {
          const minutesLate = Math.round((now.getTime() - workStart.getTime()) / 60000);
          await BlackPoint.create({
            user_id: new mongoose.Types.ObjectId(userId),
            organization_id: new mongoose.Types.ObjectId(orgId),
            points: 1,
            reason: `Late check-in: arrived ${minutesLate} minute(s) after scheduled start time (${settings.work_start_time}).`,
            type: "AUTO_LATE",
            date: today,
            is_resolved: false,
          });
        }
      }

      return NextResponse.json({ success: true, data: record });

    // ── CHECK-OUT logic ──────────────────────────────────────────────────────
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

      // ── 🚨 Early Check-Out Trap ──────────────────────────────────────────
      if (penaltyEnabled && !isExceptionDay && settings?.work_end_time) {
        const graceMins = settings.penalty_rules?.early_checkout_grace_period_mins ?? 15;
        const workEnd = timeStringToDate(settings.work_end_time, today);
        const earliest = new Date(workEnd.getTime() - graceMins * 60 * 1000);

        if (now < earliest) {
          const minsEarly = Math.round((workEnd.getTime() - now.getTime()) / 60000);
          await BlackPoint.create({
            user_id: new mongoose.Types.ObjectId(userId),
            organization_id: new mongoose.Types.ObjectId(orgId),
            points: 1,
            reason: `Early check-out: left ${minsEarly} minute(s) before scheduled end time (${settings.work_end_time}).`,
            type: "AUTO_EARLY_CHECKOUT",
            date: today,
            is_resolved: false,
          });
        }
      }

      return NextResponse.json({ success: true, data: record });
    }

    return NextResponse.json({ success: false, message: "Invalid action." }, { status: 400 });

  } catch (error: any) {
    console.error("POST Attendance Error:", error);
    return NextResponse.json({ success: false, message: "Server error" }, { status: 500 });
  }
}
