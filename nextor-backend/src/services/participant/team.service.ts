import { supabase } from "../../lib/supabaseClient";
import { MAX_TEAM_SIZE, Role } from "../../constants";
import crypto from "crypto";
import { sendEmail } from "../../utils/email"; 

interface TeamMemberProfile {
    id: string;
    email: string;
    role: Role;
    is_verified: boolean;
    Profiles: {
        first_name: string;
        last_name: string;
        avatar_url: string | null;
    } | null;
}

// 1. GET TEAM MEMBERS
//Retrieves all members of a specific team with their full profile details.
export const getTeamMembers = async (teamId: string): Promise<TeamMemberProfile[]> => {
    // Perform a complex JOIN query: TeamMembers -> Users -> Profiles
    const { data: teamMembersData, error } = await supabase
        .from("TeamMembers")
        .select(`
            user:Users (
                id, email, role, is_verified,
                Profiles (first_name, last_name, avatar_url)
            )
        `)
        .eq("team_id", teamId);

    if (error) {
        console.error("Service Error [getTeamMembers]:", error.message);
        throw new Error("Failed to fetch team members.");
    }

    // A. Explicitly type the expected nested user structure for safety
    type NestedUser = { user: TeamMemberProfile | null };

    // B. Filter, map, and flatten the result
    // We cast the data to the expected shape before mapping to make TypeScript happy.
    const nestedData = teamMembersData as unknown as NestedUser[];

    return nestedData
        .map(member => member.user)
        .filter((user): user is TeamMemberProfile => user !== null); // Use a type guard to filter out nulls safely
};


// 2. REMOVE TEAM MEMBER

// Removes a member from a team by deleting their TeamMembers entry.
export const removeTeamMember = async (teamId: string, memberId: string): Promise<void> => {
    // A. Security Check: Ensure the member is actually linked to this team
    const { data: membership, error: checkError } = await supabase
        .from("TeamMembers")
        .select("team_id")
        .eq("team_id", teamId)
        .eq("user_id", memberId)
        .maybeSingle();

    if (checkError) throw checkError;
    if (!membership) {
        throw new Error("Member not found in the specified team.");
    }

    // B. Delete the membership link
    const { error: deleteError } = await supabase
        .from("TeamMembers")
        .delete()
        .eq("team_id", teamId)
        .eq("user_id", memberId);

    if (deleteError) {
        console.error("Service Error [removeTeamMember]:", deleteError.message);
        throw new Error("Failed to remove member from team.");
    }
};

// 3. INVITE TEAM MEMBER
//Creates an invite token and sends an email. Reuses logic from team.controller.
export const inviteTeamMember = async (teamId: string, teamName: string, email: string, currentMemberCount: number): Promise<void> => {
    if (currentMemberCount >= MAX_TEAM_SIZE) {
        throw new Error("Team is already full (Max 4 members).");
    }

    // A. Create Invitation Token
    const inviteToken = crypto.randomBytes(16).toString("hex");
    const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000); // 48 hours

    const { error: inviteError } = await supabase
      .from("TeamInvitations")
      .insert([{
        team_id: teamId,
        email: email,
        token: inviteToken,
        expires_at: expiresAt.toISOString(),
        status: 'pending'
      }]);

    if (inviteError) {
        if (inviteError.code === '23505') throw new Error("User already has a pending invite for this team.");
        throw inviteError;
    }

    // B. Send Invite Email
    const inviteLink = `${process.env.FRONTEND_URL}/join-team?token=${inviteToken}`;

    await sendEmail({
      to: email,
      subject: `Invitation to join ${teamName} on HackOnX`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #E9E3FF 0%, #E9FFE5 100%); padding: 30px; border-radius: 12px; text-align: center; margin-bottom: 20px;">
            <h1 style="color: #5425FF; margin: 0; font-size: 28px;">Team Invitation</h1>
          </div>
          
          <div style="background: #ffffff; padding: 30px; border-radius: 12px; border: 1px solid #e5e7eb;">
            <p style="color: #374151; font-size: 16px; line-height: 1.6; margin-bottom: 20px;">
              Hello!
            </p>
            
            <p style="color: #374151; font-size: 16px; line-height: 1.6; margin-bottom: 20px;">
              You have been invited to join the team <strong style="color: #5425FF;">${teamName}</strong> on HackOnX.
            </p>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${inviteLink}" 
                 style="display: inline-block; background: #5425FF; color: #ffffff; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">
                Accept Invitation
              </a>
            </div>
            
            <p style="color: #6b7280; font-size: 14px; line-height: 1.6; margin-top: 20px;">
              Or copy and paste this link into your browser:
            </p>
            <p style="color: #5425FF; font-size: 12px; word-break: break-all; background: #f3f4f6; padding: 12px; border-radius: 6px; margin: 10px 0;">
              ${inviteLink}
            </p>
            
            <div style="background: #fef3c7; border-left: 4px solid #f59e0b; padding: 12px; margin-top: 20px; border-radius: 4px;">
              <p style="color: #92400e; font-size: 13px; margin: 0;">
                ⏰ <strong>Note:</strong> This invitation link expires in 48 hours.
              </p>
            </div>
          </div>
          
          <div style="text-align: center; margin-top: 20px; color: #9ca3af; font-size: 12px;">
            <p>If you didn't request this invitation, you can safely ignore this email.</p>
            <p style="margin-top: 10px;">© HackOnX - India's Multi-State HPC Hackathon</p>
          </div>
        </div>
      `,
      text: `You have been invited to join the team ${teamName} on HackOnX.\n\nAccept the invitation by clicking this link: ${inviteLink}\n\nThis link expires in 48 hours.\n\nIf you didn't request this invitation, you can safely ignore this email.`,
    });
};

// 4. UPDATE TEAM DETAILS (PATCH)
interface TeamUpdateData {
    name?: string;
    project_category?: string;
}

export const updateTeamDetails = async (teamId: string, updates: TeamUpdateData): Promise<any> => {
    // Only update allowed fields
    const validUpdates = {
        name: updates.name,
        // project_category: updates.project_category, // Uncomment when column is added
    };
    
    // Remove undefined properties to prevent errors during update
    Object.keys(validUpdates).forEach((key) => {
        const typedKey = key as keyof typeof validUpdates;
        if (validUpdates[typedKey] === undefined) {
            delete validUpdates[typedKey];
        }
    });

    if (Object.keys(validUpdates).length === 0) {
        throw new Error("No valid fields provided for update.");
    }

    const { data: updatedTeam, error } = await supabase
        .from("Teams")
        .update(validUpdates)
        .eq("id", teamId)
        .select()
        .single();

    if (error) {
        console.error("Service Error [updateTeamDetails]:", error.message);
        throw new Error("Failed to update team details.");
    }
    
    return updatedTeam;
};