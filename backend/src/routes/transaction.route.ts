import express from "express"
import { checkTransaction } from "../controllers/transaction.controller";

const transactionRouter = express.Router()

transactionRouter.post("/screen", checkTransaction)

export default transactionRouter