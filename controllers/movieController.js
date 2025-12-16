import {
  fetchTMDB,
  mapMovie,
  TMDB_BASE_URL,
} from "../utils/tmdb.js";
import { getCache, setCache } from "../utils/cache.js";

// 🔎 SEARCH MOVIES
export const searchMovies = async (req, res) => {
  try {
    const { query } = req.query;
    if (!query) return res.json({ results: [] });

    const cacheKey = `search_movie_${query.toLowerCase()}`;
    const cached = getCache(cacheKey);
    if (cached) return res.json({ results: cached, cached: true });

    const data = await fetchTMDB(
      `${TMDB_BASE_URL}/search/movie`,
      { query, include_adult: false }
    );

    const results = (data.results || [])
      .filter((m) => m.poster_path)
      .map(mapMovie);

    setCache(cacheKey, results, 300); // 5 min
    res.json({ results, cached: false });
  } catch (err) {
    res.status(500).json({
      msg: "Movie search failed",
      error: err.message,
    });
  }
};

// 🎬 TRENDING MOVIES
export const getTrendingMovies = async (req, res) => {
  const cacheKey = "movies_trending";

  const cached = getCache(cacheKey);
  if (cached) return res.json({ results: cached, cached: true });

  try {
    const data = await fetchTMDB(
      `${TMDB_BASE_URL}/trending/movie/week`
    );

    const results = (data.results || [])
      .filter((m) => m.poster_path)
      .map(mapMovie);

    setCache(cacheKey, results, 900); // 15 min
    res.json({ results, cached: false });
  } catch {
    res.status(500).json({ msg: "Failed to fetch trending movies" });
  }
};

// 🎬 POPULAR MOVIES
export const getPopularMovies = async (req, res) => {
  const cacheKey = "movies_popular";

  const cached = getCache(cacheKey);
  if (cached) return res.json({ results: cached, cached: true });

  try {
    const data = await fetchTMDB(
      `${TMDB_BASE_URL}/movie/popular`
    );

    const results = data.results
      .filter((m) => m.poster_path)
      .map(mapMovie);

    setCache(cacheKey, results, 3600); // 1 hr
    res.json({ results, cached: false });
  } catch {
    res.status(500).json({ msg: "Failed to fetch popular movies" });
  }
};

// 🎬 TOP RATED MOVIES
export const getTopRatedMovies = async (req, res) => {
  const cacheKey = "movies_top_rated";

  const cached = getCache(cacheKey);
  if (cached) return res.json({ results: cached, cached: true });

  try {
    const data = await fetchTMDB(
      `${TMDB_BASE_URL}/movie/top_rated`
    );

    const results = data.results
      .filter((m) => m.poster_path)
      .map(mapMovie);

    setCache(cacheKey, results, 3600); // 1 hrz 
    res.json({ results, cached: false });
  } catch {
    res.status(500).json({ msg: "Failed to fetch top-rated movies" });
  }
};

// 🎬 MOVIE DETAILS
export const getMovieDetails = async (req, res) => {
  const { id } = req.params;
  const cacheKey = `movie_details_${id}`;

  const cached = getCache(cacheKey);
  if (cached) return res.json({ ...cached, cached: true });

  try {
    const data = await fetchTMDB(
      `${TMDB_BASE_URL}/movie/${id}`,
      {
        append_to_response:
          "videos,credits,images,recommendations",
      }
    );

    setCache(cacheKey, data, 21600); // 6 hrs
    res.json({ ...data, cached: false });
  } catch (err) {
    res.status(500).json({
      msg: "Failed to fetch movie details",
      error: err.message,
    });
  }
};

// 🎬 SIMILAR MOVIES
export const getSimilarMovies = async (req, res) => {
  const { id } = req.params;
  const cacheKey = `movie_similar_${id}`;

  const cached = getCache(cacheKey);
  if (cached) return res.json({ results: cached, cached: true });

  try {
    const data = await fetchTMDB(
      `${TMDB_BASE_URL}/movie/${id}/similar`
    );

    const results = (data.results || [])
      .filter((m) => m.poster_path)
      .map(mapMovie);

    setCache(cacheKey, results, 3600);
    res.json({ results, cached: false });
  } catch {
    res.status(500).json({ msg: "Failed to fetch similar movies" });
  }
};
