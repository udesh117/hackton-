import { Request, Response, NextFunction } from "express";
import axios from "axios";
import { getEnvVar } from "../utils/jwt"; // Reusing JWT utility for env var access

const RECAPTCHA_SECRET = getEnvVar("RECAPTCHA_SECRET_KEY");
const RECAPTCHA_VERIFY_URL = "https://www.google.com/recaptcha/api/siteverify";
const MIN_SCORE = 0.5; // Threshold for V3: adjust as needed

interface RecaptchaResponse {
  success: boolean;
  score?: number;
  challenge_ts?: string;
  hostname?: string;
  "error-codes"?: string[];
}

/**
 * Middleware to verify the reCAPTCHA token sent from the frontend.
 */
export const verifyRecaptcha = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<any> => {
  const { recaptchaToken } = req.body;

  if (!RECAPTCHA_SECRET) {
    console.warn("RECAPTCHA_SECRET_KEY is missing. Bypassing reCAPTCHA check.");
    return next(); // Bypass in dev if key is missing, but required for production
  }

  if (!recaptchaToken) {
    return res.status(400).json({ message: "reCAPTCHA token is required." });
  }

  try {
    const response = await axios.post<RecaptchaResponse>(RECAPTCHA_VERIFY_URL, null, {
      params: {
        secret: RECAPTCHA_SECRET,
        response: recaptchaToken,
      },
    });

    const { success, score } = response.data as RecaptchaResponse;
    const scoreVal = typeof score === 'number' ? score : 0;

    if (!success || scoreVal < MIN_SCORE) {
      console.warn(`reCAPTCHA failed: Score=${score}, IP=${req.ip}`);
      return res.status(403).json({ 
        message: "Bot verification failed. Please try again.",
        code: "RECAPTCHA_FAILED"
      });
    }

    console.log(`reCAPTCHA verified. Score: ${score}`);
    next();
  } catch (error: any) {
    console.error("reCAPTCHA verification API error:", error.message);
    return res.status(500).json({ message: "Internal verification service failed." });
  }
};