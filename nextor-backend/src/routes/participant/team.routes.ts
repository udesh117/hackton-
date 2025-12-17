import { Router } from "express";
import { createTeam, joinTeam, getMyTeam, acceptInvite, getAllTeamMembers, removeMember, removeMemberById, getMyTeamMembers, sendNewInvite, updateTeamDetailsController, getTeamDetailsController, checkInviteStatus, getPendingInvitations } from "../../controllers/participant/team.controller";
import { verifyAuthToken } from "../../middlewares/authMiddleware";
import { requireRole } from "../../middlewares/roleMiddleware";

const router = Router();

// Public route - Check invite status (no auth required)
router.get("/invite/check/:token", checkInviteStatus);

// Apply authentication to all team routes below
router.use(verifyAuthToken);

// Create a team (Any participant can do this, provided they aren't in a team)
router.post("/", requireRole(['participant']), createTeam);

// Join a team using a code
router.post("/join", requireRole(['participant']), joinTeam);

// 3. updateTeamDetails (PATCH)
router.patch("/update", requireRole(['participant']), updateTeamDetailsController);

// Get my current team details
// router.get("/my-team", getMyTeam);

// 4. addTeamMember (POST /member/add)
router.post("/member/add", requireRole(['participant']), sendNewInvite); 
// Invite endpoint (POST /api/teams/invite)
router.post("/invite", requireRole(['participant']), sendNewInvite);
router.post("/accept-invite", requireRole(['participant']), acceptInvite);

// Get my team members (GET /api/teams/me/members)
router.get("/me/members", requireRole(['participant']), getMyTeamMembers);

// Get pending invitations for my team (GET /api/teams/me/pending-invites)
router.get("/me/pending-invites", requireRole(['participant']), getPendingInvitations);

// Remove member by member ID (DELETE /api/teams/member/:memberId)
router.delete("/member/:memberId", requireRole(['participant']), removeMemberById);

// Team CRUD Management Routes
router.get("/:teamId/members", requireRole(['participant', 'admin', 'judge']), getAllTeamMembers); // Read
// router.post("/:teamId/remove-member", requireRole(['participant']), removeMember); // Delete

// 5. removeTeamMember (DELETE /member/remove) - Changing method and URL structure
router.delete("/:teamId/member/remove", requireRole(['participant']), removeMember);

// getTeamDetails
// GET /api/team (for participant's own team)
router.get("/my-details", getTeamDetailsController);
// GET /api/team/:teamId (for admin lookup) 
router.get("/:teamId", getTeamDetailsController); 

export default router;