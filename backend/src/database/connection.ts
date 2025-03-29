import mongoose from "mongoose";
import "dotenv/config";


export const connectDB = async () => {
    try {
        if (process.env.MONGO_URI) {
            await mongoose.connect(process.env.MONGO_URI);
            console.log("Database connection established ...")
        }
    } catch (error) {
        console.error(error);
    }
}