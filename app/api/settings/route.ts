import { NextResponse } from "next/server";
import dbConnect from "@/src/lib/mongodb";
import { CompanySettings } from "@/src/lib/models/Settings";
import { Holiday } from "@/src/lib/models/Holiday";
import { getServerSession } from "next-auth";
import { authOptions } from "@/src/lib/auth";

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const yearParam = searchParams.get("year");
    const year = yearParam ? parseInt(yearParam) : new Date().getFullYear();

    await dbConnect();

    // Fetch settings for the specified year
    let settings = await CompanySettings.findOne({ year }).lean();

    // If no settings document exists yet for this year, create the default one
    if (!settings) {
      settings = await CompanySettings.create({
        year,
        leave_types: [{ name: "Casual Leave", quota: 10 }],
        weekend_policy: [0], // Default Sunday off
        specific_weekend_rules: [],
        allow_multi_checkins: false,
        work_start_time: "09:00",
        work_end_time: "18:00",
        is_overtime_applicable: false,
        overtime_hourly_rate: 0,
      });
    }

    // Fetch public holidays for this year
    const startOfYear = new Date(Date.UTC(year, 0, 1));
    const endOfYear = new Date(Date.UTC(year, 11, 31, 23, 59, 59));

    const holidays = await Holiday.find({
      date: { $gte: startOfYear, $lte: endOfYear }
    }).sort({ date: 1 }).lean();

    return NextResponse.json({ success: true, data: { settings, holidays } }, { status: 200 });
  } catch (error) {
    console.error("[GET /api/settings]", error);
    return NextResponse.json(
      { success: false, message: "Failed to fetch settings." },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    const userRole = (session?.user as any)?.role?.level;

    if (userRole !== "ADMIN") {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 403 });
    }

    await dbConnect();
    const body = await request.json();

    const { year, leave_types, weekend_policy, specific_weekend_rules, holidays, allow_multi_checkins, work_start_time, work_end_time, is_overtime_applicable, overtime_hourly_rate } = body;
    if (!year) {
      return NextResponse.json({ success: false, message: "Year is required" }, { status: 400 });
    }

    // 1. Update/Create Settings for the Year
    let settings = await CompanySettings.findOne({ year });

    if (!settings) {
      settings = new CompanySettings({
        year,
        leave_types: leave_types,
        weekend_policy,
        specific_weekend_rules,
        allow_multi_checkins: allow_multi_checkins || false,
        work_start_time: work_start_time || "09:00",             // NEW
        work_end_time: work_end_time || "18:00",                 // NEW
        is_overtime_applicable: is_overtime_applicable || false, // NEW
        overtime_hourly_rate: overtime_hourly_rate || 0,         // NEW
      });
      await settings.save();
    } else {
      settings.leave_types = leave_types;
      settings.weekend_policy = weekend_policy;
      settings.specific_weekend_rules = specific_weekend_rules;
      if (allow_multi_checkins !== undefined) {
        settings.allow_multi_checkins = allow_multi_checkins;
      }

      if (work_start_time !== undefined) settings.work_start_time = work_start_time;
      if (work_end_time !== undefined) settings.work_end_time = work_end_time;
      if (is_overtime_applicable !== undefined) settings.is_overtime_applicable = is_overtime_applicable;
      if (overtime_hourly_rate !== undefined) settings.overtime_hourly_rate = overtime_hourly_rate;
      await settings.save();
    }

    // 2. Overwrite Public Holidays for the Year
    if (Array.isArray(holidays)) {
      const startOfYear = new Date(Date.UTC(year, 0, 1));
      const endOfYear = new Date(Date.UTC(year, 11, 31, 23, 59, 59));

      // Remove all existing holidays in this year
      await Holiday.deleteMany({
        date: { $gte: startOfYear, $lte: endOfYear }
      });

      // Insert new array
      if (holidays.length > 0) {
        const holidayDocs = holidays.map((h: any) => {
          // ensure the date stays at UTC midnight
          const d = new Date(h.date);
          d.setUTCHours(0, 0, 0, 0);
          return {
            title: h.title,
            date: d,
            type: h.type || "PUBLIC"
          };
        });
        await Holiday.insertMany(holidayDocs);
      }
    }

    return NextResponse.json({ success: true, message: "Settings updated successfully." }, { status: 200 });
  } catch (error) {
    console.error("[POST /api/settings]", error);
    return NextResponse.json(
      { success: false, message: "Failed to update settings." },
      { status: 500 }
    );
  }
}
