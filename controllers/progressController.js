import TvProgress from "../models/TvProgress.js";
import { delCache } from "../utils/cache.js";
export const markEpisodeWatched = async (req, res) => {
  try {
    const userId = req.user.id;
    const {
      tmdbId,
      season,
      episode,
      totalEpisodesForSeason = 0,
      title,
      poster,
    } = req.body;

    if (!tmdbId || season === undefined || episode === undefined) {
      return res
        .status(400)
        .json({ message: "tmdbId, season and episode are required" });
    }

    const seasonNum = Number(season);
    const epNum = Number(episode);

    if (
      Number.isNaN(seasonNum) ||
      Number.isNaN(epNum) ||
      seasonNum < 0 ||
      epNum < 1
    ) {
      return res
        .status(400)
        .json({ message: "Invalid season or episode number" });
    }

    const filter = { userId, tmdbId: Number(tmdbId) };
    let doc = await TvProgress.findOne(filter);

    if (!doc) {
      doc = new TvProgress({
        userId,
        tmdbId: Number(tmdbId),
        title,
        poster,
        seasons: [],
        lastWatched: { season: 0, episode: 0 },
      });
    } else {
      if (title) doc.title = title;
      if (poster) doc.poster = poster;
    }

    // Work on copy
    let seasons = Array.isArray(doc.seasons) ? [...doc.seasons] : [];

    const idx = seasons.findIndex((s) => s.seasonNumber === seasonNum);
    const existing = idx >= 0 ? { ...seasons[idx] } : null;

    const seasonObj = existing || {
      seasonNumber: seasonNum,
      totalEpisodes: Number(totalEpisodesForSeason) || 0,
      watchedEpisodes: [],
    };

    seasonObj.watchedEpisodes = Array.isArray(seasonObj.watchedEpisodes)
      ? [...seasonObj.watchedEpisodes]
      : [];

    const maxWatched = seasonObj.watchedEpisodes.length
      ? Math.max(...seasonObj.watchedEpisodes)
      : 0;

    const alreadyWatched = seasonObj.watchedEpisodes.includes(epNum);

    if (!alreadyWatched) {
      seasonObj.watchedEpisodes = Array.from(
        { length: epNum },
        (_, i) => i + 1
      );
    } else {
      if (epNum === maxWatched) {
        seasonObj.watchedEpisodes = seasonObj.watchedEpisodes.filter(
          (e) => e !== epNum
        );
      } else {
        seasonObj.watchedEpisodes = seasonObj.watchedEpisodes.filter(
          (e) => e <= epNum
        );
      }
    }

    seasonObj.watchedEpisodes = Array.from(
      new Set(seasonObj.watchedEpisodes)
    ).sort((a, b) => a - b);

    if (idx >= 0) seasons[idx] = seasonObj;
    else seasons.push(seasonObj);

    doc.seasons = seasons;
    doc.markModified("seasons");

    // recompute lastWatched
    let last = { season: 0, episode: 0 };
    for (const se of seasons) {
      if (!se.watchedEpisodes?.length) continue;
      const maxEp = Math.max(...se.watchedEpisodes);
      if (
        se.seasonNumber > last.season ||
        (se.seasonNumber === last.season && maxEp > last.episode)
      ) {
        last = { season: se.seasonNumber, episode: maxEp };
      }
    }
    doc.lastWatched = last;

    await doc.save();

    // 🔥 CACHE INVALIDATION
    delCache(`watchlist:${userId}`);
    delCache(`profileStats:${userId}`);
    delCache(`tvProgress:${userId}:${tmdbId}`);

    return res.json({ message: "Progress updated", progress: doc });
  } catch (err) {
    console.error("Mark episode error:", err);
    return res.status(500).json({ message: "Failed to update progress" });
  }
};

/**
 * PATCH /progress/tv/mark-season
 * body: { tmdbId, season, totalEpisodesForSeason, title, poster }
 *
 * Marks whole season watched: sets watchedEpisodes to 1..total
 * Rebuilds seasons array and marks modified.
 */
export const markSeasonWatched = async (req, res) => {
  try {
    const userId = req.user.id;
    const {
      tmdbId,
      season,
      totalEpisodesForSeason = 0,
      title,
      poster,
    } = req.body;

    if (
      !tmdbId ||
      season === undefined ||
      Number(totalEpisodesForSeason) <= 0
    ) {
      return res.status(400).json({
        message: "tmdbId, season and totalEpisodesForSeason required",
      });
    }

    const seasonNum = Number(season);
    const total = Number(totalEpisodesForSeason);

    if (
      Number.isNaN(seasonNum) ||
      Number.isNaN(total) ||
      seasonNum < 0 ||
      total < 1
    ) {
      return res
        .status(400)
        .json({ message: "Invalid season number or totalEpisodes" });
    }

    const filter = { userId, tmdbId: Number(tmdbId) };
    let doc = await TvProgress.findOne(filter);
    if (!doc) {
      doc = new TvProgress({
        userId,
        tmdbId: Number(tmdbId),
        title,
        poster,
        seasons: [],
        lastWatched: { season: 0, episode: 0 },
      });
    } else {
      if (title) doc.title = title;
      if (poster) doc.poster = poster;
    }

    // Rebuild seasons array and set this season to have all episodes watched
    let seasons = Array.isArray(doc.seasons) ? [...doc.seasons] : [];
    const idx = seasons.findIndex((s) => s.seasonNumber === seasonNum);

    const seasonObj = {
      seasonNumber: seasonNum,
      totalEpisodes: total,
      watchedEpisodes: Array.from({ length: total }, (_, i) => i + 1),
    };

    if (idx >= 0) seasons[idx] = seasonObj;
    else seasons.push(seasonObj);

    doc.seasons = seasons;
    doc.markModified("seasons");

    // recompute lastWatched
    let last = { season: 0, episode: 0 };
    for (const se of seasons) {
      if (!se.watchedEpisodes || se.watchedEpisodes.length === 0) continue;
      const maxEp = Math.max(...se.watchedEpisodes);
      if (
        se.seasonNumber > last.season ||
        (se.seasonNumber === last.season && maxEp > last.episode)
      ) {
        last = { season: se.seasonNumber, episode: maxEp };
      }
    }
    doc.lastWatched = last;

    await doc.save();
    delCache(`watchlist:${userId}`);
    delCache(`profileStats:${userId}`);
    delCache(`tvProgress:${userId}:${tmdbId}`);
    return res.json({ message: "Season marked watched", progress: doc });
  } catch (err) {
    console.error("Mark season error:", err);
    return res.status(500).json({ message: "Failed to mark season" });
  }
};

/**
 * GET /progress/tv/:tmdbId
 */
export const getTvProgress = async (req, res) => {
  try {
    const userId = req.user.id;
    const { tmdbId } = req.params;
    if (!tmdbId) return res.status(400).json({ message: "tmdbId required" });

    const doc = await TvProgress.findOne({
      userId,
      tmdbId: Number(tmdbId),
    }).lean();
    if (!doc) return res.json({ progress: null });

    return res.json({ progress: doc });
  } catch (err) {
    console.error("Get progress error:", err);
    return res.status(500).json({ message: "Failed to get progress" });
  }
};
