'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  getCurrentUser,
  getParticipantDashboard,
  getEventInfo,
  getSubmissionDetails,
  saveSubmissionDraft,
  updateSubmission,
  finalizeSubmission,
  logout,
} from '@/lib/api';

interface Submission {
  id: string;
  title: string;
  description?: string;
  repo_url?: string;
  zip_storage_path?: string;
  status: 'draft' | 'submitted';
  submitted_at?: string;
  created_at: string;
}

export default function SubmissionPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  
  // User and team state
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [isTeamLeader, setIsTeamLeader] = useState(false);
  const [submissionId, setSubmissionId] = useState<string | null>(null);
  
  // Submission state
  const [submission, setSubmission] = useState<Submission | null>(null);
  const [submissionStatus, setSubmissionStatus] = useState<'draft' | 'submitted' | 'no_submission'>('no_submission');
  
  // Deadline state
  const [deadline, setDeadline] = useState<string | null>(null);
  const [isDeadlinePassed, setIsDeadlinePassed] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState<string>('');
  
  // Form state
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    repoUrl: '',
  });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  
  // Loading states
  const [isSaving, setIsSaving] = useState(false);
  const [isFinalizing, setIsFinalizing] = useState(false);
  const [showFinalizeModal, setShowFinalizeModal] = useState(false);

  // Calculate time remaining
  useEffect(() => {
    if (!deadline) return;

    const updateTimeRemaining = () => {
      const now = new Date();
      const deadlineDate = new Date(deadline);
      const diff = deadlineDate.getTime() - now.getTime();

      if (diff <= 0) {
        setIsDeadlinePassed(true);
        setTimeRemaining('Deadline Passed');
      } else {
        setIsDeadlinePassed(false);
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);
        
        if (days > 0) {
          setTimeRemaining(`${days}d ${hours}h ${minutes}m`);
        } else if (hours > 0) {
          setTimeRemaining(`${hours}h ${minutes}m ${seconds}s`);
        } else {
          setTimeRemaining(`${minutes}m ${seconds}s`);
        }
      }
    };

    updateTimeRemaining();
    const interval = setInterval(updateTimeRemaining, 1000);
    return () => clearInterval(interval);
  }, [deadline]);

  // Load initial data
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        setError(null);

        // Get current user
        const me = await getCurrentUser();
        if (!me.user) {
          router.push('/login');
          return;
        }
        setCurrentUser(me.user);

        // Get dashboard data to find submission ID
        const dashboardData = await getParticipantDashboard();
        
        // Check if user is team leader (do this first, regardless of submission)
        if (dashboardData.dashboard?.teamStatus?.isLeader) {
          setIsTeamLeader(true);
        }
        
        // Set submission status
        if (dashboardData.dashboard?.submissionStatus?.submissionId) {
          setSubmissionId(dashboardData.dashboard.submissionStatus.submissionId);
          setSubmissionStatus(dashboardData.dashboard.submissionStatus.state as 'draft' | 'submitted' | 'no_submission');
        } else if (dashboardData.dashboard?.submissionStatus?.state) {
          // Even if no submission ID, set the state (likely 'no_submission')
          setSubmissionStatus(dashboardData.dashboard.submissionStatus.state as 'draft' | 'submitted' | 'no_submission');
        }

        // Get event info for deadline
        const eventInfo = await getEventInfo();
        if (eventInfo.eventInfo?.submission_deadline) {
          setDeadline(eventInfo.eventInfo.submission_deadline);
        }

        // Load submission details if ID exists
        if (dashboardData.dashboard?.submissionStatus?.submissionId) {
          const submissionResult = await getSubmissionDetails(
            dashboardData.dashboard.submissionStatus.submissionId
          );
          if (submissionResult.submission) {
            setSubmission(submissionResult.submission);
            setFormData({
              title: submissionResult.submission.title || '',
              description: submissionResult.submission.description || '',
              repoUrl: submissionResult.submission.repo_url || '',
            });
          }
        }
      } catch (err: any) {
        console.error('Failed to load submission data:', err);
        setError(err.message || 'Failed to load submission data');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [router]);

  // Handle file selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) {
      setSelectedFile(null);
      setFileError(null);
      return;
    }

    // Validate file type
    if (!file.name.toLowerCase().endsWith('.zip')) {
      setFileError('Only .zip files are allowed');
      setSelectedFile(null);
      return;
    }

    // Validate file size (10MB)
    const maxSize = 10 * 1024 * 1024; // 10MB in bytes
    if (file.size > maxSize) {
      setFileError('File size must be less than 10MB');
      setSelectedFile(null);
      return;
    }

    setFileError(null);
    setSelectedFile(file);
  };

  // Handle file removal
  const handleRemoveFile = () => {
    setSelectedFile(null);
    setFileError(null);
    // Reset file input
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    if (fileInput) fileInput.value = '';
  };

  // Handle save draft
  const handleSaveDraft = async () => {
    if (!formData.title.trim()) {
      setError('Project title is required');
      return;
    }

    setIsSaving(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const result = await saveSubmissionDraft({
        title: formData.title,
        description: formData.description || undefined,
        repoUrl: formData.repoUrl || undefined,
        zipFile: selectedFile || undefined,
      });

      if (result.error) {
        setError(result.error);
      } else {
        setSuccessMessage('Draft saved successfully!');
        setSelectedFile(null);
        setIsEditing(false);
        
        // Reload submission data
        if (result.submission) {
          setSubmission(result.submission);
          setSubmissionId(result.submission.id);
          setSubmissionStatus('draft');
          
          // Update form data with saved submission
          setFormData({
            title: result.submission.title || '',
            description: result.submission.description || '',
            repoUrl: result.submission.repo_url || '',
          });
        }
      }
    } catch (err: any) {
      setError(err.message || 'Failed to save draft');
    } finally {
      setIsSaving(false);
    }
  };

  // Handle update submission (PATCH)
  const handleUpdateSubmission = async () => {
    if (!submissionId || !formData.title.trim()) {
      setError('Project title is required');
      return;
    }

    setIsSaving(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const result = await updateSubmission(submissionId, {
        title: formData.title,
        description: formData.description || undefined,
        repoUrl: formData.repoUrl || undefined,
      });

      if (result.error) {
        setError(result.error);
      } else {
        setSuccessMessage('Submission updated successfully!');
        setIsEditing(false);
        
        // Reload submission data
        if (result.submission) {
          setSubmission(result.submission);
        }
      }
    } catch (err: any) {
      setError(err.message || 'Failed to update submission');
    } finally {
      setIsSaving(false);
    }
  };

  // Handle finalize submission
  const handleFinalize = async () => {
    if (!submissionId) {
      setError('No submission to finalize');
      return;
    }

    if (!formData.title.trim()) {
      setError('Project title is required before finalizing');
      return;
    }

    setIsFinalizing(true);
    setError(null);
    setSuccessMessage(null);
    setShowFinalizeModal(false);

    try {
      const result = await finalizeSubmission(submissionId);

      if (result.error) {
        setError(result.error);
      } else {
        setSuccessMessage('🎉 Submission finalized successfully! Your project has been submitted.');
        setIsEditing(false);
        
        // Update submission status
        if (result.submission) {
          setSubmission(result.submission);
          setSubmissionStatus('submitted');
        }
      }
    } catch (err: any) {
      setError(err.message || 'Failed to finalize submission');
    } finally {
      setIsFinalizing(false);
    }
  };

  // Determine if form should be editable
  const canEdit = (submissionStatus === 'draft' || submissionStatus === 'no_submission') && !isDeadlinePassed && isTeamLeader;
  const canFinalize = submissionStatus === 'draft' && !isDeadlinePassed && isTeamLeader;
  const canUpdate = submissionStatus === 'submitted' && !isDeadlinePassed && isTeamLeader;
  const showForm = ((submissionStatus === 'draft' || submissionStatus === 'no_submission') && !isDeadlinePassed && isTeamLeader) || isEditing;
  const showReadOnly = (submissionStatus === 'submitted' || (submissionStatus === 'draft' && isDeadlinePassed) || !isTeamLeader) && !isEditing;

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f8f8ff] text-[#0f172a] flex">
        <aside className="w-64 bg-white border-r border-gray-200 px-6 py-8 flex flex-col">
          <div className="text-2xl font-silkscreen text-[#5425FF] mb-6">
            Participant Portal
          </div>
        </aside>
        <div className="flex-1 flex items-center justify-center">
          <div className="flex items-center gap-3 text-[#5425FF] font-figtree">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#5425FF]" />
            <span>Loading submission...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8f8ff] text-[#0f172a] flex">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-gray-200 px-6 py-8 flex flex-col">
        <div className="text-2xl font-silkscreen text-[#5425FF] mb-6">
          Participant Portal
        </div>
        <nav className="flex flex-col gap-3 text-[#475569] font-figtree">
          <Link
            href="/participant/dashboard"
            className="flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-gray-100"
          >
            <span className="material-symbols-rounded text-lg">home</span> Dashboard
          </Link>
          <Link href="/participant/teams" className="flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-gray-100">
            <span className="material-symbols-rounded text-lg">groups</span> Team
          </Link>
          <Link href="/participant/submission" className="flex items-center gap-3 px-3 py-2 rounded-xl bg-[#EFEAFF] text-[#5425FF] font-semibold">
            <span className="material-symbols-rounded text-lg">inventory_2</span> Submission
          </Link>
          <Link href="/participant/profile" className="flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-gray-100">
            <span className="material-symbols-rounded text-lg">person</span> Profile
          </Link>
          <Link href="/participant/notifications" className="flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-gray-100">
            <span className="material-symbols-rounded text-lg">notifications</span> Notifications
          </Link>
          <Link href="/participant/settings" className="flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-gray-100">
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
        <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-silkscreen text-[#5425FF] flex items-center gap-2">
            <span className="material-symbols-rounded">description</span>
            Project Submission
          </h1>
        </div>

        {/* Global Status Card */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <h2 className="text-xl font-silkscreen text-[#5425FF] mb-4 flex items-center gap-2">
            <span className="material-symbols-rounded">info</span>
            Submission Status
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <p className="text-sm font-figtree text-[#64748b] mb-1">Submission Deadline</p>
              <p className="text-lg font-figtree font-semibold text-[#0f172a]">
                {deadline ? new Date(deadline).toLocaleString() : 'Not set'}
              </p>
            </div>
            <div>
              <p className="text-sm font-figtree text-[#64748b] mb-1">Time Remaining</p>
              <p className={`text-lg font-figtree font-semibold ${isDeadlinePassed ? 'text-red-600' : 'text-[#5425FF]'}`}>
                {timeRemaining || 'Calculating...'}
              </p>
            </div>
            <div>
              <p className="text-sm font-figtree text-[#64748b] mb-1">Status</p>
              <p className="text-lg font-figtree font-semibold">
                {submissionStatus === 'submitted' ? (
                  <span className="inline-flex items-center gap-1 text-green-600">
                    <span className="material-symbols-rounded text-sm">check_circle</span>
                    Submitted
                  </span>
                ) : submissionStatus === 'draft' ? (
                  <span className="inline-flex items-center gap-1 text-[#5425FF]">
                    <span className="material-symbols-rounded text-sm">edit</span>
                    Draft
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-[#64748b]">
                    <span className="material-symbols-rounded text-sm">pending</span>
                    No Submission
                  </span>
                )}
              </p>
            </div>
          </div>
        </div>

        {/* Error/Success Messages */}
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

        {/* Deadline Passed Warning */}
        {submissionStatus === 'draft' && isDeadlinePassed && (
          <div className="bg-red-50 border-2 border-red-300 text-red-800 px-6 py-4 rounded-xl font-figtree">
            <div className="flex items-start gap-3">
              <span className="material-symbols-rounded text-3xl text-red-600">error</span>
              <div>
                <p className="font-semibold text-lg mb-1">Submission Rejected: Deadline Passed</p>
                <p className="text-sm">Your draft submission cannot be finalized. The submission deadline has expired.</p>
              </div>
            </div>
          </div>
        )}

        {/* Not Team Leader Warning */}
        {!isTeamLeader && (
          <div className="bg-blue-50 border border-blue-200 text-blue-800 px-6 py-4 rounded-xl font-figtree">
            <div className="flex items-start gap-3">
              <span className="material-symbols-rounded text-2xl text-blue-600">info</span>
              <div>
                <p className="font-semibold mb-1">View-Only Mode</p>
                <p className="text-sm">Only the team leader can create, edit, or finalize submissions.</p>
              </div>
            </div>
          </div>
        )}

        {/* Submission Form / Detail View */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          {showForm && !showReadOnly ? (
            // Editable Form
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (submissionStatus === 'submitted' && isEditing) {
                  handleUpdateSubmission();
                } else {
                  handleSaveDraft();
                }
              }}
              className="space-y-6"
            >
              <h2 className="text-xl font-silkscreen text-[#5425FF] mb-4 flex items-center gap-2">
                <span className="material-symbols-rounded">edit</span>
                {submissionStatus === 'submitted' ? 'Edit Submission' : 'Project Details'}
              </h2>

              <div>
                <label className="block text-sm font-figtree font-semibold text-[#0f172a] mb-2">
                  Project Title <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl font-figtree focus:outline-none focus:ring-2 focus:ring-[#5425FF]"
                  placeholder="Enter your project title"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-figtree font-semibold text-[#0f172a] mb-2">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl font-figtree focus:outline-none focus:ring-2 focus:ring-[#5425FF]"
                  placeholder="Describe your project..."
                  rows={6}
                />
              </div>

              <div>
                <label className="block text-sm font-figtree font-semibold text-[#0f172a] mb-2">
                  Repository URL
                </label>
                <input
                  type="url"
                  value={formData.repoUrl}
                  onChange={(e) => setFormData({ ...formData, repoUrl: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl font-figtree focus:outline-none focus:ring-2 focus:ring-[#5425FF]"
                  placeholder="https://github.com/your-username/your-repo"
                />
              </div>

              {(submissionStatus === 'draft' || submissionStatus === 'no_submission') && (
                <div>
                  <label className="block text-sm font-figtree font-semibold text-[#0f172a] mb-2">
                    Project File (ZIP) <span className="text-[#64748b] font-normal text-xs">(Max 10MB)</span>
                  </label>
                  
                  {/* File Upload Area */}
                  <div className="border-2 border-dashed border-gray-300 rounded-xl p-6 text-center hover:border-[#5425FF] transition-colors">
                    <input
                      type="file"
                      id="file-upload"
                      accept=".zip"
                      onChange={handleFileChange}
                      className="hidden"
                    />
                    
                    {!selectedFile && !submission?.zip_storage_path && (
                      <label
                        htmlFor="file-upload"
                        className="cursor-pointer flex flex-col items-center gap-2"
                      >
                        <span className="material-symbols-rounded text-5xl text-[#5425FF]">upload_file</span>
                        <p className="text-sm font-figtree text-[#0f172a] font-semibold">
                          Click to upload or drag and drop
                        </p>
                        <p className="text-xs font-figtree text-[#64748b]">
                          Only .zip files up to 10MB
                        </p>
                      </label>
                    )}
                    
                    {selectedFile && (
                      <div className="flex items-center justify-between p-4 bg-[#EFEAFF] rounded-lg">
                        <div className="flex items-center gap-3">
                          <span className="material-symbols-rounded text-3xl text-[#5425FF]">folder_zip</span>
                          <div className="text-left">
                            <p className="text-sm font-figtree font-semibold text-[#0f172a]">
                              {selectedFile.name}
                            </p>
                            <p className="text-xs font-figtree text-[#64748b]">
                              {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                            </p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={handleRemoveFile}
                          className="p-2 hover:bg-red-100 rounded-lg transition-colors group"
                          title="Remove file"
                        >
                          <span className="material-symbols-rounded text-[#64748b] group-hover:text-red-600">
                            delete
                          </span>
                        </button>
                      </div>
                    )}
                    
                    {submission?.zip_storage_path && !selectedFile && (
                      <div className="flex items-center justify-center gap-3 p-4 bg-green-50 rounded-lg">
                        <span className="material-symbols-rounded text-3xl text-green-600">check_circle</span>
                        <div className="text-left">
                          <p className="text-sm font-figtree font-semibold text-green-800">
                            File already uploaded
                          </p>
                          <p className="text-xs font-figtree text-green-600">
                            Upload a new file to replace it
                          </p>
                        </div>
                        <label
                          htmlFor="file-upload"
                          className="ml-auto px-4 py-2 bg-[#5425FF] text-white rounded-lg font-figtree text-sm font-semibold hover:bg-[#4319CC] transition-colors cursor-pointer"
                        >
                          Replace File
                        </label>
                      </div>
                    )}
                  </div>
                  
                  {fileError && (
                    <div className="mt-2 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2">
                      <span className="material-symbols-rounded text-red-600">error</span>
                      <p className="text-red-600 text-sm font-figtree font-semibold">{fileError}</p>
                    </div>
                  )}
                  
                  <p className="mt-2 text-xs font-figtree text-[#64748b]">
                    <span className="material-symbols-rounded text-sm align-middle">info</span>
                    {' '}Upload your complete project as a .zip file. Make sure it includes all source code, documentation, and necessary files.
                  </p>
                </div>
              )}

              {/* Action Panel */}
              <div className="flex gap-3 pt-4">
                {submissionStatus === 'submitted' && isEditing ? (
                  <>
                    <button
                      type="submit"
                      disabled={isSaving}
                      className="px-6 py-2 bg-[#5425FF] text-white rounded-xl font-figtree font-semibold hover:bg-[#4319CC] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                      {isSaving ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                          Saving...
                        </>
                      ) : (
                        <>
                          <span className="material-symbols-rounded text-lg">save</span>
                          Save Changes
                        </>
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setIsEditing(false);
                        // Reset form data to submission data
                        if (submission) {
                          setFormData({
                            title: submission.title || '',
                            description: submission.description || '',
                            repoUrl: submission.repo_url || '',
                          });
                        }
                      }}
                      className="px-6 py-2 border border-gray-300 text-[#0f172a] rounded-xl font-figtree font-semibold hover:bg-gray-50 transition-colors"
                    >
                      Cancel
                    </button>
                  </>
                ) : (
                  <>
                    {canEdit && (
                      <button
                        type="submit"
                        disabled={isSaving}
                        className="px-6 py-2 bg-[#5425FF] text-white rounded-xl font-figtree font-semibold hover:bg-[#4319CC] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                      >
                        {isSaving ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                            Saving...
                          </>
                        ) : (
                          <>
                            <span className="material-symbols-rounded text-lg">save</span>
                            Save Draft
                          </>
                        )}
                      </button>
                    )}
                    {canFinalize && submissionStatus === 'draft' && submissionId && (
                      <button
                        type="button"
                        onClick={() => setShowFinalizeModal(true)}
                        disabled={isFinalizing || !formData.title.trim()}
                        className="px-6 py-2 bg-green-600 text-white rounded-xl font-figtree font-semibold hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                      >
                        <span className="material-symbols-rounded text-lg">lock</span>
                        Finalize Submission
                      </button>
                    )}
                  </>
                )}
              </div>
            </form>
          ) : (
            // Read-Only Detail View
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-silkscreen text-[#5425FF] flex items-center gap-2">
                  <span className="material-symbols-rounded">visibility</span>
                  Submission Details
                </h2>
                {canUpdate && !isEditing && (
                  <button
                    onClick={() => setIsEditing(true)}
                    className="px-4 py-2 bg-[#5425FF] text-white rounded-xl font-figtree font-semibold hover:bg-[#4319CC] transition-colors flex items-center gap-2"
                  >
                    <span className="material-symbols-rounded text-lg">edit</span>
                    Edit
                  </button>
                )}
              </div>

              {submission ? (
                <>
                  <div>
                    <p className="text-sm font-figtree text-[#64748b] mb-1">Project Title</p>
                    <p className="text-lg font-figtree font-semibold text-[#0f172a]">{submission.title}</p>
                  </div>

                  {submission.description && (
                    <div>
                      <p className="text-sm font-figtree text-[#64748b] mb-1">Description</p>
                      <p className="text-base font-figtree text-[#0f172a] whitespace-pre-wrap">{submission.description}</p>
                    </div>
                  )}

                  {submission.repo_url && (
                    <div>
                      <p className="text-sm font-figtree text-[#64748b] mb-1">Repository URL</p>
                      <a
                        href={submission.repo_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[#5425FF] font-figtree hover:underline flex items-center gap-1"
                      >
                        <span className="material-symbols-rounded text-base">link</span>
                        {submission.repo_url}
                      </a>
                    </div>
                  )}

                  {submission.zip_storage_path && (
                    <div>
                      <p className="text-sm font-figtree text-[#64748b] mb-2">Project File</p>
                      <div className="flex items-center gap-3 p-4 bg-[#EFEAFF] rounded-lg border border-[#5425FF]/20">
                        <span className="material-symbols-rounded text-3xl text-[#5425FF]">folder_zip</span>
                        <div className="flex-1">
                          <p className="text-sm font-figtree font-semibold text-[#0f172a]">
                            Project Files (ZIP)
                          </p>
                          <p className="text-xs font-figtree text-[#64748b]">
                            Uploaded successfully
                          </p>
                        </div>
                        <a
                          href={submission.zip_storage_path}
                          download
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-4 py-2 bg-[#5425FF] text-white rounded-lg font-figtree text-sm font-semibold hover:bg-[#4319CC] transition-colors flex items-center gap-2"
                        >
                          <span className="material-symbols-rounded text-lg">download</span>
                          Download
                        </a>
                      </div>
                    </div>
                  )}

                  {submission.submitted_at && (
                    <div>
                      <p className="text-sm font-figtree text-[#64748b] mb-1">Submitted At</p>
                      <p className="text-base font-figtree text-[#0f172a]">
                        {new Date(submission.submitted_at).toLocaleString()}
                      </p>
                    </div>
                  )}
                </>
              ) : (
                <div className="text-center py-8">
                  <p className="text-[#64748b] font-figtree mb-2">No submission found</p>
                  <p className="text-sm text-[#94a3b8] font-figtree">
                    {isTeamLeader
                      ? 'Start by creating a draft submission using the form above.'
                      : 'Only the team leader can create submissions.'}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Finalize Confirmation Modal */}
        {showFinalizeModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 space-y-4">
              <div className="flex items-start gap-4">
                <div className="p-3 bg-yellow-100 rounded-full">
                  <span className="material-symbols-rounded text-3xl text-yellow-600">warning</span>
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-silkscreen text-[#0f172a] mb-2">
                    Finalize Submission?
                  </h3>
                  <p className="text-sm font-figtree text-[#64748b] mb-4">
                    Are you sure you want to finalize this submission? This action cannot be undone.
                  </p>
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4">
                    <p className="text-xs font-figtree text-yellow-800">
                      <span className="material-symbols-rounded text-sm align-middle">lock</span>
                      {' '}After finalizing, you will <strong>NOT</strong> be able to:
                    </p>
                    <ul className="text-xs font-figtree text-yellow-800 mt-2 ml-6 space-y-1 list-disc">
                      <li>Edit the project title or description</li>
                      <li>Change the repository URL</li>
                      <li>Upload a new ZIP file</li>
                    </ul>
                  </div>
                  <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                    <p className="text-xs font-figtree text-green-800">
                      <span className="material-symbols-rounded text-sm align-middle">check_circle</span>
                      {' '}Your submission will be officially submitted and visible to judges.
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => setShowFinalizeModal(false)}
                  disabled={isFinalizing}
                  className="flex-1 px-4 py-3 border border-gray-300 text-[#0f172a] rounded-xl font-figtree font-semibold hover:bg-gray-50 transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleFinalize}
                  disabled={isFinalizing}
                  className="flex-1 px-4 py-3 bg-green-600 text-white rounded-xl font-figtree font-semibold hover:bg-green-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isFinalizing ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                      Finalizing...
                    </>
                  ) : (
                    <>
                      <span className="material-symbols-rounded">lock</span>
                      Yes, Finalize
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
        </div>
      </main>
    </div>
  );
}

