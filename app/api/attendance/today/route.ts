import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/src/lib/auth";
import dbConnect from "@/src/lib/mongodb";
import { Attendance } from "@/src/lib/models/Attendance";
import { CompanySettings } from "@/src/lib/models/Settings";
import { Organization } from "@/src/lib/models/Organization";
import { Holiday } from "@/src/lib/models/Holiday";
import { BlackPoint } from "@/src/lib/models/BlackPoint";
import { User } from "@/src/lib/models/User";
import { WFHRequest } from "@/src/lib/models/WFHRequest";
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
    const { action, location } = body; // "CHECK_IN" | "CHECK_OUT"

    const userId = (session.user as any).id as string;
    const orgId = session.user.orgId as string;
    const today = getTodayDate();
    const now = new Date();

    // ── Normalise incoming GPS coords ────────────────────────────────────────
    const gpsCoords: { latitude: number; longitude: number } | undefined =
      location?.latitude != null && location?.longitude != null
        ? { latitude: location.latitude, longitude: location.longitude }
        : location?.lat != null && location?.lng != null
        ? { latitude: location.lat, longitude: location.lng }
        : undefined;

    // ── Determine work_mode via User.work_model waterfall ───────────────────
    const dbUser = await User.findById(userId).lean();
    const userWorkModel: string = (dbUser as any)?.work_model ?? "OFFICE";

    let work_mode: "OFFICE" | "WFH" = "OFFICE";
    if (userWorkModel === "REMOTE" || userWorkModel === "HYBRID") {
      // Fully remote / hybrid employees are always WFH
      work_mode = "WFH";
    } else if (userWorkModel === "OFFICE" && action === "CHECK_IN") {
      // Office employees can go WFH only if they have an approved WFH request today
      const todayStart = getTodayDate();
      const todayEnd = new Date(todayStart);
      todayEnd.setUTCHours(23, 59, 59, 999);
      const approvedWFH = await WFHRequest.findOne({
        user_id: new mongoose.Types.ObjectId(userId),
        organization_id: new mongoose.Types.ObjectId(orgId),
        status: "APPROVED",
        date: { $gte: todayStart, $lte: todayEnd },
      }).lean();
      if (approvedWFH) {
        work_mode = "WFH";
      }
    }

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
            work_mode,
            ...(gpsCoords ? { check_in_location: gpsCoords } : {}),
            location: location || undefined,
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
          work_mode,
          ...(gpsCoords ? { check_in_location: gpsCoords } : {}),
          location: location || undefined,
        });
      } else {
        record.check_in = now;
        record.work_mode = work_mode;
        if (gpsCoords) record.check_in_location = gpsCoords;
        if (location) record.location = location;
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
      if (gpsCoords) record.check_out_location = gpsCoords;

      // ── 🎁 Comp Off Eligibility Check ────────────────────────────────────
      // Check if today is a weekend or public holiday
      const weekendPolicyForCompOff = settings?.weekend_policy ?? [0];
      const isWeekendDay = weekendPolicyForCompOff.includes(today.getUTCDay());

      // Check specific_weekend_rules (alternating weekends like 2nd/4th Saturday)
      let isSpecificWeekendOff = false;
      if (!isWeekendDay && settings?.specific_weekend_rules?.length) {
        const dayOfWeek = today.getUTCDay();
        const rule = settings.specific_weekend_rules.find(r => r.dayOfWeek === dayOfWeek);
        if (rule) {
          // Calculate which occurrence of this weekday in the month this is
          const dayOfMonth = today.getUTCDate();
          const weekNumber = Math.ceil(dayOfMonth / 7);
          if (rule.weekNumbers.includes(weekNumber)) {
            isSpecificWeekendOff = true;
          }
        }
      }

      const isPublicHoliday = !!(await Holiday.findOne({
        organization_id: new mongoose.Types.ObjectId(orgId),
        date: today,
      }).lean());

      const isCompOffEligibleDay = isWeekendDay || isSpecificWeekendOff || isPublicHoliday;

      if (isCompOffEligibleDay) {
        // Compute total hours worked today including all previous sessions
        const allTodaySessions = await Attendance.find({ user_id: userId, date: today }).sort({ check_in: 1 }).lean();
        let totalSeconds = 0;
        for (const session of allTodaySessions) {
          const cin = session.check_in ? new Date(session.check_in).getTime() : null;
          // For the current (last) session, use `now` as check_out since it is not saved yet
          const cout = session._id.toString() === record._id.toString()
            ? now.getTime()
            : (session.check_out ? new Date(session.check_out).getTime() : null);
          if (cin && cout) {
            totalSeconds += Math.floor((cout - cin) / 1000);
          }
        }

        const totalHours = totalSeconds / 3600;
        if (totalHours > 4) {
          record.comp_off_status = "ELIGIBLE";
        }
      }

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
