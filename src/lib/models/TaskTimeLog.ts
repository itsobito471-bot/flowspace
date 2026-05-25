import mongoose, { Document, Model, Schema } from "mongoose";

export interface ITaskTimeLog extends Document {
  user_id: mongoose.Types.ObjectId;
  task_id?: mongoose.Types.ObjectId;
  duration_seconds: number;
  start_time: Date;
  end_time: Date;
  notes?: string;
  tags: string[];
  is_billable_overtime: boolean;
  approval_status: "PENDING" | "APPROVED" | "REJECTED";
  rejection_comment?: string;
  organization_id: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const TaskTimeLogSchema = new Schema<ITaskTimeLog>(
  {
    user_id: { type: Schema.Types.ObjectId, ref: "User", required: true },
    task_id: { type: Schema.Types.ObjectId, ref: "Task", required: false },
    duration_seconds: { type: Number, required: true },
    start_time: { type: Date, required: true },
    end_time: { type: Date, required: true },
    notes: { type: String, default: "" },
    tags: { type: [String], default: [] },
    is_billable_overtime: { type: Boolean, default: false },
    approval_status: {
      type: String,
      enum: ["PENDING", "APPROVED", "REJECTED"],
      default: "PENDING",
    },
    rejection_comment: { type: String, default: "" },
    organization_id: { type: Schema.Types.ObjectId, ref: "Organization", required: true },
  },
  { timestamps: true }
);

// Indexing for faster history lookups & admin approval queries
TaskTimeLogSchema.index({ user_id: 1, start_time: -1 });
TaskTimeLogSchema.index({ organization_id: 1, approval_status: 1 });

export const TaskTimeLog: Model<ITaskTimeLog> =
  mongoose.models.TaskTimeLog ||
  mongoose.model<ITaskTimeLog>("TaskTimeLog", TaskTimeLogSchema);
