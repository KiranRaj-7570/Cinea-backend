import Review from "../models/Review.js";
import Watchlist from "../models/Watchlist.js";
import Booking from "../models/Booking.js";
import TvProgress from "../models/TvProgress.js";
import User from "../models/User.js";
import { fetchTMDB } from "../utils/tmdb.js";
import Show from "../models/Show.js";
import { getCache, setCache, delCache } from "../utils/cache.js";

export const getTrending = async (req, res) => {
  const cacheKey = "home_trending";

  const cached = getCache(cacheKey);
  if (cached) {
    return res.json({ items: cached, cached: true });
  }

  try {
    const data = await fetchTMDB("/trending/all/week");

    const items = data.results
      .filter((i) => i.poster_path)
      .slice(0, 10)
      .map((i) => ({
        tmdbId: i.id,
        mediaType: i.media_type,
        title: i.title || i.name,
        poster: `https://image.tmdb.org/t/p/w500${i.poster_path}`,
        rating: i.vote_average,
        overview: i.overview,
      }));

    setCache(cacheKey, items, 900); // 15 mins
    res.json({ items });
  } catch (err) {
    console.error("Trending TMDB error", err);
    res.status(500).json({ items: [] });
  }
};

export const sinceYouBooked = async (req, res) => {
  try {
    const userId = req.user.id;

    const bookings = await Booking.find({ userId })
      .sort({ createdAt: -1 })
      .limit(6)
      .lean();

    if (bookings.length === 0) {
      return res.json({ fallback: true, items: [] });
    }

    const seen = new Set();
    const items = [];

    bookings.forEach((b) => {
      if (!seen.has(b.movieId)) {
        seen.add(b.movieId);
        items.push({
          tmdbId: b.movieId,
        });
      }
    });

    res.json({ fallback: false, items });
  } catch (err) {
    console.error("Since booked error", err);
    res.status(500).json({ message: "Failed to load section" });
  }
};

export const reviewedByFriends = async (req, res) => {
  const userId = req.user.id;
  const cacheKey = `home_friends_reviews_${userId}`;

  const cached = getCache(cacheKey);
  if (cached) {
    return res.json(cached);
  }

  try {
    const me = await User.findById(userId).select("following").lean();

    if (!me?.following?.length) {
      return res.json({ fallback: true, items: [] });
    }

    const reviews = await Review.find({
      userId: { $in: me.following },
    })
      .sort({ createdAt: -1 })
      .limit(10)
      .lean();

    if (!reviews.length) {
      return res.json({ fallback: true, items: [] });
    }

    const items = reviews.map((r) => ({
      reviewId: r._id,
      tmdbId: r.tmdbId,
      mediaType: r.mediaType,
      title: r.title,
      poster: r.poster,
      rating: r.rating,
      excerpt: r.text ? r.text.slice(0, 120) : "",
      reviewer: {
        id: r.userId,
        name: r.username,
        avatar: r.userAvatar,
      },
    }));

    const payload = { fallback: false, items };
    setCache(cacheKey, payload, 300); // 5 mins

    res.json(payload);
  } catch (err) {
    console.error("Reviewed by friends error", err);
    res.status(500).json({ message: "Failed to load section" });
  }
};



export const yourActivity = async (req, res) => {
  const userId = req.user.id;
  const cacheKey = `home_activity_${userId}`;
  const cached = getCache(cacheKey);
  if (cached) {
    return res.json(cached);
  }
  try {
    const items = [];
    const tmdbIdSet = new Set(); // Track unique items

    const watchlist = await Watchlist.find({
      userId,
      completed: false,
    }).limit(8).lean();

    watchlist.forEach((w) => {
      const uniqueKey = `${w.mediaType}-${w.tmdbId}`;
      if (!tmdbIdSet.has(uniqueKey)) {
        tmdbIdSet.add(uniqueKey);
        items.push({
          type: "watchlist",
          tmdbId: w.tmdbId,
          mediaType: w.mediaType,
          title: w.title,
          poster: w.poster,
          cta: "Continue Watching",
        });
      }
    });

    // Only fetch TV progress if we still need more items
    if (items.length < 8) {
      const tvProgress = await TvProgress.find({
        userId,
        "lastWatched.season": { $gt: 0 },
      })
        .limit(8 - items.length)
        .lean();

      tvProgress.forEach((t) => {
        const uniqueKey = `tv-${t.tmdbId}`;
        if (!tmdbIdSet.has(uniqueKey)) {
          tmdbIdSet.add(uniqueKey);
          items.push({
            type: "tv-progress",
            tmdbId: t.tmdbId,
            mediaType: "tv",
            title: t.title,
            poster: t.poster,
            cta: "Complete Series",
          });
        }
      });
    }

    const payload =
      items.length === 0
        ? { fallback: true, items: [] }
        : { fallback: false, items: items.slice(0, 8) };

    setCache(cacheKey, payload, 300); // 5 mins
    res.json(payload);
  } catch (err) {
    console.error("Your activity error", err);
    res.status(500).json({ message: "Failed to load activity" });
  }
};


export const getBookedRecommendations = async (req, res) => {
  try {
    const userId = req.user.id;

    const reviewed = await Review.find({ userId })
      .select("tmdbId")
      .lean();

    const reviewedIds = new Set(reviewed.map((r) => r.tmdbId));

    const bookings = await Booking.find({
      userId,
      paymentStatus: "paid",
      bookingStatus: "active",
    })
      .sort({ createdAt: -1 })
      .lean();

    const map = new Map();

    for (const b of bookings) {
      if (!map.has(b.movieId) && !reviewedIds.has(b.movieId)) {
        map.set(b.movieId, {
          tmdbId: b.movieId,
        });
      }
    }

    const items = Array.from(map.values()).slice(0, 6);

    if (!items.length) {
      return res.json({ fallback: true, items: [] });
    }

    res.json({ fallback: false, items });
  } catch (err) {
    console.error("Booked section error:", err);
    res.status(500).json({ message: "Failed to load booked section" });
  }
};

export const getFirstCityForMovie = async (req, res) => {
  try {
    const { movieId } = req.params;

    const show = await Show.findOne({ movieId }).populate("theatreId");

    if (!show || !show.theatreId) {
      return res.status(404).json({ city: null });
    }

    res.json({ city: show.theatreId.city });
  } catch (err) {
    console.error("First city lookup error", err);
    res.status(500).json({ city: null });
  }
};


export const globalReviews = async (req, res) => {
  const cacheKey = "home_global_reviews";

  const cached = getCache(cacheKey);
  if (cached) {
    return res.json({ items: cached, cached: true });
  }

  try {
    const items = await Review.aggregate([
      {
        $group: {
          _id: {
            tmdbId: "$tmdbId",
            mediaType: "$mediaType",
            title: "$title",
            poster: "$poster",
          },
          reviewCount: { $sum: 1 },
          avgRating: { $avg: "$rating" },
        },
      },
      { $sort: { reviewCount: -1 } },
      { $limit: 10 },
      {
        $project: {
          _id: 0,
          tmdbId: "$_id.tmdbId",
          mediaType: "$_id.mediaType",
          title: "$_id.title",
          poster: "$_id.poster",
          reviewCount: 1,
          avgRating: { $round: ["$avgRating", 1] },
        },
      },
    ]);

    setCache(cacheKey, items, 600); // 10 mins
    res.json({ items });
  } catch (err) {
    console.error("Global reviews error", err);
    res.status(500).json({ items: [] });
  }
};



export const getWatchlistIds = async (req, res) => {
  const userId = req.user.id;
  const cacheKey = `watchlist_ids_${userId}`;

  const cached = getCache(cacheKey);
  if (cached) {
    return res.json({ ids: cached });
  }

  const ids = await Watchlist.find({ userId })
    .select("tmdbId -_id")
    .lean();

  const result = ids.map((i) => i.tmdbId);
  setCache(cacheKey, result, 300);

  res.json({ ids: result });
};
