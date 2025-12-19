import Review from "../models/Review.js";

/**
 * GET /admin/reviews/reported
 * Get all reported reviews
 */
export const getReportedReviews = async (req, res) => {
  try {
    const { sort = "recent", page = 1, limit = 10 } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    let sortObj = { createdAt: -1 };
    if (sort === "most-reported") {
      sortObj = {
        "reports": -1,
        createdAt: -1,
      };
    }

    // Find reviews with reports
    const query = { reports: { $exists: true, $ne: [] } };
    const total = await Review.countDocuments(query);

    const reviews = await Review.find(query)
      .sort(sortObj)
      .skip(skip)
      .limit(Number(limit))
      .populate("userId", "name avatar")
      .lean();

    // Add report count to each review
    const reviewsWithCount = reviews.map((r) => ({
      ...r,
      reportCount: r.reports.length,
    }));

    return res.json({ total, reviews: reviewsWithCount });
  } catch (err) {
    console.error("Get reported reviews error:", err);
    return res.status(500).json({ message: "Failed to fetch reported reviews" });
  }
};

/**
 * GET /admin/reviews/:reviewId
 * Get a specific review with all its details and reports
 */
export const getReviewDetail = async (req, res) => {
  try {
    const { reviewId } = req.params;

    const review = await Review.findById(reviewId)
      .populate("userId", "name avatar email")
      .populate("reports.userId", "name avatar email");

    if (!review) {
      return res.status(404).json({ message: "Review not found" });
    }

    return res.json(review);
  } catch (err) {
    console.error("Get review detail error:", err);
    return res.status(500).json({ message: "Failed to fetch review" });
  }
};

/**
 * POST /admin/reviews/:reviewId/dismiss-report
 * Dismiss a specific report (not delete review)
 */
export const dismissReport = async (req, res) => {
  try {
    const { reviewId } = req.params;
    const { reportUserId } = req.body;

    if (!reportUserId) {
      return res.status(400).json({ message: "Report user ID required" });
    }

    const review = await Review.findById(reviewId);
    if (!review) {
      return res.status(404).json({ message: "Review not found" });
    }

    // Remove specific report
    review.reports = review.reports.filter(
      (r) => r.userId.toString() !== reportUserId
    );

    await review.save();
    return res.json({ message: "Report dismissed" });
  } catch (err) {
    console.error("Dismiss report error:", err);
    return res.status(500).json({ message: "Failed to dismiss report" });
  }
};

/**
 * DELETE /admin/reviews/:reviewId
 * Delete a review (admin action for reported reviews)
 */
export const deleteReviewAsAdmin = async (req, res) => {
  try {
    const { reviewId } = req.params;
    const { reason } = req.body;

    const review = await Review.findById(reviewId);
    if (!review) {
      return res.status(404).json({ message: "Review not found" });
    }

    await Review.findByIdAndDelete(reviewId);

    return res.json({
      message: "Review deleted successfully",
      deletionReason: reason || "Admin action",
    });
  } catch (err) {
    console.error("Delete review error:", err);
    return res.status(500).json({ message: "Failed to delete review" });
  }
};

/**
 * POST /admin/reviews/:reviewId/clear-reports
 * Clear all reports for a review (review stays, reports are dismissed)
 */
export const clearAllReports = async (req, res) => {
  try {
    const { reviewId } = req.params;

    const review = await Review.findById(reviewId);
    if (!review) {
      return res.status(404).json({ message: "Review not found" });
    }

    const reportCount = review.reports.length;
    review.reports = [];

    await review.save();
    return res.json({
      message: `Cleared ${reportCount} report(s)`,
    });
  } catch (err) {
    console.error("Clear reports error:", err);
    return res.status(500).json({ message: "Failed to clear reports" });
  }
};
