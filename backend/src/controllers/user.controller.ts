import { Request, Response } from "express";
import { User } from "../models/user.model";
import { logger } from "../config/logger.config";
import { sendResponse } from "../utils/api-response.utils";
import Joi from "joi";
import { isValidObjectId } from "mongoose";

export async function getUsers(req: Request, res: Response) {
    const tag = `[user.controller.ts][getUsers]`;

    logger.info(`${tag} attempting to get all users ...`);
    try {
        const page: number = parseInt(req.query.page as string) || 1;
        const limit: number = parseInt(req.query.limit as string) || 10;

        logger.info(`${tag} Parsing page: ${page}, perPage: ${limit}`);
        if (isNaN(page) || page < 1) {
            logger.warn(`${tag} Invalid page number: ${page}. Defaulting to page 1.`);
        }

        logger.info(`${tag} Executing database query to fetch users`);
        const users = await User.find()
            .sort({ createdAt: -1 })
            .skip((page - 1) * limit)
            .limit(limit)
            .lean();

        const totalUsers = await User.countDocuments();
        logger.info(`${tag} Total users count: ${totalUsers}`);

        const message = "Users list fetched successfully";
        const totalPages = Math.ceil(totalUsers / limit);

        const data = {
            users,
            totalUsers,
            totalPages,
            currentPage: page,
        };

        logger.info(`${tag} fetched all users successfully ...`);
        sendResponse(res, {
            message: "Successfully fetched all users",
            status: "success",
            data
        }, 200);
    } catch (error: any) {
        logger.error(`${tag} Error: ${error.message}`);
        sendResponse(res, {
            status: "error",
            message: "An error occurred while fetching the users list."
        }, 500);
    }
}

export async function getSingleUser(req: Request, res: Response) {
    const tag = `[user.controller.ts][getSingleUser]`;
    const userId = req.params.id;

    try {
        logger.info(`${tag} Received user ID: ${userId}`);

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

        logger.info(`${tag} Fetching user with ID: ${userId}`);

        const user = await User.findById(userId).lean();

        if (!user) {
            sendResponse(res, {
                status: "error",
                message: "User not found."
            }, 404);
            return;
        }

        logger.info(`${tag} User retrieved successfully.`);
        sendResponse(res, {
            status: "success",
            message: "User retrieved successfully.",
            data: user
        }, 200);
    } catch (error: any) {
        logger.error(`${tag} Error: ${error.message}`);
        sendResponse(res, {
            status: "error",
            message: "An error occurred while retrieving the user."
        }, 500);
    }
}