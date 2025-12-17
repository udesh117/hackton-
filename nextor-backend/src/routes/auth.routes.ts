import { Router } from "express";
import { signup, login, verifyEmail, logout, me, editMyProfile, updateEmailPreferencesController, updatePasswordController } from "../controllers/auth/auth.controller";
import { verifyAuthToken } from "../middlewares/authMiddleware";
import { requireRole } from "../middlewares/roleMiddleware";
import { sendResetLink, resetPassword } from "../controllers/resetPassword.controller";
import { verifyRecaptcha } from "../middlewares/recaptcha.middleware";
import { validate, signupValidation, loginValidation } from "../middlewares/validation.middleware";

const router = Router();

// Public routes (Validation -> reCAPTCHA -> Controller)
router.post("/signup", validate(signupValidation), verifyRecaptcha, signup);
router.post("/login", validate(loginValidation), login);

router.post("/verify-email", verifyEmail); 

// Protected routes (Token required)
router.post("/logout", logout);
router.get("/me", verifyAuthToken, me);

// Password Reset routes
router.post("/forgot-password", sendResetLink);
router.post("/reset-password", resetPassword);

// User profile routes
router.post("/user/edit", verifyAuthToken, editMyProfile);

// --- Settings Routes (All Protected) ---
// Note: We are using '/auth' prefix in index.ts, so the path is /api/auth/settings/...

router.patch("/settings/password", verifyAuthToken, updatePasswordController);
router.patch("/settings/email-preferences", verifyAuthToken, updateEmailPreferencesController);

// Example of Admin protected route (requires token AND 'admin' role)
// router.get("/admin/dashboard", verifyAuthToken, requireRole(["admin"]), (req, res) => res.send("Welcome, Admin!")); 

export default router;