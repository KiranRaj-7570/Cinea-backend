import express from "express";
import { verifyToken } from "../middleware/authMiddleware.js";
import {
  getNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  clearAllNotifications,
} from "../controllers/notificationController.js";

const router = express.Router();

router.use(verifyToken);

router.get("/", getNotifications);
router.get("/count/unread", getUnreadCount);
router.patch("/:notificationId/read", markAsRead);
router.patch("/read-all", verifyToken, markAllAsRead);
router.delete("/:notificationId", deleteNotification);
router.delete("/", clearAllNotifications);

export default router;
