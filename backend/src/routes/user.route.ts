import express from "express"
import { getUsers, getSingleUser } from "../controllers/user.controller";

const userRouter = express.Router()

userRouter.get("/", getUsers)
userRouter.get("/:id", getSingleUser)

export default userRouter