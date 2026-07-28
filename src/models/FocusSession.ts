import mongoose, { Schema, Document, Model } from "mongoose";

export interface IFocusSession extends Document {
  userId: string;
  mission: string;
  type: "focus" | "break";
  duration: number; // in seconds
  startedAt: Date;
  endedAt: Date;
  completed: boolean;
  distractions: number; // count of pauses
  createdAt: Date;
  updatedAt: Date;
}

const FocusSessionSchema = new Schema<IFocusSession>(
  {
    userId: { type: String, required: true, index: true },
    mission: { type: String, required: true },
    type: { type: String, enum: ["focus", "break"], required: true },
    duration: { type: Number, required: true },
    startedAt: { type: Date, required: true },
    endedAt: { type: Date, required: true },
    completed: { type: Boolean, required: true },
    distractions: { type: Number, default: 0 },
  },
  {
    timestamps: true,
  }
);

const FocusSession: Model<IFocusSession> =
  mongoose.models?.FocusSession || mongoose.model<IFocusSession>("FocusSession", FocusSessionSchema);

export default FocusSession;
