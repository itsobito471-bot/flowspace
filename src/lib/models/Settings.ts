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

  work_start_time: string;
  work_end_time: string;
  is_overtime_applicable: boolean;
  overtime_hourly_rate: number;
  organization_id: mongoose.Types.ObjectId;
  penalty_rules: {
    attendance_penalty_enabled: boolean;
    manual_penalty_enabled: boolean;
    late_grace_period_mins: number;
    early_checkout_grace_period_mins: number;
    attendance_points_for_leave_deduction: number;
    manual_points_for_leave_deduction: number;
    
    // Legacy fields for backward compatibility
    is_enabled?: boolean;
    points_for_leave_deduction?: number;
  };
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
    work_start_time: { type: String, default: "09:00" },
    work_end_time: { type: String, default: "18:00" },
    is_overtime_applicable: { type: Boolean, default: false },
    overtime_hourly_rate: { type: Number, default: 0 },
    organization_id: { type: Schema.Types.ObjectId, ref: "Organization", required: true },
    penalty_rules: {
      attendance_penalty_enabled: { type: Boolean, default: false },
      manual_penalty_enabled: { type: Boolean, default: false },
      late_grace_period_mins: { type: Number, default: 15 },
      early_checkout_grace_period_mins: { type: Number, default: 15 },
      attendance_points_for_leave_deduction: { type: Number, default: 3 },
      manual_points_for_leave_deduction: { type: Number, default: 3 },
    },
  },
  { timestamps: true }
);

export const CompanySettings: Model<ICompanySettings> =
  mongoose.models.CompanySettings ||
  mongoose.model<ICompanySettings>("CompanySettings", CompanySettingsSchema);
