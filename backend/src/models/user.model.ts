import mongoose, { Schema, Document } from "mongoose";

interface IUser extends Document {
  name: string;
  account: string;
  email?: string;
  phone?: string;
  riskScore?: number;
  createdAt: Date;
}

const UserSchema = new Schema<IUser>({
  name: { type: String, required: true },
  email: { type: String, unique: true, required: true },
  phone: { type: String, required: true },
  riskScore: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now },
});

export const User = mongoose.model<IUser>("User", UserSchema);
