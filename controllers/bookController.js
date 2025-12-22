import Show from "../models/Show.js";
import Theatre from "../models/Theatre.js";
import { getCache, setCache } from "../utils/cache.js";
import { fetchTMDB } from "../utils/tmdb.js";

export const getBookableMovies = async (req, res) => {
  try {
    const { city, date } = req.query;
    const selectedDate = date || new Date().toISOString().split("T")[0];
    const cacheKey = city
      ? `book_movies_${city}_${selectedDate}`
      : `book_movies_all_${selectedDate}`;

    const cached = getCache(cacheKey);
    if (cached) {
      return res.json(cached);
    }

    const theatres = city
      ? await Theatre.find({ city })
      : await Theatre.find({});
    const theatreIds = theatres.map((t) => t._id);

    if (theatreIds.length === 0) {
      setCache(cacheKey, []);
      return res.json([]);
    }

    const shows = await Show.find({
      theatreId: { $in: theatreIds },
      date: selectedDate,
    });

    const now = new Date();
    const isToday = selectedDate === new Date().toISOString().split("T")[0];

    const validShows = isToday
      ? shows.filter((show) => {
          const showTime = new Date(`${show.date}T${show.time}:00`);
          return showTime > now;
        })
      : shows;

    if (validShows.length === 0) {
      setCache(cacheKey, []);
      return res.json([]);
    }

    const movieMap = {};

    validShows.forEach((show) => {
      const id = show.movieId;

      if (!movieMap[id]) {
        movieMap[id] = {
          movieId: id,
          languages: new Set(),
          formats: new Set(),
        };
      }

      if (show.language) movieMap[id].languages.add(show.language);
      if (show.format) movieMap[id].formats.add(show.format);
    });

    const movies = (
      await Promise.all(
        Object.keys(movieMap).map(async (id) => {
          try {
            const data = await fetchTMDB(`/movie/${id}`);

            if (!data || !data.poster_path) {
              return null; 
            }

            return {
              movieId: Number(id),
              title: data.title,
              poster: data.poster_path,
              rating: data.vote_average,
              languages: [...movieMap[id].languages],
              formats: [...movieMap[id].formats],
            };
          } catch (err) {
            return null; 
          }
        })
      )
    ).filter(Boolean);
    setCache(cacheKey, movies);

    res.json(movies);
  } catch (err) {
    console.error("Book movies error", err);
    res.status(500).json({ message: "Failed to fetch movies" });
  }
};
