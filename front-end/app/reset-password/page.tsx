'use client';

import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

export default function ResetPasswordRedirectPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const token = searchParams.get('token');
    const target = token ? `/auth/reset-password?token=${encodeURIComponent(token)}` : '/auth/reset-password';
    router.replace(target);
  }, [router, searchParams]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f8f8ff]">
      <div className="flex items-center gap-3 text-[#5425FF] font-figtree">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#5425FF]" />
        <span>Redirecting...</span>
      </div>
    </div>
  );
}




