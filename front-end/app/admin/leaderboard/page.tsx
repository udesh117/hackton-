'use client';

import { useEffect, useState } from 'react';
import { adminAggregateScores, adminComputeLeaderboard, adminGetLeaderboard, adminPublishLeaderboardToggle } from '@/lib/api';

export default function AdminLeaderboardPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [rows, setRows] = useState<any[]>([]);
  const [working, setWorking] = useState(false);
  const [isPublishedFilter, setIsPublishedFilter] = useState<string>(''); // '', 'true', 'false'

  const load = async () => {
    try {
      setLoading(true);
      setError(null);
      const filter =
        isPublishedFilter === '' ? undefined : isPublishedFilter === 'true' ? true : false;
      const res = await adminGetLeaderboard(filter);
      setRows(Array.isArray(res) ? res : res.leaderboard || []);
    } catch (e: any) {
      setError(e.message || 'Failed to load leaderboard');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPublishedFilter]);

  const runAggregate = async () => {
    setError(null);
    setMessage(null);
    setWorking(true);
    try {
      const res = await adminAggregateScores();
      setMessage(res.message || 'Aggregated');
    } catch (e: any) {
      setError(e.message || 'Failed to aggregate');
    } finally {
      setWorking(false);
    }
  };

  const runCompute = async () => {
    setError(null);
    setMessage(null);
    setWorking(true);
    try {
      const res = await adminComputeLeaderboard();
      setMessage(res.message || 'Computed');
      await load();
    } catch (e: any) {
      setError(e.message || 'Failed to compute');
    } finally {
      setWorking(false);
    }
  };

  const togglePublish = async (shouldPublish: boolean) => {
    setError(null);
    setMessage(null);
    setWorking(true);
    try {
      const res = await adminPublishLeaderboardToggle(shouldPublish);
      setMessage(`Publish set to ${res.isPublished}`);
      await load();
    } catch (e: any) {
      setError(e.message || 'Failed to toggle publish');
    } finally {
      setWorking(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-silkscreen text-[#0f172a]">Leaderboard</h1>
        <p className="text-[#64748b] font-figtree mt-1">Aggregate scores, compute ranks, and publish results.</p>
      </div>

      {(error || message) && (
        <div
          className={`px-4 py-3 rounded-xl font-figtree flex items-center gap-2 border ${
            error ? 'bg-red-50 border-red-200 text-red-800' : 'bg-green-50 border-green-200 text-green-800'
          }`}
        >
          <span className="material-symbols-rounded">{error ? 'error' : 'check_circle'}</span>
          {error || message}
        </div>
      )}

      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="flex flex-wrap items-center gap-2">
            <button
              disabled={working}
              onClick={runAggregate}
              className="px-4 py-2 rounded-xl border border-gray-300 text-[#0f172a] font-figtree font-semibold hover:bg-gray-50 disabled:opacity-50"
            >
              Aggregate Scores
            </button>
            <button
              disabled={working}
              onClick={runCompute}
              className="px-4 py-2 rounded-xl bg-[#5425FF] text-white font-figtree font-semibold hover:bg-[#4319CC] disabled:opacity-50"
            >
              Compute Leaderboard
            </button>
            <button
              disabled={working}
              onClick={() => togglePublish(true)}
              className="px-4 py-2 rounded-xl bg-green-600 text-white font-figtree font-semibold hover:bg-green-700 disabled:opacity-50"
            >
              Publish
            </button>
            <button
              disabled={working}
              onClick={() => togglePublish(false)}
              className="px-4 py-2 rounded-xl bg-red-600 text-white font-figtree font-semibold hover:bg-red-700 disabled:opacity-50"
            >
              Unpublish
            </button>
            <button
              disabled={working}
              onClick={load}
              className="px-4 py-2 rounded-xl border border-gray-300 text-[#0f172a] font-figtree font-semibold hover:bg-gray-50 disabled:opacity-50"
            >
              Refresh
            </button>
          </div>

          <div>
            <label className="block text-sm font-figtree font-semibold text-[#0f172a] mb-2">Filter</label>
            <select
              value={isPublishedFilter}
              onChange={(e) => setIsPublishedFilter(e.target.value)}
              className="px-4 py-3 border border-gray-300 rounded-xl font-figtree focus:outline-none focus:ring-2 focus:ring-[#5425FF]"
            >
              <option value="">All</option>
              <option value="true">Published</option>
              <option value="false">Unpublished</option>
            </select>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
        <h2 className="text-xl font-silkscreen text-[#5425FF] mb-4 flex items-center gap-2">
          <span className="material-symbols-rounded">leaderboard</span>
          Internal Leaderboard
        </h2>

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
                  <th className="py-2">Rank</th>
                  <th className="py-2">Team</th>
                  <th className="py-2">Score</th>
                  <th className="py-2">Category</th>
                  <th className="py-2">Published</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, idx) => (
                  <tr key={idx} className="border-t border-gray-100">
                    <td className="py-3 font-semibold">{r.rank ?? idx + 1}</td>
                    <td className="py-3 font-semibold text-[#0f172a]">{r.teamName || r.team_name || '—'}</td>
                    <td className="py-3">{r.score ?? r.final_score ?? '—'}</td>
                    <td className="py-3">{r.category || r.project_category || '—'}</td>
                    <td className="py-3">
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-semibold ${
                          r.isPublished || r.is_published ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
                        }`}
                      >
                        {r.isPublished || r.is_published ? 'Yes' : 'No'}
                      </span>
                    </td>
                  </tr>
                ))}
                {rows.length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-6 text-center text-[#94a3b8]">
                      No leaderboard data yet. Run “Aggregate” then “Compute”.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}


