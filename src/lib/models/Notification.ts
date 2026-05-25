import mongoose, { Document, Model, Schema } from "mongoose";

export type NotificationType =
  | "LEAVE_REQUEST"
  | "LEAVE_APPROVED"
  | "LEAVE_REJECTED"
  | "WFH_REQUEST"
  | "WFH_APPROVED"
  | "WFH_REJECTED"
  | "TASK_ASSIGNED"
  | "TASK_STATUS_CHANGED"
  | "TASK_OVERDUE"
  | "TASK_DELETED"
  | "OVERTIME_STARTED"
  | "OVERTIME_SUBMITTED";

export interface INotification extends Document {
  recipient_id: mongoose.Types.ObjectId;
  type: NotificationType;
  title: string;
  message: string;
  link: string;
  is_read: boolean;
  related_id?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const NotificationSchema = new Schema<INotification>(
  {
    recipient_id: { type: Schema.Types.ObjectId, ref: "User", required: true },
    type: {
      type: String,
      enum: [
        "LEAVE_REQUEST",
        "LEAVE_APPROVED",
        "LEAVE_REJECTED",
        "WFH_REQUEST",
        "WFH_APPROVED",
        "WFH_REJECTED",
        "TASK_ASSIGNED",
        "TASK_STATUS_CHANGED",
        "TASK_OVERDUE",
        "TASK_DELETED",
        "OVERTIME_STARTED",
        "OVERTIME_SUBMITTED"
      ],
      required: true,
    },
    title: { type: String, required: true },
    message: { type: String, required: true },
    link: { type: String, required: true },
    is_read: { type: Boolean, default: false },
    related_id: { type: Schema.Types.ObjectId, required: false },
  },
  { timestamps: true }
);

NotificationSchema.index({ recipient_id: 1, is_read: 1, createdAt: -1 });

export const Notification: Model<INotification> =
  mongoose.models.Notification ||
  mongoose.model<INotification>("Notification", NotificationSchema);
