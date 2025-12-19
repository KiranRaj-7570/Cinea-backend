import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import cloudinary from "../config/cloudinary.js";
import User from "../models/User.js";
import fs from "fs";
import nodemailer from "nodemailer";

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
    token : token,
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

//Forgot Pass
export const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ msg: "Email is required" });

    const user = await User.findOne({ email });
    if (!user)
      return res.status(404).json({ msg: "No account with this email" });

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiry = Date.now() + 10 * 60 * 1000; // 10 minutes

    user.resetOtp = otp;
    user.resetOtpExpire = expiry;
    await user.save();

    // Email Transport
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    const mailOptions = {
      from: `"Cinéa Support" <${process.env.EMAIL_USER}>`,
      to: user.email,
      subject: "Cinéa Password Reset OTP",
      text: `Your OTP for resetting your password is: ${otp}`,
    };

    await transporter.sendMail(mailOptions);

    res.json({ msg: "OTP sent to email" });
  } catch (err) {
    console.error("Forgot Password Error:", err);
    res.status(500).json({ msg: "Server error" });
  }
};

//verify OTP
export const verifyOtp = async (req, res) => {
  try {
    const { email, otp } = req.body;

    const user = await User.findOne({
      email,
      resetOtp: otp,
      resetOtpExpire: { $gt: Date.now() },
    });

    if (!user) {
      return res.status(400).json({ msg: "Invalid or expired OTP" });
    }

    res.json({ msg: "OTP Verified" });
  } catch (err) {
    console.error("Verify OTP Error:", err);
    res.status(500).json({ msg: "Server error" });
  }
};

//reset Pass
export const resetPassword = async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body;

    const user = await User.findOne({
      email,
      resetOtp: otp,
      resetOtpExpire: { $gt: Date.now() },
    });

    if (!user) {
      return res.status(400).json({ msg: "Invalid or expired OTP" });
    }

    const hashed = await bcrypt.hash(newPassword, 10);

    user.password = hashed;
    user.resetOtp = undefined;
    user.resetOtpExpire = undefined;
    await user.save();

    // Automatically authenticate user and set cookie ✨
    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.cookie("token", token, {
      httpOnly: true,
      secure: false,
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    return res.json({
      msg: "Password reset successful",
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        avatar: user.avatar,
        bio: user.bio,
        followers: user.followers,
        following: user.following,
      },
    });
  } catch (err) {
    console.error("Reset Password Error:", err.message);
    return res.status(500).json({ msg: "Server error" });
  }
};

export const followOrUnfollowUser = async (req, res) => {
  try {
    const targetUserId = req.params.id;
    const currentUserId = req.user.id;

    if (targetUserId === currentUserId) {
      return res.status(400).json({ msg: "You cannot follow yourself" });
    }

    const targetUser = await User.findById(targetUserId);
    const currentUser = await User.findById(currentUserId);

    if (!targetUser || !currentUser) {
      return res.status(404).json({ msg: "User not found" });
    }

    const isFollowing = currentUser.following.includes(targetUserId);

    if (isFollowing) {
      // 🔴 UNFOLLOW
      currentUser.following.pull(targetUserId);
      targetUser.followers.pull(currentUserId);
    } else {
      // 🟢 FOLLOW
      currentUser.following.push(targetUserId);
      targetUser.followers.push(currentUserId);
    }

    await currentUser.save();
    await targetUser.save();

    // Return UPDATED logged-in user (important for realtime UI)
    const updatedCurrentUser = await User.findById(currentUserId).select("-password");

    return res.json({
      msg: isFollowing ? "Unfollowed successfully" : "Followed successfully",
      user: updatedCurrentUser,
      isFollowing: !isFollowing,
    });
  } catch (err) {
    console.error("Follow/Unfollow Error:", err);
    return res.status(500).json({ msg: "Server error" });
  }
};

// LOGOUT
export const logout = (req, res) => {
  res.clearCookie("token");
  res.json({ msg: "Logged out successfully" });
};


export const getUserById = async (req, res) => {
  try {
    const user = await User.findById(req.params.id)
      .select("name bio avatar followers following");

    if (!user) return res.status(404).json({ msg: "User not found" });

    res.json({ user });
  } catch (err) {
    res.status(500).json({ msg: "Server error" });
  }
};