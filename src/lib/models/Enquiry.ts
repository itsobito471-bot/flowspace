import mongoose, { Document, Model, Schema } from "mongoose";

export interface IEnquiry extends Document {
  full_name: string;
  email: string;
  company: string;
  team_size: string;
  message?: string;
  status: "NEW" | "CONTACTED" | "RESOLVED";
  createdAt: Date;
  updatedAt: Date;
}

const EnquirySchema = new Schema<IEnquiry>(
  {
    full_name: { type: String, required: true },
    email: { type: String, required: true },
    company: { type: String, required: true },
    team_size: { type: String, required: true },
    message: { type: String },
    status: {
      type: String,
      enum: ["NEW", "CONTACTED", "RESOLVED"],
      default: "NEW",
    },
  },
  { timestamps: true }
);

if (mongoose.models.Enquiry) {
  delete mongoose.models.Enquiry;
}

export const Enquiry: Model<IEnquiry> = mongoose.model<IEnquiry>("Enquiry", EnquirySchema);
