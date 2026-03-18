import mongoose, { Document, Model, Schema } from "mongoose";

export interface IHoliday extends Document {
  title: string;
  date: Date;
  createdAt: Date;
  updatedAt: Date;
}

const HolidaySchema = new Schema<IHoliday>(
  {
    title: { type: String, required: true },
    /**
     * date is stored normalised to midnight UTC so calendar queries are simple
     * date-equality comparisons rather than range queries.
     */
    date: { type: Date, required: true, unique: true },
  },
  { timestamps: true }
);

export const Holiday: Model<IHoliday> =
  mongoose.models.Holiday ||
  mongoose.model<IHoliday>("Holiday", HolidaySchema);
