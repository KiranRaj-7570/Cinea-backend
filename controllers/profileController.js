import Review from "../models/Review.js";
import TvProgress from "../models/TvProgress.js";

export const getProfileStats = async (req, res) => {
  try {
    const userId = req.user.id;

    /* ===================== REVIEWS ===================== */
    const reviews = await Review.find({ userId }).lean();

    /* ---------- BEST & WORST (rating stable) ---------- */
    let best = null;
    let worst = null;

    if (reviews.length > 0) {
      best = reviews.reduce((a, b) => (b.rating > a.rating ? b : a));
      worst = reviews.reduce((a, b) => (b.rating < a.rating ? b : a));
    }

    /* ---------- TOP 5 (rating DESC + recency DESC) ---------- */
    const topFive = await Review.find({ userId })
      .sort({ rating: -1, createdAt: -1 })
      .limit(5)
      .select("title rating poster mediaType tmdbId")
      .lean();

    /* ---------- RECENT REVIEWS ---------- */
    const recentReviews = await Review.find({ userId })
      .sort({ createdAt: -1 })
      .limit(3)
      .lean();

    /* ===================== GENRE DONUT ===================== */
    /**
     * IMPORTANT:
     * Your Review schema DOES NOT store genres.
     * So we DO NOT aggregate genres here.
     * We send source data and let frontend (TMDB) handle it.
     */
    const genresSource = reviews.map(r => ({
      tmdbId: r.tmdbId,
      mediaType: r.mediaType,
    }));

    /* ===================== WATCH TIME ===================== */
    const tvDocs = await TvProgress.find({ userId }).lean();

    /**
     * Each watched episode = 1 unit
     * Group by DATE (not updatedAt)
     */
    const watchTimeMap = {};

    tvDocs.forEach(doc => {
      doc.seasons.forEach(season => {
        season.watchedEpisodes.forEach(() => {
          const day = new Date(doc.createdAt).toISOString().slice(0, 10);
          watchTimeMap[day] = (watchTimeMap[day] || 0) + 1;
        });
      });
    });

    const watchTime = Object.entries(watchTimeMap).map(
      ([date, episodes]) => ({
        date,
        episodes, // frontend converts to minutes if needed
      })
    );

    /* ===================== RESPONSE ===================== */
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
