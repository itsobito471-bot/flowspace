import mongoose, { Document, Model, Schema } from "mongoose";

export interface IRole extends Document {
  title: string;
  department: string;
  level: "ADMIN" | "EMPLOYEE";
  organization_id: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const RoleSchema = new Schema<IRole>(
  {
    title: { type: String, required: true },
    department: { type: String, required: true },
    organization_id: { type: Schema.Types.ObjectId, ref: "Organization", required: true },
    level: {
      type: String,
      enum: ["ADMIN", "EMPLOYEE"],
      required: true,
      default: "EMPLOYEE"
    },
  },
  { timestamps: true }
);

export const Role: Model<IRole> = mongoose.models.Role || mongoose.model<IRole>("Role", RoleSchema);
