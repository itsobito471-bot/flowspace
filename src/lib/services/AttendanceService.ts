import { Attendance } from "@/src/lib/models/Attendance";
import { CompanySettings } from "@/src/lib/models/Settings";
import { Holiday } from "@/src/lib/models/Holiday";
import { User } from "@/src/lib/models/User";
import mongoose from "mongoose";

/**
 * Checks if a given date is considered a holiday or global off-day 
 * based on Company Settings (weekend policies) and the Holiday collection.
 */
export async function isOffDay(date: Date): Promise<boolean> {
  const dayOfWeek = date.getDay(); // 0 = Sunday, 6 = Saturday
  const year = date.getFullYear();
  
  // 1. Check Global Weekend Policies (e.g. Every Sunday)
  const settings = await CompanySettings.findOne({ year }).lean();
  if (settings) {
    if (settings.weekend_policy.includes(dayOfWeek)) {
      return true;
    }
    
    // Check specific specific weekend rules (e.g. 2nd & 4th Saturday)
    // Find absolute day of month
    const dateNum = date.getDate(); // 1 - 31
    // Calculate which "week" this day is in.
    // e.g. 1st to 7th is Week 1. 8th to 14th is Week 2.
    const weekOfMonth = Math.ceil(dateNum / 7);
    
    for (const rule of settings.specific_weekend_rules || []) {
      if (rule.dayOfWeek === dayOfWeek && rule.weekNumbers.includes(weekOfMonth)) {
        return true;
      }
    }
  }

  // 2. Check Public Holidays
  // Normalise the input date to start of day in local time or UTC
  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);
  
  const holiday = await Holiday.findOne({
    date: {
      $gte: startOfDay,
      $lt: new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000)
    },
    type: "PUBLIC"
  }).lean();

  if (holiday) return true;

  return false;
}

/**
 * Handles checking out a user, calculating hours worked, 
 * and automatically granting a Flex Leave (Comp Off) if they worked on an off-day.
 */
export async function handleAttendanceCheckout(userId: string) {
  const today = new Date();
  const startOfDay = new Date(today);
  startOfDay.setHours(0, 0, 0, 0);

  // Find today's attendance record
  const record = await Attendance.findOne({
    user_id: new mongoose.Types.ObjectId(userId),
    date: {
      $gte: startOfDay,
      $lt: new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000)
    }
  });

  if (!record) {
    throw new Error("No check-in record found for today.");
  }

  if (record.check_out) {
    throw new Error("Already checked out for today.");
  }

  // Mark checkout
  record.check_out = new Date();

  // Calculate if they breached a minimum hours threshold for Comp-off (e.g. 4 hours)
  const hoursWorked = (record.check_out.getTime() - record.check_in!.getTime()) / (1000 * 60 * 60);

  // If they worked on an Off-Day, give them a Flex Leave (Comp-Off)
  if (hoursWorked >= 4) {
    const isHolidayOrWeekend = await isOffDay(today);
    
    if (isHolidayOrWeekend) {
      // Grant a flex leave!
      await User.findByIdAndUpdate(userId, {
        $inc: { earned_flex_leaves: 1 }
      });
    }
  }

  await record.save();
  return record;
}
