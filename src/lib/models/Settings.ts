import mongoose, { Document, Model, Schema } from "mongoose";

export interface ICompanySettings extends Document {
  year: number;
  // annual_leave_quota: number;
  leave_types: {
    name: string;
    quota: number;
  }[];
  weekend_policy: number[]; // e.g. [0, 6] for Sunday, Saturday
  specific_weekend_rules: {
    dayOfWeek: number; // e.g., 6 for Saturday
    weekNumbers: number[]; // e.g., [2, 4] for 2nd and 4th Saturday
  }[];
  allow_multi_checkins: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const CompanySettingsSchema = new Schema<ICompanySettings>(
  {
    year: { type: Number, required: true, unique: true },
    // annual_leave_quota: { type: Number, default: 20 },
    leave_types: {
      type: [
        {
          name: { type: String, required: true }, // e.g., "Sick Leave"
          quota: { type: Number, required: true }, // e.g., 10
        }
      ],
      default: [
        { name: "Casual Leave", quota: 10 },
        { name: "Sick Leave", quota: 5 }
      ]
    },
    // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
    weekend_policy: { type: [Number], default: [0] },
    specific_weekend_rules: [
      {
        dayOfWeek: { type: Number, required: true },
        weekNumbers: { type: [Number], required: true },
      },
    ],
    allow_multi_checkins: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export const CompanySettings: Model<ICompanySettings> =
  mongoose.models.CompanySettings ||
  mongoose.model<ICompanySettings>("CompanySettings", CompanySettingsSchema);
