import { Response, NextFunction } from "express";
import { AuthenticatedRequest} from "./authMiddleware";
import { Role } from "../constants"

/**
 * Middleware to restrict access based on user roles.
 * Usage: router.get("/admin/teams", verifyAuthToken, requireRole(["admin"]), controller)
 */
export const requireRole = (allowedRoles: Role[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    
    // Check 1: Ensure user is authenticated (verifyAuthToken must run first)
    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized: User object missing. Run verifyAuthToken first." });
    }

    const userRole = req.user.role;

    // Check 2: Check if the user's role is in the list of allowed roles
    if (!allowedRoles.includes(userRole)) {
      return res.status(403).json({ 
        message: `Forbidden: Access denied. Required role(s): ${allowedRoles.join(", ")}` 
      });
    }

    next();
  };
};