import mongoose from "mongoose";

const ReplySchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    username: { type: String },
    userAvatar: { type: String },
    text: { type: String, required: true },
    createdAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const ReviewSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    username: { type: String },
    userAvatar: { type: String },
    tmdbId: { type: Number, required: true, index: true },
    mediaType: { type: String, enum: ["movie", "tv"], required: true },
    title: { type: String },
    poster: { type: String },
    rating: { type: Number, min: 1, max: 5, required: true },
    text: { type: String, required: true },
    likes: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    replies: { type: [ReplySchema], default: [] },
  },
  { timestamps: true }
);

const Review = mongoose.model("Review", ReviewSchema);
export default Review;
