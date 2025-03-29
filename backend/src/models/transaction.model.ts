import mongoose, { Schema, Document } from "mongoose";

export interface ITransaction {
    user: mongoose.Types.ObjectId;
    amount: number;
    currency: string;
    country: string;
    recipient: {
        name: string;
        account: string;
    };
    status: "pending" | "approved" | "flagged" | "rejected";
    createdAt: Date;
    suspicionReasons: string;
    suspicious: boolean;
}

export interface ITransactionDocument extends ITransaction, Document {}

const TransactionSchema = new Schema<ITransactionDocument>({
    user: { type: Schema.Types.ObjectId, ref: "User", required: true },
    amount: { type: Number, required: true },
    currency: { type: String, required: true },
    country: { type: String, required: true },
    recipient: {
        name: { type: String, required: true },
        account: { type: String, required: true },
    },
    status: { type: String, enum: ["pending", "approved", "flagged", "rejected"], default: "pending" },
    suspicionReasons: { type: String, default: "" },
    suspicious: { type: Boolean, default: false },
    createdAt: { type: Date, default: Date.now },
});

export const Transaction = mongoose.model<ITransactionDocument>("Transaction", TransactionSchema);  