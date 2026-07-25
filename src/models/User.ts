import mongoose, { Schema, Document, Model } from "mongoose";

export interface IUser extends Document {
  clerkId: string;
  email: string;
  firstName?: string;
  lastName?: string;
  imageUrl?: string;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>(
  {
    clerkId: { type: String, required: true, unique: true, index: true },
    email: { type: String, required: true },
    firstName: { type: String, default: "" },
    lastName: { type: String, default: "" },
    imageUrl: { type: String, default: "" },
  },
  {
    timestamps: true,
  }
);

const User: Model<IUser> = mongoose.models?.User || mongoose.model<IUser>("User", UserSchema);

export default User;
