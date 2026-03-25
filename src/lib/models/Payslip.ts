import mongoose, { Document, Model, Schema } from "mongoose";

export interface IPayslip extends Document {
  user_id: mongoose.Types.ObjectId;
  month: number;
  year: number;
  base_salary: number;
  additions: { title: string; amount: number }[];
  deductions: { title: string; amount: number }[];
  net_pay: number;
  organization_id: mongoose.Types.ObjectId;
  status: "DRAFT" | "PAID" | "PUBLISHED";
  createdAt: Date;
  updatedAt: Date;
}

const PayslipSchema = new Schema<IPayslip>(
  {
    user_id: { type: Schema.Types.ObjectId, ref: "User", required: true },
    month: { type: Number, required: true, min: 1, max: 12 },
    year: { type: Number, required: true },
    base_salary: { type: Number, required: true },
    organization_id: { type: Schema.Types.ObjectId, ref: "Organization", required: true },
    additions: [
      {
        title: { type: String, required: true },
        amount: { type: Number, required: true },
      },
    ],
    deductions: [
      {
        title: { type: String, required: true },
        amount: { type: Number, required: true },
      },
    ],
    net_pay: { type: Number, required: true },
    status: {
      type: String,
      enum: ["DRAFT", "PAID", "PUBLISHED"],
      default: "DRAFT",
    },
  },
  { timestamps: true }
);

PayslipSchema.index({ user_id: 1, year: -1, month: -1 });

export const Payslip: Model<IPayslip> =
  mongoose.models.Payslip || mongoose.model<IPayslip>("Payslip", PayslipSchema);
