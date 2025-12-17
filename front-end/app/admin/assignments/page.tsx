'use client';

import { useEffect, useMemo, useState } from 'react';
import { adminAssignTeams, adminAutoBalance, adminGetJudgeAssignments, adminReassignTeam } from '@/lib/api';

export default function AdminAssignmentsPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [matrix, setMatrix] = useState<any[]>([]);

  const [bulkText, setBulkText] = useState<string>(
    JSON.stringify([{ judgeId: '', teamId: '' }], null, 2)
  );
  const [reassignForm, setReassignForm] = useState({ teamId: '', oldJudgeId: '', newJudgeId: '' });
  const [working, setWorking] = useState(false);

  const load = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await adminGetJudgeAssignments();
      setMatrix(res.assignmentMatrix || []);
    } catch (e: any) {
      setError(e.message || 'Failed to load assignment matrix');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const totals = useMemo(() => {
    const totalJudges = matrix.length;
    const totalAssigned = matrix.reduce((acc, j) => acc + (j?.loadStats?.totalAssigned || 0), 0);
    const totalCompleted = matrix.reduce((acc, j) => acc + (j?.loadStats?.completedCount || 0), 0);
    const totalPending = matrix.reduce((acc, j) => acc + (j?.loadStats?.pendingCount || 0), 0);
    return { totalJudges, totalAssigned, totalCompleted, totalPending };
  }, [matrix]);

  const runBulkAssign = async () => {
    setError(null);
    setMessage(null);
    setWorking(true);
    try {
      const parsed = JSON.parse(bulkText);
      if (!Array.isArray(parsed) || parsed.length === 0) {
        throw new Error('Assignments must be a non-empty JSON array');
      }
      const invalid = parsed.find((a: any) => !a?.judgeId || !a?.teamId);
      if (invalid) {
        throw new Error('Each assignment must include valid judgeId and teamId (UUID strings).');
      }
      const res = await adminAssignTeams(parsed);
      setMessage(res.message || 'Assignments created');
      await load();
    } catch (e: any) {
      setError(e.message || 'Failed to assign teams');
    } finally {
      setWorking(false);
    }
  };

  const runReassign = async () => {
    setError(null);
    setMessage(null);
    setWorking(true);
    try {
      const { teamId, oldJudgeId, newJudgeId } = reassignForm;
      if (!teamId || !oldJudgeId || !newJudgeId) throw new Error('teamId, oldJudgeId, newJudgeId are required');
      const res = await adminReassignTeam({ teamId, oldJudgeId, newJudgeId });
      setMessage(res.message || 'Reassigned');
      await load();
    } catch (e: any) {
      setError(e.message || 'Failed to reassign team');
    } finally {
      setWorking(false);
    }
  };

  const runAutoBalance = async () => {
    setError(null);
    setMessage(null);
    setWorking(true);
    try {
      const res = await adminAutoBalance();
      setMessage(res.message || 'Auto-balance completed');
      await load();
    } catch (e: any) {
      setError(e.message || 'Failed to auto-balance');
    } finally {
      setWorking(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-silkscreen text-[#0f172a]">Judge Assignments</h1>
        <p className="text-[#64748b] font-figtree mt-1">View the assignment matrix and manage workload distribution.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { label: 'Judges', value: totals.totalJudges, color: '#5425FF' },
          { label: 'Total Assigned', value: totals.totalAssigned, color: '#3B82F6' },
          { label: 'Completed', value: totals.totalCompleted, color: '#10B981' },
          { label: 'Pending', value: totals.totalPending, color: '#F59E0B' },
        ].map((c) => (
          <div key={c.label} className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
            <p className="text-sm font-figtree text-[#64748b]">{c.label}</p>
            <p className="text-2xl font-semibold" style={{ color: c.color }}>
              {c.value}
            </p>
          </div>
        ))}
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

      {/* Actions */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 xl:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-silkscreen text-[#5425FF] flex items-center gap-2">
              <span className="material-symbols-rounded">grid_view</span>
              Matrix
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
            <div className="space-y-3">
              {matrix.map((j: any) => (
                <div key={j.judgeId} className="border border-gray-200 rounded-2xl p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <p className="font-figtree font-semibold text-[#0f172a]">
                        {j.judgeName || j.judgeId}
                      </p>
                      <p className="text-xs text-[#64748b] font-figtree mt-1">
                        Total: {j.loadStats?.totalAssigned || 0} • Completed: {j.loadStats?.completedCount || 0} • Pending:{' '}
                        {j.loadStats?.pendingCount || 0}
                      </p>
                    </div>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {(j.teamsAssigned || []).map((t: any) => (
                      <span
                        key={t.teamId}
                        className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-gray-100 text-gray-700 text-xs font-figtree"
                      >
                        {t.teamName || t.teamId}
                        <span className="px-2 py-0.5 rounded-full bg-white border border-gray-200">
                          {t.evaluationStatus}
                        </span>
                      </span>
                    ))}
                    {(j.teamsAssigned || []).length === 0 && (
                      <span className="text-xs text-[#94a3b8] font-figtree">No teams assigned.</span>
                    )}
                  </div>
                </div>
              ))}
              {matrix.length === 0 && <p className="text-sm text-[#94a3b8] font-figtree">No judges found.</p>}
            </div>
          )}
        </div>

        <div className="space-y-6">
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <h3 className="text-lg font-silkscreen text-[#5425FF] mb-3 flex items-center gap-2">
              <span className="material-symbols-rounded">playlist_add</span>
              Bulk Assign
            </h3>
            <textarea
              value={bulkText}
              onChange={(e) => setBulkText(e.target.value)}
              rows={8}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl font-mono text-xs focus:outline-none focus:ring-2 focus:ring-[#5425FF]"
            />
            <button
              disabled={working}
              onClick={runBulkAssign}
              className="mt-3 w-full px-5 py-3 rounded-xl bg-[#5425FF] text-white font-figtree font-semibold hover:bg-[#4319CC] disabled:opacity-50"
            >
              {working ? 'Working...' : 'Create Assignments'}
            </button>
          </div>

          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <h3 className="text-lg font-silkscreen text-[#5425FF] mb-3 flex items-center gap-2">
              <span className="material-symbols-rounded">swap_horiz</span>
              Reassign Team
            </h3>
            <div className="space-y-2">
              {(['teamId', 'oldJudgeId', 'newJudgeId'] as const).map((k) => (
                <input
                  key={k}
                  value={(reassignForm as any)[k]}
                  onChange={(e) => setReassignForm((p) => ({ ...p, [k]: e.target.value }))}
                  placeholder={k}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl font-figtree focus:outline-none focus:ring-2 focus:ring-[#5425FF]"
                />
              ))}
            </div>
            <button
              disabled={working}
              onClick={runReassign}
              className="mt-3 w-full px-5 py-3 rounded-xl border border-gray-300 text-[#0f172a] font-figtree font-semibold hover:bg-gray-50 disabled:opacity-50"
            >
              {working ? 'Working...' : 'Reassign'}
            </button>
          </div>

          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <h3 className="text-lg font-silkscreen text-[#5425FF] mb-3 flex items-center gap-2">
              <span className="material-symbols-rounded">balance</span>
              Auto-Balance
            </h3>
            <p className="text-sm text-[#64748b] font-figtree">
              This redistributes pending assignments. Use carefully.
            </p>
            <button
              disabled={working}
              onClick={runAutoBalance}
              className="mt-3 w-full px-5 py-3 rounded-xl bg-yellow-500 text-white font-figtree font-semibold hover:bg-yellow-600 disabled:opacity-50"
            >
              {working ? 'Working...' : 'Run Auto-Balance'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}


