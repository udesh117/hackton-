'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { adminGetSubmissions } from '@/lib/api';

type SubmissionRow = {
  id: string;
  teamName?: string;
  submissionStatus?: string;
  repoUrl?: string;
  evaluationCount?: number;
  submittedAt?: string;
};

export default function AdminSubmissionsPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submissions, setSubmissions] = useState<SubmissionRow[]>([]);
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [totalCount, setTotalCount] = useState(0);
  const [status, setStatus] = useState<string>('');

  const totalPages = Math.max(1, Math.ceil(totalCount / limit));

  const load = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await adminGetSubmissions(page, limit, { status: status || undefined });
      setSubmissions(res.submissions || []);
      setTotalCount(res.totalCount || 0);
    } catch (e: any) {
      setError(e.message || 'Failed to load submissions');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, limit, status]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-silkscreen text-[#0f172a]">Submissions</h1>
        <p className="text-[#64748b] font-figtree mt-1">Review submissions and evaluation coverage.</p>
      </div>

      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
        <div className="flex items-end justify-between gap-4 flex-wrap">
          <div>
            <label className="block text-sm font-figtree font-semibold text-[#0f172a] mb-2">Status</label>
            <select
              value={status}
              onChange={(e) => {
                setPage(1);
                setStatus(e.target.value);
              }}
              className="px-4 py-3 border border-gray-300 rounded-xl font-figtree focus:outline-none focus:ring-2 focus:ring-[#5425FF]"
            >
              <option value="">All</option>
              <option value="submitted">Submitted</option>
              <option value="draft">Draft</option>
            </select>
          </div>
          <button
            onClick={load}
            className="px-4 py-2 rounded-xl border border-gray-300 text-[#0f172a] font-figtree font-semibold hover:bg-gray-50"
          >
            Refresh
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-xl font-figtree flex items-center gap-2">
          <span className="material-symbols-rounded">error</span>
          {error}
        </div>
      )}

      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-silkscreen text-[#5425FF] flex items-center gap-2">
            <span className="material-symbols-rounded">list</span>
            Submissions Panel
          </h2>
        </div>

        {loading ? (
          <div className="py-10 flex items-center justify-center text-[#5425FF] font-figtree">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#5425FF]" />
            <span className="ml-3">Loading...</span>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm font-figtree">
              <thead>
                <tr className="text-left text-[#64748b]">
                  <th className="py-2">Team</th>
                  <th className="py-2">Status</th>
                  <th className="py-2">Evaluations</th>
                  <th className="py-2">Submitted</th>
                  <th className="py-2">Repo</th>
                </tr>
              </thead>
              <tbody>
                {submissions.map((s) => (
                  <tr key={s.id} className="border-t border-gray-100">
                    <td className="py-3 font-semibold text-[#0f172a]">
                      <Link href={`/admin/submissions/${s.id}`} className="text-[#5425FF] hover:underline">
                        {s.teamName || s.id}
                      </Link>
                    </td>
                    <td className="py-3">
                      <span className="px-2 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-700 capitalize">
                        {s.submissionStatus || 'unknown'}
                      </span>
                    </td>
                    <td className="py-3">{s.evaluationCount ?? 0}</td>
                    <td className="py-3 text-[#334155]">{s.submittedAt ? new Date(s.submittedAt).toLocaleString() : '—'}</td>
                    <td className="py-3">
                      {s.repoUrl ? (
                        <a className="text-[#5425FF] hover:underline" href={s.repoUrl} target="_blank" rel="noreferrer">
                          Open
                        </a>
                      ) : (
                        '—'
                      )}
                    </td>
                  </tr>
                ))}
                {submissions.length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-6 text-center text-[#94a3b8]">
                      No submissions found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-6 pt-4 border-t border-gray-200">
            <p className="text-sm font-figtree text-[#64748b]">
              Page {page} of {totalPages} • Total {totalCount}
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="px-4 py-2 rounded-xl border border-gray-300 text-[#0f172a] font-figtree font-semibold hover:bg-gray-50 disabled:opacity-50"
              >
                Prev
              </button>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="px-4 py-2 rounded-xl bg-[#5425FF] text-white font-figtree font-semibold hover:bg-[#4319CC] disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}


