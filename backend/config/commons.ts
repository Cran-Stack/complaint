import dotenv from "dotenv";

dotenv.config();

export const config = {
  OFAC_API_URL: process.env.OFAC_API_URL || "",
  OFAC_API_KEY: process.env.API_KEY || "",
};