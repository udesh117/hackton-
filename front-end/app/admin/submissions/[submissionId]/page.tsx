'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { adminChangeSubmissionStatus, adminGetSubmissionDetail, adminGetSubmissionDownloadUrl } from '@/lib/api';

export default function AdminSubmissionDetailPage() {
  const params = useParams();
  const submissionId = params?.submissionId as string;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [submission, setSubmission] = useState<any>(null);
  const [statusForm, setStatusForm] = useState({ newStatus: 'under-review', adminNote: '' });
  const [changing, setChanging] = useState(false);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);

  const load = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await adminGetSubmissionDetail(submissionId);
      setSubmission(res.submission);
      setStatusForm((p) => ({
        ...p,
        newStatus: res.submission?.status || p.newStatus,
      }));
    } catch (e: any) {
      setError(e.message || 'Failed to load submission');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (submissionId) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [submissionId]);

  const changeStatus = async () => {
    setError(null);
    setMessage(null);
    setChanging(true);
    try {
      const res = await adminChangeSubmissionStatus(submissionId, {
        newStatus: statusForm.newStatus,
        adminNote: statusForm.adminNote || undefined,
      });
      setMessage('Status updated');
      setSubmission((prev: any) => ({ ...prev, status: res.status || statusForm.newStatus, admin_status_note: res.admin_status_note }));
      setStatusForm((p) => ({ ...p, adminNote: '' }));
    } catch (e: any) {
      setError(e.message || 'Failed to update status');
    } finally {
      setChanging(false);
    }
  };

  const getDownload = async () => {
    setError(null);
    try {
      const res = await adminGetSubmissionDownloadUrl(submissionId);
      setDownloadUrl(res.signedUrl || res.url || null);
    } catch (e: any) {
      setError(e.message || 'Failed to get download link');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16 text-[#5425FF] font-figtree">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#5425FF]" />
        <span className="ml-3">Loading submission...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-silkscreen text-[#0f172a]">Submission Detail</h1>
        <p className="text-[#64748b] font-figtree mt-1">Review repository, download file, and see judge reviews.</p>
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
        <h2 className="text-xl font-silkscreen text-[#5425FF] mb-4 flex items-center gap-2">
          <span className="material-symbols-rounded">inventory_2</span>
          Submission
        </h2>
        <div className="space-y-2 text-sm font-figtree text-[#334155]">
          <p>
            <span className="text-[#64748b]">Team:</span> {submission?.teamName || '—'}
          </p>
          <p>
            <span className="text-[#64748b]">Status:</span> {submission?.status || '—'}
          </p>
          {submission?.repo_url && (
            <p>
              <span className="text-[#64748b]">Repo:</span>{' '}
              <a className="text-[#5425FF] hover:underline" href={submission.repo_url} target="_blank" rel="noreferrer">
                {submission.repo_url}
              </a>
            </p>
          )}
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            onClick={getDownload}
            className="px-4 py-2 rounded-xl bg-[#5425FF] text-white font-figtree font-semibold hover:bg-[#4319CC]"
          >
            Get Download Link
          </button>
          {downloadUrl && (
            <a
              href={downloadUrl}
              target="_blank"
              rel="noreferrer"
              className="px-4 py-2 rounded-xl border border-gray-300 text-[#0f172a] font-figtree font-semibold hover:bg-gray-50"
            >
              Open Signed URL
            </a>
          )}
        </div>
      </div>

      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
        <h2 className="text-xl font-silkscreen text-[#5425FF] mb-4 flex items-center gap-2">
          <span className="material-symbols-rounded">gavel</span>
          Change Submission Status
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <label className="block text-sm font-figtree font-semibold text-[#0f172a] mb-2">New Status</label>
            <select
              value={statusForm.newStatus}
              onChange={(e) => setStatusForm((p) => ({ ...p, newStatus: e.target.value }))}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl font-figtree focus:outline-none focus:ring-2 focus:ring-[#5425FF]"
            >
              <option value="under-review">under-review</option>
              <option value="accepted">accepted</option>
              <option value="rejected">rejected</option>
            </select>
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-figtree font-semibold text-[#0f172a] mb-2">Admin Note</label>
            <input
              value={statusForm.adminNote}
              onChange={(e) => setStatusForm((p) => ({ ...p, adminNote: e.target.value }))}
              placeholder="Optional note"
              className="w-full px-4 py-3 border border-gray-300 rounded-xl font-figtree focus:outline-none focus:ring-2 focus:ring-[#5425FF]"
            />
          </div>
        </div>
        <button
          disabled={changing}
          onClick={changeStatus}
          className="mt-4 px-5 py-3 rounded-xl bg-[#5425FF] text-white font-figtree font-semibold hover:bg-[#4319CC] disabled:opacity-50"
        >
          {changing ? 'Updating...' : 'Update Status'}
        </button>
      </div>

      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
        <h2 className="text-xl font-silkscreen text-[#5425FF] mb-4 flex items-center gap-2">
          <span className="material-symbols-rounded">rate_review</span>
          Judge Reviews
        </h2>
        <div className="space-y-3">
          {(submission?.reviews || []).map((r: any, idx: number) => (
            <div key={idx} className="p-4 border border-gray-200 rounded-2xl">
              <p className="font-figtree font-semibold text-[#0f172a]">{r.judgeName || 'Judge'}</p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs text-[#334155] font-figtree mt-2">
                {['score_innovation', 'score_feasibility', 'score_execution', 'score_presentation'].map((k) => (
                  <div key={k} className="bg-gray-50 rounded-xl p-2">
                    <p className="text-[#64748b]">{k.replace('score_', '')}</p>
                    <p className="font-semibold">{r[k] ?? '—'}</p>
                  </div>
                ))}
              </div>
              {r.comments && <p className="text-sm text-[#475569] font-figtree mt-3 whitespace-pre-wrap">{r.comments}</p>}
            </div>
          ))}
          {(submission?.reviews || []).length === 0 && (
            <p className="text-sm text-[#94a3b8] font-figtree">No reviews yet.</p>
          )}
        </div>
      </div>
    </div>
  );
}


