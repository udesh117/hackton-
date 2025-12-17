'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { getCurrentUser } from '@/lib/api';

interface UserProfile {
  id: string;
  email: string;
  role: string;
  Profiles: {
    first_name: string;
    last_name: string;
    avatar_url: string | null;
    bio: string | null;
    phone: string | null;
    linkedin_url: string | null;
    github_url: string | null;
  } | null;
}

export default function ProfilePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [user, setUser] = useState<UserProfile | null>(null);

  useEffect(() => {
    const loadUserProfile = async () => {
      try {
        setLoading(true);
        setError(null);

        const result = await getCurrentUser();
        
        if (result.error || !result.user) {
          setError(result.error || 'Failed to load user profile');
          if (result.error?.includes('Unauthorized') || result.message?.includes('Unauthorized')) {
            router.push('/login');
            return;
          }
          return;
        }

        // The API returns { message: "...", user: { id, email, role, Profiles: {...} } }
        // Profiles can be an array or a single object from Supabase
        const userData = result.user as any;
        
        // Handle Supabase's nested structure (Profiles might be an array)
        if (userData.Profiles) {
          const profiles = Array.isArray(userData.Profiles) ? userData.Profiles[0] : userData.Profiles;
          setUser({
            ...userData,
            Profiles: profiles || null
          });
        } else {
          // Fallback: if Profiles is missing, set it to null
          setUser({
            ...userData,
            Profiles: null
          });
        }
      } catch (err: any) {
        console.error('Failed to load profile:', err);
        setError(err.message || 'Failed to load user profile');
      } finally {
        setLoading(false);
      }
    };

    loadUserProfile();
  }, [router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f8f8ff] flex items-center justify-center">
        <div className="flex items-center gap-3 text-[#5425FF] font-figtree">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#5425FF]" />
          <span>Loading profile...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#f8f8ff] flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-white shadow-xl rounded-2xl p-6 text-center">
          <p className="text-xl font-figtree text-red-600 mb-4">Error</p>
          <p className="text-gray-700 font-figtree mb-6">{error}</p>
          <div className="flex flex-col gap-3">
            <button
              onClick={() => router.refresh()}
              className="w-full bg-[#5425FF] text-white py-3 rounded-xl font-figtree font-semibold hover:bg-[#4319CC]"
            >
              Retry
            </button>
            <Link
              href="/participant/dashboard"
              className="w-full text-center border border-[#5425FF] text-[#5425FF] py-3 rounded-xl font-figtree font-semibold hover:bg-[#F9F9F9]"
            >
              Back to Dashboard
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const profile = user?.Profiles;
  const fullName = profile 
    ? `${profile.first_name} ${profile.last_name}`.trim()
    : 'Not set';

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
          <Link href="/participant/teams" className="flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-gray-100">
            <span className="material-symbols-rounded text-lg">groups</span> Team
          </Link>
          <Link href="/participant/submission" className="flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-gray-100">
            <span className="material-symbols-rounded text-lg">inventory_2</span> Submission
          </Link>
          <Link href="/participant/profile" className="flex items-center gap-3 px-3 py-2 rounded-xl bg-[#EFEAFF] text-[#5425FF] font-semibold">
            <span className="material-symbols-rounded text-lg">person</span> Profile
          </Link>
          <Link href="#" className="flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-gray-100">
            <span className="material-symbols-rounded text-lg">notifications</span> Notifications
          </Link>
          <Link href="#" className="flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-gray-100">
            <span className="material-symbols-rounded text-lg">settings</span> Settings
          </Link>
        </nav>
        <div className="mt-auto pt-6">
          <button
            onClick={async () => {
              try {
                const { logout } = await import('@/lib/api');
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
      <main className="flex-1 px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-silkscreen text-[#0f172a] mb-2">
            Profile
          </h1>
          <p className="text-[#64748b] font-figtree">
            View and manage your profile information.
          </p>
        </div>

        {/* Profile Card */}
        <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-100">
          <div className="flex flex-col md:flex-row gap-6 mb-8">
            {/* Avatar Section */}
            <div className="flex flex-col items-center md:items-start">
              <div className="w-32 h-32 rounded-full bg-gradient-to-br from-[#5425FF] to-[#7C3AED] flex items-center justify-center text-white text-4xl font-silkscreen mb-4">
                {profile?.avatar_url ? (
                  <img
                    src={profile.avatar_url}
                    alt={fullName}
                    className="w-full h-full rounded-full object-cover"
                  />
                ) : (
                  <span>
                    {fullName
                      .split(' ')
                      .map((n) => n[0])
                      .join('')
                      .toUpperCase()
                      .slice(0, 2) || 'U'}
                  </span>
                )}
              </div>
              <h2 className="text-2xl font-silkscreen text-[#5425FF] text-center md:text-left">
                {fullName}
              </h2>
              <p className="text-[#64748b] font-figtree text-sm mt-1">
                {user?.role ? user.role.charAt(0).toUpperCase() + user.role.slice(1) : 'Participant'}
              </p>
            </div>

            {/* Profile Details */}
            <div className="flex-1 space-y-6">
              {/* Basic Information */}
              <div>
                <h3 className="text-lg font-silkscreen text-[#5425FF] mb-4 flex items-center gap-2">
                  <span className="material-symbols-rounded text-xl">info</span>
                  Basic Information
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-figtree text-[#64748b] mb-1">First Name</p>
                    <p className="text-base font-figtree font-semibold text-[#0f172a]">
                      {profile?.first_name || 'Not set'}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-figtree text-[#64748b] mb-1">Last Name</p>
                    <p className="text-base font-figtree font-semibold text-[#0f172a]">
                      {profile?.last_name || 'Not set'}
                    </p>
                  </div>
                  <div className="md:col-span-2">
                    <p className="text-sm font-figtree text-[#64748b] mb-1">Email Address</p>
                    <p className="text-base font-figtree font-semibold text-[#0f172a]">
                      {user?.email || 'Not set'}
                    </p>
                  </div>
                  {profile?.phone && (
                    <div>
                      <p className="text-sm font-figtree text-[#64748b] mb-1">Phone Number</p>
                      <p className="text-base font-figtree font-semibold text-[#0f172a]">
                        {profile.phone}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Bio */}
              {profile?.bio && (
                <div>
                  <h3 className="text-lg font-silkscreen text-[#5425FF] mb-4 flex items-center gap-2">
                    <span className="material-symbols-rounded text-xl">description</span>
                    Bio
                  </h3>
                  <p className="text-base font-figtree text-[#0f172a] whitespace-pre-wrap">
                    {profile.bio}
                  </p>
                </div>
              )}

              {/* Social Links */}
              {(profile?.github_url || profile?.linkedin_url) && (
                <div>
                  <h3 className="text-lg font-silkscreen text-[#5425FF] mb-4 flex items-center gap-2">
                    <span className="material-symbols-rounded text-xl">link</span>
                    Social Links
                  </h3>
                  <div className="flex flex-wrap gap-4">
                    {profile.github_url && (
                      <a
                        href={profile.github_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-xl font-figtree font-semibold text-[#0f172a] transition-colors"
                      >
                        <span className="material-symbols-rounded text-lg">code</span>
                        GitHub
                      </a>
                    )}
                    {profile.linkedin_url && (
                      <a
                        href={profile.linkedin_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-xl font-figtree font-semibold text-[#0f172a] transition-colors"
                      >
                        <span className="material-symbols-rounded text-lg">work</span>
                        LinkedIn
                      </a>
                    )}
                  </div>
                </div>
              )}

              {/* Account Information */}
              <div>
                <h3 className="text-lg font-silkscreen text-[#5425FF] mb-4 flex items-center gap-2">
                  <span className="material-symbols-rounded text-xl">account_circle</span>
                  Account Information
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-figtree text-[#64748b] mb-1">User ID</p>
                    <p className="text-base font-figtree font-mono text-[#0f172a] text-sm">
                      {user?.id || 'Not available'}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-figtree text-[#64748b] mb-1">Role</p>
                    <p className="text-base font-figtree font-semibold text-[#0f172a]">
                      {user?.role ? user.role.charAt(0).toUpperCase() + user.role.slice(1) : 'Not set'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-6 border-t border-gray-200">
            <button
              onClick={() => {
                // TODO: Implement edit profile functionality
                alert('Edit profile functionality coming soon!');
              }}
              className="px-6 py-2 bg-[#5425FF] text-white rounded-xl font-figtree font-semibold hover:bg-[#4319CC] transition-colors flex items-center gap-2"
            >
              <span className="material-symbols-rounded text-lg">edit</span>
              Edit Profile
            </button>
            <Link
              href="/participant/dashboard"
              className="px-6 py-2 border border-gray-300 text-[#0f172a] rounded-xl font-figtree font-semibold hover:bg-gray-50 transition-colors flex items-center gap-2"
            >
              <span className="material-symbols-rounded text-lg">arrow_back</span>
              Back to Dashboard
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}

