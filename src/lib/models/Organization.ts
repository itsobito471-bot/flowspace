import mongoose, { Document, Model, Schema } from "mongoose";

export interface IOrganization extends Document {
  name: string;
  slug: string;
  plan_id: mongoose.Types.ObjectId | null;
  
  status: "ACTIVE" | "SUSPENDED";
  max_users: number;
  createdAt: Date;
  updatedAt: Date;
}

const OrganizationSchema = new Schema<IOrganization>(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    plan_id: { type: Schema.Types.ObjectId, ref: "SubscriptionPlan", default: null },
    status: {
      type: String,
      enum: ["ACTIVE", "SUSPENDED"],
      default: "ACTIVE",
    },
    max_users: { type: Number, default: 10 },
  },
  { timestamps: true }
);

OrganizationSchema.index({ slug: 1 });
OrganizationSchema.index({ status: 1 });

export const Organization: Model<IOrganization> =
  mongoose.models.Organization ||
  mongoose.model<IOrganization>("Organization", OrganizationSchema);
