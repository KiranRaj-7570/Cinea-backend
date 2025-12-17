import express from "express";
import { getBookableMovies } from "../controllers/bookController.js";

const router = express.Router();

router.get("/movies", getBookableMovies);

export default router;
