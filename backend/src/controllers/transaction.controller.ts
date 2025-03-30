import { Request, Response } from "express";
import { User } from "../models/user.model";
import { Transaction } from "../models/transaction.model";
import { checkSuspiciousTransactions } from "../services/transaction.service";
import Joi from "joi";
import { sendResponse } from "../utils/api-response.utils";
import { logger } from "../config/logger.config";
import { isValidObjectId } from "mongoose";
import OFACService from "../services/ofacService";


export async function checkTransaction(req: Request, res: Response) {
    const tag = "[transaction.controller.ts][checkTransaction]";

    try {
        console.log(`${tag} Request received: ${JSON.stringify(req.body)}`);
        const schema = Joi.object({
            account: Joi.string().required(),
            name: Joi.string().min(3).max(100).required(),
            recipient_account: Joi.string().required(),
            recipient_name: Joi.string().min(3).max(100).required(),
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

        const { account, name,recipient_account,recipient_name, currency, country, amount, callbackUrl, extrId } = value;

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

        let recipient_user = await User.findOne({ account:recipient_account });

        if (!recipient_user) {
            console.log(`${tag} Account not found, creating user with account: ${account}`);
            const newUser = new User({
                name:recipient_name,
                currency,
                country,
                account:recipient_account
            });
            await newUser.save();
            recipient_user = newUser;
            console.log(`${tag} New user created successfully: ${newUser}`);
        } else {
            console.log(`${tag} User with account found, proceeding ...`);
        }

        // Run function on last transactions
        const { suspicious, reasons } = await checkSuspiciousTransactions(value, user);

        // Make OFAC call (mocking for now)
        const ofacResponse = await OFACService.screenName(name)
        console.log(`${tag} OFAC Response: ${JSON.stringify(ofacResponse)}`);

        const { matchCount = 0, score = 0, similarity = "weak" } = ofacResponse.data ?? {};

        const checkOfAC = {
            score, 
            similarity,
            flaggedName: matchCount > 0 ? name : null,
        };


        // Create new transaction and save suspicion status
        const newTransaction = new Transaction({
            user: user.id,
            amount,
            currency,
            country,
            recipient: { recipient_name, recipient_account, user: recipient_user.id },
            sender: { name, account, user: user.id },
            status: "pending",
            businessRulesChecks: { suspicious },
            ofac: {
                score: checkOfAC.score,
                match: checkOfAC.similarity === "STRONG" ? true : false,
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


export async function getTransactions(req: Request, res: Response) {

    const tag = `[transaction.controller.ts][getTransactions]`;

    logger.info(`${tag} attempting to get all transactions ...`);
    try {
        const status = req.query.status as string;
        const page: number = parseInt(req.query.page as string) || 1;
        const limit: number = parseInt(req.query.limit as string) || 10;

        let query: Record<string, any> = {};
        if (status) {
            query.status = status;
        }

        logger.info(`${tag} Parsing page: ${page}, perPage: ${limit}`);
        if (isNaN(page) || page < 1) {
            logger.warn(`${tag} Invalid page number: ${page}. Defaulting to page 1.`);
        }

        logger.info(`${tag} Executing database query to fetch transactions`);
        const transactions = await Transaction.find(query)
            .sort({ createdAt: -1 })
            .skip((page - 1) * limit)
            .limit(limit)
            .lean();

        const totalTransactions = await Transaction.countDocuments(query);
        logger.info(`${tag} Total transactions count: ${totalTransactions}`);

        const message = "Transactions list fetched successfully";
        const totalPages = Math.ceil(totalTransactions / limit);

        const data = {
            transactions,
            totalTransactions,
            totalPages,
            currentPage: page,
        };



        logger.info(`${tag} fetched all transactions successfully ...`);
        sendResponse(res, {
            message: "Successfully fetched all transactions",
            status: "success",
            data
        }, 200);

        return;
    } catch (error: any) {
        logger.error(`${tag} Error: ${error.message}`);
        const message = "An error occurred while fetching the transactions list.";
        sendResponse(res, {
            status: "error",
            message
        }, 500);
        return;
    }
}


export async function getSingleTransaction(req: Request, res: Response) {
    const tag = `[transaction.controller.ts][getSingleTransaction]`;
    const transactionId = req.params.id;

    try {
        logger.info(`${tag} Received transaction ID: ${transactionId}`);

        const schema = Joi.object({
            id: Joi.string().custom((value, helpers) => {
                if (!isValidObjectId(value)) {
                    return helpers.error("any.invalid");
                }
                return value;
            }).required()
        });

        const { error } = schema.validate(req.params);

        if (error) {
            logger.warn(`${tag} Validation error: ${error.details[0].message}`);
            sendResponse(res, {
                status: "error",
                message: error.details[0].message
            }, 400);
            return;
        }

        logger.info(`${tag} Fetching transaction with ID: ${transactionId}`);

        const transaction = await Transaction.findById(transactionId).lean();

        if (!transaction) {
            sendResponse(res, {
                status: "error",
                message: "Transaction not found."
            }, 404);
            return;
        }

        logger.info(`${tag} Transaction retrieved successfully.`);
        sendResponse(res, {
            status: "success",
            message: "Transaction retrieved successfully.",
            data: transaction
        }, 200);
        return;
    } catch (error: any) {
        logger.error(`${tag} Error: ${error.message}`);
        sendResponse(res, {
            status: "error",
            message: "An error occurred while retrieving the transaction."
        }, 500);
        return;
    }
}

export function sendCallBack(req: Request, res: Response) {
    const tag = "[transaction.controller.ts][sendCallBack]";
    try {
        const schema = Joi.object({
            transactionId: Joi.string().required(),
            callBackUrl: Joi.string().required(),
            note: Joi.string().required(),
        });

        const { error, value } = schema.validate(req.body);

        if (error) {
            console.error(`${tag} Invalid request body: ${error.details[0].message}`);
            sendResponse(res, { status: "error", message: error.details[0].message, data: null });
            return
        }

        const { transactionId, callBackUrl, note } = value;

        const transaction = Transaction.findById(transactionId);
        if (!transaction) {
            console.error(`${tag} Transaction not found: ${transactionId}`);
            sendResponse(res, { status: "error", message: "Transaction not found", data: null });
            return;
        }

        const requestBody = {
            status: "success",
            data: {
                transaction:{
                    transaction
                },
                note: note
            }
        };

        fetch(callBackUrl, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(requestBody),
          });
        return;

    } catch (error: any) {
        console.error(`${tag} Error: ${error.message}`);
        sendResponse(res, {
            status: "error",
            message: "An error occurred while updating the transaction status."
        }, 500);
        return;
    }
}


export async function test() {
    console.log("Testung")
    return
}
