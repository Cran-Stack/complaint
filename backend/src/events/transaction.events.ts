import eventEmitter from '../config/events.config';
import { ITransactionDocument } from '../models/transaction.model';
import { checkSuspiciousTransactionsAsync } from '../services/transaction.service';

const tag = "[transaction.events.ts]]"

eventEmitter.on("checkTransactionAsync", async (transaction:ITransactionDocument) => {
    console.log(`${tag} Checking Transaction Asynchronously. Transaction ID: ${transaction._id}`)
    await checkSuspiciousTransactionsAsync(transaction)
})