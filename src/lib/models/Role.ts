import mongoose, { Document, Model, Schema } from "mongoose";

export interface IRole extends Document {
  title: string;
  department: string;
  level: "ADMIN" | "EMPLOYEE";
  createdAt: Date;
  updatedAt: Date;
}

const RoleSchema = new Schema<IRole>(
  {
    title: { type: String, required: true },
    department: { type: String, required: true },
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
