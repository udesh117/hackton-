'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { adminGetTeams } from '@/lib/api';

type TeamRow = {
  id: string;
  name: string;
  leaderName?: string;
  memberCount?: number;
  verificationStatus?: string;
  dateCreated?: string;
};

export default function AdminTeamsPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [teams, setTeams] = useState<TeamRow[]>([]);
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [totalCount, setTotalCount] = useState(0);

  const [status, setStatus] = useState<string>('');
  const [search, setSearch] = useState<string>('');
  const [searchInput, setSearchInput] = useState<string>('');

  const totalPages = Math.max(1, Math.ceil(totalCount / limit));

  const load = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await adminGetTeams(page, limit, { status: status || undefined, search: search || undefined });
      setTeams(res.teams || []);
      setTotalCount(res.totalCount || 0);
    } catch (e: any) {
      setError(e.message || 'Failed to load teams');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, limit, status, search]);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-silkscreen text-[#0f172a]">Teams</h1>
          <p className="text-[#64748b] font-figtree mt-1">Search, inspect, and verify teams.</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <label className="block text-sm font-figtree font-semibold text-[#0f172a] mb-2">Status</label>
            <select
              value={status}
              onChange={(e) => {
                setPage(1);
                setStatus(e.target.value);
              }}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl font-figtree focus:outline-none focus:ring-2 focus:ring-[#5425FF]"
            >
              <option value="">All</option>
              <option value="verified">Verified</option>
              <option value="pending">Pending</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-figtree font-semibold text-[#0f172a] mb-2">Search by team name</label>
            <div className="flex gap-2">
              <input
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Type part of team name..."
                className="flex-1 px-4 py-3 border border-gray-300 rounded-xl font-figtree focus:outline-none focus:ring-2 focus:ring-[#5425FF]"
              />
              <button
                onClick={() => {
                  setPage(1);
                  setSearch(searchInput.trim());
                }}
                className="px-5 py-3 rounded-xl bg-[#5425FF] text-white font-figtree font-semibold hover:bg-[#4319CC]"
              >
                Search
              </button>
              <button
                onClick={() => {
                  setPage(1);
                  setSearchInput('');
                  setSearch('');
                }}
                className="px-5 py-3 rounded-xl border border-gray-300 text-[#0f172a] font-figtree font-semibold hover:bg-gray-50"
              >
                Clear
              </button>
            </div>
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-xl font-figtree flex items-center gap-2">
          <span className="material-symbols-rounded">error</span>
          {error}
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-silkscreen text-[#5425FF] flex items-center gap-2">
            <span className="material-symbols-rounded">list</span>
            Teams List
          </h2>
          <button
            onClick={load}
            className="px-4 py-2 rounded-xl border border-gray-300 text-[#0f172a] font-figtree font-semibold hover:bg-gray-50"
          >
            Refresh
          </button>
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
                  <th className="py-2">Leader</th>
                  <th className="py-2">Members</th>
                  <th className="py-2">Status</th>
                  <th className="py-2">Created</th>
                </tr>
              </thead>
              <tbody>
                {teams.map((t) => (
                  <tr key={t.id} className="border-t border-gray-100">
                    <td className="py-3 font-semibold text-[#0f172a]">
                      <Link href={`/admin/teams/${t.id}`} className="hover:underline text-[#5425FF]">
                        {t.name}
                      </Link>
                    </td>
                    <td className="py-3 text-[#334155]">{t.leaderName || '—'}</td>
                    <td className="py-3">{t.memberCount ?? '—'}</td>
                    <td className="py-3">
                      <span className="px-2 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-700 capitalize">
                        {t.verificationStatus || 'unknown'}
                      </span>
                    </td>
                    <td className="py-3 text-[#334155]">
                      {t.dateCreated ? new Date(t.dateCreated).toLocaleDateString() : '—'}
                    </td>
                  </tr>
                ))}
                {teams.length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-6 text-center text-[#94a3b8]">
                      No teams found.
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


