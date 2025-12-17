'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { adminGetTeam, adminUpdateTeam, adminVerifyTeam } from '@/lib/api';

export default function AdminTeamDetailPage() {
  const params = useParams();
  const teamId = params?.teamId as string;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [team, setTeam] = useState<any>(null);

  const [editForm, setEditForm] = useState({
    name: '',
    city: '',
    projectCategory: '',
    adminNotes: '',
  });
  const [saving, setSaving] = useState(false);

  const load = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await adminGetTeam(teamId);
      setTeam(res.team);
      setEditForm({
        name: res.team?.name || '',
        city: res.team?.city || '',
        projectCategory: res.team?.project_category || '',
        adminNotes: res.team?.admin_notes || '',
      });
    } catch (e: any) {
      setError(e.message || 'Failed to load team');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (teamId) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [teamId]);

  const onVerify = async (action: 'approve' | 'reject') => {
    setError(null);
    setMessage(null);
    try {
      const res = await adminVerifyTeam(teamId, action);
      setMessage(res.message || 'Updated');
      await load();
    } catch (e: any) {
      setError(e.message || 'Failed to verify team');
    }
  };

  const onSave = async () => {
    setError(null);
    setMessage(null);
    setSaving(true);
    try {
      const payload: any = {};
      if (editForm.name) payload.name = editForm.name;
      if (editForm.city) payload.city = editForm.city;
      if (editForm.projectCategory) payload.projectCategory = editForm.projectCategory;
      if (editForm.adminNotes) payload.adminNotes = editForm.adminNotes;
      const res = await adminUpdateTeam(teamId, payload);
      setMessage(res.message || 'Saved');
      await load();
    } catch (e: any) {
      setError(e.message || 'Failed to update team');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16 text-[#5425FF] font-figtree">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#5425FF]" />
        <span className="ml-3">Loading team...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-silkscreen text-[#0f172a]">Team Profile</h1>
        <p className="text-[#64748b] font-figtree mt-1">360° view: members, submissions, judges, and evaluations.</p>
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

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Team summary */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 xl:col-span-2">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-xl font-silkscreen text-[#5425FF]">{team?.name || 'Team'}</h2>
              <p className="text-sm font-figtree text-[#64748b] mt-1">
                Status: <span className="capitalize font-semibold">{team?.verification_status || 'unknown'}</span>
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => onVerify('approve')}
                className="px-4 py-2 rounded-xl bg-green-600 text-white font-figtree font-semibold hover:bg-green-700"
              >
                Approve
              </button>
              <button
                onClick={() => onVerify('reject')}
                className="px-4 py-2 rounded-xl bg-red-600 text-white font-figtree font-semibold hover:bg-red-700"
              >
                Reject
              </button>
            </div>
          </div>

          {/* Members */}
          <div className="mt-6">
            <h3 className="text-lg font-silkscreen text-[#0f172a] mb-3 flex items-center gap-2">
              <span className="material-symbols-rounded">group</span>
              Members
            </h3>
            <div className="space-y-2">
              {(team?.members || []).map((m: any, idx: number) => (
                <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                  <div className="min-w-0">
                    <p className="font-figtree font-semibold text-[#0f172a] truncate">{m?.name || 'Member'}</p>
                    <p className="text-xs text-[#64748b] font-figtree capitalize">{m?.role || 'member'}</p>
                  </div>
                </div>
              ))}
              {(team?.members || []).length === 0 && <p className="text-sm text-[#94a3b8] font-figtree">No members.</p>}
            </div>
          </div>

          {/* Submissions */}
          <div className="mt-6">
            <h3 className="text-lg font-silkscreen text-[#0f172a] mb-3 flex items-center gap-2">
              <span className="material-symbols-rounded">inventory_2</span>
              Submissions
            </h3>
            <div className="space-y-2">
              {(team?.submissions || []).map((s: any, idx: number) => (
                <div key={idx} className="p-3 bg-gray-50 rounded-xl">
                  <p className="text-sm font-figtree text-[#0f172a]">
                    Repo: {s?.repo_url ? <a className="text-[#5425FF] hover:underline" href={s.repo_url} target="_blank" rel="noreferrer">{s.repo_url}</a> : '—'}
                  </p>
                  {s?.status && <p className="text-xs text-[#64748b] font-figtree mt-1">Status: {s.status}</p>}
                </div>
              ))}
              {(team?.submissions || []).length === 0 && (
                <p className="text-sm text-[#94a3b8] font-figtree">No submissions.</p>
              )}
            </div>
          </div>
        </div>

        {/* Admin edit */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <h3 className="text-lg font-silkscreen text-[#5425FF] mb-4 flex items-center gap-2">
            <span className="material-symbols-rounded">edit</span>
            Admin Edit
          </h3>
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-figtree font-semibold text-[#0f172a] mb-2">Team Name</label>
              <input
                value={editForm.name}
                onChange={(e) => setEditForm((p) => ({ ...p, name: e.target.value }))}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl font-figtree focus:outline-none focus:ring-2 focus:ring-[#5425FF]"
              />
            </div>
            <div>
              <label className="block text-sm font-figtree font-semibold text-[#0f172a] mb-2">City</label>
              <input
                value={editForm.city}
                onChange={(e) => setEditForm((p) => ({ ...p, city: e.target.value }))}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl font-figtree focus:outline-none focus:ring-2 focus:ring-[#5425FF]"
              />
            </div>
            <div>
              <label className="block text-sm font-figtree font-semibold text-[#0f172a] mb-2">Project Category</label>
              <input
                value={editForm.projectCategory}
                onChange={(e) => setEditForm((p) => ({ ...p, projectCategory: e.target.value }))}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl font-figtree focus:outline-none focus:ring-2 focus:ring-[#5425FF]"
              />
            </div>
            <div>
              <label className="block text-sm font-figtree font-semibold text-[#0f172a] mb-2">Admin Notes</label>
              <textarea
                value={editForm.adminNotes}
                onChange={(e) => setEditForm((p) => ({ ...p, adminNotes: e.target.value }))}
                rows={5}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl font-figtree focus:outline-none focus:ring-2 focus:ring-[#5425FF]"
              />
            </div>
            <button
              disabled={saving}
              onClick={onSave}
              className="w-full px-5 py-3 rounded-xl bg-[#5425FF] text-white font-figtree font-semibold hover:bg-[#4319CC] disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}


