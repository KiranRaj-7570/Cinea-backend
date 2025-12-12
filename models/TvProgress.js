import mongoose from "mongoose";

const SeasonSchema = new mongoose.Schema(
  {
    seasonNumber: { type: Number, required: true },
    totalEpisodes: { type: Number, default: 0 },
    watchedEpisodes: { type: [Number], default: [] } // store episode numbers watched for that season
  },
  { _id: false }
);

const TvProgressSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    tmdbId: { type: Number, required: true, index: true },
    title: { type: String },
    poster: { type: String },
    seasons: { type: [SeasonSchema], default: [] },
    lastWatched: {
      season: { type: Number, default: 0 },
      episode: { type: Number, default: 0 },
    },
  },
  { timestamps: true }
);


TvProgressSchema.index({ userId: 1, tmdbId: 1 }, { unique: true });

const TvProgress = mongoose.model("TvProgress", TvProgressSchema);
export default TvProgress;
