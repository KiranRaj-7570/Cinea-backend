import jwt from "jsonwebtoken";

export const verifyToken = (req, res, next) => {
  try {
    let token;

    // 1️⃣ From Authorization header
    if (
      req.headers.authorization &&
      req.headers.authorization.startsWith("Bearer")
    ) {
      token = req.headers.authorization.split(" ")[1];
    }

    // 2️⃣ Fallback to cookies (old code)
    if (!token && req.cookies?.token) {
      token = req.cookies.token;
    }

    if (!token) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // normalize user object
    req.user = {
      ...decoded,
      isAdmin:
        decoded.isAdmin === true || decoded.role === "admin",
      role: decoded.role || (decoded.isAdmin ? "admin" : "user"),
    };

    next();
  } catch (err) {
    console.error("Token verification failed:", err.message);
    return res.status(401).json({ message: "Invalid or expired token" });
  }
};
