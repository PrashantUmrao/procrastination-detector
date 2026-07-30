import mongoose, { Schema, Document, Model } from "mongoose";

export interface IFlowHistory extends Document {
  userId: string;
  startedAt: Date;
  endedAt: Date;
  duration: number; // in seconds
  sessions: number; // count of completed focus sessions completed in this flow period
  averageFocusScore: number;
  maxContinuousFlow: number; // max continuous duration in seconds
  reflection: string;
  createdAt: Date;
  updatedAt: Date;
}

const FlowHistorySchema = new Schema<IFlowHistory>(
  {
    userId: { type: String, required: true, index: true },
    startedAt: { type: Date, required: true },
    endedAt: { type: Date, required: true },
    duration: { type: Number, required: true },
    sessions: { type: Number, default: 0 },
    averageFocusScore: { type: Number, default: 0 },
    maxContinuousFlow: { type: Number, default: 0 },
    reflection: { type: String, default: "" },
  },
  {
    timestamps: true,
  }
);

// Define compound indexes for common queries and sorting
FlowHistorySchema.index({ userId: 1, startedAt: -1 });

const FlowHistory: Model<IFlowHistory> =
  mongoose.models?.FlowHistory || mongoose.model<IFlowHistory>("FlowHistory", FlowHistorySchema);

export default FlowHistory;
