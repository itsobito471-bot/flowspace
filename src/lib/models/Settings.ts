import mongoose, { Document, Model, Schema } from "mongoose";

export interface ICompanySettings extends Document {
  year: number;
  annual_leave_quota: number;
  weekend_policy: number[]; // e.g. [0, 6] for Sunday, Saturday
  specific_weekend_rules: {
    dayOfWeek: number; // e.g., 6 for Saturday
    weekNumbers: number[]; // e.g., [2, 4] for 2nd and 4th Saturday
  }[];
  createdAt: Date;
  updatedAt: Date;
}

const CompanySettingsSchema = new Schema<ICompanySettings>(
  {
    year: { type: Number, required: true, unique: true },
    annual_leave_quota: { type: Number, default: 20 },
    // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
    weekend_policy: { type: [Number], default: [0] },
    specific_weekend_rules: [
      {
        dayOfWeek: { type: Number, required: true },
        weekNumbers: { type: [Number], required: true },
      },
    ],
  },
  { timestamps: true }
);

export const CompanySettings: Model<ICompanySettings> =
  mongoose.models.CompanySettings ||
  mongoose.model<ICompanySettings>("CompanySettings", CompanySettingsSchema);
