import mongoose, { Document, Model, Schema } from "mongoose";

export interface IBlackPoint extends Document {
    user_id: mongoose.Types.ObjectId;
    organization_id: mongoose.Types.ObjectId; // 🔒 Tenant Isolation!
    points: number;
    reason: string;
    type: "AUTO_LATE" | "AUTO_EARLY_CHECKOUT" | "MANUAL";
    date: Date;
    is_resolved: boolean;
    createdAt: Date;
    updatedAt: Date;
}

const BlackPointSchema = new Schema<IBlackPoint>(
    {
        user_id: { type: Schema.Types.ObjectId, ref: "User", required: true },
        organization_id: { type: Schema.Types.ObjectId, ref: "Organization", required: true },
        points: { type: Number, default: 1 },
        reason: { type: String, required: true },
        type: {
            type: String,
            enum: ["AUTO_LATE", "AUTO_EARLY_CHECKOUT", "MANUAL"],
            required: true,
        },
        date: { type: Date, required: true },
        // We set this to true when they get deducted pay, so they aren't punished twice!
        is_resolved: { type: Boolean, default: false },
    },
    { timestamps: true }
);

// Fast lookup for unresolved points per user
BlackPointSchema.index({ user_id: 1, is_resolved: 1, organization_id: 1 });

export const BlackPoint: Model<IBlackPoint> =
    mongoose.models.BlackPoint ||
    mongoose.model<IBlackPoint>("BlackPoint", BlackPointSchema);