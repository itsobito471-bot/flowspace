import mongoose, { Document, Model, Schema } from "mongoose";

export interface IStatus {
  name: string;
  color: string;
  order: number;
}

export interface IBoard extends Document {
  name: string;
  organization_id: mongoose.Types.ObjectId;
  creator_id: mongoose.Types.ObjectId;
  members: mongoose.Types.ObjectId[];
  statuses: IStatus[];
  createdAt: Date;
  updatedAt: Date;
}

const StatusSchema = new Schema<IStatus>({
  name: { type: String, required: true },
  color: { type: String, required: true },
  order: { type: Number, required: true },
});

const BoardSchema = new Schema<IBoard>(
  {
    name: { type: String, required: true },
    organization_id: { type: Schema.Types.ObjectId, ref: "Organization", required: true },
    creator_id: { type: Schema.Types.ObjectId, ref: "User", required: true },
    members: [{ type: Schema.Types.ObjectId, ref: "User" }],
    statuses: {
      type: [StatusSchema],
      default: [
        { name: "TODO", color: "text-muted", order: 0 },
        { name: "IN_PROGRESS", color: "text-amber-400", order: 1 },
        { name: "REVIEW", color: "text-blue-400", order: 2 },
        { name: "DONE", color: "text-emerald-400", order: 3 },
      ],
    },
  },
  { timestamps: true }
);

export const Board: Model<IBoard> =
  mongoose.models.Board || mongoose.model<IBoard>("Board", BoardSchema);
