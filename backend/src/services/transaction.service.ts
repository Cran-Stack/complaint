import { ITransaction, ITransactionDocument, Transaction } from "../models/transaction.model";
import { sendResponse } from "../utils/api-response.utils";

interface SuspiciousTransactionCheckResult {
  suspicious: boolean;
  reasons: string[];
}

export const checkSuspiciousTransactions = (
  transactions: ITransaction[]
): SuspiciousTransactionCheckResult => {
  const tag = "[transaction.services.ts][checkSuspiciousTransactions]"
  const reasons: string[] = [];
  const largeTransactionThreshold = 5000; // Example threshold
  const rapidTransactionInterval = 10 * 60 * 1000; // 10 minutes
  const uniqueRecipientsThreshold = 3;
  const unusualCountries = ["North Korea", "Iran", "Syria"];
  const similarAmountThreshold = 100; // Define a threshold for amount similarity
  const similarAmountInterval = 10 * 60 * 1000; // 10 minutes

  transactions.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());

  let lastTransactionTime: number | null = null;
  const recipientSet = new Set<string>();
  const amountTimestamps: { amount: number; timestamp: number }[] = [];

  for (const tx of transactions) {
    if (tx.amount > largeTransactionThreshold) {
      reasons.push(`Large transaction detected: $${tx.amount}`);
    }

    if (lastTransactionTime && tx.createdAt.getTime() - lastTransactionTime < rapidTransactionInterval) {
      reasons.push("Multiple transactions in a short time period.");
    }
    lastTransactionTime = tx.createdAt.getTime();

    recipientSet.add(tx.recipient.account);

    if (unusualCountries.includes(tx.country)) {
      reasons.push(`Transaction to high-risk country: ${tx.country}`);
    }

    // Check for similar amounts within a short time frame
    for (const record of amountTimestamps) {
      if (
        Math.abs(record.amount - tx.amount) <= similarAmountThreshold &&
        tx.createdAt.getTime() - record.timestamp < similarAmountInterval
      ) {
        reasons.push("Multiple transactions with similar amounts in a short time frame.");
        break;
      }
    }

    amountTimestamps.push({ amount: tx.amount, timestamp: tx.createdAt.getTime() });
  }

  console.log(`${tag} AmountTimestamps: ${amountTimestamps}`)

  if (recipientSet.size > uniqueRecipientsThreshold) {
    reasons.push("Multiple transactions to different recipients within a short time.");
  }

  // emit event to call the checkTransactionAsync method


  return {
    suspicious: reasons.length > 0,
    reasons,
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

  } catch (error) {
    console.error("Error checking transactions asynchronously:", error);
  }
};