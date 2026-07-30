import mongoose, { Schema, Document, Model } from "mongoose";

export interface IHabit extends Document {
  userId: string;
  title: string;
  time?: string;
  category?: string;
  completedToday: boolean;
  streak: number;
  maxStreak: number;
  displayOrder: number;
  isDefault: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const HabitSchema = new Schema<IHabit>(
  {
    userId: { type: String, required: true, index: true },
    title: { type: String, required: true },
    time: { type: String, default: "" },
    category: { type: String, default: "Personal" },
    completedToday: { type: Boolean, default: false },
    streak: { type: Number, default: 0 },
    maxStreak: { type: Number, default: 0 },
    displayOrder: { type: Number, default: 0 },
    isDefault: { type: Boolean, default: false },
  },
  {
    timestamps: true,
  }
);

// Define index for sorting and user grouping
HabitSchema.index({ userId: 1, displayOrder: 1 });

const Habit: Model<IHabit> =
  mongoose.models?.Habit || mongoose.model<IHabit>("Habit", HabitSchema);

export default Habit;
