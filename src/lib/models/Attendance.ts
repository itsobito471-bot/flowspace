import mongoose, { Document, Model, Schema } from "mongoose";

export type CompOffStatus = "NONE" | "ELIGIBLE" | "PENDING_APPROVAL" | "APPROVED" | "REJECTED";

export interface IAttendance extends Document {
  user_id: mongoose.Types.ObjectId;
  /** Stored normalised to midnight UTC for clean date comparisons */
  date: Date;
  check_in: Date | null;
  check_out: Date | null;
  status: "PRESENT" | "ABSENT" | "HALF_DAY";
  work_mode: "OFFICE" | "WFH";
  check_in_location?: { latitude: number; longitude: number };
  check_out_location?: { latitude: number; longitude: number };
  added_by: mongoose.Types.ObjectId | null;
  description: string | null;
  location?: { lat: number | null; lng: number | null };
  organization_id: mongoose.Types.ObjectId;
  comp_off_status: CompOffStatus;
  createdAt: Date;
  updatedAt: Date;
}

const AttendanceSchema = new Schema<IAttendance>(
  {
    user_id: { type: Schema.Types.ObjectId, ref: "User", required: true },
    date: { type: Date, required: true },
    check_in: { type: Date, default: null },
    check_out: { type: Date, default: null },
    organization_id: { type: Schema.Types.ObjectId, ref: "Organization", required: true },
    status: {
      type: String,
      enum: ["PRESENT", "ABSENT", "HALF_DAY"],
      required: true,
      default: "PRESENT",
    },
    work_mode: {
      type: String,
      enum: ["OFFICE", "WFH"],
      default: "OFFICE",
    },
    check_in_location: {
      latitude: { type: Number },
      longitude: { type: Number },
    },
    check_out_location: {
      latitude: { type: Number },
      longitude: { type: Number },
    },
    added_by: { type: Schema.Types.ObjectId, ref: "User", default: null },
    description: { type: String, default: null },
    location: {
      lat: { type: Number, default: null },
      lng: { type: Number, default: null },
    },
    comp_off_status: {
      type: String,
      enum: ["NONE", "ELIGIBLE", "PENDING_APPROVAL", "APPROVED", "REJECTED"],
      default: "NONE",
    },
  },
  { timestamps: true }
);

// Allow multiple attendance records per day (removed unique index)
// AttendanceSchema.index({ user_id: 1, date: 1 }, { unique: true });

if (mongoose.models.Attendance) {
  delete mongoose.models.Attendance;
}
export const Attendance: Model<IAttendance> = mongoose.model<IAttendance>("Attendance", AttendanceSchema);

