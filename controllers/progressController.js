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
        watchedEpisodes: [], // 🔥 ensure exists
      });
    } else {
      if (title) doc.title = title;
      if (poster) doc.poster = poster;
      if (!Array.isArray(doc.watchedEpisodes)) {
        doc.watchedEpisodes = []; // 🔥 backward safety
      }
    }

    // ===== EXISTING SEASON LOGIC (UNCHANGED) =====
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

    // ===== 🔥 NEW: WATCHED TIMELINE (ADDITIVE) =====
    const alreadyLogged = doc.watchedEpisodes.some(
      (e) => e.episode === epNum && e.season === seasonNum
    );

    if (!alreadyWatched && !alreadyLogged) {
      doc.watchedEpisodes.push({
        season: seasonNum,
        episode: epNum,
        watchedAt: new Date(),
      });
    }

    // ===== recompute lastWatched (UNCHANGED) =====
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

    // ===== CACHE INVALIDATION (UNCHANGED) =====
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
        watchedEpisodes: [],
      });
    }

    // ===== EXISTING LOGIC =====
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

    // ===== 🔥 NEW: LOG EACH EPISODE =====
    for (let ep = 1; ep <= total; ep++) {
      const exists = doc.watchedEpisodes.some(
        (e) => e.season === seasonNum && e.episode === ep
      );
      if (!exists) {
        doc.watchedEpisodes.push({
          season: seasonNum,
          episode: ep,
          watchedAt: new Date(),
        });
      }
    }

    // recompute lastWatched
    doc.lastWatched = { season: seasonNum, episode: total };

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
 * (UNCHANGED)
 */
export const getTvProgress = async (req, res) => {
  try {
    const userId = req.user.id;
    const { tmdbId } = req.params;

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
