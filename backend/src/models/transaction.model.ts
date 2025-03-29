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
    callbackUrl: string;
    extrId: string;
    ofac: {
        score: number;
        match?: boolean;
        similarity?: string;
    },
    businessRulesChecks: {
        suspicionReasons: string;
        suspicious?: boolean;
    },
    asyncReport: {
        score: number;
        match?: boolean;
        similarity?: string;
        notes?: string;
    }
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
    createdAt: { type: Date, default: Date.now },
    callbackUrl: { type: String, required: true },
    extrId: { type: String, required: true, unique: true },
    ofac: {
        score: { type: Number, default: 0 },
        match: { type: Boolean, default: false },
        similarity: { type: String, default: null },
    },
    businessRulesChecks: {
        suspicionReasons: { type: String, default: null },
        suspicious: { type: Boolean, default: false },
    },
    asyncReport: {
        score: { type: Number, default: 0 },
        match: { type: Boolean, default: false },
        similarity: { type: String, default: null },
        notes: { type: String, default: null },
    }
});

export const Transaction = mongoose.model<ITransactionDocument>("Transaction", TransactionSchema);  