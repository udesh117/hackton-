'use client';

import { useEffect, useMemo, useState } from 'react';
import { adminCreateJudge, adminDeleteJudge, adminGetJudges, adminUpdateJudge } from '@/lib/api';

type Judge = {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  isActive: boolean;
  dateAdded: string;
  assignmentLoad: number;
};

export default function AdminJudgesPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [totalCount, setTotalCount] = useState(0);
  const [judges, setJudges] = useState<Judge[]>([]);

  const [createForm, setCreateForm] = useState({ email: '', firstName: '', lastName: '' });
  const [creating, setCreating] = useState(false);

  const totalPages = Math.max(1, Math.ceil(totalCount / limit));

  const load = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await adminGetJudges(page, limit);
      setJudges(res.judges || []);
      setTotalCount(res.totalCount || 0);
    } catch (e: any) {
      setError(e.message || 'Failed to load judges');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, limit]);

  const stats = useMemo(() => {
    const active = judges.filter((j) => j.isActive).length;
    const inactive = judges.filter((j) => !j.isActive).length;
    return { active, inactive };
  }, [judges]);

  const onCreate = async () => {
    setError(null);
    setMessage(null);
    if (!createForm.email || !createForm.firstName || !createForm.lastName) {
      setError('Email, first name, and last name are required');
      return;
    }
    setCreating(true);
    try {
      const res = await adminCreateJudge(createForm);
      setMessage(res.message || 'Judge created');
      setCreateForm({ email: '', firstName: '', lastName: '' });
      await load();
    } catch (e: any) {
      setError(e.message || 'Failed to create judge');
    } finally {
      setCreating(false);
    }
  };

  const toggleActive = async (judgeId: string, isActive: boolean) => {
    setError(null);
    setMessage(null);
    try {
      const res = await adminUpdateJudge(judgeId, { isActive: !isActive });
      setMessage(res.message || 'Updated');
      await load();
    } catch (e: any) {
      setError(e.message || 'Failed to update judge');
    }
  };

  const resetPassword = async (judgeId: string) => {
    setError(null);
    setMessage(null);
    try {
      const res = await adminUpdateJudge(judgeId, { resetPassword: true });
      setMessage(res.message || 'Password reset triggered');
      await load();
    } catch (e: any) {
      setError(e.message || 'Failed to trigger password reset');
    }
  };

  const deleteJudge = async (judgeId: string, type: 'soft' | 'hard') => {
    setError(null);
    setMessage(null);
    try {
      const res = await adminDeleteJudge(judgeId, type);
      setMessage(res.message || 'Deleted');
      await load();
    } catch (e: any) {
      setError(e.message || 'Failed to delete judge');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-silkscreen text-[#0f172a]">Judges</h1>
          <p className="text-[#64748b] font-figtree mt-1">Create and manage judge accounts.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { label: 'Total', value: totalCount, color: '#5425FF' },
          { label: 'Active', value: stats.active, color: '#10B981' },
          { label: 'Inactive', value: stats.inactive, color: '#F59E0B' },
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

      {/* Create */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
        <h2 className="text-xl font-silkscreen text-[#5425FF] mb-4 flex items-center gap-2">
          <span className="material-symbols-rounded">person_add</span>
          Create Judge
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <input
            value={createForm.email}
            onChange={(e) => setCreateForm((p) => ({ ...p, email: e.target.value }))}
            placeholder="Email"
            className="px-4 py-3 border border-gray-300 rounded-xl font-figtree focus:outline-none focus:ring-2 focus:ring-[#5425FF]"
          />
          <input
            value={createForm.firstName}
            onChange={(e) => setCreateForm((p) => ({ ...p, firstName: e.target.value }))}
            placeholder="First name"
            className="px-4 py-3 border border-gray-300 rounded-xl font-figtree focus:outline-none focus:ring-2 focus:ring-[#5425FF]"
          />
          <input
            value={createForm.lastName}
            onChange={(e) => setCreateForm((p) => ({ ...p, lastName: e.target.value }))}
            placeholder="Last name"
            className="px-4 py-3 border border-gray-300 rounded-xl font-figtree focus:outline-none focus:ring-2 focus:ring-[#5425FF]"
          />
        </div>
        <div className="mt-4">
          <button
            disabled={creating}
            onClick={onCreate}
            className="px-5 py-3 rounded-xl bg-[#5425FF] text-white font-figtree font-semibold hover:bg-[#4319CC] disabled:opacity-50"
          >
            {creating ? 'Creating...' : 'Create & Send Invite'}
          </button>
        </div>
        <p className="text-xs text-[#64748b] font-figtree mt-3">
          Note: the backend currently sets a placeholder password and emails a reset link. If you need a separate status
          like “Invited / Pending Password”, we’ll need backend support (e.g. a flag).
        </p>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-silkscreen text-[#5425FF] flex items-center gap-2">
            <span className="material-symbols-rounded">list</span>
            Judges List
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
                  <th className="py-2">Name</th>
                  <th className="py-2">Email</th>
                  <th className="py-2">Active</th>
                  <th className="py-2">Load</th>
                  <th className="py-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {judges.map((j) => (
                  <tr key={j.id} className="border-t border-gray-100">
                    <td className="py-3 font-semibold text-[#0f172a]">
                      {(j.firstName || '') + ' ' + (j.lastName || '')}
                    </td>
                    <td className="py-3 text-[#334155]">{j.email}</td>
                    <td className="py-3">
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-semibold ${
                          j.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
                        }`}
                      >
                        {j.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="py-3">{j.assignmentLoad}</td>
                    <td className="py-3">
                      <div className="flex flex-wrap gap-2">
                        <button
                          onClick={() => toggleActive(j.id, j.isActive)}
                          className="px-3 py-1 rounded-lg border border-gray-300 hover:bg-gray-50"
                        >
                          {j.isActive ? 'Deactivate' : 'Activate'}
                        </button>
                        <button
                          onClick={() => resetPassword(j.id)}
                          className="px-3 py-1 rounded-lg bg-[#5425FF] text-white hover:bg-[#4319CC]"
                        >
                          Reset Password
                        </button>
                        <button
                          onClick={() => deleteJudge(j.id, 'soft')}
                          className="px-3 py-1 rounded-lg bg-yellow-100 text-yellow-800 hover:bg-yellow-200"
                        >
                          Soft Delete
                        </button>
                        <button
                          onClick={() => deleteJudge(j.id, 'hard')}
                          className="px-3 py-1 rounded-lg bg-red-100 text-red-800 hover:bg-red-200"
                        >
                          Hard Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {judges.length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-6 text-center text-[#94a3b8]">
                      No judges found.
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
              Page {page} of {totalPages}
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


