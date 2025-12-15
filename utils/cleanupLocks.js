import Show from "../models/Show.js";

// 🔒 lock expires after 5 minutes
const LOCK_TIMEOUT = 5 * 60 * 1000; // 5 minutes

export const cleanupExpiredLocks = async (showId) => {
  const expiry = new Date(Date.now() - LOCK_TIMEOUT);

  await Show.updateOne(
    { _id: showId },
    {
      $pull: {
        lockedSeats: { lockedAt: { $lt: expiry } },
      },
    }
  );
};
