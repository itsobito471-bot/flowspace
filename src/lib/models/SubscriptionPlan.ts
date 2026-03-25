import mongoose, { Document, Model, Schema } from "mongoose";

export interface ISubscriptionPlan extends Document {
  name: string;
  price: number;
  max_users: number;
  features: string[];
  createdAt: Date;
  updatedAt: Date;
}

const SubscriptionPlanSchema = new Schema<ISubscriptionPlan>(
  {
    name: { type: String, required: true, trim: true }, // e.g. 'Starter', 'Pro', 'Enterprise'
    price: { type: Number, required: true, default: 0 },
    max_users: { type: Number, required: true, default: 10 },
    features: { type: [String], default: [] },
  },
  { timestamps: true }
);

export const SubscriptionPlan: Model<ISubscriptionPlan> =
  mongoose.models.SubscriptionPlan ||
  mongoose.model<ISubscriptionPlan>("SubscriptionPlan", SubscriptionPlanSchema);
