import mongoose, { Schema, Document, Model } from "mongoose";

export interface ITask extends Document {
  userId: string;
  title: string;
  category: "DUEL" | "SYSTEM" | "REFLECT" | "BATTLE";
  completed: boolean;
  displayOrder: number;
  createdAt: Date;
  updatedAt: Date;
}

const TaskSchema = new Schema<ITask>(
  {
    userId: { type: String, required: true, index: true },
    title: { type: String, required: true },
    category: {
      type: String,
      enum: ["DUEL", "SYSTEM", "REFLECT", "BATTLE"],
      default: "BATTLE",
    },
    completed: { type: Boolean, default: false },
    displayOrder: { type: Number, default: 0 },
  },
  {
    timestamps: true,
  }
);

// Compound index for user mapping and ordering
TaskSchema.index({ userId: 1, displayOrder: 1 });

const Task: Model<ITask> =
  mongoose.models?.Task || mongoose.model<ITask>("Task", TaskSchema);

export default Task;
