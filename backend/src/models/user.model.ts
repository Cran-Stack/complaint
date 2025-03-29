import mongoose, { Schema, Document } from "mongoose";

interface IUser {
  name: string;
  account: string;
  phone?: string;
  riskScore?: number;
  createdAt: Date;
}

export interface IUserDocument extends IUser, Document {}

const UserSchema = new Schema<IUserDocument>({
  name: { type: String, required: true },
  account: { type: String, unique: true, required: true },
  phone: { type: String, required: false },
  riskScore: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now },
});

export const User = mongoose.model<IUserDocument>("User", UserSchema);
