import mongoose, { Document, Model, Schema } from "mongoose";

export interface ITaskComment extends Document {
  task_id: mongoose.Types.ObjectId;
  author_id: mongoose.Types.ObjectId;
  content: string;
  parent_id?: mongoose.Types.ObjectId | null;
  mentions: mongoose.Types.ObjectId[];
  reactions: { emoji: string; users: mongoose.Types.ObjectId[] }[];
  createdAt: Date;
  updatedAt: Date;
}

const TaskCommentSchema = new Schema<ITaskComment>(
  {
    task_id: { type: Schema.Types.ObjectId, ref: "Task", required: true },
    author_id: { type: Schema.Types.ObjectId, ref: "User", required: true },
    content: { type: String, required: true },
    parent_id: { type: Schema.Types.ObjectId, ref: "TaskComment", default: null },
    mentions: [{ type: Schema.Types.ObjectId, ref: "User" }],
    reactions: [
      {
        emoji: { type: String, required: true },
        users: [{ type: Schema.Types.ObjectId, ref: "User" }],
      },
    ],
  },
  { timestamps: true }
);

TaskCommentSchema.index({ task_id: 1, createdAt: 1 });

export const TaskComment: Model<ITaskComment> =
  mongoose.models.TaskComment ||
  mongoose.model<ITaskComment>("TaskComment", TaskCommentSchema);
