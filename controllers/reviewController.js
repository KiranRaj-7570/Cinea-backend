import Review from "../models/Review.js";
import User from "../models/User.js";

export const createReview = async (req, res) => {
  try {
    const userId = req.user.id;
    const { tmdbId, mediaType, rating, text, title, poster } = req.body;
    if (!tmdbId || !mediaType || !rating || !text) {
      return res
        .status(400)
        .json({ message: "tmdbId, mediaType, rating and text required" });
    }

    const user = await User.findById(userId).lean();
    const review = new Review({
      userId,
      username: user?.name || "User",
      userAvatar: user?.avatar || "",
      tmdbId: Number(tmdbId),
      mediaType,
      title,
      poster,
      rating: Number(rating),
      text,
    });

    await review.save();
    return res.status(201).json({ message: "Review created", review });
  } catch (err) {
    console.error("Create review error:", err);
    return res.status(500).json({ message: "Failed to create review" });
  }
};

export const listReviews = async (req, res) => {
  try {
    const { mediaType, tmdbId } = req.params;
    const { sort = "recent", page = 1, limit = 10 } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    let sortObj = { createdAt: -1 };
    if (sort === "top") sortObj = { rating: -1, createdAt: -1 };

    const query = { mediaType, tmdbId: Number(tmdbId) };
    const total = await Review.countDocuments(query);
    const reviews = await Review.find(query)
      .sort(sortObj)
      .skip(skip)
      .limit(Number(limit))
      .lean();

    return res.json({ total, reviews });
  } catch (err) {
    console.error("List reviews error:", err);
    return res.status(500).json({ message: "Failed to load reviews" });
  }
};

export const replyToReview = async (req, res) => {
  try {
    const userId = req.user.id;
    const { reviewId } = req.params;
    const { text } = req.body;
    if (!text) return res.status(400).json({ message: "text required" });

    const user = await User.findById(userId).lean();
    const payload = {
      userId,
      username: user?.name || "User",
      userAvatar: user?.avatar || "",
      text,
      createdAt: new Date(),
    };

    const review = await Review.findById(reviewId);
    if (!review) return res.status(404).json({ message: "Review not found" });

    review.replies.push(payload);
    await review.save();

    return res.json({ message: "Reply added", reply: payload });
  } catch (err) {
    console.error("Reply error:", err);
    return res.status(500).json({ message: "Failed to add reply" });
  }
};

export const toggleLike = async (req, res) => {
  try {
    const userId = req.user.id;
    const { reviewId } = req.params;

    const review = await Review.findById(reviewId);
    if (!review) return res.status(404).json({ message: "Review not found" });

    const idx = review.likes.findIndex((id) => id.toString() === userId);
    if (idx === -1) {
      review.likes.push(userId);
      await review.save();
      return res.json({ message: "Liked" });
    } else {
      review.likes.splice(idx, 1);
      await review.save();
      return res.json({ message: "Unliked" });
    }
  } catch (err) {
    console.error("Toggle like error:", err);
    return res.status(500).json({ message: "Failed to toggle like" });
  }
};
