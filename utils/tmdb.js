import axios from "axios";

const TMDB_BASE = "https://api.themoviedb.org/3";
const API_KEY = process.env.TMDB_API_KEY;

// Fetch helper
export const fetchTMDB = async (url, params = {}) => {
  const { data } = await axios.get(url, {
    params: {
      api_key: API_KEY,
      language: "en-US",
      ...params,
    },
  });
  return data;
};

// Transform movie → unified format
export const mapMovie = (item) => ({
  id: item.id,
  title: item.title,
  media_type: "movie",
  poster_path: item.poster_path,
  vote_average: item.vote_average,
  popularity: item.popularity,
  release_date: item.release_date,
});

export const TMDB_BASE_URL = TMDB_BASE;
