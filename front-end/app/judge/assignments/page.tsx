'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { getAssignedTeams, getCurrentUser, logout } from '@/lib/api';

type Assignment = {
  teamId: string | null;
  teamName: string | null;
  verificationStatus: string;
  submissionId?: string | null;
  submissionStatus: string;
  submittedAt?: string | null;
  evaluationId?: string | null;
  evaluationStatus: string;
  evaluationSubmittedAt?: string | null;
  isReadyForEvaluation: boolean;
};

export default function JudgeAssignmentsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [teams, setTeams] = useState<Assignment[]>([]);
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [pagination, setPagination] = useState<any>(null);

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

        const res = await getAssignedTeams(page, limit);
        if (res.error) {
          setError(res.error);
          setTeams([]);
          setPagination(null);
          return;
        }

        setTeams((res.teams as any) || []);
        setPagination(res.pagination || null);
      } catch (err: any) {
        setError(err.message || 'Failed to load assigned teams');
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [router, page, limit]);

  const stats = useMemo(() => {
    const total = pagination?.totalItems ?? teams.length;
    const ready = teams.filter((t) => t.isReadyForEvaluation).length;
    const completed = teams.filter((t) => t.evaluationStatus === 'submitted').length;
    const pending = teams.filter((t) => t.evaluationStatus !== 'submitted').length;
    return { total, ready, completed, pending };
  }, [teams, pagination]);

  const badge = (kind: 'submission' | 'evaluation', status: string) => {
    if (kind === 'submission') {
      if (status === 'submitted') {
      return (
        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-blue-100 text-blue-700 text-xs font-figtree font-semibold">
            <span className="material-symbols-rounded text-sm">check_circle</span>
            Submitted
          </span>
        );
      }
      if (status === 'draft') {
      return (
        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-purple-100 text-purple-700 text-xs font-figtree font-semibold">
            <span className="material-symbols-rounded text-sm">edit</span>
            Draft
          </span>
        );
      }
      return (
        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-gray-100 text-gray-700 text-xs font-figtree font-semibold">
          <span className="material-symbols-rounded text-sm">pending</span>
          No Submission
        </span>
      );
    }

    if (status === 'submitted') {
      return (
        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-green-100 text-green-700 text-xs font-figtree font-semibold">
          <span className="material-symbols-rounded text-sm">check_circle</span>
          Completed
        </span>
      );
    }
    if (status === 'draft') {
      return (
        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-yellow-100 text-yellow-700 text-xs font-figtree font-semibold">
          <span className="material-symbols-rounded text-sm">edit</span>
          Draft
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-gray-100 text-gray-700 text-xs font-figtree font-semibold">
        <span className="material-symbols-rounded text-sm">pending</span>
        Pending
      </span>
    );
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
            <span>Loading assigned teams...</span>
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
          <Link
            href="/judge/assignments"
            className="flex items-center gap-3 px-3 py-2 rounded-xl bg-[#EFEAFF] text-[#5425FF] font-semibold"
          >
            <span className="material-symbols-rounded text-lg">groups</span> Assigned Teams
          </Link>
          <Link href="/judge/reviews" className="flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-gray-100">
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

      {/* Main */}
      <main className="flex-1 px-8 py-8 space-y-6 overflow-y-auto">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-silkscreen text-[#0f172a] mb-2">Assigned Teams</h1>
            <p className="text-[#64748b] font-figtree">Open a team to evaluate their submission.</p>
          </div>
          <Link
            href="/judge/dashboard"
            className="px-4 py-2 border border-gray-300 text-[#0f172a] rounded-xl font-figtree font-semibold hover:bg-gray-50 transition-colors flex items-center gap-2"
          >
            <span className="material-symbols-rounded">arrow_back</span>
            Back
          </Link>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[
            { label: 'Total', value: stats.total, color: '#5425FF' },
            { label: 'Ready', value: stats.ready, color: '#3B82F6' },
            { label: 'Completed', value: stats.completed, color: '#10B981' },
            { label: 'Pending', value: stats.pending, color: '#F59E0B' },
          ].map((c) => (
            <div key={c.label} className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
              <p className="text-sm font-figtree text-[#64748b]">{c.label}</p>
              <p className="text-2xl font-semibold" style={{ color: c.color }}>
                {c.value}
              </p>
            </div>
          ))}
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-xl font-figtree flex items-center gap-2">
            <span className="material-symbols-rounded">error</span>
            {error}
          </div>
        )}

        {teams.length === 0 ? (
          <div className="bg-white rounded-2xl p-12 shadow-sm border border-gray-100 text-center">
            <div className="flex justify-center mb-4">
              <span className="material-symbols-rounded text-8xl text-[#94a3b8]">groups</span>
            </div>
            <h2 className="text-2xl font-silkscreen text-[#5425FF] mb-2">No Assigned Teams</h2>
            <p className="text-[#64748b] font-figtree">Once teams are assigned to you, they’ll show up here.</p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <div className="space-y-3">
              {teams.map((t) => (
                <Link
                  key={t.teamId || t.teamName || Math.random()}
                  href={t.teamId ? `/judge/evaluation/${t.teamId}` : '/judge/dashboard'}
                  className="block p-5 border border-gray-200 rounded-2xl hover:border-[#5425FF] hover:bg-[#EFEAFF]/30 transition-all"
                >
                  <div className="flex items-start justify-between gap-6">
                    <div className="min-w-0 flex-1">
                      <h3 className="font-figtree font-semibold text-[#0f172a] truncate text-[15px] md:text-base">
                        {t.teamName || 'Unnamed Team'}
                      </h3>
                      <div className="mt-2 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm font-figtree text-[#64748b]">
                        <div className="flex items-center gap-2">
                          <span className="text-[#64748b]">Submission:</span>
                          {badge('submission', t.submissionStatus || 'no_submission')}
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-[#64748b]">Evaluation:</span>
                          {badge('evaluation', t.evaluationStatus || 'none')}
                        </div>
                        {t.isReadyForEvaluation && (
                          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-blue-100 text-blue-700 text-xs font-figtree font-semibold">
                            <span className="material-symbols-rounded text-sm">play_circle</span>
                            Ready
                          </span>
                        )}
                      </div>
                    </div>
                    <span className="material-symbols-rounded text-[#5425FF] self-center">chevron_right</span>
                  </div>
                </Link>
              ))}
            </div>

            {/* Pagination */}
            {pagination?.totalPages > 1 && (
              <div className="flex items-center justify-between mt-6 pt-4 border-t border-gray-200">
                <p className="text-sm font-figtree text-[#64748b]">
                  Page {pagination.currentPage} of {pagination.totalPages}
                </p>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page <= 1}
                    className="px-4 py-2 rounded-xl border border-gray-300 text-[#0f172a] font-figtree font-semibold hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Prev
                  </button>
                  <button
                    onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
                    disabled={page >= pagination.totalPages}
                    className="px-4 py-2 rounded-xl bg-[#5425FF] text-white font-figtree font-semibold hover:bg-[#4319CC] disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}


