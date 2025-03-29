import dotenv from "dotenv";

dotenv.config();

export const config = {
  OFAC_API_URL: process.env.API_BASE_URL || "",
  OFAC_API_KEY: process.env.API_KEY || "",
};