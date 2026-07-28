import mongoose, { Schema, Document, Model } from "mongoose";

export interface IFocusSession extends Document {
  userId: string;
  mission: string;
  type: "focus" | "break";
  duration: number; // in seconds
  startedAt: Date;
  endedAt: Date;
  completed: boolean;
  distractions: number; // count of distractions (pauses + incomplete sessions)
  focusScore?: number;
  pauseCount?: number;
  distractionCount?: number;
  achievementIds?: string[];
  environment?: string;
  volume?: number;
  deviceType?: string;
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
    focusScore: { type: Number, default: 0 },
    pauseCount: { type: Number, default: 0 },
    distractionCount: { type: Number, default: 0 },
    achievementIds: { type: [String], default: [] },
    environment: { type: String, default: "None" },
    volume: { type: Number, default: 0.5 },
    deviceType: { type: String, default: "Desktop" },
  },
  {
    timestamps: true,
  }
);

const FocusSession: Model<IFocusSession> =
  mongoose.models?.FocusSession || mongoose.model<IFocusSession>("FocusSession", FocusSessionSchema);

export default FocusSession;
