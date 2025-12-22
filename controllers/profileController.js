import Review from "../models/Review.js";
import TvProgress from "../models/TvProgress.js";
import Watchlist from "../models/Watchlist.js";

export const getProfileStats = async (req, res) => {
  try {
  
    const targetUserId = req.params.userId || req.user.id;
    const reviews = await Review.find({ userId: targetUserId }).lean();

    let best = null;
    let worst = null;

    if (reviews.length > 0) {
      best = reviews.reduce((a, b) => (b.rating > a.rating ? b : a));
      worst = reviews.reduce((a, b) => (b.rating < a.rating ? b : a));
    }

    const topFive = await Review.find({ userId: targetUserId })
      .sort({ rating: -1, createdAt: -1 })
      .limit(5)
      .select("title rating poster mediaType tmdbId")
      .lean();

    const recentReviews = await Review.find({ userId: targetUserId })
      .sort({ createdAt: -1 })
      .limit(3)
      .lean();

    const completedWatchlist = await Watchlist.find({
      userId: targetUserId,
      completed: true,
    })
      .select("tmdbId mediaType")
      .lean();

    const genresSource = completedWatchlist.map((item) => ({
      tmdbId: item.tmdbId,
      mediaType: item.mediaType,
    }));

    const tvDocs = await TvProgress.find({ userId: targetUserId }).lean();
    const completedMovies = await Watchlist.find({
      userId: targetUserId,
      completed: true,
      mediaType: "movie",
    }).lean();

    const watchTimeMap = {};

    tvDocs.forEach((doc) => {
      doc.watchedEpisodes?.forEach((ep) => {
        if (!ep.watchedAt) return;
        const day = new Date(ep.watchedAt).toISOString().slice(0, 10);
        watchTimeMap[day] = (watchTimeMap[day] || 0) + 0.75;
      });
    });

    completedMovies.forEach((movie) => {
      const day = new Date(movie.updatedAt).toISOString().slice(0, 10);
      watchTimeMap[day] = (watchTimeMap[day] || 0) + 2;
    });

    const watchTime = Object.entries(watchTimeMap)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, hours]) => ({
        date,
        hours: Number(hours.toFixed(2)),
      }));

    res.json({
      genresSource,
      watchTime,
      best: best ? { title: best.title, rating: best.rating } : null,
      worst: worst ? { title: worst.title, rating: worst.rating } : null,
      topFive,
      recentReviews,
    });
  } catch (err) {
    console.error("Profile stats error:", err);
    res.status(500).json({ msg: "Failed to fetch profile stats" });
  }
};
