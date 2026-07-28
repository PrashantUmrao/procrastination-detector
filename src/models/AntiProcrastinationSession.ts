import mongoose, { Schema, Document, Model } from "mongoose";

export interface ITimelineEvent {
  timestamp: Date;
  event: string; // e.g. "Focus Started", "Exited Fullscreen", "Returned", "Session Completed", "Tab Switched", "Window Blurred", "Timer Paused"
  elapsed: number; // in seconds
  remaining: number; // in seconds
}

export interface IAntiProcrastinationSession extends Document {
  userId: string;
  sessionId: string; // unique UUID or timestamp-based ID
  mission: string;
  focusDuration: number; // elapsed focus time in seconds
  remainingDuration: number; // remaining focus time in seconds
  distractionCount: number;
  pauseCount: number;
  fullscreenExits: number;
  tabSwitches: number;
  windowBlurEvents: number;
  interruptionTimeline: ITimelineEvent[];
  sessionStatus: "completed" | "interrupted" | "active" | "cancelled";
  focusScore: number;
  antiProcrastinationScore: number;
  startedAt: Date;
  endedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const AntiProcrastinationSessionSchema = new Schema<IAntiProcrastinationSession>(
  {
    userId: { type: String, required: true, index: true },
    sessionId: { type: String, required: true, unique: true, index: true },
    mission: { type: String, required: true },
    focusDuration: { type: Number, required: true },
    remainingDuration: { type: Number, required: true },
    distractionCount: { type: Number, default: 0 },
    pauseCount: { type: Number, default: 0 },
    fullscreenExits: { type: Number, default: 0 },
    tabSwitches: { type: Number, default: 0 },
    windowBlurEvents: { type: Number, default: 0 },
    interruptionTimeline: [
      {
        timestamp: { type: Date, required: true },
        event: { type: String, required: true },
        elapsed: { type: Number, required: true },
        remaining: { type: Number, required: true },
      },
    ],
    sessionStatus: {
      type: String,
      enum: ["completed", "interrupted", "active", "cancelled"],
      required: true,
    },
    focusScore: { type: Number, default: 0 },
    antiProcrastinationScore: { type: Number, default: 0 },
    startedAt: { type: Date, required: true },
    endedAt: { type: Date, required: true },
  },
  {
    timestamps: true,
  }
);

const AntiProcrastinationSession: Model<IAntiProcrastinationSession> =
  mongoose.models?.AntiProcrastinationSession ||
  mongoose.model<IAntiProcrastinationSession>("AntiProcrastinationSession", AntiProcrastinationSessionSchema);

export default AntiProcrastinationSession;
