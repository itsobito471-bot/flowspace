import mongoose, { Document, Model, Schema } from "mongoose";

export interface ISpace extends Document {
  name: string;
  description: string;
  members: mongoose.Types.ObjectId[];
  organization_id: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const SpaceSchema = new Schema<ISpace>(
  {
    name: { type: String, required: true },
    description: { type: String, default: "" },
    organization_id: { type: Schema.Types.ObjectId, ref: "Organization", required: true },
    /**
     * members is an array of User references.
     * Both tasks and group messages hang off a space_id.
     */
    members: [{ type: Schema.Types.ObjectId, ref: "User" }],
  },
  { timestamps: true }
);

export const Space: Model<ISpace> =
  mongoose.models.Space ||
  mongoose.model<ISpace>("Space", SpaceSchema);
