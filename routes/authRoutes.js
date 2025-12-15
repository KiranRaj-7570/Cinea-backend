import express from "express";
import { verifyToken } from "../middleware/authMiddleware.js";
import {
  signup,
  login,
  getMe,
  updateProfile,
  logout,
  uploadAvatar,
  removeAvatar,
  forgotPassword,
  verifyOtp,
  resetPassword,
  followOrUnfollowUser,
} from "../controllers/authController.js";
import { upload } from "../config/cloudinary.js";

const router = express.Router();

router.post("/signup", signup);
router.post("/login", login);
router.get("/me", verifyToken, getMe);
router.patch("/me", verifyToken, updateProfile);
router.post("/upload-avatar", verifyToken, upload.single("avatar"), uploadAvatar);
router.delete("/remove-avatar", verifyToken, removeAvatar);
router.post("/forgot-password", forgotPassword);
router.post("/verify-otp", verifyOtp);
router.post("/reset-password", resetPassword);
router.post("/:id/follow", verifyToken, followOrUnfollowUser);
router.post("/logout", verifyToken, logout);

export default router;