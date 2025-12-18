import Show from "../models/Show.js";
import Theatre from "../models/Theatre.js";
import { getCache, setCache } from "../utils/cache.js";
import { fetchTMDB } from "../utils/tmdb.js";

export const getBookableMovies = async (req, res) => {
  try {
    const { city, date } = req.query;

    if (!city) {
      return res.status(400).json({ message: "City is required" });
    }

    const selectedDate = date || new Date().toISOString().split("T")[0];

    const cacheKey = `book_movies_${city}_${selectedDate}`;

    // ✅ 1️⃣ Serve from cache
    const cached = getCache(cacheKey);
    if (cached) {
      return res.json(cached);
    }

    // 2️⃣ Find theatres in city
    const theatres = await Theatre.find({ city });
    const theatreIds = theatres.map((t) => t._id);

    if (theatreIds.length === 0) {
      setCache(cacheKey, []);
      return res.json([]);
    }

    // 3️⃣ Find shows for date
    const shows = await Show.find({
  theatreId: { $in: theatreIds },
  date: selectedDate,
});

// ⏰ filter past shows if date is today
const now = new Date();
const isToday =
  selectedDate === new Date().toISOString().split("T")[0];

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

    // 4️⃣ Group by movieId
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

    // 5️⃣ Fetch TMDB movie details
    const movies = (
  await Promise.all(
    Object.keys(movieMap).map(async (id) => {
      try {
        const data = await fetchTMDB(`/movie/${id}`);

        if (!data || !data.poster_path) {
          return null; // ❌ ignore movies without poster
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
        return null; // ❌ ignore TMDB failures
      }
    })
  )
).filter(Boolean);
    // ✅ 6️⃣ Cache result
    setCache(cacheKey, movies);

    res.json(movies);
  } catch (err) {
    console.error("Book movies error", err);
    res.status(500).json({ message: "Failed to fetch movies" });
  }
};
