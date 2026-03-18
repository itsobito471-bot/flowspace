import mongoose, { Document, Model, Schema } from "mongoose";

export interface IMessage extends Document {
  sender_id: mongoose.Types.ObjectId;
  /** null for group/space messages */
  receiver_id: mongoose.Types.ObjectId | null;
  /** null for private 1-on-1 messages */
  space_id: mongoose.Types.ObjectId | null;
  content: string;
  timestamp: Date;
  createdAt: Date;
  updatedAt: Date;
}

const MessageSchema = new Schema<IMessage>(
  {
    sender_id: { type: Schema.Types.ObjectId, ref: "User", required: true },
    // Private chat: receiver_id is set, space_id is null
    receiver_id: { type: Schema.Types.ObjectId, ref: "User", default: null },
    // Group chat: space_id is set, receiver_id is null
    space_id: { type: Schema.Types.ObjectId, ref: "Space", default: null },
    content: { type: String, required: true },
    timestamp: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

// Efficient queries for private chat history between two users
MessageSchema.index({ sender_id: 1, receiver_id: 1, timestamp: -1 });
// Efficient queries for all messages in a space
MessageSchema.index({ space_id: 1, timestamp: -1 });

export const Message: Model<IMessage> =
  mongoose.models.Message ||
  mongoose.model<IMessage>("Message", MessageSchema);

