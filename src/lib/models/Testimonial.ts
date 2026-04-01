import mongoose, { Document, Model, Schema } from "mongoose";

export interface ITestimonial extends Document {
  name: string;
  role: string;
  quote: string;
  avatar: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  createdAt: Date;
  updatedAt: Date;
}

const TestimonialSchema = new Schema<ITestimonial>(
  {
    name: { type: String, required: true },
    role: { type: String, required: true },
    quote: { type: String, required: true },
    avatar: { type: String, required: true },
    status: {
      type: String,
      enum: ["PENDING", "APPROVED", "REJECTED"],
      default: "PENDING",
    },
  },
  { timestamps: true }
);

if (mongoose.models.Testimonial) {
  delete mongoose.models.Testimonial;
}

export const Testimonial: Model<ITestimonial> = mongoose.model<ITestimonial>("Testimonial", TestimonialSchema);
