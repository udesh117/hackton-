import { Request, Response } from "express";
import crypto from "crypto";
import bcrypt from "bcryptjs";
import { supabase } from "../lib/supabaseClient";
import redisClient from "../lib/redisClient";
import { sendEmail } from "../utils/email"; 

const TOKEN_EXPIRY_SECONDS = 900; // 15 minutes for security

// 1. FORGOT PASSWORD (POST /api/auth/forgot-password)
export const sendResetLink = async (req: Request, res: Response): Promise<any> => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: "Email is required" });
    }

    // A. Find the user by email
    const { data: users, error } = await supabase
      .from("Users")
      .select("id, email")
      .eq("email", email)
      .limit(1);

    if (error || !users?.length) {
      // NOTE: For security, we often send a 200 OK response even if the email doesn't exist 
      // to avoid leaking account existence status.
      return res.status(200).json({ message: "If an account exists, a password reset link has been sent to your email." });
    }

    const user = users[0];

    // B. Generate and Store Token in Redis (15 minutes)
    const token = crypto.randomBytes(32).toString("hex");

    // Key format: 'reset_token:<token>' holds the user's ID
    await redisClient.set(
        `reset_token:${token}`, 
        user.id, 
        'EX', 
        TOKEN_EXPIRY_SECONDS
    );

    // C. Send Reset Email
    const resetLink = `${process.env.FRONTEND_URL}/auth/reset-password?token=${token}`;

    await sendEmail({
      to: user.email,
      subject: "HackOnX Password Reset Request",
      html: `<p>You requested a password reset for your HackOnX account.</p>
             <p>Click the link below to set a new password. This link will expire in 15 minutes:</p>
             <a href="${resetLink}">${resetLink}</a>`,
    });

    return res.status(200).json({ message: "If an account exists, a password reset link has been sent to your email." });

  } catch (error: any) {
    console.error("sendResetLink error:", error.message);
    return res.status(500).json({ message: "Server error" });
  }
};


// 2. RESET PASSWORD (POST /api/auth/reset-password)
export const resetPassword = async (req: Request, res: Response): Promise<any> => {
  try {
    const { token, newPassword } = req.body;

    if (!token || !newPassword) {
      return res.status(400).json({ message: "Token and new password are required" });
    }

    // A. Get the user ID from Redis using the token
    const userId = await redisClient.get(`reset_token:${token}`);
    const redisTokenKey = `reset_token:${token}`;

    if (!userId) {
      return res.status(404).json({ message: "Invalid or expired token." });
    }

    // B. Hash and update password
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    
    const { error: updateError } = await supabase
      .from("Users")
      .update({ password: hashedPassword })
      .eq("id", userId);

    if (updateError) throw updateError;

    // C. Delete the token from Redis
    await redisClient.del(redisTokenKey);

    return res.status(200).json({ message: "Password reset successful. You can now log in with your new password." });

  } catch (error: any) {
    console.error("resetPassword error:", error.message);
    return res.status(500).json({ message: "Server error" });
  }
};