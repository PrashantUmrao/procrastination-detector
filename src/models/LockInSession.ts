import mongoose, { Schema, Document, Model } from "mongoose";

export interface IInterruptionEvent {
  timestamp: Date;
  type: "fullscreen-exit" | "visibility-hidden" | "window-blur";
  durationAway: number; // in seconds
}

export interface ILockInSession extends Document {
  userId: string;
  mission: string;
  lockDuration: number; // in seconds
  focusTime: number; // in seconds
  breakTime: number; // in seconds
  completed: boolean;
  focusScore: number;
  distractionCount: number;
  interruptionEvents: IInterruptionEvent[];
  fullscreenExits: number;
  tabSwitches: number;
  startedAt: Date;
  endedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const LockInSessionSchema = new Schema<ILockInSession>(
  {
    userId: { type: String, required: true, index: true },
    mission: { type: String, required: true },
    lockDuration: { type: Number, required: true },
    focusTime: { type: Number, required: true },
    breakTime: { type: Number, default: 0 },
    completed: { type: Boolean, required: true },
    focusScore: { type: Number, required: true },
    distractionCount: { type: Number, default: 0 },
    interruptionEvents: [
      {
        timestamp: { type: Date, required: true },
        type: { type: String, required: true },
        durationAway: { type: Number, default: 0 },
      },
    ],
    fullscreenExits: { type: Number, default: 0 },
    tabSwitches: { type: Number, default: 0 },
    startedAt: { type: Date, required: true },
    endedAt: { type: Date, required: true },
  },
  {
    timestamps: true,
  }
);

// Define compound indexes for common queries and sorting
LockInSessionSchema.index({ userId: 1, startedAt: -1 });

const LockInSession: Model<ILockInSession> =
  mongoose.models?.LockInSession || mongoose.model<ILockInSession>("LockInSession", LockInSessionSchema);

export default LockInSession;
