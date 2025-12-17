import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import cookieParser from "cookie-parser";
import { getEnvVar } from "../utils/jwt"; // Utility to get JWT_SECRET
import { Role } from "../constants"

// Extend the Express Request interface to include the user payload
export interface AuthenticatedRequest extends Request {
  user?: { 
    id: string; 
    email: string;
    role: Role;
  };
}

const JWT_SECRET = getEnvVar("JWT_SECRET");

/**
 * Middleware to verify the JWT token from the cookie.
 * If valid, it attaches the user data (id, email, role) to req.user.
 */
export const verifyAuthToken = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void => {
  // 1. Get token from the 'token' HTTP-Only cookie
  // Note: cookie-parser must be registered in index.ts for this to work
  const token = req.cookies?.token;

  if (!token) {
    // If no token, terminate request as Unauthorized
    res.status(401).json({ message: "Authentication required: No session token provided." });
    return;
  }

  try {
    // 2. Verify the token signature and expiration
    const decoded = jwt.verify(token, JWT_SECRET) as {
      uid: string;
      email: string;
      role: Role;
    };

    // 3. Attach decoded user payload to the request
    req.user = {
      id: decoded.uid,
      email: decoded.email,
      role: decoded.role,
    };
    
    // Proceed to the next middleware/controller
    next();
  } catch (err: any) {
    console.error("Auth middleware error:", err.message);
    // Token is expired, invalid, or corrupted
    res.status(403).json({ message: "Session expired or invalid token." });
    return;
  }
};