import mongoose, { Document, Model, Schema } from "mongoose";

export interface ITask extends Document {
  space_id: mongoose.Types.ObjectId;
  title: string;
  assigned_to: mongoose.Types.ObjectId;
  status: "TODO" | "IN_PROGRESS" | "DONE";
  tracked_time: number;
  createdAt: Date;
  updatedAt: Date;
}

const TaskSchema = new Schema<ITask>(
  {
    space_id: { type: Schema.Types.ObjectId, ref: "Space", required: true },
    title: { type: String, required: true },
    assigned_to: { type: Schema.Types.ObjectId, ref: "User", required: false },
    status: {
      type: String,
      enum: ["TODO", "IN_PROGRESS", "DONE"],
      required: true,
      default: "TODO",
    },
    /** tracked_time stored in seconds for precision */
    tracked_time: { type: Number, default: 0 },
  },
  { timestamps: true }
);

TaskSchema.index({ space_id: 1, status: 1 });
TaskSchema.index({ assigned_to: 1 });

export const Task: Model<ITask> =
  mongoose.models.Task ||
  mongoose.model<ITask>("Task", TaskSchema);

