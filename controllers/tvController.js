import {
  fetchTMDB,
  TMDB_BASE_URL,
} from "../utils/tmdb.js";
import { getCache, setCache } from "../utils/cache.js";

// Transform TV show → unified format
const mapShow = (item) => ({
  id: item.id,
  name: item.name,
  media_type: "tv",
  poster_path: item.poster_path,
  backdrop_path: item.backdrop_path,
  vote_average: item.vote_average,
  popularity: item.popularity,
  first_air_date: item.first_air_date,
});

// 🔎 SEARCH TV
export const searchTV = async (req, res) => {
  try {
    const { query } = req.query;
    if (!query) return res.json({ results: [] });

    const cacheKey = `search_tv_${query.toLowerCase()}`;
    const cached = getCache(cacheKey);
    if (cached) return res.json({ results: cached, cached: true });

    const data = await fetchTMDB(
      `${TMDB_BASE_URL}/search/tv`,
      { query, include_adult: false }
    );

    const results = (data.results || [])
      .filter((s) => s.poster_path)
      .map(mapShow);

    setCache(cacheKey, results, 300);
    res.json({ results, cached: false });
  } catch (err) {
    res.status(500).json({
      msg: "TV search failed",
      error: err.message,
    });
  }
};

// 📺 TRENDING TV
export const getTrendingTV = async (req, res) => {
  const cacheKey = "tv_trending";

  const cached = getCache(cacheKey);
  if (cached) return res.json({ results: cached, cached: true });

  try {
    const data = await fetchTMDB(
      `${TMDB_BASE_URL}/trending/tv/week`
    );

    const results = (data.results || [])
      .filter((s) => s.backdrop_path)
      .map(mapShow);

    setCache(cacheKey, results, 900);
    res.json({ results, cached: false });
  } catch {
    res.status(500).json({ msg: "Failed to fetch trending TV shows" });
  }
};

// 📺 POPULAR TV
export const getPopularTV = async (req, res) => {
  const cacheKey = "tv_popular";

  const cached = getCache(cacheKey);
  if (cached) return res.json({ results: cached, cached: true });

  try {
    const data = await fetchTMDB(
      `${TMDB_BASE_URL}/tv/popular`
    );

    const results = data.results
      .filter((s) => s.backdrop_path)
      .map(mapShow);

    setCache(cacheKey, results, 3600);
    res.json({ results, cached: false });
  } catch {
    res.status(500).json({ msg: "Failed to fetch popular TV shows" });
  }
};

// 📺 TOP RATED TV
export const getTopRatedTV = async (req, res) => {
  const cacheKey = "tv_top_rated";

  const cached = getCache(cacheKey);
  if (cached) return res.json({ results: cached, cached: true });

  try {
    const data = await fetchTMDB(
      `${TMDB_BASE_URL}/tv/top_rated`
    );

    const results = data.results
      .filter((s) => s.backdrop_path)
      .map(mapShow);

    setCache(cacheKey, results, 3600);
    res.json({ results, cached: false });
  } catch {
    res.status(500).json({ msg: "Failed to fetch top-rated TV shows" });
  }
};

// 📺 TV DETAILS
export const getTVDetails = async (req, res) => {
  const { id } = req.params;
  const cacheKey = `tv_details_${id}`;

  const cached = getCache(cacheKey);
  if (cached) return res.json({ ...cached, cached: true });

  try {
    const data = await fetchTMDB(
      `${TMDB_BASE_URL}/tv/${id}`,
      {
        append_to_response:
          "videos,credits,images,recommendations",
      }
    );

    setCache(cacheKey, data, 21600);
    res.json({ ...data, cached: false });
  } catch (err) {
    res.status(500).json({
      msg: "Failed to fetch TV details",
      error: err.message,
    });
  }
};

// 📺 SIMILAR TV
export const getSimilarTV = async (req, res) => {
  const { id } = req.params;
  const cacheKey = `tv_similar_${id}`;

  const cached = getCache(cacheKey);
  if (cached) return res.json({ results: cached, cached: true });

  try {
    const data = await fetchTMDB(
      `${TMDB_BASE_URL}/tv/${id}/similar`
    );

    const results = (data.results || [])
      .filter((s) => s.backdrop_path)
      .map(mapShow);

    setCache(cacheKey, results, 3600);
    res.json({ results, cached: false });
  } catch {
    res.status(500).json({ msg: "Failed to fetch similar TV shows" });
  }
};

// 📺 SEASON EPISODES
export const getSeasonEpisodes = async (req, res) => {
  const { id, seasonNumber } = req.params;
  const cacheKey = `tv_${id}_season_${seasonNumber}`;

  const cached = getCache(cacheKey);
  if (cached) return res.json({ ...cached, cached: true });

  try {
    const data = await fetchTMDB(
      `${TMDB_BASE_URL}/tv/${id}/season/${seasonNumber}`
    );

    setCache(cacheKey, data, 21600);
    res.json({ ...data, cached: false });
  } catch {
    res.status(500).json({
      msg: "Failed to fetch season episodes",
    });
  }
};
