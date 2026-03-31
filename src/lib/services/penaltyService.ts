import mongoose from "mongoose";
import { Leave } from "@/src/lib/models/Leave";
import { BlackPoint } from "@/src/lib/models/BlackPoint";
import { Notification } from "@/src/lib/models/Notification";
import { pusherServer } from "@/src/lib/pusher";


export async function processPenaltyDeduction(
  userId: string | mongoose.Types.ObjectId,
  orgId: string | mongoose.Types.ObjectId,
  totalPoints: number,
  pointIds: mongoose.Types.ObjectId[],
  year: number,
  availableLeaveTypes: { name: string; quota: number }[],
  reasonPrefix: string = "Automatic automated deduction"
): Promise<void> {
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  const startOfYear = new Date(Date.UTC(year, 0, 1));
  const endOfYear = new Date(Date.UTC(year, 11, 31, 23, 59, 59));

  // 1. Fetch currently taken leaves to calculate balance
  const takenLeaves = await Leave.find({
    user_id: userId,
    organization_id: new mongoose.Types.ObjectId(String(orgId)),
    status: "APPROVED",
    is_loss_of_pay: { $ne: true }, // Only count their actual paid time off
    start_date: { $gte: startOfYear, $lte: endOfYear }
  }).lean();

  const takenCounts: Record<string, number> = {};
  for (const l of takenLeaves) {
    const start = new Date(l.start_date).getTime();
    const end = new Date(l.end_date).getTime();
    const days = Math.round((end - start) / (1000 * 60 * 60 * 24)) + 1;
    takenCounts[l.leave_type] = (takenCounts[l.leave_type] || 0) + days;
  }

  let selectedLeaveType = "Loss of Pay"; // Default to punishment
  let isLOP = true;

  for (const lt of availableLeaveTypes) {
    const name = lt.name;
    const quota = lt.quota;
    const taken = takenCounts[name] || 0;

    // Do they have a balance remaining for this specific leave type?
    if (taken < quota) {
      selectedLeaveType = name; // We found a paid leave to use!
      isLOP = false;            // Spare them from Loss of Pay!
      break;                    // Stop looking, we found our deduction target.
    }
  }

  // 2. Create the Leave Deduction Record
  const leave = await Leave.create({
    user_id: userId,
    organization_id: new mongoose.Types.ObjectId(String(orgId)),
    start_date: today,
    end_date: today,
    reason: `${reasonPrefix} (${selectedLeaveType}) for accumulating ${totalPoints} unpaid demerit points.`,
    leave_type: selectedLeaveType,
    status: "APPROVED",
    is_loss_of_pay: isLOP,
    is_demerit_deduction: true,
  });

  // 3. Notify the user instantly!
  const dateStr = today.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  try {
    await Notification.create({
      recipient_id: userId,
      type: "LEAVE_APPROVED",
      title: "Demerit Leave Deduction",
      message: `An automatic deduction (${selectedLeaveType}) was applied on ${dateStr} due to accumulating ${totalPoints} unpaid demerit points.`,
      link: "/leave",
      related_id: leave._id,
      is_read: false,
    });
    await pusherServer.trigger(`user-${String(userId)}`, "notification-ping", {});
  } catch (err) {
    console.error("[penaltyService] Failed to notify user of deduction:", err);
  }

  // 4. Resolve the contributing Black Point documents
  await BlackPoint.updateMany(
    { _id: { $in: pointIds } },
    { $set: { is_resolved: true } }
  );
}
