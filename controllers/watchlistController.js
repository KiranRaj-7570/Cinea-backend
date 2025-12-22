import Watchlist from "../models/Watchlist.js";
import TvProgress from "../models/TvProgress.js";
import { getCache, setCache, delCache } from "../utils/cache.js";

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

    delCache(`watchlist:${userId}`);
    delCache(`profileStats:${userId}`);
    delCache(`watchlist_ids_${userId}`);
    delCache(`home_activity_${userId}`);

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

    await TvProgress.deleteOne({
      userId,
      tmdbId: Number(tmdbId),
    });

    delCache(`watchlist:${userId}`);
    delCache(`profileStats:${userId}`);
    delCache(`tvProgress:${userId}:${tmdbId}`);
    delCache(`watchlist_ids_${userId}`);
    delCache(`home_activity_${userId}`);

    return res.json({ message: "Removed from watchlist" });
  } catch (err) {
    console.error("Remove watchlist error:", err);
    return res.status(500).json({ message: "Failed to remove" });
  }
};

export const getWatchlist = async (req, res) => {
  try {
    const userId = req.user.id;
    const cacheKey = `watchlist:${userId}`;
    const cached = getCache(cacheKey);
    if (cached) {
      return res.json(cached);
    }
    const list = await Watchlist.find({ userId }).sort({ addedAt: -1 }).lean();

    const tvIds = list.filter((i) => i.mediaType === "tv").map((i) => i.tmdbId);

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

      if (item.mediaType === "tv") {
        progress = progressMap[item.tmdbId] || null;

        if (item.completed === true) {
          status = "completed";
          completed = true;
        } else if (progress?.seasons?.length) {
          if (progress.lastWatched?.episode > 0) {
            status = "continue";
          }
        }
      }
      if (item.mediaType === "movie" && item.completed === true) {
        status = "completed";
        completed = true;
      }

      return {
        ...item,
        progress,
        status,
        completed,
      };
    });

    const response = { items };
    setCache(cacheKey, response);
    return res.json(response);
  } catch (err) {
    console.error("Get watchlist error:", err);
    return res.status(500).json({ message: "Failed to fetch watchlist" });
  }
};

export const markAsCompleted = async (req, res) => {
  try {
    const userId = req.user.id;
    const { tmdbId, mediaType } = req.params;

    if (mediaType === "movie") {
      const item = await Watchlist.findOneAndUpdate(
        { userId, tmdbId: Number(tmdbId), mediaType },
        { completed: true },
        { new: true }
      );

      if (!item) {
        return res.status(404).json({ message: "Item not found in watchlist" });
      }

      delCache(`watchlist:${userId}`);
      delCache(`profileStats:${userId}`);
      delCache(`watchlist_ids_${userId}`);
      delCache(`home_activity_${userId}`);

      return res.json({
        message: "Marked as completed",
        item,
      });
    }

    if (mediaType === "tv") {
      const watchlistItem = await Watchlist.findOne({
        userId,
        tmdbId: Number(tmdbId),
        mediaType: "tv",
      });

      if (!watchlistItem) {
        return res
          .status(404)
          .json({ message: "Series not found in watchlist" });
      }

      watchlistItem.completed = true;
      await watchlistItem.save();
      let progress = await TvProgress.findOne({
        userId,
        tmdbId: Number(tmdbId),
      });

      if (!progress) {    
        delCache(`watchlist:${userId}`);
        delCache(`profileStats:${userId}`);
        delCache(`watchlist_ids_${userId}`);
        delCache(`home_activity_${userId}`);
        return res.json({
          message: "Series marked as completed!",
          progress: {
            userId,
            tmdbId: Number(tmdbId),
            seasons: [],
            lastWatched: { season: 0, episode: 0 },
          },
        });
      }

      if (progress.seasons && progress.seasons.length > 0) {
        for (let season of progress.seasons) {
          if (season.totalEpisodes > 0) {
            season.watchedEpisodes = Array.from(
              { length: season.totalEpisodes },
              (_, i) => i + 1
            );
          }
        }
      
        const lastSeason = progress.seasons[progress.seasons.length - 1];
        if (lastSeason && lastSeason.totalEpisodes > 0) {
          progress.lastWatched = {
            season: lastSeason.seasonNumber,
            episode: lastSeason.totalEpisodes,
          };
        }
      }

      await progress.save();
      delCache(`watchlist:${userId}`);
      delCache(`profileStats:${userId}`);
      delCache(`tvProgress:${userId}:${tmdbId}`);
      delCache(`watchlist_ids_${userId}`);
      delCache(`home_activity_${userId}`);

      return res.json({
        message: "All episodes marked as watched!",
        progress,
      });
    }

    return res.status(400).json({ message: "Invalid media type" });
  } catch (err) {
    console.error("Mark completed error:", err);
    return res.status(500).json({ message: "Failed to mark completed" });
  }
};

export const unmarkAsCompleted = async (req, res) => {
  try {
    const userId = req.user.id;
    const { tmdbId, mediaType } = req.params;

    if (mediaType === "movie") {
      const item = await Watchlist.findOneAndUpdate(
        { userId, tmdbId: Number(tmdbId), mediaType },
        { completed: false },
        { new: true }
      );

      if (!item) {
        return res.status(404).json({ message: "Item not found in watchlist" });
      }

      delCache(`watchlist:${userId}`);
      delCache(`profileStats:${userId}`);
      delCache(`watchlist_ids_${userId}`);
      delCache(`home_activity_${userId}`);

      return res.json({
        message: "Unmarked as completed",
        item,
      });
    }

    if (mediaType === "tv") {
      const watchlistItem = await Watchlist.findOne({
        userId,
        tmdbId: Number(tmdbId),
        mediaType: "tv",
      });

      if (!watchlistItem) {
        return res
          .status(404)
          .json({ message: "Series not found in watchlist" });
      }

      watchlistItem.completed = false;
      await watchlistItem.save();

      delCache(`watchlist:${userId}`);
      delCache(`profileStats:${userId}`);
      delCache(`tvProgress:${userId}:${tmdbId}`);
      delCache(`watchlist_ids_${userId}`);
      delCache(`home_activity_${userId}`);

      return res.json({
        message: "Series unmarked as completed",
        item: watchlistItem,
      });
    }

    return res.status(400).json({ message: "Invalid media type" });
  } catch (err) {
    console.error("Unmark completed error:", err);
    return res.status(500).json({ message: "Failed to unmark completed" });
  }
};
