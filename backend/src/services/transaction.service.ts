import eventEmitter from "../config/events.config";
import { ITransaction, ITransactionDocument, Transaction } from "../models/transaction.model";
import { IUserDocument, User } from "../models/user.model";

interface SuspiciousTransactionCheckResult {
  suspicious: boolean;
  reasons: string[];
}

export const checkSuspiciousTransactions = async (
  transaction: ITransaction,
  user: IUserDocument
): Promise<SuspiciousTransactionCheckResult> => {
  const tag = "[transaction.services.ts][checkSuspiciousTransactions]";

  // Fraud detection codes
  const REASON_CODES = {
    RAPID_SAME_ACCOUNT: "R01",  // Multiple transactions with similar amounts in a short time
    RAPID_DIFF_ACCOUNTS: "R02", // Multiple transactions to different recipients in a short time
    HIGH_RISK_COUNTRY: "R03",   // Transaction to a high-risk country
    LARGE_TRANSACTION: "R04",   // Large transaction detected
    RAPID_SHORT_INTERVAL: "R05" // Multiple transactions within a short time
  };

  // Constants for fraud detection
  const numberOfLastTransactions = 5;
  const reasons = new Set<string>();
  const largeTransactionThreshold = 5000;
  const rapidTransactionInterval = 10 * 60 * 1000; // 10 minutes
  const uniqueRecipientsThreshold = 3;
  const unusualCountries = ["North Korea", "Iran", "Syria"];
  const similarAmountThreshold = 100;
  const similarAmountInterval = 10 * 60 * 1000; // 10 minutes

  // Fetch last `numberOfLastTransactions` for user
  const transactions = await Transaction.find({ user: user.id })
    .sort({ createdAt: -1 })
    .limit(numberOfLastTransactions)
    .lean()
    .exec();

  transactions.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());

  let lastTransactionTime: number | null = null;
  const recipientSet = new Set<string>();
  const amountTimestamps: { amount: number; timestamp: number }[] = [];

  // Check if current transaction is a large transaction
  if (transaction.amount > largeTransactionThreshold) {
    reasons.add(REASON_CODES.LARGE_TRANSACTION);
  }

  // Check if transaction is from a high-risk country
  if (unusualCountries.includes(transaction.country)) {
    reasons.add(REASON_CODES.HIGH_RISK_COUNTRY);
  }

  for (const tx of transactions) {
    // Check rapid transactions in a short interval
    if (lastTransactionTime && tx.createdAt.getTime() - lastTransactionTime < rapidTransactionInterval) {
      reasons.add(REASON_CODES.RAPID_SHORT_INTERVAL);
    }

    lastTransactionTime = tx.createdAt.getTime();
    recipientSet.add(tx.sender.account);

    // Check for similar amounts within a short time frame
    for (const record of amountTimestamps) {
      if (
        Math.abs(record.amount - tx.amount) <= similarAmountThreshold &&
        tx.createdAt.getTime() - record.timestamp < similarAmountInterval
      ) {
        reasons.add(REASON_CODES.RAPID_SAME_ACCOUNT);
        break;
      }
    }

    amountTimestamps.push({ amount: tx.amount, timestamp: tx.createdAt.getTime() });
  }

  console.log(`${tag} AmountTimestamps: ${JSON.stringify(amountTimestamps)}`);

  // Check if too many unique recipients exist in a short time
  if (recipientSet.size > uniqueRecipientsThreshold) {
    reasons.add(REASON_CODES.RAPID_DIFF_ACCOUNTS);
  }

  const reasonsArray = [...reasons];

  // Emit event to trigger async transaction checks
  eventEmitter.emit("checkTransactionAsync", transaction);

  return {
    suspicious: reasonsArray.length > 0,
    reasons: reasonsArray, // Now contains codes like ["R01", "R04"]
  };
};




// Simulated AI Agent Check (Replace with real AI integration)
const checkTransactionViaAI = async (transaction: ITransaction): Promise<"yellow" | "red" | "white"> => {
  // Mocked AI response based on random logic (replace with actual API call)
  const aiResponses: ("yellow" | "red" | "white")[] = ["yellow", "red", "white"];
  return aiResponses[Math.floor(Math.random() * aiResponses.length)];
};



export const checkSuspiciousTransactionsAsync = async (transaction: ITransactionDocument) => {
  try {
    const tag = "[transactions.service.ts][checkSuspiciousTransactionsAsync]";
    console.log(`${tag} Checking Transaction Asynchronously. Transaction ID: ${transaction._id}`);

    let updatedStatus = transaction.status;

    // Simulated AI check
    const aiResponse = await checkTransactionViaAI(transaction);

    if (aiResponse === "yellow") {
      if (transaction.status === "flagged" || transaction.status === "pending") {
        updatedStatus = "approved"; // Good transaction
      }
    } else if (aiResponse === "red") {
      updatedStatus = "rejected"; // AI deems it suspicious
    }

    // Update the transaction only if the status has changed
    if (updatedStatus !== transaction.status) {
      await Transaction.findByIdAndUpdate(transaction._id, {
        status: updatedStatus,
        asyncCheck: true,
      });

      console.log(`Transaction ${transaction._id} updated to ${updatedStatus}`);
    }


    // simulate wait for 5 seconds
    await new Promise((resolve) => setTimeout(resolve, 5000));
    console.log(`${tag} Transaction Asynchronously checked. Transaction ID: ${transaction._id}`);

  } catch (error) {
    console.error("Error checking transactions asynchronously:", error);
  }
};