import Notification from "../models/Notification.js";
import User from "../models/User.js";

/* ================= GET ALL NOTIFICATIONS ================= */
export const getNotifications = async (req, res) => {
  try {
    const userId = req.user.id;

    const notifications = await Notification.find({ userId })
      .populate("fromUserId", "name avatar")
      .sort({ createdAt: -1 })
      .limit(50);

    res.json({ notifications });
  } catch (err) {
    console.error("Get notifications error:", err);
    res.status(500).json({ msg: "Failed to fetch notifications" });
  }
};

/* ================= GET UNREAD COUNT ================= */
export const getUnreadCount = async (req, res) => {
  try {
    const userId = req.user.id;

    const count = await Notification.countDocuments({
      userId,
      read: false,
    });

    res.json({ count });
  } catch (err) {
    console.error("Get unread count error:", err);
    res.status(500).json({ msg: "Failed to fetch unread count" });
  }
};

/* ================= MARK AS READ ================= */
export const markAsRead = async (req, res) => {
  try {
    const { notificationId } = req.params;
    const userId = req.user.id;

    const notification = await Notification.findOneAndUpdate(
      { _id: notificationId, userId },
      { read: true },
      { new: true }
    );

    if (!notification) {
      return res.status(404).json({ msg: "Notification not found" });
    }

    res.json({ notification });
  } catch (err) {
    console.error("Mark as read error:", err);
    res.status(500).json({ msg: "Failed to update notification" });
  }
};

export const markAllAsRead = async (req, res) => {
  try {
    const userId = req.user.id;

    const result = await Notification.updateMany(
      { userId, read: false },
      { $set: { read: true } }
    );

    console.log("Marked notifications:", result.modifiedCount);

    return res.json({ success: true });
  } catch (err) {
    console.error("Mark all read error:", err);
    return res.status(500).json({ msg: "Failed to mark all as read" });
  }
};


/* ================= DELETE NOTIFICATION ================= */
export const deleteNotification = async (req, res) => {
  try {
    const { notificationId } = req.params;
    const userId = req.user.id;

    const notification = await Notification.findOneAndDelete({
      _id: notificationId,
      userId,
    });

    if (!notification) {
      return res.status(404).json({ msg: "Notification not found" });
    }

    res.json({ msg: "Notification deleted" });
  } catch (err) {
    console.error("Delete notification error:", err);
    res.status(500).json({ msg: "Failed to delete notification" });
  }
};

/* ================= CREATE NOTIFICATION (Internal) ================= */
export const createNotification = async (userId, fromUserId, type, message, relatedData = {}) => {
  try {
    const notification = await Notification.create({
      userId,
      fromUserId,
      type,
      message,
      movieId: relatedData.movieId,
      reviewId: relatedData.reviewId,
      bookingId: relatedData.bookingId,
    });

    return notification;
  } catch (err) {
    console.error("Create notification error:", err);
  }
};

/* ================= CLEAR ALL NOTIFICATIONS ================= */
export const clearAllNotifications = async (req, res) => {
  try {
    const userId = req.user.id;

    await Notification.deleteMany({ userId });

    res.json({ msg: "All notifications cleared" });
  } catch (err) {
    console.error("Clear notifications error:", err);
    res.status(500).json({ msg: "Failed to clear notifications" });
  }
};
