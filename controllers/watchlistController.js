import Watchlist from "../models/Watchlist.js";
import TvProgress from "../models/TvProgress.js";
import { getCache, setCache, delCache } from "../utils/cache.js";

/* =====================================================
   ADD TO WATCHLIST
===================================================== */
export const addToWatchlist = async (req, res) => {
  try {
    const { tmdbId, mediaType, title, poster, backdrop } = req.body;
    const userId = req.user.id;

    const item = new Watchlist({
      userId,
      tmdbId: Number(tmdbId),
      mediaType,
      title,
      poster,
      backdrop,
      completed: false,
    });

    await item.save();

    // 🔥 invalidate caches
    delCache(`watchlist:${userId}`);
    delCache(`profileStats:${userId}`);

    return res.status(201).json({
      message: "Added to watchlist",
      item,
    });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(200).json({ message: "Already in watchlist" });
    }

    console.error("Add watchlist error:", err);
    return res.status(500).json({ message: "Failed to add to watchlist" });
  }
};

/* =====================================================
   REMOVE FROM WATCHLIST
===================================================== */
export const removeFromWatchlist = async (req, res) => {
  try {
    const userId = req.user.id;
    const { tmdbId, mediaType } = req.params;

    const deleted = await Watchlist.findOneAndDelete({
      userId,
      tmdbId: Number(tmdbId),
      mediaType,
    });

    if (!deleted) {
      return res.status(404).json({ message: "Not found in watchlist" });
    }

    // Remove TV progress if exists
    await TvProgress.deleteOne({
      userId,
      tmdbId: Number(tmdbId),
    });

    // 🔥 invalidate caches
    delCache(`watchlist:${userId}`);
    delCache(`profileStats:${userId}`);
    delCache(`tvProgress:${userId}:${tmdbId}`);

    return res.json({ message: "Removed from watchlist" });
  } catch (err) {
    console.error("Remove watchlist error:", err);
    return res.status(500).json({ message: "Failed to remove" });
  }
};

/* =====================================================
   GET WATCHLIST (WATCHLIST / CONTINUE / COMPLETED)
===================================================== */
export const getWatchlist = async (req, res) => {
  try {
    const userId = req.user.id;
    const cacheKey = `watchlist:${userId}`;

    // ✅ cache hit
    const cached = getCache(cacheKey);
    if (cached) {
      return res.json(cached);
    }

    // ❌ cache miss → DB
    const list = await Watchlist.find({ userId })
      .sort({ addedAt: -1 })
      .lean();

    const tvIds = list
      .filter((i) => i.mediaType === "tv")
      .map((i) => i.tmdbId);

    const progressDocs = await TvProgress.find({
      userId,
      tmdbId: { $in: tvIds },
    }).lean();

    const progressMap = {};
    progressDocs.forEach((p) => {
      progressMap[p.tmdbId] = p;
    });

    const items = list.map((item) => {
      let status = "watchlist";
      let completed = false;
      let progress = null;

      /* ================= TV ================= */
      if (item.mediaType === "tv") {
        progress = progressMap[item.tmdbId] || null;

        if (progress?.seasons?.length) {
          const isCompleted = progress.seasons.every(
            (s) =>
              s.totalEpisodes > 0 &&
              s.watchedEpisodes.length === s.totalEpisodes
          );

          if (isCompleted) {
            status = "completed";
            completed = true;
          } else if (progress.lastWatched?.episode > 0) {
            status = "continue";
          }
        }
      }

      /* ================= MOVIE ================= */
      if (item.mediaType === "movie" && item.completed === true) {
        status = "completed";
        completed = true;
      }

      return {
        ...item,
        progress,
        status,     // watchlist | continue | completed
        completed,  // boolean
      };
    });

    const response = { items };

    // ✅ store cache
    setCache(cacheKey, response);

    return res.json(response);
  } catch (err) {
    console.error("Get watchlist error:", err);
    return res.status(500).json({ message: "Failed to fetch watchlist" });
  }
};

/* =====================================================
   MARK MOVIE AS COMPLETED (MANUAL)
===================================================== */
export const markAsCompleted = async (req, res) => {
  try {
    const userId = req.user.id;
    const { tmdbId, mediaType } = req.params;

    // ❗ movies only
    if (mediaType !== "movie") {
      return res
        .status(400)
        .json({ message: "Only movies can be manually completed" });
    }

    const item = await Watchlist.findOneAndUpdate(
      { userId, tmdbId: Number(tmdbId), mediaType },
      { completed: true },
      { new: true }
    );

    if (!item) {
      return res.status(404).json({ message: "Item not found in watchlist" });
    }

    // 🔥 invalidate caches
    delCache(`watchlist:${userId}`);
    delCache(`profileStats:${userId}`);

    return res.json({
      message: "Marked as completed",
      item,
    });
  } catch (err) {
    console.error("Mark completed error:", err);
    return res.status(500).json({ message: "Failed to mark completed" });
  }
};
