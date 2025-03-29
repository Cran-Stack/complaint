import { Request, Response } from "express";
import { User } from "../models/user.model";
import { Transaction } from "../models/transaction.model";
import { checkSuspiciousTransactions } from "../services/transaction.service";
import OFACService from "../services/ofacService";



export async function checkTransaction(req: Request, res: Response){
    const tag = "[transaction.controller.ts][checkTransaction]";
    const numberOfLastTransactions = 5;

    try {
        const { account, name, currency, country, amount, email } = req.body;
        console.log(`${tag} Request received: ${JSON.stringify(req.body)}`);

        console.log(`${tag} Searching for user with account ${account}`);
        let user = await User.findById(account);

        if (!user) {
            console.log(`${tag} Account not found, creating user with account: ${account}`);
            const newUser = new User({
                name,
                email: email ?? "",
                currency,
                country,
            });
            await newUser.save();
            user = newUser;
            console.log(`${tag} New user created successfully: ${newUser}`);
        } else {
            console.log(`${tag} User with account found, proceeding ...`);
        }

        // Check user's last 5 transactions
        const lastTransactions = await Transaction.find({ user: user.id })
            .sort({ createdAt: -1 })
            .limit(numberOfLastTransactions)
            .lean()
            .exec();

        // Run function on last transactions
        const { suspicious, reasons } = checkSuspiciousTransactions(lastTransactions);

        // Make OFAC call (mocking for now)
        const ofacResponse = await OFACService.screenName(name)
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
            recipient: { name, account },
            status: "pending",
            syncCheck: suspicious,  // Flag transaction if suspicious
            asyncCheck: checkOfAC.score >= 90, // Example OFAC check condition
            createdAt: new Date(),
        });

        if (suspicious) {
            newTransaction.status = "flagged";
            newTransaction.suspicionReasons = reasons.join(",");
        }

        await newTransaction.save();

        console.log(`${tag} Transaction saved: ${newTransaction}`);

        res.status(200).json({
            data: newTransaction,
            status: "success",
            message: "Transaction checked and saved successfully",
        });
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



export async function test(){
    console.log("Testung")
    return 
}
