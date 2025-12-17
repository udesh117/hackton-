import jwt from "jsonwebtoken";
import dotenv from "dotenv";

dotenv.config();

// Helper to safely get environment variables
export function getEnvVar(key: string): string {
  const raw = process.env[key] ?? "";
  // Trim whitespace, then remove surrounding single or double quotes
  return raw.trim().replace(/^['"]+|['"]+$/g, "");
}

const JWT_SECRET = getEnvVar("JWT_SECRET");

// Generates a new JWT token, expiring in 7 days (as per Accrefin)
export const generateToken = (payload: object) => {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: "7d" });
}