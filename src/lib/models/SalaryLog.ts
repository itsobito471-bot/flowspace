import mongoose, { Document, Model, Schema } from "mongoose";

export interface ISalaryLog extends Document {
  user_id: mongoose.Types.ObjectId;
  amount: number;
  breakdown: { title: string; amount: number }[];
  effective_date: Date;
  changed_by: mongoose.Types.ObjectId | null;
  organization_id: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const SalaryLogSchema = new Schema<ISalaryLog>(
  {
    user_id: { type: Schema.Types.ObjectId, ref: "User", required: true },
    amount: { type: Number, required: true },
    breakdown: [
      {
        title: { type: String, required: true },
        amount: { type: Number, required: true },
      },
    ],
    effective_date: { type: Date, required: true },
    organization_id: { type: Schema.Types.ObjectId, ref: "Organization", required: true },
    /**
     * changed_by is nullable — null signals a system/initial entry made
     * during onboarding, not triggered by an admin action.
     */
    changed_by: { type: Schema.Types.ObjectId, ref: "User", default: null },
  },
  { timestamps: true }
);

// Index for efficient per-user salary history queries
SalaryLogSchema.index({ user_id: 1, effective_date: -1 });

export const SalaryLog: Model<ISalaryLog> =
  mongoose.models.SalaryLog ||
  mongoose.model<ISalaryLog>("SalaryLog", SalaryLogSchema);
