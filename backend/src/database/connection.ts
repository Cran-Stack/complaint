import mongoose from "mongoose";
import "dotenv/config";


export const connectDB = async () => {
    try {
        if (process.env.MONGO_URI) {
            mongoose.connect(process.env.MONGO_URI)
            .then(() => {
                console.log("Connected to MongoDB successfully");
              });
            console.log("Database connection established ...")
        }else{
            console.error("MONGO_URI not found in .env file")
        }
    } catch (error) {
        console.error(error);
    }
}