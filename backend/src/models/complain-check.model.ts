import mongoose, { Schema, Document } from "mongoose";

interface IComplianceCheck extends Document {
    transaction: mongoose.Types.ObjectId;
    checkType: "sync" | "async";
    result: "clear" | "flagged" | "high_risk";
    notes: string;
    createdAt: Date;
  }
  
  const ComplianceCheckSchema = new Schema<IComplianceCheck>({
    transaction: { type: Schema.Types.ObjectId, ref: "Transaction", required: true },
    checkType: { type: String, enum: ["sync", "async"], required: true },
    result: { type: String, enum: ["clear", "flagged", "high_risk"], required: true },
    notes: { type: String, required: true },
    createdAt: { type: Date, default: Date.now },
  });
  
  export const ComplianceCheck = mongoose.model<IComplianceCheck>("ComplianceCheck", ComplianceCheckSchema);
  