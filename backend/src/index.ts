import express, { Request, Response } from "express";
import dotenv from "dotenv";
import cors from "cors";
import { sendResponse } from "./utils/api-response.utils";
import "../src/events/index.events"
import { connectDB } from "./database/connection";
import transactionRouter from "./routes/transaction.route";
import userRouter from "./routes/user.route";

dotenv.config(); // Load environment variables

const app = express();
const prefix = "/api/v1";
const PORT = process.env.PORT || 3000;


app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors());



app.get("/", (req: Request, res: Response) => {
    res.send("Hello World!");
});

app.use(`${prefix}/transactions`, transactionRouter);
app.use(`${prefix}/users`, userRouter);

app.use(`${prefix}/test`, (request: Request, response: Response) => {
    sendResponse(response, {
        status: "success",
        message: "This is a test route",
        data: null,
    });
});



async function startServer() {
    await connectDB();

    app.listen(PORT, () => {
        console.log(`Complaint Backend is live on port ${PORT}`);
    });
}

startServer();


export default app;