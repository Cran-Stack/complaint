import { Request, Response } from "express";
import { User } from "../models/user.model";
import { ITransaction, ITransactionDocument, Transaction } from "../models/transaction.model";
import { checkSuspiciousTransactions } from "../services/transaction.service";
import Joi from "joi";
import { sendResponse } from "../utils/api-response.utils";

export async function checkTransaction(req: Request, res: Response) {
    const tag = "[transaction.controller.ts][checkTransaction]";

    try {
        console.log(`${tag} Request received: ${JSON.stringify(req.body)}`);
        const schema = Joi.object({
            account: Joi.string().required(),
            name: Joi.string().min(3).max(100).required(),
            currency: Joi.string().length(3).uppercase().required(),
            country: Joi.string().length(2).uppercase().required(),
            amount: Joi.number().positive().precision(2).required(),
            callbackUrl: Joi.string().required(),
            extrId: Joi.string().required(),
        });

        const { error, value } = schema.validate(req.body);
        if (error) {
            console.error(`${tag} Invalid request body: ${error.details[0].message}`);
            sendResponse(res, { status: "error", message: error.details[0].message, data: null });
            return
        }

        const { account, name, currency, country, amount, callbackUrl, extrId } = value;

        // check if extrId is unique
        const existingTransaction = await Transaction.findOne({ extrId });
        if (existingTransaction) {
            console.error(`${tag} ExtrId already exists: ${extrId}`);
            sendResponse(res, { status: "error", message: "ExtrId already exists", data: null });
            return;
        }


        console.log(`${tag} Searching for user with account ${account}`);
        let user = await User.findOne({ account });

        if (!user) {
            console.log(`${tag} Account not found, creating user with account: ${account}`);
            const newUser = new User({
                name,
                currency,
                country,
                account
            });
            await newUser.save();
            user = newUser;
            console.log(`${tag} New user created successfully: ${newUser}`);
        } else {
            console.log(`${tag} User with account found, proceeding ...`);
        }

        // Run function on last transactions
        const { suspicious, reasons } = await checkSuspiciousTransactions(value, user);

        // Make OFAC call (mocking for now)
        const checkOfAC = { score: 100, similarity: "Strong", flaggedName: "Kwame" };

        // Create new transaction and save suspicion status
        const newTransaction = new Transaction({
            user: user.id,
            amount,
            currency,
            country,
            recipient: { name, account },
            status: "pending",
            businessRulesChecks: { suspicious },
            ofac: {
                score: checkOfAC.score,
                match: checkOfAC.similarity === "Strong" ? true : false,
                similarity: checkOfAC.similarity,
            },
            createdAt: new Date(),
            callbackUrl,
            extrId
        });


        if (suspicious) {
            newTransaction.status = "flagged";
            newTransaction.businessRulesChecks.suspicionReasons = reasons.join(",");
        }

        await newTransaction.save();

        console.log(`${tag} Transaction saved: ${newTransaction}`);

        sendResponse(res, {
            data: newTransaction,
            status: "success",
            message: "Transaction checked and saved successfully",
        }, 200)
        return
    } catch (error) {
        console.error(`${tag} Error: ${error}`);
        res.status(500).json({
            data: null,
            status: "error",
            message: "An error occurred while checking the transaction",
        });
        return
    }
};



export async function test() {
    console.log("Testung")
    return
}
