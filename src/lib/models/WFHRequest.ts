import mongoose, { Document, Model, Schema } from "mongoose";

export interface IWFHRequest extends Document {
  user_id: mongoose.Types.ObjectId;
  organization_id: mongoose.Types.ObjectId;
  date: Date;
  reason: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  createdAt: Date;
  updatedAt: Date;
}

const WFHRequestSchema = new Schema<IWFHRequest>(
  {
    user_id: { type: Schema.Types.ObjectId, ref: "User", required: true },
    organization_id: { type: Schema.Types.ObjectId, ref: "Organization", required: true },
    date: { type: Date, required: true },
    reason: { type: String, required: true },
    status: {
      type: String,
      enum: ["PENDING", "APPROVED", "REJECTED"],
      default: "PENDING",
      required: true,
    },
  },
  { timestamps: true }
);

WFHRequestSchema.index({ user_id: 1, date: 1 });
WFHRequestSchema.index({ organization_id: 1, status: 1 });

export const WFHRequest: Model<IWFHRequest> =
  mongoose.models.WFHRequest ||
  mongoose.model<IWFHRequest>("WFHRequest", WFHRequestSchema);
