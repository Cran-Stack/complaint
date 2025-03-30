import express from "express"
import { checkTransaction, getTransactions, getSingleTransaction, getTransactionStats } from "../controllers/transaction.controller";

const transactionRouter = express.Router()

transactionRouter.post("/screen", checkTransaction)
transactionRouter.get("/", getTransactions)
transactionRouter.get("/stats", getTransactionStats)
transactionRouter.get("/:id", getSingleTransaction)

export default transactionRouter