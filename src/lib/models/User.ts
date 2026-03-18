import mongoose, { Document, Model, Schema } from "mongoose";

export interface IUser extends Document {
  name: string;
  email: string;
  employee_id?: string;
  date_of_joining?: Date;
  passwordHash: string;
  role_id: mongoose.Types.ObjectId;
  earned_flex_leaves: number;
  is_active: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    employee_id: { type: String, required: false },
    date_of_joining: { type: Date, required: false },
    passwordHash: { type: String, required: true },
    role_id: { type: Schema.Types.ObjectId, ref: "Role", required: false },
    earned_flex_leaves: { type: Number, default: 0 },
    is_active: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export const User: Model<IUser> = mongoose.models.User || mongoose.model<IUser>("User", UserSchema);
