import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import { supabase } from "../../lib/supabaseClient";
import redisClient from "../../lib/redisClient";
import { sendEmail } from "../../utils/email";   // Reuse from Accrefin
import { getEnvVar, generateToken } from "../../utils/jwt";
import { Role } from "../../constants";
import { AuthenticatedRequest } from "../../middlewares/authMiddleware";

dotenv.config();

// Standard JWT options for the HTTP-Only cookie (7 days)
const isProd = process.env.NODE_ENV === "production";
export const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: isProd, // secure only in production
  sameSite: isProd ? ("none" as const) : ("lax" as const), // lax in dev to allow localhost
  path: "/",
  maxAge: 60 * 60 * 24 * 7 * 1000, // 7 days in milliseconds
};

// 1. SIGNUP CONTROLLER (POST /api/auth/signup)

export const signup = async (req: Request, res: Response): Promise<any> => {
  try {
    const { firstName, lastName, email, password} = req.body;

    if (!firstName || !lastName || !email || !password) {
      return res.status(400).json({ message: "All fields are required" });
    }

    // A. Check if user exists
    const { data: existingUsers, error: checkError } = await supabase
      .from("Users")
      .select("id, is_verified")
      .eq("email", email);

    if (checkError) throw checkError;

    if (existingUsers && existingUsers.length > 0) {
      if (!existingUsers[0].is_verified) {
        return res.status(409).json({ message: "Account exists but not verified. Check your email." });
      }
      return res.status(409).json({ message: "User already exists" });
    }

    // B. Hash Password
    const hashedPassword = await bcrypt.hash(password, 10);

    // C. Create User (Auth Data ONLY)
    console.log("Attempting to insert user...");
    const { data: insertedUsers, error: insertUserError } = await supabase
      .from("Users")
      .insert([
        {
          email,
          password: hashedPassword,
          role: 'participant',
          is_verified: false,
        },
      ])
      .select("id, email, role");

    if (insertUserError){
      console.error("Error during User Insert:", insertUserError.message);
      throw insertUserError;
    } 
    const user = insertedUsers[0];
    console.log("User inserted successfully. ID:", user?.id);


    // D. Create Profile (Personal Data) - Linked by User ID
    const { error: insertProfileError } = await supabase
      .from("Profiles")
      .insert([
        {
          user_id: user.id,
          first_name: firstName,
          last_name: lastName,
        },
      ]);

    if (insertProfileError) {
      // Rollback: Delete the user if profile creation fails
      await supabase.from("Users").delete().eq("id", user.id);
      throw insertProfileError;
    }

    // E. Generate Verification Token & Store in Redis (24 hours)
    const verificationToken = crypto.randomBytes(32).toString("hex");
    const expires_in_seconds = 86400; 

    // Store token in Redis (handle errors gracefully)
    try {
      await redisClient.set(
        `verify_email:${verificationToken}`, 
        user.id, 
        "EX", 
        expires_in_seconds
      );
      console.log("✅ Verification token stored in Redis");
    } catch (redisError: any) {
      console.error("⚠️ Redis connection failed, but continuing signup:", redisError.message);
      // Continue without Redis - token won't be stored but signup can still succeed
      // In production, you should have Redis running
    }

    // F. Send Email (don't await - send asynchronously to not block response)
    const verificationLink = `${process.env.FRONTEND_URL}/auth/verify-email?token=${verificationToken}`;
    
    console.log("📧 Attempting to send verification email to:", user.email);
    
    sendEmail({
      to: user.email,
      subject: "Verify your HackOnX Account",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #5425FF;">Welcome to HackOnX!</h2>
          <p>Thank you for signing up. Please verify your email address to complete your registration.</p>
          <p>Click the button below to verify your account:</p>
          <a href="${verificationLink}" 
             style="display: inline-block; padding: 12px 24px; background-color: #5425FF; color: white; text-decoration: none; border-radius: 8px; margin: 20px 0;">
            Verify Email Address
          </a>
          <p>Or copy and paste this link into your browser:</p>
          <p style="word-break: break-all; color: #666;">${verificationLink}</p>
          <p style="margin-top: 30px; color: #999; font-size: 12px;">
            This link will expire in 24 hours. If you didn't create an account, please ignore this email.
          </p>
        </div>
      `,
      text: `Welcome to HackOnX! Please verify your email by clicking this link: ${verificationLink}`,
    }).catch((emailError) => {
      // Log email error but don't fail the signup
      console.error("❌ Failed to send verification email:", {
        error: emailError.message,
        code: emailError.code,
        response: emailError.response,
        userID: user.id,
        email: user.email,
        stack: emailError.stack,
      });
    });

    return res.status(201).json({
      message: "Success! User created. Please check your email to verify your account."
    });

  } catch (error: any) {
    console.error("❌ Signup Error:", {
      message: error.message,
      code: error.code,
      details: error.details,
      hint: error.hint,
      stack: error.stack,
    });
    return res.status(500).json({ 
      message: "Server Error", 
      error: error.message,
      details: process.env.NODE_ENV === 'development' ? error.details : undefined
    });
  }
};


// 2. LOGIN CONTROLLER (POST /api/auth/login)

export const login = async (req: Request, res: Response): Promise<any> => {
  try {
    const { email, password } = req.body;

    if (!email || !password) return res.status(400).json({ message: "Email and password are required" });

    // A. Fetch User + Profile Joined
    const { data: users, error } = await supabase
      .from("Users")
      .select(`
        id, email, password, role, is_verified,
        Profiles (first_name, last_name, avatar_url)
      `)
      .eq("email", email)
      .limit(1);

    if (error) throw error;
    const user = users?.[0];

    if (!user) return res.status(404).json({ message: "Email not found" });

    // B. Check if user is verified
    if (!user.is_verified) {
      return res.status(403).json({
        message: "Account not verified. Please check your email for a verification link."
      });
    }

    // C. Compare input password with hashed password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(401).json({ message: "Invalid password" });

    // Flatten the profile data for the frontend response
    const profile = Array.isArray(user.Profiles) ? user.Profiles[0] : user.Profiles;

    // D. Generate Token (Payload includes user ID and essential role for RBAC)
    const token = generateToken({
      uid: user.id,
      email: user.email,
      role: user.role, // Essential for requireRole middleware
    });

    // E. Set the token as an HttpOnly cookie
    res.cookie("token", token, COOKIE_OPTIONS);

    // F. Respond with user/profile data (excluding password hash)
    return res.status(200).json({
      message: "Login successful",
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        firstName: profile?.first_name,
        lastName: profile?.last_name,
        avatar: profile?.avatar_url
      },
    });

  } catch (error: any) {
    console.error("Login Error:", error.message);
    return res.status(500).json({ message: "Server Error", error: error.message });
  }
};


// 3. LOGOUT CONTROLLER (POST /api/auth/logout)

export const logout = async (req: Request, res: Response): Promise<any> => {
  // Clear the HttpOnly cookie that stores the JWT
  res.clearCookie("token", COOKIE_OPTIONS);
  
  return res.status(200).json({ message: "Logged out successfully" });
};

// 5. ME CONTROLLER (GET /api/auth/me)

// Requires verifyAuthToken middleware

export const me = async (req: AuthenticatedRequest, res: Response): Promise<any> => {
    // The user data is already attached by verifyAuthToken middleware
    try {
        if (!req.user || !req.user.id) {
             return res.status(401).json({ message: "Unauthorized: User session invalid." });
        }

        // Fetch full user details from the database
        const { data: userRecord, error } = await supabase
            .from("Users")
            .select(`
                id, email, role,
                Profiles (first_name, last_name, avatar_url, bio, phone, linkedin_url, github_url)
            `)
            .eq("id", req.user.id)
            .single();

        if (error || !userRecord) {
             console.error("ME fetch error:", error);
             return res.status(404).json({ message: "User not found." });
        }

        return res.status(200).json({
            message: "User details retrieved successfully.",
            user: userRecord, // Frontend will access user.Profiles.first_name
        });

    } catch (err) {
        return res.status(500).json({ message: "Server error during profile retrieval." });
    }
};

// 4. VERIFY EMAIL CONTROLLER (POST /api/auth/verify-email)
export const verifyEmail = async (
  req: Request,
  res: Response
): Promise<any> => {
  try {
    const { token } = req.body;

    console.log("📧 Email verification attempt:", {
      token: token ? `${token.substring(0, 10)}...` : 'missing',
      hasToken: !!token,
      bodyKeys: Object.keys(req.body)
    });

    if (!token) {
      console.error("❌ Verification failed: No token provided");
      return res.status(400).json({ message: "Token is required" });
    }

    // A. Find the user ID associated with this token in Redis
    let userId: string | null = null;
    try {
      userId = await redisClient.get(`verify_email:${token}`);
      console.log("🔍 Redis lookup result:", {
        token: `${token.substring(0, 10)}...`,
        foundUserId: userId ? `${userId.substring(0, 8)}...` : null
      });
    } catch (redisError: any) {
      console.error("⚠️ Redis error during token lookup:", redisError.message);
      // If Redis is down, we can't verify tokens stored in Redis
      // For development, you might want to allow verification without Redis
      // In production, Redis should be available
      return res.status(503).json({ 
        message: "Verification service temporarily unavailable. Please try again later or contact support.",
        error: "Redis connection failed"
      });
    }

    if (!userId) {
      console.error("❌ Verification failed: Token not found or expired");
      return res.status(404).json({ message: "Invalid or expired verification token." });
    }

    // B. Update the user to mark them as verified in the database
    const { error: updateError } = await supabase
      .from("Users")
      .update({
        is_verified: true,
      })
      .eq("id", userId);

    if (updateError) {
      console.error("❌ Database update failed:", updateError);
      throw updateError;
    }

    console.log("✅ Email verified successfully for user:", userId);

    // C. Delete the token from Redis so it can't be reused
    try {
      await redisClient.del(`verify_email:${token}`);
      console.log("✅ Token deleted from Redis");
    } catch (redisError: any) {
      console.warn("⚠️ Failed to delete token from Redis (non-critical):", redisError.message);
      // Continue even if deletion fails - token is already used
    }

    // Frontend handles the final redirect after a successful verification
    return res.status(200).json({ message: "Email verified successfully. You can now log in." });

  } catch (error: any) {
    console.error("❌ Email verification error:", {
      message: error.message,
      code: error.code,
      details: error.details,
    });
    return res.status(500).json({ 
      message: "Server Error", 
      error: error.message 
    });
  }
};

// 5. EDIT MY PROFILE (POST /api/auth/user/edit)
export const editMyProfile = async (req: AuthenticatedRequest, res: Response): Promise<any> => {
  try {
    const userId = req.user!.id;
    const updates = req.body;

    if (!updates || Object.keys(updates).length === 0) {
      return res.status(400).json({ message: "No changes provided." });
    }

    // 1. Define Allowed Fields (Security Layer)
    // We only allow updating fields present in the 'Profiles' table.
    const allowedFields = [
      "first_name",
      "last_name",
      "avatar_url",
      "bio",
      "phone",
      "linkedin_url",
      "github_url"
    ];

    // 2. Filter the Input
    // Only keep keys that are in the allowedFields list
    const filteredUpdates: Record<string, any> = {};
    Object.keys(updates).forEach((key) => {
      if (allowedFields.includes(key)) {
        filteredUpdates[key] = updates[key];
      }
    });

    if (Object.keys(filteredUpdates).length === 0) {
      return res.status(400).json({ message: "Invalid fields provided. You can only edit profile details." });
    }

    // 2. Fetch Existing Profile (Required to ensure NOT NULL fields are present)
    const { data: existingProfile, error: fetchError } = await supabase
        .from("Profiles")
        .select("first_name, last_name") // Only need the required fields
        .eq("id", userId)
        .maybeSingle(); // Use maybeSingle to get null if 0 rows

    if (fetchError) throw fetchError;
    
    // 3. Create the Final Payload for UPSERT
    let upsertPayload: Record<string, any> = { id: userId, ...filteredUpdates };

    if (!existingProfile) {
        // SCENARIO: Profile is MISSING (user migrated or profile creation failed)
        // We must ensure first_name and last_name are provided, or fail.
        if (!updates.first_name || !updates.last_name) {
            return res.status(400).json({ 
                message: "Profile is missing. Please provide both 'first_name' and 'last_name' to initialize your profile before saving other details." 
            });
        }
    } else {
        // SCENARIO: Profile EXISTS (standard update)
        // If the update doesn't include the name, we merge the old name back in 
        // to prevent upsert from setting it to NULL.
        upsertPayload.first_name = updates.first_name || existingProfile.first_name;
        upsertPayload.last_name = updates.last_name || existingProfile.last_name;
    }
    
    // 4. Perform UPSERT
    upsertPayload.updated_at = new Date().toISOString(); // Add timestamp last

    const { data: updatedProfile, error: updateError } = await supabase
      .from("Profiles")
      .upsert(upsertPayload)
      .select()
      .single();

    if (updateError) throw updateError;

    return res.status(200).json({
      message: "Profile updated successfully.",
      profile: updatedProfile,
    });

  } catch (error: any) {
    console.error("Edit Profile Error:", error.message);
    return res.status(500).json({ message: "Server Error", error: error.message });
  }
};

// 7. PATCH /api/auth/settings/password (Update Password)
export const updatePasswordController = async (req: AuthenticatedRequest, res: Response): Promise<any> => {
    try {
        const userId = req.user!.id;
        const { oldPassword, newPassword } = req.body;

        if (!oldPassword || !newPassword) {
            return res.status(400).json({ message: "Both oldPassword and newPassword are required." });
        }

        // 1. Fetch current user data (including hashed password)
        const { data: users, error: fetchError } = await supabase
            .from("Users")
            .select("password")
            .eq("id", userId)
            .single();

        if (fetchError || !users) {
            return res.status(404).json({ message: "User not found." });
        }

        const user = users;

        // 2. Verify Old Password
        const isMatch = await bcrypt.compare(oldPassword, user.password);
        if (!isMatch) {
            return res.status(401).json({ message: "Invalid old password." });
        }
        
        // 3. Hash New Password
        const newHashedPassword = await bcrypt.hash(newPassword, 10);
        
        // 4. Update Database
        const { error: updateError } = await supabase
            .from("Users")
            .update({ password: newHashedPassword })
            .eq("id", userId);

        if (updateError) throw updateError;

        // Log the user out for a clean slate, forcing a login with the new password
        // (You should also clear the JWT cookie here, handled by a separate logout function usually)
        return res.status(200).json({ message: "Password updated successfully. Please log in again." });

    } catch (error: any) {
        console.error("Update Password Error:", error.message);
        return res.status(500).json({ message: "Server Error" });
    }
};

// 8. PATCH /api/auth/settings/email-preferences (Update Email Preferences)
export const updateEmailPreferencesController = async (req: AuthenticatedRequest, res: Response): Promise<any> => {
    try {
        const userId = req.user!.id;
        const { allowMarketingEmails } = req.body;

        if (allowMarketingEmails === undefined || typeof allowMarketingEmails !== 'boolean') {
             return res.status(400).json({ message: "Invalid value for allowMarketingEmails." });
        }
        
        // Assumption: 'allow_marketing' column exists in the Users table
        const { error: updateError } = await supabase
            .from("Users")
            .update({ allow_marketing: allowMarketingEmails })
            .eq("id", userId);

        if (updateError) throw updateError;
        
        return res.status(200).json({ 
            message: "Email preferences updated successfully.",
            allowMarketingEmails
        });

    } catch (error: any) {
        console.error("Update Email Preferences Error:", error.message);
        return res.status(500).json({ message: "Server Error" });
    }
};