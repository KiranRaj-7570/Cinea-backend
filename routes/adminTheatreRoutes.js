import express from "express";
import {
  createTheatre,
  deleteTheatre,
  getAllTheatres,
  getCities,
  updateTheatre,
} from "../controllers/adminTheatreController.js";
import { verifyToken } from "../middleware/authMiddleware.js";
import { isAdmin } from "../middleware/adminMiddleware.js";

const router = express.Router();

router.post("/theatres", verifyToken, isAdmin, createTheatre);
router.get("/theatres", verifyToken, isAdmin, getAllTheatres);
router.put("/theatres/:id", verifyToken, isAdmin, updateTheatre);
router.delete("/theatres/:id", verifyToken, isAdmin, deleteTheatre);
router.get("/cities", getCities);

export default router;
