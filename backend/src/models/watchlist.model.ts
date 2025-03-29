import mongoose, { Schema, Document } from "mongoose";

interface IWatchlist extends Document {
    name: string;
    nationalId: string;
    country: string;
  }
  
  const WatchlistSchema = new Schema<IWatchlist>({
    name: { type: String, required: true },
    nationalId: { type: String, required: true },
    country: { type: String, required: true },
  });
  
  export const Watchlist = mongoose.model<IWatchlist>("Watchlist", WatchlistSchema);
  