'use client';

import { useEffect, useState } from 'react';
import { adminCreateAnnouncement, adminGetAnnouncements, adminScheduleAnnouncement, adminSendAnnouncementNow } from '@/lib/api';

export default function AdminAnnouncementsPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [totalCount, setTotalCount] = useState(0);
  const [items, setItems] = useState<any[]>([]);

  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({
    title: '',
    content: '',
    role: 'participant',
    city: '',
    scheduledAt: '',
  });

  const totalPages = Math.max(1, Math.ceil(totalCount / limit));

  const load = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await adminGetAnnouncements(page, limit);
      setItems(res.announcements || []);
      setTotalCount(res.totalCount || 0);
    } catch (e: any) {
      setError(e.message || 'Failed to load announcements');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, limit]);

  const create = async () => {
    setError(null);
    setMessage(null);
    if (!form.title || !form.content) {
      setError('Title and content are required');
      return;
    }
    setCreating(true);
    try {
      const targetCriteria: any = { role: form.role };
      if (form.city.trim()) targetCriteria.city = form.city.trim();
      const payload: any = { title: form.title, content: form.content, targetCriteria };
      if (form.scheduledAt) payload.scheduledAt = form.scheduledAt;
      const res = await adminCreateAnnouncement(payload);
      setMessage('Announcement created');
      setForm({ title: '', content: '', role: 'participant', city: '', scheduledAt: '' });
      await load();
      // Optionally immediately schedule if scheduledAt was provided and backend marks it scheduled
      if (res?.id && form.scheduledAt) {
        await adminScheduleAnnouncement(res.id, form.scheduledAt);
      }
    } catch (e: any) {
      setError(e.message || 'Failed to create announcement');
    } finally {
      setCreating(false);
    }
  };

  const sendNow = async (id: string) => {
    setError(null);
    setMessage(null);
    try {
      const res = await adminSendAnnouncementNow(id);
      setMessage(res.message || 'Queued for sending');
      await load();
    } catch (e: any) {
      setError(e.message || 'Failed to send');
    }
  };

  const schedule = async (id: string, scheduledAt: string) => {
    setError(null);
    setMessage(null);
    try {
      const res = await adminScheduleAnnouncement(id, scheduledAt);
      setMessage(res.status ? `Scheduled (${res.status})` : 'Scheduled');
      await load();
    } catch (e: any) {
      setError(e.message || 'Failed to schedule');
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-silkscreen text-[#0f172a]">Announcements</h1>
        <p className="text-[#64748b] font-figtree mt-1">Create, schedule, and send announcements.</p>
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
          <span className="material-symbols-rounded">add</span>
          Create Announcement
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <input
            value={form.title}
            onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
            placeholder="Title"
            className="md:col-span-3 px-4 py-3 border border-gray-300 rounded-xl font-figtree focus:outline-none focus:ring-2 focus:ring-[#5425FF]"
          />
          <textarea
            value={form.content}
            onChange={(e) => setForm((p) => ({ ...p, content: e.target.value }))}
            placeholder="Content"
            rows={4}
            className="md:col-span-3 px-4 py-3 border border-gray-300 rounded-xl font-figtree focus:outline-none focus:ring-2 focus:ring-[#5425FF]"
          />
          <div>
            <label className="block text-sm font-figtree font-semibold text-[#0f172a] mb-2">Target Role</label>
            <select
              value={form.role}
              onChange={(e) => setForm((p) => ({ ...p, role: e.target.value }))}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl font-figtree focus:outline-none focus:ring-2 focus:ring-[#5425FF]"
            >
              <option value="participant">participant</option>
              <option value="judge">judge</option>
              <option value="admin">admin</option>
              <option value="all">all</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-figtree font-semibold text-[#0f172a] mb-2">City (optional)</label>
            <input
              value={form.city}
              onChange={(e) => setForm((p) => ({ ...p, city: e.target.value }))}
              placeholder="e.g. Boston"
              className="w-full px-4 py-3 border border-gray-300 rounded-xl font-figtree focus:outline-none focus:ring-2 focus:ring-[#5425FF]"
            />
          </div>
          <div>
            <label className="block text-sm font-figtree font-semibold text-[#0f172a] mb-2">Schedule At (optional)</label>
            <input
              value={form.scheduledAt}
              onChange={(e) => setForm((p) => ({ ...p, scheduledAt: e.target.value }))}
              placeholder="2025-12-30T09:00:00Z"
              className="w-full px-4 py-3 border border-gray-300 rounded-xl font-figtree focus:outline-none focus:ring-2 focus:ring-[#5425FF]"
            />
          </div>
        </div>
        <button
          disabled={creating}
          onClick={create}
          className="mt-4 px-5 py-3 rounded-xl bg-[#5425FF] text-white font-figtree font-semibold hover:bg-[#4319CC] disabled:opacity-50"
        >
          {creating ? 'Creating...' : 'Create'}
        </button>
      </div>

      {/* List */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-silkscreen text-[#5425FF] flex items-center gap-2">
            <span className="material-symbols-rounded">list</span>
            History
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
            {items.map((a: any) => (
              <div key={a.id} className="border border-gray-200 rounded-2xl p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <p className="font-figtree font-semibold text-[#0f172a]">{a.title}</p>
                    <p className="text-xs text-[#64748b] font-figtree mt-1">
                      Status: {a.status || 'draft'} • Created: {a.created_at ? new Date(a.created_at).toLocaleString() : '—'}
                      {a.scheduled_at && ` • Scheduled: ${new Date(a.scheduled_at).toLocaleString()}`}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => sendNow(a.id)}
                      className="px-3 py-1 rounded-lg bg-[#5425FF] text-white text-xs font-figtree font-semibold hover:bg-[#4319CC]"
                    >
                      Send Now
                    </button>
                    <button
                      onClick={() => {
                        const ts = prompt('Enter scheduledAt ISO timestamp (future):', a.scheduled_at || '');
                        if (ts) schedule(a.id, ts);
                      }}
                      className="px-3 py-1 rounded-lg border border-gray-300 text-xs font-figtree font-semibold hover:bg-gray-50"
                    >
                      Schedule
                    </button>
                  </div>
                </div>
                {a.content && <p className="text-sm text-[#475569] font-figtree mt-3 whitespace-pre-wrap">{a.content}</p>}
              </div>
            ))}
            {items.length === 0 && <p className="text-sm text-[#94a3b8] font-figtree">No announcements yet.</p>}
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


