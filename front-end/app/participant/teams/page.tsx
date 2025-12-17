'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  getCurrentUser,
  getTeamDetails,
  createTeam,
  joinTeam,
  sendTeamInvite,
  removeMemberById,
  getMyTeamMembers,
  logout,
} from '@/lib/api';

interface TeamMember {
  id: string;
  email: string;
  role: string;
  Profiles: {
    first_name: string;
    last_name: string;
    avatar_url: string | null;
  } | null;
  is_verified?: boolean;
}

interface TeamLeader {
  id: string;
  email: string;
  role: string;
  Profiles: {
    first_name: string;
    last_name: string;
    avatar_url: string | null;
  } | null;
}

interface Team {
  id: string;
  name: string;
  join_code: string;
  leader_id: string;
  is_finalized: boolean;
  verification_status: string;
  leader?: TeamLeader;
}

export default function TeamsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [isLoadingMembers, setIsLoadingMembers] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [team, setTeam] = useState<Team | null>(null);
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [isLeader, setIsLeader] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  // Form states
  const [showCreateTeam, setShowCreateTeam] = useState(false);
  const [showJoinTeam, setShowJoinTeam] = useState(false);
  const [showInviteForm, setShowInviteForm] = useState(false);
  const [showRemoveConfirm, setShowRemoveConfirm] = useState<{ show: boolean; memberId: string; memberName: string }>({
    show: false,
    memberId: '',
    memberName: '',
  });

  // Form inputs
  const [teamName, setTeamName] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');

  // Messages
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const me = await getCurrentUser();
        if (!me.user) {
          router.replace('/login');
          return;
        }
        if (me.user.role && me.user.role !== 'participant') {
          router.replace('/');
          return;
        }

        setCurrentUserId(me.user.id);
        await loadTeamData(me.user.id); // Pass user ID directly
      } catch (err: any) {
        setError(err.message || 'Failed to load team data. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [router]);

  const loadTeamData = async (userId: string) => {
    try {
      // Load team details first
      const teamResult = await getTeamDetails();
      if (teamResult.team) {
        setTeam(teamResult.team);
        // Check if current user is leader using the passed userId
        setIsLeader(teamResult.team.leader_id === userId);
        
        // Load members using GET /api/teams/me/members (as per requirements)
        await loadMembers();
      } else {
        setTeam(null);
        setMembers([]);
        setIsLeader(false);
      }
    } catch (err: any) {
      if (err.message?.includes('not found') || err.message?.includes('do not belong')) {
        setTeam(null);
        setMembers([]);
        setIsLeader(false);
      } else {
        console.error('Failed to load team:', err);
        setError('Failed to load team data. Please try again.');
      }
    }
  };

  const loadMembers = async () => {
    setIsLoadingMembers(true);
    setError(null);
    try {
      const result = await getMyTeamMembers();
      console.log('API Response:', result);
      
      if (result.error) {
        setError(result.error || 'Failed to load team members');
        setMembers([]);
      } else {
        // Handle both array and object response formats
        let membersList: TeamMember[] = [];
        
        if (Array.isArray(result)) {
          // If result is directly an array
          membersList = result;
        } else if (result.members && Array.isArray(result.members)) {
          // If result has members property
          membersList = result.members;
        } else if (result.data && Array.isArray(result.data)) {
          // If result has data property
          membersList = result.data;
        }
        
        console.log('Processed team members:', membersList);
        console.log('Members count:', membersList.length);
        
        // Ensure we're setting the members correctly
        setMembers(membersList);
      }
    } catch (err: any) {
      console.error('Error loading members:', err);
      setError(err.message || 'Failed to load team members');
      setMembers([]);
    } finally {
      setIsLoadingMembers(false);
    }
  };


  const handleCreateTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setSuccessMessage(null);

    if (!teamName.trim()) {
      setFormError('Team name is required');
      return;
    }

    try {
      const result = await createTeam(teamName.trim());
      if (result.error) {
        setFormError(result.error);
      } else {
        setSuccessMessage(result.message || 'Team created successfully!');
        setTeamName('');
        setShowCreateTeam(false);
        await loadTeamData();
      }
    } catch (err: any) {
      setFormError(err.message || 'Failed to create team');
    }
  };

  const handleJoinTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setSuccessMessage(null);

    if (!joinCode.trim()) {
      setFormError('Join code is required');
      return;
    }

    try {
      const result = await joinTeam(joinCode.trim().toUpperCase());
      if (result.error) {
        setFormError(result.error);
      } else {
        setSuccessMessage(result.message || 'Successfully joined team!');
        setJoinCode('');
        setShowJoinTeam(false);
        await loadTeamData();
      }
    } catch (err: any) {
      setFormError(err.message || 'Failed to join team');
    }
  };

  const handleSendInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setSuccessMessage(null);

    // Security check: Only leader can send invites
    if (!isLeader) {
      setFormError('Only the Team Leader can invite members.');
      return;
    }

    if (!inviteEmail.trim()) {
      setFormError('Email is required');
      return;
    }

    const emailToInvite = inviteEmail.trim();

    try {
      const result = await sendTeamInvite(emailToInvite);
      if (result.error) {
        setFormError(result.error);
      } else {
        // Show success message and clear form
        setSuccessMessage(`Invite sent to ${emailToInvite}!`);
        setInviteEmail('');
        setShowInviteForm(false); // Hide form after successful invite
        
        // Reload members and pending invites to show the new invitation
        await loadMembers();
        
        // Auto-dismiss success message after 5 seconds
        setTimeout(() => {
          setSuccessMessage(null);
        }, 5000);
      }
    } catch (err: any) {
      setFormError(err.message || 'Failed to send invite');
    }
  };

  const handleRemoveMember = async () => {
    if (!showRemoveConfirm.memberId) return;

    setFormError(null);
    setSuccessMessage(null);

    try {
      const result = await removeMemberById(showRemoveConfirm.memberId);
      if (result.error) {
        setFormError(result.error);
      } else {
        setSuccessMessage(result.message || 'Member removed successfully');
        setShowRemoveConfirm({ show: false, memberId: '', memberName: '' });
        // Refresh members list
        await loadMembers();
      }
    } catch (err: any) {
      setFormError(err.message || 'Failed to remove member');
    }
  };

  const getMemberFullName = (member: TeamMember): string => {
    if (member.Profiles?.first_name && member.Profiles?.last_name) {
      return `${member.Profiles.first_name} ${member.Profiles.last_name}`;
    }
    return member.email;
  };

  const MAX_TEAM_SIZE = 4;
  const isTeamFull = members.length >= MAX_TEAM_SIZE;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#E9E3FF] to-[#E9FFE5]">
        <div className="flex items-center gap-3 text-[#5425FF] font-figtree">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#5425FF]" />
          <span>Loading team...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8f8ff] text-[#0f172a] flex">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-gray-200 px-6 py-8 flex flex-col">
        <div className="text-2xl font-silkscreen text-[#5425FF] mb-6">
          Participant Portal
        </div>
        <nav className="flex flex-col gap-3 text-[#475569] font-figtree">
          <Link
            href="/participant/dashboard"
            className="flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-gray-100"
          >
            <span className="material-symbols-rounded text-lg">home</span> Dashboard
          </Link>
          <Link
            href="/participant/teams"
            className="flex items-center gap-3 px-3 py-2 rounded-xl bg-[#EFEAFF] text-[#5425FF] font-semibold"
          >
            <span className="material-symbols-rounded text-lg">groups</span> Team
          </Link>
          <Link href="/participant/submission" className="flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-gray-100">
            <span className="material-symbols-rounded text-lg">inventory_2</span> Submission
          </Link>
          <Link href="/participant/profile" className="flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-gray-100">
            <span className="material-symbols-rounded text-lg">person</span> Profile
          </Link>
          <Link href="/participant/notifications" className="flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-gray-100">
            <span className="material-symbols-rounded text-lg">notifications</span> Notifications
          </Link>
          <Link href="/participant/settings" className="flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-gray-100">
            <span className="material-symbols-rounded text-lg">settings</span> Settings
          </Link>
        </nav>
        <div className="mt-auto pt-6">
          <button
            onClick={async () => {
              try {
                await logout();
              } finally {
                router.replace('/login');
              }
            }}
            className="w-full px-4 py-3 rounded-xl bg-red-500 text-white font-figtree font-semibold hover:bg-red-600 transition-colors flex items-center justify-center gap-2"
          >
            <span className="material-symbols-rounded">logout</span> Logout
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 px-8 py-8 space-y-6 overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-silkscreen text-[#0f172a]">Team Management</h1>
            <p className="text-[#64748b] font-figtree">Manage your team, members, and settings.</p>
          </div>
        </div>

        {/* Messages */}
        {successMessage && (
          <div className="bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded-xl font-figtree flex items-center gap-2">
            <span className="material-symbols-rounded">check_circle</span>
            {successMessage}
          </div>
        )}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-xl font-figtree flex items-center gap-2">
            <span className="material-symbols-rounded">error</span>
            {error}
          </div>
        )}
        {formError && (
          <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-xl font-figtree flex items-center gap-2">
            <span className="material-symbols-rounded">error</span>
            {formError}
          </div>
        )}

        {/* No Team State */}
        {!team && (
          <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-100">
            <div className="text-center space-y-6">
              <div className="flex justify-center">
                <span className="material-symbols-rounded text-8xl text-[#5425FF]">groups</span>
              </div>
              <div>
                <h2 className="text-2xl font-silkscreen text-[#5425FF] mb-2">You're not in a team yet</h2>
                <p className="text-[#64748b] font-figtree mb-6">
                  Create a new team or join an existing one to get started.
                </p>
              </div>
              <div className="flex gap-4 justify-center">
                <button
                  onClick={() => {
                    setShowCreateTeam(true);
                    setShowJoinTeam(false);
                  }}
                  className="px-6 py-3 bg-[#5425FF] text-white rounded-xl font-figtree font-semibold hover:bg-[#4319CC] transition-colors flex items-center gap-2"
                >
                  <span className="material-symbols-rounded">add</span> Create Team
                </button>
                <button
                  onClick={() => {
                    setShowJoinTeam(true);
                    setShowCreateTeam(false);
                  }}
                  className="px-6 py-3 border-2 border-[#5425FF] text-[#5425FF] rounded-xl font-figtree font-semibold hover:bg-[#EFEAFF] transition-colors flex items-center gap-2"
                >
                  <span className="material-symbols-rounded">group_add</span> Join Team
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Create Team Form */}
        {showCreateTeam && !team && (
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <h3 className="text-xl font-silkscreen text-[#5425FF] mb-4 flex items-center gap-2">
              <span className="material-symbols-rounded">group_add</span> Create New Team
            </h3>
            <form onSubmit={handleCreateTeam} className="space-y-4">
              <div>
                <label className="block text-sm font-figtree font-semibold text-[#0f172a] mb-2">
                  Team Name
                </label>
                <input
                  type="text"
                  value={teamName}
                  onChange={(e) => setTeamName(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl font-figtree focus:outline-none focus:ring-2 focus:ring-[#5425FF]"
                  placeholder="Enter team name"
                  required
                />
              </div>
              <div className="flex gap-3">
                <button
                  type="submit"
                  className="flex-1 px-4 py-3 bg-[#5425FF] text-white rounded-xl font-figtree font-semibold hover:bg-[#4319CC] transition-colors flex items-center justify-center gap-2"
                >
                  <span className="material-symbols-rounded">check</span> Create Team
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateTeam(false);
                    setTeamName('');
                    setFormError(null);
                  }}
                  className="px-4 py-3 border border-gray-300 text-[#0f172a] rounded-xl font-figtree font-semibold hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Join Team Form */}
        {showJoinTeam && !team && (
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <h3 className="text-xl font-silkscreen text-[#5425FF] mb-4 flex items-center gap-2">
              <span className="material-symbols-rounded">login</span> Join Team
            </h3>
            <form onSubmit={handleJoinTeam} className="space-y-4">
              <div>
                <label className="block text-sm font-figtree font-semibold text-[#0f172a] mb-2">
                  Join Code
                </label>
                <input
                  type="text"
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl font-figtree focus:outline-none focus:ring-2 focus:ring-[#5425FF] uppercase"
                  placeholder="Enter 6-character join code"
                  maxLength={6}
                  required
                />
                <p className="text-xs text-[#64748b] font-figtree mt-1">
                  Ask your team leader for the join code
                </p>
              </div>
              <div className="flex gap-3">
                <button
                  type="submit"
                  className="flex-1 px-4 py-3 bg-[#5425FF] text-white rounded-xl font-figtree font-semibold hover:bg-[#4319CC] transition-colors flex items-center justify-center gap-2"
                >
                  <span className="material-symbols-rounded">check</span> Join Team
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowJoinTeam(false);
                    setJoinCode('');
                    setFormError(null);
                  }}
                  className="px-4 py-3 border border-gray-300 text-[#0f172a] rounded-xl font-figtree font-semibold hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Team Status Card */}
        {team && (
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <h2 className="text-2xl font-silkscreen text-[#5425FF] mb-2">{team.name}</h2>
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm font-figtree text-[#64748b]">
                    <span className="material-symbols-rounded text-base">qr_code</span>
                    <span className="font-mono font-semibold text-[#5425FF]">Join Code: {team.join_code}</span>
                  </div>
                  <div className="flex items-center gap-4 text-sm font-figtree text-[#64748b]">
                    <span className="flex items-center gap-1">
                      <span className="material-symbols-rounded text-base">
                        {team.is_finalized ? 'lock' : 'lock_open'}
                      </span>
                      Status: {team.is_finalized ? 'Finalized' : 'Draft'}
                    </span>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <span className="material-symbols-rounded text-base">verified</span>
                      Verification: {team.verification_status || 'Pending'}
                    </span>
                  </div>
                  {isLeader ? (
                    <div className="flex items-center gap-2 text-sm font-figtree text-[#5425FF] font-semibold mt-2">
                      <span className="material-symbols-rounded text-base">star</span>
                      <span>You are the Team Leader</span>
                    </div>
                  ) : team.leader && (
                    <div className="flex items-center gap-2 text-sm font-figtree text-[#64748b] mt-2">
                      <span className="material-symbols-rounded text-base">person</span>
                      <span>
                        Team Leader: {team.leader.Profiles 
                          ? `${team.leader.Profiles.first_name} ${team.leader.Profiles.last_name}` 
                          : team.leader.email}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Team Members Table */}
        {team && (
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <h3 className="text-xl font-silkscreen text-[#5425FF] flex items-center gap-2">
                  <span className="material-symbols-rounded">people</span>
                  Team Members ({members.length}/{MAX_TEAM_SIZE})
                </h3>
                <button
                  onClick={async () => {
                    await loadMembers();
                    setSuccessMessage('Members list refreshed');
                    setTimeout(() => setSuccessMessage(null), 3000);
                  }}
                  className="px-3 py-1 border border-gray-300 text-[#64748b] rounded-lg font-figtree font-semibold hover:bg-gray-50 transition-colors text-sm flex items-center gap-1"
                  title="Refresh members list"
                >
                  <span className="material-symbols-rounded text-base">refresh</span>
                </button>
              </div>
              {isLeader && !isTeamFull && !showInviteForm && (
                <button
                  onClick={() => {
                    setShowInviteForm(true);
                    setInviteEmail('');
                    setFormError(null);
                    setSuccessMessage(null);
                  }}
                  className="px-4 py-2 bg-[#5425FF] text-white rounded-xl font-figtree font-semibold hover:bg-[#4319CC] transition-colors text-sm flex items-center gap-1"
                >
                  <span className="material-symbols-rounded text-lg">person_add</span> Add Member
                </button>
              )}
            </div>

            {/* Team Full Message */}
            {isLeader && isTeamFull && (
              <div className="bg-blue-50 border border-blue-200 text-blue-800 px-4 py-3 rounded-xl font-figtree flex items-center gap-2 mb-4">
                <span className="material-symbols-rounded">info</span>
                Maximum team size reached ({members.length}/{MAX_TEAM_SIZE})
              </div>
            )}

            {/* Invite Member Form - Only visible for Leader and if team is not full */}
            {isLeader && !isTeamFull && showInviteForm && (
              <div className="bg-[#f8fafc] border border-gray-200 rounded-xl p-4 mb-4">
                <h4 className="text-lg font-figtree font-semibold text-[#5425FF] mb-3 flex items-center gap-2">
                  <span className="material-symbols-rounded">mail</span> Invite Team Member
                </h4>
                <form onSubmit={handleSendInvite} className="space-y-3">
                  <div>
                    <label className="block text-sm font-figtree font-semibold text-[#0f172a] mb-2">
                      Invitee's Email Address
                    </label>
                    <input
                      type="email"
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl font-figtree focus:outline-none focus:ring-2 focus:ring-[#5425FF]"
                      placeholder="Enter email address"
                      required
                    />
                  </div>
                  <div className="flex gap-3">
                    <button
                      type="submit"
                      className="px-6 py-2 bg-[#5425FF] text-white rounded-xl font-figtree font-semibold hover:bg-[#4319CC] transition-colors flex items-center gap-2 text-sm"
                    >
                      <span className="material-symbols-rounded text-lg">send</span> Send Invite
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowInviteForm(false);
                        setInviteEmail('');
                        setFormError(null);
                      }}
                      className="px-6 py-2 border border-gray-300 text-[#0f172a] rounded-xl font-figtree font-semibold hover:bg-gray-50 transition-colors text-sm"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            )}

            {isLoadingMembers ? (
              <div className="flex items-center justify-center py-12">
                <div className="flex items-center gap-3 text-[#5425FF] font-figtree">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#5425FF]" />
                  <span>Loading members...</span>
                </div>
              </div>
            ) : members.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-[#64748b] font-figtree mb-2">No members found</p>
                <p className="text-sm text-[#94a3b8] font-figtree">Team members who accept invitations will appear here.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-3 px-4 font-figtree font-semibold text-[#0f172a]">Role</th>
                      <th className="text-left py-3 px-4 font-figtree font-semibold text-[#0f172a]">Name</th>
                      <th className="text-left py-3 px-4 font-figtree font-semibold text-[#0f172a]">Email</th>
                      <th className="text-left py-3 px-4 font-figtree font-semibold text-[#0f172a]">Status</th>
                      {isLeader && <th className="text-left py-3 px-4 font-figtree font-semibold text-[#0f172a]">Actions</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {/* Display Team Leader first */}
                    {members
                      .filter(member => team.leader_id === member.id)
                      .map((member) => {
                        const fullName = getMemberFullName(member);
                        const verified = member.is_verified === true;

                        return (
                          <tr key={member.id} className="border-b border-gray-100 hover:bg-gray-50">
                            <td className="py-3 px-4 font-figtree">
                              <span className="inline-flex items-center gap-1 px-2 py-1 bg-[#5425FF] text-white rounded-full text-xs font-semibold">
                                <span className="material-symbols-rounded text-sm">star</span>
                                Team Leader
                              </span>
                            </td>
                            <td className="py-3 px-4 font-figtree font-semibold text-[#0f172a]">
                              {fullName}
                            </td>
                            <td className="py-3 px-4 font-figtree text-[#64748b]">
                              {member.email}
                            </td>
                            <td className="py-3 px-4 font-figtree">
                              {verified ? (
                                <span className="inline-flex items-center gap-1 text-green-600">
                                  <span className="material-symbols-rounded text-sm">check_circle</span>
                                  Verified
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-[#64748b]">
                                  <span className="material-symbols-rounded text-sm">pending</span>
                                  Pending
                                </span>
                              )}
                            </td>
                            {isLeader && <td className="py-3 px-4 font-figtree"></td>}
                          </tr>
                        );
                      })}
                    
                    {/* Display Accepted Team Members (who accepted invitations) below Team Leader */}
                    {members
                      .filter(member => team.leader_id !== member.id)
                      .map((member) => {
                        const fullName = getMemberFullName(member);
                        const verified = member.is_verified === true;

                        return (
                          <tr key={member.id} className="border-b border-gray-100 hover:bg-gray-50">
                            <td className="py-3 px-4 font-figtree">
                              <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-50 text-green-700 rounded-full text-xs font-semibold">
                                <span className="material-symbols-rounded text-sm">check_circle</span>
                                Accepted
                              </span>
                            </td>
                            <td className="py-3 px-4 font-figtree font-semibold text-[#0f172a]">
                              {fullName || member.email}
                            </td>
                            <td className="py-3 px-4 font-figtree text-[#64748b]">
                              {member.email}
                            </td>
                            <td className="py-3 px-4 font-figtree">
                              {verified ? (
                                <span className="inline-flex items-center gap-1 text-green-600">
                                  <span className="material-symbols-rounded text-sm">check_circle</span>
                                  Verified
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-[#64748b]">
                                  <span className="material-symbols-rounded text-sm">pending</span>
                                  Pending
                                </span>
                              )}
                            </td>
                            {isLeader && (
                              <td className="py-3 px-4 font-figtree">
                                <button
                                  onClick={() => {
                                    setShowRemoveConfirm({
                                      show: true,
                                      memberId: member.id,
                                      memberName: fullName || member.email,
                                    });
                                  }}
                                  className="px-3 py-1 text-red-600 border border-red-300 rounded-lg font-figtree font-semibold hover:bg-red-50 transition-colors text-sm flex items-center gap-1"
                                >
                                  <span className="material-symbols-rounded text-sm">person_remove</span>
                                  Remove
                                </button>
                              </td>
                            )}
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Remove Member Confirmation Modal */}
        {showRemoveConfirm.show && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-2xl p-6 shadow-xl max-w-md w-full mx-4">
              <h3 className="text-xl font-silkscreen text-[#0f172a] mb-4">Confirm Removal</h3>
              <p className="text-[#64748b] font-figtree mb-6">
                Are you sure you want to remove <strong>{showRemoveConfirm.memberName}</strong> from the team?
              </p>
              <div className="flex gap-3">
                <button
                  onClick={handleRemoveMember}
                  className="flex-1 px-4 py-2 bg-red-600 text-white rounded-xl font-figtree font-semibold hover:bg-red-700 transition-colors"
                >
                  Yes, Remove
                </button>
                <button
                  onClick={() => {
                    setShowRemoveConfirm({ show: false, memberId: '', memberName: '' });
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 text-[#0f172a] rounded-xl font-figtree font-semibold hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
