import mongoose from "mongoose";

const WatchlistSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    tmdbId: { type: Number, required: true },
    mediaType: { type: String, enum: ["movie", "tv"], required: true },
    title: { type: String },
    poster: { type: String },
    backdrop: { type: String },
    addedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);


WatchlistSchema.index({ userId: 1, tmdbId: 1, mediaType: 1 }, { unique: true });

const Watchlist = mongoose.model("Watchlist", WatchlistSchema);
export default Watchlist;