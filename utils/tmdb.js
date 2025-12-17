// utils/tmdb.js
import axios from "axios";

const TMDB_BASE = "https://api.themoviedb.org/3";
const API_KEY = process.env.TMDB_API_KEY;

if (!API_KEY) {
  console.error("❌ TMDB_API_KEY missing");
}

export const fetchTMDB = async (path, params = {}) => {
  const url = `${TMDB_BASE}${path}`;

  const { data } = await axios.get(url, {
    params: {
      api_key: API_KEY,
      language: "en-US",
      ...params,
    },
  });

  return data;
};

// keep this if you want, but DO NOT use it to build URLs
export const mapMovie = (item) => ({
  id: item.id,
  title: item.title,
  media_type: "movie",
  poster_path: item.poster_path,
  vote_average: item.vote_average,
  popularity: item.popularity,
  release_date: item.release_date,
});
