import { Request, Response } from "express";
import crypto from "crypto";
import { supabase } from "../../lib/supabaseClient";
import { AuthenticatedRequest } from "../../middlewares/authMiddleware";
import { MAX_TEAM_SIZE } from "../../constants";
import { sendEmail } from "../../utils/email";
import { getTeamMembers, removeTeamMember, inviteTeamMember, updateTeamDetails } from "../../services/participant/team.service";

// 1. CREATE TEAM (POST /api/teams)
export const createTeam = async (req: AuthenticatedRequest, res: Response): Promise<any> => {
  try {
    const userId = req.user!.id;
    const { name } = req.body;

    if (!name) return res.status(400).json({ message: "Team name is required" });

    // A. Check if user is already in a team
    const { data: existingMembership } = await supabase
      .from("TeamMembers")
      .select("team_id")
      .eq("user_id", userId)
      .single();

    if (existingMembership) {
      return res.status(409).json({ message: "You are already part of a team." });
    }

    // B. Generate unique Join Code (6 characters)
    const joinCode = crypto.randomBytes(3).toString("hex").toUpperCase();

    // C. Create the Team
    const { data: teamData, error: teamError } = await supabase
      .from("Teams")
      .insert([
        {
          name,
          join_code: joinCode,
          leader_id: userId,
        },
      ])
      .select()
      .single();

    if (teamError) {
        // Handle unique name constraint
        if (teamError.code === '23505') return res.status(409).json({ message: "Team name already taken." });
        throw teamError;
    }

    // D. Add the creator as the 'Leader' in TeamMembers
    const { error: memberError } = await supabase
      .from("TeamMembers")
      .insert([
        {
          team_id: teamData.id,
          user_id: userId,
          // role: 'leader' // We need to add a 'role' column to TeamMembers table if we want to track this explicitly in the junction table, 
                            // OR we just rely on Teams.leader_id. Let's rely on Teams.leader_id for now to keep it simple.
        }
      ]);

    if (memberError) {
        // Rollback: Delete the team if adding the member fails
        await supabase.from("Teams").delete().eq("id", teamData.id);
        throw memberError;
    }

    return res.status(201).json({
      message: "Team created successfully!",
      team: teamData,
      joinCode: joinCode 
    });

  } catch (error: any) {
    console.error("Create Team Error:", error.message);
    return res.status(500).json({ message: "Server Error", error: error.message });
  }
};

// ------------------------------------------------------------------
// 2. JOIN TEAM (POST /api/teams/join)
// ------------------------------------------------------------------
export const joinTeam = async (req: AuthenticatedRequest, res: Response): Promise<any> => {
  try {
    const userId = req.user!.id;
    const { joinCode } = req.body;

    if (!joinCode) return res.status(400).json({ message: "Join code is required" });

    // A. Find the team by code
    const { data: team, error: teamError } = await supabase
      .from("Teams")
      .select("id, name, is_finalized")
      .eq("join_code", joinCode)
      .single();

    if (teamError || !team) return res.status(404).json({ message: "Invalid join code" });

    if (team.is_finalized) return res.status(409).json({ message: "Team is already full." });

    // B. Check if user is already in ANY team
    const { data: existingMembership } = await supabase
      .from("TeamMembers")
      .select("team_id")
      .eq("user_id", userId)
      .single();

    if (existingMembership) return res.status(409).json({ message: "You are already in a team." });

    // C. Check current member count
    const { count } = await supabase
      .from("TeamMembers")
      .select("*", { count: 'exact', head: true })
      .eq("team_id", team.id);

    if (count !== null && count >= MAX_TEAM_SIZE) {
        return res.status(409).json({ message: "Team is full (Max 4 members)." });
    }

    // D. Add user to TeamMembers
    const { error: joinError } = await supabase
      .from("TeamMembers")
      .insert([{ team_id: team.id, user_id: userId }]);

    if (joinError) throw joinError;

    // E. Check if team is now full (4 members) -> Mark as Finalized
    if ((count || 0) + 1 === MAX_TEAM_SIZE) {
        await supabase.from("Teams").update({ is_finalized: true }).eq("id", team.id);
    }

    return res.status(200).json({ message: `Successfully joined team: ${team.name}` });

  } catch (error: any) {
    console.error("Join Team Error:", error.message);
    return res.status(500).json({ message: "Server Error", error: error.message });
  }
};

// ------------------------------------------------------------------
// 3. GET MY TEAM (GET /api/teams/my-team)
// ------------------------------------------------------------------
export const getMyTeam = async (req: AuthenticatedRequest, res: Response): Promise<any> => {
    try {
        const userId = req.user!.id;

        // 1. Find which team the user belongs to
        const { data: membership, error: memError } = await supabase
            .from("TeamMembers")
            .select("team_id")
            .eq("user_id", userId)
            .single();

        if (memError || !membership) {
            return res.status(200).json({ message: "User is not in a team", team: null });
        }

        // 2. Fetch full team details + members + profiles
          const { data: team, error: teamError } = await supabase
              .from("Teams")
              .select(`
                  *,
                  members:TeamMembers (
                      user:Users (
                          id, email, role,
                          profile:Profiles (first_name, last_name, avatar_url)
                      )
                  )
              `)
              .eq("id", membership.team_id)
              .single();

        if (teamError) throw teamError;

        return res.status(200).json({ team });

    } catch (error: any) {
        console.error("Get Team Error:", error.message);
        return res.status(500).json({ message: "Server Error", error: error.message });
    }
}

// ------------------------------------------------------------------
// 4. INVITE MEMBER
// ------------------------------------------------------------------
export const sendNewInvite = async (req: AuthenticatedRequest, res: Response): Promise<any> => {
    try {
        const userId = req.user!.id;
        const { email } = req.body;

        if (!email) return res.status(400).json({ message: "Email is required" });

        // A. Controller Security Check: Ensure requester is the Leader
        const { data: team } = await supabase
          .from("Teams")
          .select("id, name, leader_id")
          .eq("leader_id", userId)
          .single();

        if (!team) return res.status(403).json({ message: "Forbidden. Only the Team Leader can invite members." });

        // B. Controller Check: Get current member count
        const { count } = await supabase
          .from("TeamMembers")
          .select("*", { count: 'exact', head: true })
          .eq("team_id", team.id);
        
        // C. Call the service function (Service handles max size check and DB insert)
        await inviteTeamMember(team.id, team.name, email, count || 0);

        return res.status(200).json({ message: `Invitation sent to ${email}` });

    } catch (error: any) {
        // Handle custom service errors gracefully
        if (error.message.includes("Team is already full") || error.message.includes("pending invite")) {
             return res.status(409).json({ message: error.message });
        }
        return res.status(500).json({ message: "Server Error", error: error.message });
    }
};
    

// ------------------------------------------------------------------
// 5. ACCEPT INVITE (Fixed Null Check)
// ------------------------------------------------------------------
export const acceptInvite = async (req: AuthenticatedRequest, res: Response): Promise<any> => {
  try {
    const userId = req.user!.id;
    const { token } = req.body;

    if (!token) return res.status(400).json({ message: "Invitation token is required" });

    // A. Validate Token
    const { data: invite, error: inviteError } = await supabase
      .from("TeamInvitations")
      .select("*")
      .eq("token", token)
      .single();

    if (inviteError || !invite) return res.status(404).json({ message: "Invalid invitation." });
    if (invite.status !== 'pending') return res.status(409).json({ message: "Invite already accepted or used." });
    if (new Date(invite.expires_at) < new Date()) return res.status(410).json({ message: "Invitation expired." });

    // B. Check if Team is full
    const { data: team, error: teamError } = await supabase
        .from("Teams")
        .select("is_finalized, name")
        .eq("id", invite.team_id)
        .single();
    
    // --- FIX: Explicit null check before accessing team.is_finalized ---
    if (teamError || !team) {
        return res.status(404).json({ message: "Team associated with this invite not found." });
    }

    if (team.is_finalized) return res.status(409).json({ message: "Team is full." });

    // C. Check if User is already in a team
    const { data: existing } = await supabase.from("TeamMembers").select("team_id").eq("user_id", userId).single();
    if (existing) return res.status(409).json({ message: "You are already in a team." });

    // D. Add User to Team
    const { error: joinError } = await supabase
      .from("TeamMembers")
      .insert([{ team_id: invite.team_id, user_id: userId }]);

    if (joinError) throw joinError;

    // E. Mark Invite as Accepted
    await supabase.from("TeamInvitations").update({ status: 'accepted' }).eq("id", invite.id);

    return res.status(200).json({ message: `Successfully joined ${team.name}` });

  } catch (error: any) {
    console.error("Accept Invite Error:", error.message);
    return res.status(500).json({ message: "Server Error", error: error.message });
  }
};

// 6. DELETE /api/team/:teamId/member/remove (Remove Member)
// ------------------------------------------------------------------
export const removeMember = async (req: AuthenticatedRequest, res: Response): Promise<any> => {
    try {
        const MIN_MEMBERS = 2; // Assuming minimum team size is 2

        const { teamId } = req.params;
        const { memberId } = req.body;
        const requestingUserId = req.user!.id;

        // --- 1. Rule Check: Deadline Passed? (NEW LOGIC) ---
        // Fetch the global submission deadline from the Settings table
        const { data: settings } = await supabase
            .from("Settings")
            .select("submission_deadline")
            .single();

        if (settings?.submission_deadline) {
            const deadline = new Date(settings.submission_deadline);
            const now = new Date();

            if (now > deadline) {
                return res.status(403).json({ 
                    message: "Action forbidden. The submission deadline has passed; team composition is locked." 
                });
            }
        }

        // --- 2. Security Check: Ensure requester is the Leader ---
        const { data: team } = await supabase.from("Teams").select("leader_id").eq("id", teamId).single();
        if (!team || team.leader_id !== requestingUserId) {
            return res.status(403).json({ message: "Forbidden. Only the Team Leader can remove members." });
        }
        
        // --- 3. Rule Check: Prevent Leader from removing themselves ---
        if (memberId === requestingUserId) {
            return res.status(400).json({ message: "You cannot remove yourself as the leader. Transfer leadership first." });
        }

        // --- 4. Rule Check: Check Minimum Member Count ---
        const { count } = await supabase
            .from("TeamMembers")
            .select("*", { count: 'exact', head: true })
            .eq("team_id", teamId);

        if (count && count <= MIN_MEMBERS) {
            return res.status(400).json({ message: `Cannot remove member. Minimum team size of ${MIN_MEMBERS} required.` });
        }

        // --- 5. Call the service function ---
        // Assuming removeTeamMember is imported from your service layer
        // await removeTeamMember(teamId, memberId); 
        
        // For now, executing the deletion directly here if service isn't imported
        const { error: removeError } = await supabase
            .from("TeamMembers")
            .delete()
            .eq("team_id", teamId)
            .eq("user_id", memberId);

        if (removeError) {
             throw removeError;
        }

        return res.status(200).json({ message: "Member removed successfully." });

    } catch (error: any) {
        console.error("Controller Error [removeMember]:", error.message);
        if (error.message.includes("Member not found")) {
            return res.status(404).json({ message: error.message });
        }
        return res.status(500).json({ message: "Server Error", error: error.message });
    }
};
// ------------------------------------------------------------------
// 7. GET ALL TEAM MEMBERS (New Read Endpoint using Service)
// ------------------------------------------------------------------
export const getAllTeamMembers = async (req: AuthenticatedRequest, res: Response): Promise<any> => {
    try {
        const { teamId } = req.params; // Expecting teamId from URL parameter

        // Call the new service function (Service handles complex JOIN query)
        const members = await getTeamMembers(teamId);

        return res.status(200).json({ members });
    } catch (error: any) {
        return res.status(500).json({ message: "Server Error", error: error.message });
    }
};

// ------------------------------------------------------------------
// 8. GET MY TEAM MEMBERS (GET /api/teams/me/members)
// ------------------------------------------------------------------
export const getMyTeamMembers = async (req: AuthenticatedRequest, res: Response): Promise<any> => {
    try {
        const userId = req.user!.id;

        // Find the user's team
        const { data: membership, error: memError } = await supabase
            .from("TeamMembers")
            .select("team_id")
            .eq("user_id", userId)
            .maybeSingle();

        if (memError) throw memError;
        if (!membership) {
            return res.status(404).json({ message: "You do not belong to a team." });
        }

        // Get all team members
        const members = await getTeamMembers(membership.team_id);

        return res.status(200).json({ members });
    } catch (error: any) {
        console.error("Get My Team Members Error:", error.message);
        return res.status(500).json({ message: "Server Error", error: error.message });
    }
};

// ------------------------------------------------------------------
// 8.5. GET PENDING INVITATIONS (GET /api/teams/me/pending-invites)
// Get all pending invitations for the user's team
// ------------------------------------------------------------------
export const getPendingInvitations = async (req: AuthenticatedRequest, res: Response): Promise<any> => {
    try {
        const userId = req.user!.id;

        // Find the user's team
        const { data: membership, error: memError } = await supabase
            .from("TeamMembers")
            .select("team_id")
            .eq("user_id", userId)
            .maybeSingle();

        if (memError) throw memError;
        if (!membership) {
            return res.status(404).json({ message: "You do not belong to a team." });
        }

        // Get all pending invitations for this team
        const { data: invitations, error: inviteError } = await supabase
            .from("TeamInvitations")
            .select("id, email, created_at, expires_at")
            .eq("team_id", membership.team_id)
            .eq("status", "pending")
            .gt("expires_at", new Date().toISOString()); // Only non-expired invites

        if (inviteError) throw inviteError;

        return res.status(200).json({ invitations: invitations || [] });
    } catch (error: any) {
        console.error("Get Pending Invitations Error:", error.message);
        return res.status(500).json({ message: "Server Error", error: error.message });
    }
};

// ------------------------------------------------------------------
// 9. CHECK INVITE AND USER STATUS (GET /api/teams/invite/check/:token)
// Public endpoint to check if invite is valid and if user exists
// ------------------------------------------------------------------
export const checkInviteStatus = async (req: Request, res: Response): Promise<any> => {
  try {
    const { token } = req.params;

    if (!token) {
      return res.status(400).json({ message: "Invitation token is required" });
    }

    // A. Validate Token and get invite details
    const { data: invite, error: inviteError } = await supabase
      .from("TeamInvitations")
      .select("email, status, expires_at, team_id")
      .eq("token", token)
      .single();

    if (inviteError || !invite) {
      return res.status(404).json({ message: "Invalid invitation token." });
    }

    if (invite.status !== 'pending') {
      return res.status(409).json({ message: "Invite already accepted or used." });
    }

    if (new Date(invite.expires_at) < new Date()) {
      return res.status(410).json({ message: "Invitation expired." });
    }

    // B. Check if user with this email exists
    const { data: user, error: userError } = await supabase
      .from("Users")
      .select("id, email")
      .eq("email", invite.email)
      .maybeSingle();

    if (userError) {
      console.error("Error checking user:", userError);
      return res.status(500).json({ message: "Server error checking user status." });
    }

    return res.status(200).json({
      valid: true,
      email: invite.email,
      userExists: !!user,
      userId: user?.id || null,
    });

  } catch (error: any) {
    console.error("Check Invite Status Error:", error.message);
    return res.status(500).json({ message: "Server Error", error: error.message });
  }
};

// 10. REMOVE MEMBER BY MEMBER ID (DELETE /api/teams/member/:memberId)
// ------------------------------------------------------------------
export const removeMemberById = async (req: AuthenticatedRequest, res: Response): Promise<any> => {
    try {
        const MIN_MEMBERS = 2;
        const { memberId } = req.params;
        const requestingUserId = req.user!.id;

        // Find the team the requesting user belongs to
        const { data: userMembership, error: userMemError } = await supabase
            .from("TeamMembers")
            .select("team_id")
            .eq("user_id", requestingUserId)
            .maybeSingle();

        if (userMemError) throw userMemError;
        if (!userMembership) {
            return res.status(404).json({ message: "You do not belong to a team." });
        }

        const teamId = userMembership.team_id;

        // Check if deadline passed
        const { data: settings } = await supabase
            .from("Settings")
            .select("submission_deadline")
            .single();

        if (settings?.submission_deadline) {
            const deadline = new Date(settings.submission_deadline);
            const now = new Date();
            if (now > deadline) {
                return res.status(403).json({ 
                    message: "Action forbidden. The submission deadline has passed; team composition is locked." 
                });
            }
        }

        // Security Check: Ensure requester is the Leader
        const { data: team } = await supabase.from("Teams").select("leader_id").eq("id", teamId).single();
        if (!team || team.leader_id !== requestingUserId) {
            return res.status(403).json({ message: "Forbidden. Only the Team Leader can remove members." });
        }
        
        // Prevent Leader from removing themselves
        if (memberId === requestingUserId) {
            return res.status(400).json({ message: "You cannot remove yourself as the leader. Transfer leadership first." });
        }

        // Check minimum member count
        const { count } = await supabase
            .from("TeamMembers")
            .select("*", { count: 'exact', head: true })
            .eq("team_id", teamId);

        if (count && count <= MIN_MEMBERS) {
            return res.status(400).json({ message: `Cannot remove member. Minimum team size of ${MIN_MEMBERS} required.` });
        }

        // Remove the member
        const { error: removeError } = await supabase
            .from("TeamMembers")
            .delete()
            .eq("team_id", teamId)
            .eq("user_id", memberId);

        if (removeError) {
            throw removeError;
        }

        return res.status(200).json({ message: "Member removed successfully." });

    } catch (error: any) {
        console.error("Controller Error [removeMemberById]:", error.message);
        if (error.message.includes("Member not found")) {
            return res.status(404).json({ message: error.message });
        }
        return res.status(500).json({ message: "Server Error", error: error.message });
    }
};

// 9. PATCH /api/team/update (Update Team Details)
export const updateTeamDetailsController = async (req: AuthenticatedRequest, res: Response): Promise<any> => {
    try {
        const userId = req.user!.id;
        const updates = req.body;

        // A. Security Check: Find team and ensure requester is the Leader
        const { data: team } = await supabase.from("Teams").select("id, leader_id").eq("leader_id", userId).single();

        if (!team) {
            // User is either not a leader or doesn't have a team
            return res.status(403).json({ message: "Forbidden. Only the Team Leader can update team details." });
        }

        // B. Call Service
        const updatedTeam = await updateTeamDetails(team.id, updates);

        return res.status(200).json({ 
            message: "Team details updated successfully.", 
            team: updatedTeam 
        });

    } catch (error: any) {
        if (error.message.includes("No valid fields")) {
            return res.status(400).json({ message: error.message });
        }
        return res.status(500).json({ message: "Server Error", error: error.message });
    }
};

// GET /api/team/:teamId? (Get Team Details for Admin/Judge or Participant)
export const getTeamDetailsController = async (req: AuthenticatedRequest, res: Response): Promise<any> => {
    try {
        const userId = req.user!.id;
        const requestedTeamId = req.params.teamId; 
        const userRole = req.user!.role;

        let teamIdToFetch: string | undefined;

        if (requestedTeamId) {
            // Case 1: ID provided (Admin/Judge lookup)
            if (userRole === 'participant') {
                return res.status(403).json({ message: "Forbidden. Participants can only view their own team." });
            }
            teamIdToFetch = requestedTeamId;
        } else {
            // Case 2: No ID provided (Participant looking up their own team)
            const { data: membership } = await supabase
                .from("TeamMembers")
                .select("team_id")
                .eq("user_id", userId)
                .maybeSingle(); 
            
            if (!membership) {
                return res.status(404).json({ message: "You do not belong to a team." });
            }
            teamIdToFetch = membership.team_id;
        }

        const { data: team, error: teamError } = await supabase
            .from("Teams")
            .select(`
                id, name, join_code, leader_id, is_finalized, verification_status,
                leader:Users!leader_id (
                    id, email, role,
                    Profiles (first_name, last_name, avatar_url)
                ),
                members:TeamMembers (
                    user:Users (
                        id, email, role,
                        Profiles (first_name, last_name, avatar_url)
                    )
                )
            `)
            .eq("id", teamIdToFetch)
            .single();

        if (teamError || !team) {
            // Log the error to your console for RLS policy issues (usually 404 in Supabase)
            console.error("TEAM FETCH ERROR:", teamError?.message);
            return res.status(404).json({ message: "Team not found." });
        }

        return res.status(200).json({ team });

    } catch (error: any) {
        console.error("GET Team Details Error:", error.message);
        return res.status(500).json({ message: "Server Error" });
    }
};