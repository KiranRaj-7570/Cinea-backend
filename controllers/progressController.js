import TvProgress from "../models/TvProgress.js";

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

    if (!tmdbId || !season || !episode) {
      return res
        .status(400)
        .json({ message: "tmdbId, season and episode are required" });
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

    const seasonNum = Number(season);
    const epNum = Number(episode);

    // Work with a fresh seasons array and replace it back (rebuild pattern)
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
      // MARK 1..epNum
      seasonObj.watchedEpisodes = Array.from({ length: epNum }, (_, i) => i + 1);
    } else {
      // UNWATCH behavior:
      if (epNum === maxWatched) {
        // remove only this episode (undo last)
        seasonObj.watchedEpisodes = seasonObj.watchedEpisodes.filter((e) => e !== epNum);
      } else {
        // clicked a lower watched episode -> keep 1..epNum
        seasonObj.watchedEpisodes = seasonObj.watchedEpisodes.filter((e) => e <= epNum);
      }
    }

    // sort & dedupe
    seasonObj.watchedEpisodes = Array.from(new Set(seasonObj.watchedEpisodes)).sort((a, b) => a - b);

    // put back into seasons array (replace or push)
    if (idx >= 0) seasons[idx] = seasonObj;
    else seasons.push(seasonObj);

    // assign and force mongoose to detect change
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
    return res.json({ message: "Progress updated", progress: doc });
  } catch (err) {
    console.error("Mark episode error:", err);
    return res.status(500).json({ message: "Failed to update progress" });
  }
};


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

    if (!tmdbId || !season || !totalEpisodesForSeason) {
      return res.status(400).json({
        message: "tmdbId, season and totalEpisodesForSeason required",
      });
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

    const s = ensureSeason(doc, Number(season), Number(totalEpisodesForSeason));
    s.watchedEpisodes = [];
    for (let e = 1; e <= Number(totalEpisodesForSeason); e++) {
      s.watchedEpisodes.push(e);
    }

    let last = { season: 0, episode: 0 };
    for (const se of doc.seasons) {
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
    return res.json({ message: "Season marked watched", progress: doc });
  } catch (err) {
    console.error("Mark season error:", err);
    return res.status(500).json({ message: "Failed to mark season" });
  }
};

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
