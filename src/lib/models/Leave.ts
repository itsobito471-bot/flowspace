import mongoose, { Document, Model, Schema } from "mongoose";

export interface ILeave extends Document {
  user_id: mongoose.Types.ObjectId;
  start_date: Date;
  end_date: Date;
  reason: string;
  leave_type: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  organization_id: mongoose.Types.ObjectId;
  is_loss_of_pay: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const LeaveSchema = new Schema<ILeave>(
  {
    user_id: { type: Schema.Types.ObjectId, ref: "User", required: true },
    start_date: { type: Date, required: true },
    end_date: { type: Date, required: true },
    reason: { type: String, required: true },
    leave_type: { type: String, required: true },
    organization_id: { type: Schema.Types.ObjectId, ref: "Organization", required: true },
    status: {
      type: String,
      enum: ["PENDING", "APPROVED", "REJECTED"],
      required: true,
      default: "PENDING",
    },
    /**
     * is_loss_of_pay is set by an admin when approving/rejecting if the
     * employee has insufficient leave_quota remaining.
     */
    is_loss_of_pay: { type: Boolean, default: false },
  },
  { timestamps: true }
);

// Efficient lookups for admin approval queue and personal history
LeaveSchema.index({ user_id: 1, status: 1 });
LeaveSchema.index({ start_date: 1, end_date: 1 });

export const Leave: Model<ILeave> =
  mongoose.models.Leave ||
  mongoose.model<ILeave>("Leave", LeaveSchema);
