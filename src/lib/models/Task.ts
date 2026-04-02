import mongoose, { Document, Model, Schema } from "mongoose";

export interface ITask extends Document {
  space_id?: mongoose.Types.ObjectId; // made optional per ClickUp style, tasks can be space-less
  title: string;
  description?: any; // To store Editor.js JSON block data
  creator_id: mongoose.Types.ObjectId;
  assignee_ids: mongoose.Types.ObjectId[];
  parent_task_id?: mongoose.Types.ObjectId | null;
  tags: string[];
  start_date?: Date;
  due_date?: Date;
  status: string;
  priority: string;
  tracked_time: number;
  createdAt: Date;
  updatedAt: Date;
  organization_id: mongoose.Types.ObjectId;
  assigned_to?: mongoose.Types.ObjectId; // Legacy support
  board_id?: mongoose.Types.ObjectId;
  page_id?: mongoose.Types.ObjectId;
}

const TaskSchema = new Schema<ITask>(
  {
    space_id: { type: Schema.Types.ObjectId, ref: "Space", required: false },
    title: { type: String, required: true },
    description: { type: Schema.Types.Mixed, default: null },
    creator_id: { type: Schema.Types.ObjectId, ref: "User", required: true },
    assignee_ids: [{ type: Schema.Types.ObjectId, ref: "User" }],
    parent_task_id: { type: Schema.Types.ObjectId, ref: "Task", default: null },
    tags: [{ type: String }],
    start_date: { type: Date, default: null },
    due_date: { type: Date, default: null },
    organization_id: { type: Schema.Types.ObjectId, ref: "Organization", required: true },
    assigned_to: { type: Schema.Types.ObjectId, ref: "User", required: false },
    board_id: { type: Schema.Types.ObjectId, ref: "Board", required: false },
    page_id: { type: Schema.Types.ObjectId, ref: "BoardPage", required: false },
    status: {
      type: String,
      required: true,
    },
    priority: {
      type: String,
      enum: ["URGENT", "HIGH", "NORMAL", "LOW"],
      default: "NORMAL",
    },
    /** tracked_time stored in seconds for precision */
    tracked_time: { type: Number, default: 0 },
  },
  { timestamps: true }
);

TaskSchema.index({ space_id: 1, status: 1 });
TaskSchema.index({ assignee_ids: 1 });
TaskSchema.index({ parent_task_id: 1 });

export const Task: Model<ITask> =
  mongoose.models.Task ||
  mongoose.model<ITask>("Task", TaskSchema);

