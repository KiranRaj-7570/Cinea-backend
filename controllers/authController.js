import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import cloudinary from "../config/cloudinary.js";
import User from "../models/User.js";
import fs from "fs";

// SIGNUP
export const signup = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    const userExists = await User.findOne({ email });
    if (userExists)
      return res.status(400).json({ msg: "Email already registered" });

    const hashed = await bcrypt.hash(password, 10);

    const user = await User.create({ name, email, password: hashed });

    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    res.cookie("token", token, {
      httpOnly: true,
      secure: false,
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.status(201).json({
      msg: "Signup successful",
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        bio: user.bio,
        avatar: user.avatar,
      },
    });
  } catch (error) {
    console.error("Signup Error:", error);
    res.status(500).json({ msg: "Server error" });
  }
};

// LOGIN
export const login = async (req, res) => {
  const { email, password } = req.body;

  const user = await User.findOne({ email });
  if (!user) return res.status(404).json({ msg: "Invalid email" });

  const match = await bcrypt.compare(password, user.password);
  if (!match) return res.status(401).json({ msg: "Wrong password" });

  const token = jwt.sign(
    { id: user._id, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: "1d" }
  );

  res.cookie("token", token, {
    httpOnly: true,
    secure: false,
    sameSite: "lax",
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });

  res.json({
    msg: "Login successful",
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      bio: user.bio,
      avatar: user.avatar,
    },
  });
};

// GET LOGGED IN USER
export const getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("-password");
    if (!user) return res.status(404).json({ msg: "User not found" });
    res.json({ user });
  } catch (error) {
    console.error("GetMe Error:", error);
    res.status(500).json({ msg: "Server error" });
  }
};

// UPDATE PROFILE
export const updateProfile = async (req, res) => {
  try {
    const { name, bio } = req.body;
    if (!name || name.trim() === "")
      return res.status(400).json({ msg: "Name is required" });

    const updatedUser = await User.findByIdAndUpdate(
      req.user.id,
      { name, bio },
      { new: true }
    ).select("-password");

    res.json({ msg: "Profile updated", user: updatedUser });
  } catch (error) {
    console.error("UpdateProfile Error:", error);
    res.status(500).json({ msg: "Server error" });
  }
};

export const uploadAvatar = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ msg: "No image uploaded" });
    }

    const filePath = req.file.path;

    // Upload to Cloudinary
    const result = await cloudinary.uploader.upload(filePath, {
      folder: "cinea-avatars",
      width: 300,
      height: 300,
      crop: "fill",
    });

    // Remove the local file after uploading
    fs.unlink(filePath, () => {});

    const updatedUser = await User.findByIdAndUpdate(
      req.user.id,
      { avatar: result.secure_url },
      { new: true }
    ).select("-password");

    return res.json({
      msg: "Avatar updated successfully",
      user: updatedUser,
    });

  } catch (err) {
    console.error("Upload Avatar Error:", err.message);
    return res.status(500).json({ msg: "Server error" });
  }
};

// REMOVE AVATAR
export const removeAvatar = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);

    if (!user || !user.avatar) {
      return res.status(400).json({ msg: "No avatar to remove" });
    }

    // Extract Cloudinary public_id
    const urlParts = user.avatar.split("/");
    const filename = urlParts[urlParts.length - 1]; // image.jpg
    const publicId = filename.split(".")[0]; // image

    await cloudinary.uploader.destroy(`cinea-avatars/${publicId}`);

    user.avatar = "";
    await user.save();

    const updatedUser = await User.findById(req.user.id).select("-password");

    return res.json({
      msg: "Avatar removed successfully",
      user: updatedUser,
    });

  } catch (err) {
    console.error("Remove Avatar Error:", err.message);
    return res.status(500).json({ msg: "Server error" });
  }
};

// LOGOUT
export const logout = (req, res) => {
  res.clearCookie("token");
  res.json({ msg: "Logged out successfully" });
};