'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

export default function VerifyEmailPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState<string>('');

  useEffect(() => {
    const token = searchParams.get('token');

    console.log('🔍 Verification page loaded:', {
      token: token ? `${token.substring(0, 10)}...` : 'missing',
      API_BASE_URL,
      hasToken: !!token
    });

    if (!token) {
      setStatus('error');
      setMessage('Invalid verification link. No token provided.');
      console.error('❌ No token in URL');
      return;
    }

    // Call the backend API to verify the email
    const verifyEmail = async () => {
      console.log('📤 Sending verification request to:', `${API_BASE_URL}/api/auth/verify-email`);
      
      try {
        const response = await fetch(`${API_BASE_URL}/api/auth/verify-email`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          body: JSON.stringify({ token }),
        });

        console.log('📥 Response received:', {
          status: response.status,
          statusText: response.statusText,
          ok: response.ok
        });

        const result = await response.json();
        console.log('📥 Response data:', result);

        if (!response.ok) {
          setStatus('error');
          setMessage(result.message || 'Verification failed. The link may be invalid or expired.');
          console.error('❌ Verification failed:', result);
        } else {
          setStatus('success');
          setMessage(result.message || 'Email verified successfully!');
          console.log('✅ Verification successful');
          // Redirect to login after 3 seconds
          setTimeout(() => {
            router.push('/login');
          }, 3000);
        }
      } catch (error: any) {
        setStatus('error');
        setMessage(`Network error: ${error.message}. Please check if the backend is running on ${API_BASE_URL}`);
        console.error('❌ Verification error:', {
          error,
          message: error.message,
          stack: error.stack
        });
      }
    };

    verifyEmail();
  }, [searchParams, router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#E9E3FF] to-[#E9FFE5] px-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-8">
        <div className="text-center">
          <h1 className="text-4xl font-silkscreen text-[#5425FF] mb-4">Email Verification</h1>

          {status === 'loading' && (
            <div className="space-y-4">
              <div className="flex justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#5425FF]"></div>
              </div>
              <p className="text-gray-600 font-figtree">Verifying your email address...</p>
            </div>
          )}

          {status === 'success' && (
            <div className="space-y-4">
              <div className="flex justify-center">
                <svg
                  className="w-16 h-16 text-green-500"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
              <p className="text-green-600 font-figtree font-semibold text-lg">{message}</p>
              <p className="text-gray-600 font-figtree">Redirecting to login page...</p>
              <Link
                href="/login"
                className="inline-block mt-4 px-6 py-3 bg-[#5425FF] text-white rounded-xl font-figtree font-semibold hover:bg-[#4319CC] transition-colors"
              >
                Go to Login
              </Link>
            </div>
          )}

          {status === 'error' && (
            <div className="space-y-4">
              <div className="flex justify-center">
                <svg
                  className="w-16 h-16 text-red-500"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
              <p className="text-red-600 font-figtree font-semibold">{message}</p>
              <div className="space-y-2">
                <Link
                  href="/signup"
                  className="block px-6 py-3 bg-[#5425FF] text-white rounded-xl font-figtree font-semibold hover:bg-[#4319CC] transition-colors text-center"
                >
                  Sign Up Again
                </Link>
                <Link
                  href="/login"
                  className="block px-6 py-3 border border-[#5425FF] text-[#5425FF] rounded-xl font-figtree font-semibold hover:bg-[#F9F9F9] transition-colors text-center"
                >
                  Go to Login
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

