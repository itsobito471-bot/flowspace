import mongoose, { Document, Model, Schema } from "mongoose";

export interface IAttendance extends Document {
  user_id: mongoose.Types.ObjectId;
  /** Stored normalised to midnight UTC for clean date comparisons */
  date: Date;
  check_in: Date | null;
  check_out: Date | null;
  status: "PRESENT" | "ABSENT" | "HALF_DAY";
  createdAt: Date;
  updatedAt: Date;
}

const AttendanceSchema = new Schema<IAttendance>(
  {
    user_id: { type: Schema.Types.ObjectId, ref: "User", required: true },
    date: { type: Date, required: true },
    check_in: { type: Date, default: null },
    check_out: { type: Date, default: null },
    status: {
      type: String,
      enum: ["PRESENT", "ABSENT", "HALF_DAY"],
      required: true,
      default: "PRESENT",
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

