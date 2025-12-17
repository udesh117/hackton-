'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { getCurrentUser, getMyReviews, logout } from '@/lib/api';

type Review = {
  evaluationId: string;
  teamId: string | null;
  teamName: string | null;
  evaluationStatus: 'draft' | 'submitted' | string;
  isLocked: boolean;
  submittedAt?: string | null;
  lastUpdatedAt?: string | null;
  submissionStatus?: string | null;
};

export default function JudgeReviewsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        setError(null);

        const me = await getCurrentUser();
        if (!me.user) {
          router.replace('/login');
          return;
        }
        if (me.user.role !== 'judge') {
          router.replace('/');
          return;
        }

        const res = await getMyReviews();
        if (res.error) {
          setError(res.error);
          setReviews([]);
          return;
        }
        setReviews((res.reviews as any) || []);
      } catch (err: any) {
        console.error('Failed to load judge reviews:', err);
        setError(err.message || 'Failed to load reviews');
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [router]);

  const stats = useMemo(() => {
    const total = reviews.length;
    const submitted = reviews.filter((r) => r.evaluationStatus === 'submitted').length;
    const draft = reviews.filter((r) => r.evaluationStatus === 'draft').length;
    const locked = reviews.filter((r) => r.isLocked).length;
    return { total, submitted, draft, locked };
  }, [reviews]);

  const badge = (status: string, isLocked: boolean) => {
    if (isLocked) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-yellow-100 text-yellow-700 text-xs font-figtree font-semibold">
          <span className="material-symbols-rounded text-sm">lock</span>
          Locked
        </span>
      );
    }

    switch (status) {
      case 'submitted':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-green-100 text-green-700 text-xs font-figtree font-semibold">
            <span className="material-symbols-rounded text-sm">check_circle</span>
            Submitted
          </span>
        );
      case 'draft':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-blue-100 text-blue-700 text-xs font-figtree font-semibold">
            <span className="material-symbols-rounded text-sm">edit</span>
            Draft
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-gray-100 text-gray-700 text-xs font-figtree font-semibold">
            <span className="material-symbols-rounded text-sm">help</span>
            {status || 'Unknown'}
          </span>
        );
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f8f8ff] text-[#0f172a] flex">
        <aside className="w-64 bg-white border-r border-gray-200 px-6 py-8 flex flex-col">
          <div className="text-2xl font-silkscreen text-[#5425FF] mb-6">Judge Portal</div>
        </aside>
        <div className="flex-1 flex items-center justify-center">
          <div className="flex items-center gap-3 text-[#5425FF] font-figtree">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#5425FF]" />
            <span>Loading reviews...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8f8ff] text-[#0f172a] flex">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-gray-200 px-6 py-8 flex flex-col">
        <div className="text-2xl font-silkscreen text-[#5425FF] mb-6">Judge Portal</div>
        <nav className="flex flex-col gap-3 text-[#475569] font-figtree">
          <Link href="/judge/dashboard" className="flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-gray-100">
            <span className="material-symbols-rounded text-lg">dashboard</span> Dashboard
          </Link>
          <Link href="/judge/assignments" className="flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-gray-100">
            <span className="material-symbols-rounded text-lg">groups</span> Assigned Teams
          </Link>
          <Link
            href="/judge/reviews"
            className="flex items-center gap-3 px-3 py-2 rounded-xl bg-[#EFEAFF] text-[#5425FF] font-semibold"
          >
            <span className="material-symbols-rounded text-lg">rate_review</span> My Reviews
          </Link>
          <Link href="/judge/notifications" className="flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-gray-100">
            <span className="material-symbols-rounded text-lg">notifications</span> Notifications
          </Link>
          <Link href="/judge/profile" className="flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-gray-100">
            <span className="material-symbols-rounded text-lg">person</span> Profile
          </Link>
          <Link href="/judge/settings" className="flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-gray-100">
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
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-silkscreen text-[#5425FF] flex items-center gap-2">
              <span className="material-symbols-rounded">rate_review</span>
              My Reviews
            </h1>
            <p className="text-[#64748b] font-figtree mt-1">All your draft and submitted evaluations</p>
          </div>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[
            { label: 'Total', value: stats.total, color: '#5425FF' },
            { label: 'Submitted', value: stats.submitted, color: '#10B981' },
            { label: 'Drafts', value: stats.draft, color: '#3B82F6' },
            { label: 'Locked', value: stats.locked, color: '#F59E0B' },
          ].map((c) => (
            <div
              key={c.label}
              className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 flex items-center justify-between"
            >
              <div>
                <p className="text-sm font-figtree text-[#64748b]">{c.label}</p>
                <p className="text-2xl font-semibold" style={{ color: c.color }}>
                  {c.value}
                </p>
              </div>
              <span className="material-symbols-rounded" style={{ color: c.color }}>
                leaderboard
              </span>
            </div>
          ))}
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-xl font-figtree flex items-center gap-2">
            <span className="material-symbols-rounded">error</span>
            {error}
          </div>
        )}

        {reviews.length === 0 ? (
          <div className="bg-white rounded-2xl p-12 shadow-sm border border-gray-100 text-center">
            <div className="flex justify-center mb-4">
              <span className="material-symbols-rounded text-8xl text-[#94a3b8]">rate_review</span>
            </div>
            <h2 className="text-2xl font-silkscreen text-[#5425FF] mb-2">No Reviews Yet</h2>
            <p className="text-[#64748b] font-figtree">Once you start evaluating teams, they’ll appear here.</p>
            <div className="mt-6">
              <Link
                href="/judge/dashboard"
                className="inline-flex items-center gap-2 px-5 py-3 bg-[#5425FF] text-white rounded-xl font-figtree font-semibold hover:bg-[#4319CC] transition-colors"
              >
                <span className="material-symbols-rounded">dashboard</span>
                Go to Dashboard
              </Link>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <div className="space-y-3">
              {reviews.map((r) => (
                <Link
                  key={r.evaluationId}
                  href={r.teamId ? `/judge/evaluation/${r.teamId}` : '/judge/dashboard'}
                  className="block p-4 border border-gray-200 rounded-xl hover:border-[#5425FF] hover:bg-[#EFEAFF]/30 transition-all"
                >
                  <div className="flex items-center justify-between gap-4">
                    <div className="min-w-0">
                      <h3 className="font-figtree font-semibold text-[#0f172a] truncate">
                        {r.teamName || 'Unknown Team'}
                      </h3>
                      <div className="flex items-center gap-3 text-sm font-figtree text-[#64748b] flex-wrap mt-1">
                        {badge(r.evaluationStatus, r.isLocked)}
                        {r.lastUpdatedAt && (
                          <span className="inline-flex items-center gap-1">
                            <span className="material-symbols-rounded text-base">schedule</span>
                            Updated {new Date(r.lastUpdatedAt).toLocaleString()}
                          </span>
                        )}
                      </div>
                    </div>
                    <span className="material-symbols-rounded text-[#5425FF]">chevron_right</span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}


