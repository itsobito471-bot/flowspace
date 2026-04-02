import mongoose, { Document, Model, Schema } from "mongoose";

export interface IBoardPage extends Document {
  name: string;
  description?: string;
  board_id: mongoose.Types.ObjectId;
  organization_id: mongoose.Types.ObjectId;
  approval_status: "PENDING" | "APPROVED" | "REJECTED";
  requested_by?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const BoardPageSchema = new Schema<IBoardPage>(
  {
    name: { type: String, required: true },
    description: { type: String, required: false },
    board_id: { type: Schema.Types.ObjectId, ref: "Board", required: true },
    organization_id: { type: Schema.Types.ObjectId, ref: "Organization", required: true },
    approval_status: {
      type: String,
      enum: ["PENDING", "APPROVED", "REJECTED"],
      default: "APPROVED",
    },
    requested_by: { type: Schema.Types.ObjectId, ref: "User", required: false },
  },
  { timestamps: true }
);

BoardPageSchema.index({ board_id: 1, organization_id: 1 });

export const BoardPage: Model<IBoardPage> =
  mongoose.models.BoardPage || mongoose.model<IBoardPage>("BoardPage", BoardPageSchema);

