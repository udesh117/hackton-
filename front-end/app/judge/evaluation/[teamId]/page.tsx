'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import {
  getCurrentUser,
  getJudgeSubmission,
  getEvaluationDraft,
  saveEvaluationDraft,
  submitFinalEvaluation,
  updateSubmittedEvaluation,
  getEvaluationStatus,
  logout,
} from '@/lib/api';

interface EvaluationForm {
  score_innovation: number | '';
  score_feasibility: number | '';
  score_execution: number | '';
  score_presentation: number | '';
  comments: string;
}

export default function EvaluationPage() {
  const router = useRouter();
  const params = useParams();
  const teamId = params?.teamId as string;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  const [submission, setSubmission] = useState<any>(null);
  const [evaluation, setEvaluation] = useState<any>(null);
  const [evaluationStatus, setEvaluationStatus] = useState<{ status: string; isLocked: boolean } | null>(null);
  const [teamName, setTeamName] = useState<string>('');

  const [formData, setFormData] = useState<EvaluationForm>({
    score_innovation: '',
    score_feasibility: '',
    score_execution: '',
    score_presentation: '',
    comments: '',
  });

  useEffect(() => {
    const loadData = async () => {
      if (!teamId) return;

      try {
        setLoading(true);
        setError(null);

        // Check authentication
        const me = await getCurrentUser();
        if (!me.user || me.user.role !== 'judge') {
          router.replace('/login');
          return;
        }

        // Load submission, evaluation, and status in parallel
        const [submissionRes, evaluationRes, statusRes] = await Promise.all([
          getJudgeSubmission(teamId).catch((err) => {
            console.error('Submission error:', err);
            return { submission: null, error: err.message };
          }),
          getEvaluationDraft(teamId).catch((err) => {
            console.error('Evaluation error:', err);
            return { evaluation: null, error: err.message };
          }),
          getEvaluationStatus(teamId).catch((err) => {
            console.error('Status error:', err);
            return { status: 'none', isLocked: false };
          }),
        ]);

        if (submissionRes.submission) {
          setSubmission(submissionRes.submission);
        } else if (submissionRes.error) {
          setError(submissionRes.error);
        }

        if (evaluationRes.evaluation) {
          setEvaluation(evaluationRes.evaluation);
          setFormData({
            score_innovation: evaluationRes.evaluation.score_innovation || '',
            score_feasibility: evaluationRes.evaluation.score_feasibility || '',
            score_execution: evaluationRes.evaluation.score_execution || '',
            score_presentation: evaluationRes.evaluation.score_presentation || '',
            comments: evaluationRes.evaluation.comments || '',
          });
        }

        if (statusRes.status) {
          setEvaluationStatus({
            status: statusRes.status,
            isLocked: statusRes.isLocked || false,
          });
        }

        // Try to get team name from assigned teams
        // This would require another API call, but for now we'll use a placeholder
        setTeamName('Team');
      } catch (err: any) {
        console.error('Failed to load data:', err);
        setError(err.message || 'Failed to load evaluation data');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [teamId, router]);

  const handleInputChange = (field: keyof EvaluationForm, value: string | number) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    // Clear validation error for this field
    if (validationErrors[field]) {
      setValidationErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const validateForm = (isSubmit: boolean = false): boolean => {
    const errors: Record<string, string> = {};

    // Validate scores (required for submit, optional for draft)
    const scoreFields: (keyof EvaluationForm)[] = [
      'score_innovation',
      'score_feasibility',
      'score_execution',
      'score_presentation',
    ];

    scoreFields.forEach((field) => {
      const value = formData[field];
      if (isSubmit && (value === '' || value === null || value === undefined)) {
        errors[field] = `${field.replace('score_', '').replace('_', ' ')} is required`;
      } else if (value !== '' && (Number(value) < 1 || Number(value) > 10)) {
        errors[field] = 'Score must be between 1 and 10';
      }
    });

    // Validate comments for submit
    if (isSubmit) {
      if (!formData.comments || formData.comments.trim().length < 15) {
        errors.comments = 'Detailed comments (minimum 15 characters) are required for submission';
      }
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSaveDraft = async () => {
    setError(null);
    setSuccessMessage(null);
    setValidationErrors({});

    if (!validateForm(false)) {
      return;
    }

    setSaving(true);

    try {
      const draftData: any = {};
      if (formData.score_innovation !== '') draftData.score_innovation = Number(formData.score_innovation);
      if (formData.score_feasibility !== '') draftData.score_feasibility = Number(formData.score_feasibility);
      if (formData.score_execution !== '') draftData.score_execution = Number(formData.score_execution);
      if (formData.score_presentation !== '') draftData.score_presentation = Number(formData.score_presentation);
      if (formData.comments) draftData.comments = formData.comments;

      const result = await saveEvaluationDraft(teamId, draftData);

      if (result.error) {
        setError(result.error);
        if (result.errors) {
          const errorMap: Record<string, string> = {};
          result.errors.forEach((err: any) => {
            errorMap[err.field] = err.message;
          });
          setValidationErrors(errorMap);
        }
      } else {
        setSuccessMessage('Draft saved successfully!');
        setTimeout(() => setSuccessMessage(null), 3000);
        // Reload evaluation to get updated status
        const evaluationRes = await getEvaluationDraft(teamId);
        if (evaluationRes.evaluation) {
          setEvaluation(evaluationRes.evaluation);
        }
      }
    } catch (err: any) {
      setError(err.message || 'Failed to save draft');
    } finally {
      setSaving(false);
    }
  };

  const handleSubmit = async () => {
    setError(null);
    setSuccessMessage(null);
    setValidationErrors({});

    if (!validateForm(true)) {
      return;
    }

    if (evaluationStatus?.isLocked) {
      setError('This evaluation is locked by an administrator and cannot be modified.');
      return;
    }

    if (evaluationStatus?.status === 'submitted') {
      // Update existing submission
      setSaving(true);
      try {
        const result = await updateSubmittedEvaluation(teamId, {
          score_innovation: Number(formData.score_innovation),
          score_feasibility: Number(formData.score_feasibility),
          score_execution: Number(formData.score_execution),
          score_presentation: Number(formData.score_presentation),
          comments: formData.comments,
        });

        if (result.error) {
          setError(result.error);
          if (result.errors) {
            const errorMap: Record<string, string> = {};
            result.errors.forEach((err: any) => {
              errorMap[err.field] = err.message;
            });
            setValidationErrors(errorMap);
          }
        } else {
          setSuccessMessage('Evaluation updated successfully!');
          setTimeout(() => {
            router.push('/judge/dashboard');
          }, 2000);
        }
      } catch (err: any) {
        setError(err.message || 'Failed to update evaluation');
      } finally {
        setSaving(false);
      }
    } else {
      // Submit new evaluation
      setSaving(true);
      try {
        const result = await submitFinalEvaluation(teamId, {
          score_innovation: Number(formData.score_innovation),
          score_feasibility: Number(formData.score_feasibility),
          score_execution: Number(formData.score_execution),
          score_presentation: Number(formData.score_presentation),
          comments: formData.comments,
        });

        if (result.error) {
          setError(result.error);
          if (result.errors) {
            const errorMap: Record<string, string> = {};
            result.errors.forEach((err: any) => {
              errorMap[err.field] = err.message;
            });
            setValidationErrors(errorMap);
          }
        } else {
          setSuccessMessage('Evaluation submitted successfully!');
          setTimeout(() => {
            router.push('/judge/dashboard');
          }, 2000);
        }
      } catch (err: any) {
        setError(err.message || 'Failed to submit evaluation');
      } finally {
        setSaving(false);
      }
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f8f8ff] flex items-center justify-center">
        <div className="flex items-center gap-3 text-[#5425FF] font-figtree">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#5425FF]" />
          <span>Loading evaluation...</span>
        </div>
      </div>
    );
  }

  const isLocked = evaluationStatus?.isLocked || false;
  const isSubmitted = evaluationStatus?.status === 'submitted';

  return (
    <div className="min-h-screen bg-[#f8f8ff] text-[#0f172a] flex">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-gray-200 px-6 py-8 flex flex-col">
        <div className="text-2xl font-silkscreen text-[#5425FF] mb-6">
          Judge Portal
        </div>
        <nav className="flex flex-col gap-3 text-[#475569] font-figtree">
          <Link
            href="/judge/dashboard"
            className="flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-gray-100"
          >
            <span className="material-symbols-rounded text-lg">dashboard</span> Dashboard
          </Link>
          <Link href="/judge/assignments" className="flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-gray-100">
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

      {/* Main content */}
      <main className="flex-1 px-8 py-8 space-y-6 overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-silkscreen text-[#0f172a] mb-2">
              Evaluate Team
            </h1>
            <p className="text-[#64748b] font-figtree">
              Review and score the team's submission
            </p>
          </div>
          <Link
            href="/judge/dashboard"
            className="px-4 py-2 border border-gray-300 text-[#0f172a] rounded-xl font-figtree font-semibold hover:bg-gray-50 transition-colors flex items-center gap-2"
          >
            <span className="material-symbols-rounded">arrow_back</span>
            Back to Dashboard
          </Link>
        </div>

        {/* Status Banner */}
        {isLocked && (
          <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 px-4 py-3 rounded-xl font-figtree flex items-center gap-2">
            <span className="material-symbols-rounded">lock</span>
            This evaluation is locked by an administrator and cannot be modified.
          </div>
        )}

        {isSubmitted && !isLocked && (
          <div className="bg-blue-50 border border-blue-200 text-blue-800 px-4 py-3 rounded-xl font-figtree flex items-center gap-2">
            <span className="material-symbols-rounded">info</span>
            This evaluation has been submitted. You can still update it.
          </div>
        )}

        {/* Messages */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-xl font-figtree flex items-center gap-2">
            <span className="material-symbols-rounded">error</span>
            {error}
          </div>
        )}
        {successMessage && (
          <div className="bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded-xl font-figtree flex items-center gap-2">
            <span className="material-symbols-rounded">check_circle</span>
            {successMessage}
          </div>
        )}

        {/* Submission Details */}
        {submission && (
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <h2 className="text-xl font-silkscreen text-[#5425FF] mb-4 flex items-center gap-2">
              <span className="material-symbols-rounded">inventory_2</span>
              Submission Details
            </h2>
            <div className="space-y-3">
              <div>
                <p className="text-sm font-figtree text-[#64748b] mb-1">Repository URL</p>
                {submission.repo_url ? (
                  <a
                    href={submission.repo_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-base font-figtree text-[#5425FF] hover:underline flex items-center gap-2"
                  >
                    <span className="material-symbols-rounded text-lg">link</span>
                    {submission.repo_url}
                  </a>
                ) : (
                  <p className="text-base font-figtree text-[#64748b]">No repository URL provided</p>
                )}
              </div>
              <div>
                <p className="text-sm font-figtree text-[#64748b] mb-1">Status</p>
                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-green-100 text-green-700 text-xs font-figtree font-semibold">
                  <span className="material-symbols-rounded text-sm">check_circle</span>
                  {submission.status || 'submitted'}
                </span>
              </div>
              {submission.submitted_at && (
                <div>
                  <p className="text-sm font-figtree text-[#64748b] mb-1">Submitted At</p>
                  <p className="text-base font-figtree text-[#0f172a]">
                    {new Date(submission.submitted_at).toLocaleString()}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {!submission && (
          <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 px-4 py-3 rounded-xl font-figtree">
            <span className="material-symbols-rounded">warning</span>
            No submission found for this team. The team must submit their project before evaluation.
          </div>
        )}

        {/* Evaluation Form */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <h2 className="text-xl font-silkscreen text-[#5425FF] mb-6 flex items-center gap-2">
            <span className="material-symbols-rounded">rate_review</span>
            Evaluation Scores
          </h2>

          <div className="space-y-6">
            {/* Scoring Criteria */}
            {[
              { key: 'score_innovation', label: 'Innovation', description: 'Creativity and originality of the solution' },
              { key: 'score_feasibility', label: 'Feasibility', description: 'Practicality and implementability' },
              { key: 'score_execution', label: 'Execution', description: 'Quality of implementation and code' },
              { key: 'score_presentation', label: 'Presentation', description: 'Clarity and quality of presentation' },
            ].map((criterion) => (
              <div key={criterion.key}>
                <label className="block text-sm font-figtree font-semibold text-[#0f172a] mb-2">
                  {criterion.label}
                  <span className="text-red-500 ml-1">*</span>
                </label>
                <p className="text-xs font-figtree text-[#64748b] mb-2">{criterion.description}</p>
                <div className="flex items-center gap-4">
                  <input
                    type="number"
                    min="1"
                    max="10"
                    step="1"
                    value={formData[criterion.key as keyof EvaluationForm]}
                    onChange={(e) => {
                      const value = e.target.value === '' ? '' : Number(e.target.value);
                      handleInputChange(criterion.key as keyof EvaluationForm, value);
                    }}
                    disabled={isLocked}
                    className={`w-24 px-4 py-3 border rounded-xl font-figtree focus:outline-none focus:ring-2 focus:ring-[#5425FF] ${
                      validationErrors[criterion.key]
                        ? 'border-red-300 focus:ring-red-500'
                        : 'border-gray-300'
                    }`}
                    placeholder="1-10"
                  />
                  <div className="flex-1">
                    <input
                      type="range"
                      min="1"
                      max="10"
                      step="1"
                      value={formData[criterion.key as keyof EvaluationForm] || 5}
                      onChange={(e) => {
                        handleInputChange(criterion.key as keyof EvaluationForm, Number(e.target.value));
                      }}
                      disabled={isLocked}
                      className="w-full"
                    />
                    <div className="flex justify-between text-xs text-[#64748b] font-figtree mt-1">
                      <span>1</span>
                      <span>5</span>
                      <span>10</span>
                    </div>
                  </div>
                </div>
                {validationErrors[criterion.key] && (
                  <p className="mt-1 text-sm text-red-600 font-figtree flex items-center gap-1">
                    <span className="material-symbols-rounded text-base">error</span>
                    {validationErrors[criterion.key]}
                  </p>
                )}
              </div>
            ))}

            {/* Comments */}
            <div>
              <label className="block text-sm font-figtree font-semibold text-[#0f172a] mb-2">
                Comments
                <span className="text-red-500 ml-1">*</span>
                {isSubmitted && (
                  <span className="text-xs text-[#64748b] ml-2">(Minimum 15 characters required)</span>
                )}
              </label>
              <textarea
                value={formData.comments}
                onChange={(e) => handleInputChange('comments', e.target.value)}
                disabled={isLocked}
                rows={6}
                className={`w-full px-4 py-3 border rounded-xl font-figtree focus:outline-none focus:ring-2 focus:ring-[#5425FF] ${
                  validationErrors.comments
                    ? 'border-red-300 focus:ring-red-500'
                    : 'border-gray-300'
                }`}
                placeholder="Provide detailed feedback on the team's submission..."
              />
              <p className="text-xs font-figtree text-[#64748b] mt-1">
                {formData.comments.length} characters
                {isSubmitted && formData.comments.length < 15 && (
                  <span className="text-red-600 ml-2">
                    (Need {15 - formData.comments.length} more characters)
                  </span>
                )}
              </p>
              {validationErrors.comments && (
                <p className="mt-1 text-sm text-red-600 font-figtree flex items-center gap-1">
                  <span className="material-symbols-rounded text-base">error</span>
                  {validationErrors.comments}
                </p>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 pt-4 border-t border-gray-200">
              <button
                onClick={handleSaveDraft}
                disabled={saving || isLocked}
                className="px-6 py-3 bg-gray-100 text-[#0f172a] rounded-xl font-figtree font-semibold hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {saving ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-[#0f172a]" />
                    Saving...
                  </>
                ) : (
                  <>
                    <span className="material-symbols-rounded">save</span>
                    Save Draft
                  </>
                )}
              </button>
              <button
                onClick={handleSubmit}
                disabled={saving || isLocked}
                className="px-6 py-3 bg-[#5425FF] text-white rounded-xl font-figtree font-semibold hover:bg-[#4319CC] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {saving ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                    {isSubmitted ? 'Updating...' : 'Submitting...'}
                  </>
                ) : (
                  <>
                    <span className="material-symbols-rounded">
                      {isSubmitted ? 'edit' : 'check_circle'}
                    </span>
                    {isSubmitted ? 'Update Evaluation' : 'Submit Evaluation'}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}





