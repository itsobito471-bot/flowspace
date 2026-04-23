import mongoose, { Document, Model, Schema } from "mongoose";

export interface IUser extends Document {
  name: string;
  email: string;
  avatar?: string;
  employee_id?: string;
  date_of_joining?: Date;
  passwordHash: string;
  role_id: mongoose.Types.ObjectId;
  earned_flex_leaves: number;
  earned_comp_offs: number;
  is_active: boolean;
  leave_balances: {
    leave_type_id: mongoose.Types.ObjectId;
    total_allowance: number;
    consumed: number;
  }[];
  organization_id?: mongoose.Types.ObjectId | null;
  user_type: "SUPER_ADMIN" | "ORG_USER";
  work_model: "OFFICE" | "REMOTE" | "HYBRID";
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    avatar: { type: String, required: false },
    employee_id: { type: String, required: false },
    date_of_joining: { type: Date, required: false },
    passwordHash: { type: String, required: true },
    role_id: { type: Schema.Types.ObjectId, ref: "Role", required: false },
    earned_flex_leaves: { type: Number, default: 0 },
    earned_comp_offs: { type: Number, default: 0 },
    is_active: { type: Boolean, default: true },
    leave_balances: {
      type: [
        {
          leave_type_id: { type: Schema.Types.ObjectId, required: true },
          total_allowance: { type: Number, required: true },
          consumed: { type: Number, default: 0 },
        }
      ],
      default: []
    },
    organization_id: { type: Schema.Types.ObjectId, ref: "Organization", default: null },
    user_type: {
      type: String,
      enum: ["SUPER_ADMIN", "ORG_USER"],
      default: "ORG_USER",
    },
    work_model: {
      type: String,
      enum: ["OFFICE", "REMOTE", "HYBRID"],
      default: "OFFICE",
    },
  },
  { timestamps: true }
);

if (mongoose.models.User) {
  delete mongoose.models.User;
}
export const User: Model<IUser> = mongoose.model<IUser>("User", UserSchema);

