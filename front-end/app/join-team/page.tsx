'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { acceptInvite, getCurrentUser, checkInviteStatus } from '@/lib/api';

export default function JoinTeamPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  const [status, setStatus] = useState<'loading' | 'success' | 'error' | 'checking'>('checking');
  const [message, setMessage] = useState<string>('');
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);

  useEffect(() => {
    const checkAuthAndAccept = async () => {
      if (!token) {
        setStatus('error');
        setMessage('Invalid invitation link. No token provided.');
        return;
      }

      try {
        // First, check invite status and if user exists
        const inviteStatus = await checkInviteStatus(token);
        
        if (inviteStatus.error || !inviteStatus.valid) {
          setStatus('error');
          setMessage(inviteStatus.error || inviteStatus.message || 'Invalid invitation.');
          return;
        }

        // Check if user is authenticated
        const me = await getCurrentUser();
        
        if (!me.user) {
          // User not logged in - check if user exists
          if (!inviteStatus.userExists) {
            // User doesn't exist - redirect to signup with token preserved
            // Redirect immediately to signup page
            const redirectUrl = encodeURIComponent(`/join-team?token=${token}`);
            router.push(`/signup?redirect=${redirectUrl}&email=${encodeURIComponent(inviteStatus.email || '')}`);
            return;
          } else {
            // User exists but not logged in - redirect to login with token preserved
            // Redirect immediately to login page
            const redirectUrl = encodeURIComponent(`/join-team?token=${token}`);
            router.push(`/login?redirect=${redirectUrl}`);
            return;
          }
        }

        // User is authenticated - verify they have participant role
        if (me.user.role !== 'participant') {
          setStatus('error');
          setMessage('You must be a participant to accept team invitations. Please contact support.');
          return;
        }

        // Accept the invite
        setIsAuthenticated(true);
        setStatus('loading');
        setMessage('Accepting invitation...');

        const result = await acceptInvite(token);
        
        if (result.error) {
          setStatus('error');
          // Check if it's a role/permission error
          if (result.error.includes('Forbidden') || result.error.includes('role')) {
            setMessage('Access denied. Please make sure you are logged in as a participant and try again.');
          } else {
            setMessage(result.error || 'Failed to accept invitation.');
          }
        } else {
          setStatus('success');
          setMessage(result.message || 'Successfully joined the team!');
          // Redirect to dashboard after 2 seconds
          setTimeout(() => {
            router.push('/participant/dashboard');
          }, 2000);
        }
      } catch (error: any) {
        setStatus('error');
        setMessage(error.message || 'An error occurred. Please try again.');
        console.error('Join team error:', error);
      }
    };

    checkAuthAndAccept();
  }, [token, router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#E9E3FF] to-[#E9FFE5] px-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center">
        {status === 'checking' && (
          <>
            <div className="flex justify-center mb-4">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#5425FF]"></div>
            </div>
            <h1 className="text-2xl font-silkscreen text-[#5425FF] mb-2">Checking Invitation</h1>
            <p className="text-[#64748b] font-figtree">Please wait...</p>
          </>
        )}

        {status === 'loading' && (
          <>
            <div className="flex justify-center mb-4">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#5425FF]"></div>
            </div>
            <h1 className="text-2xl font-silkscreen text-[#5425FF] mb-2">Accepting Invitation</h1>
            <p className="text-[#64748b] font-figtree">{message}</p>
          </>
        )}

        {status === 'success' && (
          <>
            <div className="flex justify-center mb-4">
              <span className="material-symbols-rounded text-6xl text-green-500">check_circle</span>
            </div>
            <h1 className="text-2xl font-silkscreen text-[#5425FF] mb-2">Success!</h1>
            <p className="text-[#64748b] font-figtree mb-6">{message}</p>
            <p className="text-sm text-[#94a3b8] font-figtree">Redirecting to your team page...</p>
          </>
        )}

        {status === 'error' && (
          <>
            <div className="flex justify-center mb-4">
              <span className="material-symbols-rounded text-6xl text-red-500">error</span>
            </div>
            <h1 className="text-2xl font-silkscreen text-[#5425FF] mb-2">Invitation Error</h1>
            <p className="text-[#64748b] font-figtree mb-6">{message}</p>
            <div className="flex flex-col gap-3">
              {!isAuthenticated ? (
                <>
                  <Link
                    href={`/login?redirect=${encodeURIComponent(`/join-team?token=${token}`)}`}
                    className="w-full px-6 py-3 bg-[#5425FF] text-white rounded-xl font-figtree font-semibold hover:bg-[#4319CC] transition-colors"
                  >
                    Go to Login
                  </Link>
                  <Link
                    href={`/signup?redirect=${encodeURIComponent(`/join-team?token=${token}`)}`}
                    className="w-full px-6 py-3 bg-[#10B981] text-white rounded-xl font-figtree font-semibold hover:bg-[#059669] transition-colors"
                  >
                    Create Account
                  </Link>
                  <Link
                    href="/"
                    className="w-full px-6 py-3 border border-gray-300 text-[#0f172a] rounded-xl font-figtree font-semibold hover:bg-gray-50 transition-colors"
                  >
                    Go to Home
                  </Link>
                </>
              ) : (
                <>
                  <Link
                    href="/participant/dashboard"
                    className="w-full px-6 py-3 bg-[#5425FF] text-white rounded-xl font-figtree font-semibold hover:bg-[#4319CC] transition-colors"
                  >
                    Go to Dashboard
                  </Link>
                  <Link
                    href="/participant/teams"
                    className="w-full px-6 py-3 border border-gray-300 text-[#0f172a] rounded-xl font-figtree font-semibold hover:bg-gray-50 transition-colors"
                  >
                    Go to Teams Page
                  </Link>
                </>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

