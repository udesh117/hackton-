'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { getCurrentUser, getJudgeDashboard, getAssignedTeams, getMyReviews, logout } from '@/lib/api';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

export default function JudgeDashboardPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dashboard, setDashboard] = useState<any>(null);
  const [assignedTeams, setAssignedTeams] = useState<any[]>([]);
  const [reviews, setReviews] = useState<any[]>([]);

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        setError(null);

        // Check authentication and role
        const me = await getCurrentUser();
        if (!me.user) {
          router.replace('/login');
          return;
        }
        if (me.user.role !== 'judge') {
          router.replace('/');
          return;
        }

        // Load dashboard data, assigned teams, and reviews in parallel
        const [dashboardRes, teamsRes, reviewsRes] = await Promise.all([
          getJudgeDashboard().catch((err) => {
            console.error('Dashboard error:', err);
            return { message: 'Failed to load judge dashboard', dashboard: null, error: err?.message || 'Network error' };
          }),
          getAssignedTeams(1, 10).catch((err) => {
            console.error('Teams error:', err);
            return { message: 'Failed to load assigned teams', teams: [], pagination: null, error: err?.message || 'Network error' };
          }),
          getMyReviews().catch((err) => {
            console.error('Reviews error:', err);
            return { message: 'Failed to load reviews', reviews: [], totalCount: 0, error: err?.message || 'Network error' };
          }),
        ]);

        // Handle dashboard response
        if ((dashboardRes as any)?.dashboard) {
          setDashboard((dashboardRes as any).dashboard);
        } else if ((dashboardRes as any)?.error) {
          throw new Error((dashboardRes as any).error);
        }

        // Handle teams response - backend returns 'teams' array
        if (teamsRes.teams) {
          setAssignedTeams(teamsRes.teams);
        }

        // Handle reviews response
        if (reviewsRes.reviews) {
          setReviews(reviewsRes.reviews);
        }
      } catch (err: any) {
        setError(err.message || 'Failed to load dashboard');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [router]);

  const statsCards = useMemo(() => {
    if (!dashboard) return [];
    
    return [
      {
        title: 'Total Assigned',
        value: dashboard.assignedTeamsCount || 0,
        caption: 'Teams assigned to you',
        icon: 'groups',
        color: '#5425FF',
        iconBg: '#EFEAFF',
      },
      {
        title: 'Ready to Evaluate',
        value: dashboard.evaluationProgress?.readyForEvaluation || 0,
        caption: 'Submissions ready',
        icon: 'play_circle',
        color: '#3B82F6',
        iconBg: '#DBEAFE',
      },
      {
        title: 'Completed',
        value: dashboard.evaluationProgress?.completed || 0,
        caption: 'Evaluations submitted',
        icon: 'check_circle',
        color: '#10B981',
        iconBg: '#D1FAE5',
      },
      {
        title: 'Pending',
        value: dashboard.evaluationProgress?.pending || 0,
        caption: 'Awaiting evaluation',
        icon: 'pending',
        color: '#F59E0B',
        iconBg: '#FEF3C7',
      },
    ];
  }, [dashboard]);

  // Chart data for evaluation progress
  const evaluationChartData = useMemo(() => {
    if (!dashboard?.evaluationProgress) return [];
    
    const { completed, pending, readyForEvaluation } = dashboard.evaluationProgress;
    return [
      { name: 'Completed', value: completed, color: '#10B981' },
      { name: 'Pending', value: pending, color: '#F59E0B' },
      { name: 'Ready', value: readyForEvaluation, color: '#3B82F6' },
    ].filter(item => item.value > 0);
  }, [dashboard]);

  // Bar chart data for status breakdown
  const statusBarData = useMemo(() => {
    if (!assignedTeams || assignedTeams.length === 0) return [];
    
    const statusCounts = {
      'No Submission': 0,
      'Draft Submission': 0,
      'Submitted': 0,
    };
    
    assignedTeams.forEach((team: any) => {
      if (team.submissionStatus === 'submitted') {
        statusCounts['Submitted']++;
      } else if (team.submissionStatus === 'draft') {
        statusCounts['Draft Submission']++;
      } else {
        statusCounts['No Submission']++;
      }
    });
    
    return Object.entries(statusCounts).map(([name, value]) => ({
      name,
      value,
    }));
  }, [assignedTeams]);

  // Evaluation status breakdown
  const evaluationStatusData = useMemo(() => {
    if (!assignedTeams || assignedTeams.length === 0) return [];
    
    const statusCounts = {
      'None': 0,
      'Draft': 0,
      'Submitted': 0,
    };
    
    assignedTeams.forEach((team: any) => {
      if (team.evaluationStatus === 'submitted') {
        statusCounts['Submitted']++;
      } else if (team.evaluationStatus === 'draft') {
        statusCounts['Draft']++;
      } else {
        statusCounts['None']++;
      }
    });
    
    return Object.entries(statusCounts).map(([name, value]) => ({
      name,
      value,
    }));
  }, [assignedTeams]);

  const getEvaluationStatusBadge = (status: string) => {
    switch (status) {
      case 'submitted':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-green-100 text-green-700 text-xs font-figtree font-semibold">
            <span className="material-symbols-rounded text-sm">check_circle</span>
            Completed
          </span>
        );
      case 'draft':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-yellow-100 text-yellow-700 text-xs font-figtree font-semibold">
            <span className="material-symbols-rounded text-sm">edit</span>
            Draft
          </span>
        );
      case 'none':
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-gray-100 text-gray-700 text-xs font-figtree font-semibold">
            <span className="material-symbols-rounded text-sm">pending</span>
            Pending
          </span>
        );
    }
  };

  const getSubmissionStatusBadge = (status: string) => {
    switch (status) {
      case 'submitted':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-blue-100 text-blue-700 text-xs font-figtree font-semibold">
            <span className="material-symbols-rounded text-sm">check_circle</span>
            Submitted
          </span>
        );
      case 'draft':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-purple-100 text-purple-700 text-xs font-figtree font-semibold">
            <span className="material-symbols-rounded text-sm">edit</span>
            Draft
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-gray-100 text-gray-700 text-xs font-figtree font-semibold">
            <span className="material-symbols-rounded text-sm">pending</span>
            No Submission
          </span>
        );
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#E9E3FF] to-[#E9FFE5]">
        <div className="flex items-center gap-3 text-[#5425FF] font-figtree">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#5425FF]" />
          <span>Loading dashboard...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-[#E9E3FF] to-[#E9FFE5] px-4">
        <div className="max-w-md w-full bg-white shadow-xl rounded-2xl p-6 text-center">
          <p className="text-xl font-figtree text-red-600 mb-4">Server Error</p>
          <p className="text-gray-700 font-figtree mb-6">{error}</p>
          <div className="flex flex-col gap-3">
            <button
              onClick={() => router.refresh()}
              className="w-full bg-[#5425FF] text-white py-3 rounded-xl font-figtree font-semibold hover:bg-[#4319CC]"
            >
              Retry
            </button>
            <Link
              href="/login"
              className="w-full text-center border border-[#5425FF] text-[#5425FF] py-3 rounded-xl font-figtree font-semibold hover:bg-[#F9F9F9]"
            >
              Go to Login
            </Link>
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
          Judge Portal
        </div>
        <nav className="flex flex-col gap-3 text-[#475569] font-figtree">
          <Link
            href="/judge/dashboard"
            className="flex items-center gap-3 px-3 py-2 rounded-xl bg-[#EFEAFF] text-[#5425FF] font-semibold"
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
      <main className="flex-1 px-8 py-8 space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-silkscreen text-[#0f172a]">
              Dashboard
            </h1>
            <p className="text-[#64748b] font-figtree">
              Overview of your assigned teams and evaluation progress
            </p>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          {statsCards.map((card) => (
            <div
              key={card.title}
              className="rounded-2xl px-5 py-4 flex items-center shadow-sm"
              style={{ backgroundColor: card.color, color: '#ffffff' }}
            >
              <div className="flex flex-1 items-center gap-4">
                <span
                  className="w-14 h-14 rounded-full flex items-center justify-center"
                  style={{ backgroundColor: '#ffffff22' }}
                >
                  <span className="material-symbols-rounded text-3xl">{card.icon}</span>
                </span>
                <div className="flex flex-col justify-center">
                  <p className="text-lg font-semibold">{card.value}</p>
                  <p className="text-sm font-figtree" style={{ color: '#e2e8f0' }}>
                    {card.caption}
                  </p>
                  <p className="text-xs font-figtree" style={{ color: '#e2e8f0' }}>
                    {card.title}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Charts Section */}
        {dashboard && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Evaluation Progress Pie Chart */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
              <h2 className="text-xl font-silkscreen text-[#5425FF] mb-4 flex items-center gap-2">
                <span className="material-symbols-rounded">pie_chart</span>
                Evaluation Progress
              </h2>
              {evaluationChartData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={evaluationChartData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name}: ${((percent ?? 0) * 100).toFixed(0)}%`}
                      outerRadius={100}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {evaluationChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-[300px] text-gray-400">
                  <div className="text-center">
                    <span className="material-symbols-rounded text-6xl mb-2">pie_chart</span>
                    <p className="font-figtree">No evaluation data available</p>
                  </div>
                </div>
              )}
            </div>

            {/* Submission Status Bar Chart */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
              <h2 className="text-xl font-silkscreen text-[#5425FF] mb-4 flex items-center gap-2">
                <span className="material-symbols-rounded">bar_chart</span>
                Submission Status
              </h2>
              {statusBarData.length > 0 && statusBarData.some(item => item.value > 0) ? (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={statusBarData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="value" fill="#5425FF" />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-[300px] text-gray-400">
                  <div className="text-center">
                    <span className="material-symbols-rounded text-6xl mb-2">bar_chart</span>
                    <p className="font-figtree">No submission data available</p>
                  </div>
                </div>
              )}
            </div>

            {/* Evaluation Status Breakdown */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
              <h2 className="text-xl font-silkscreen text-[#5425FF] mb-4 flex items-center gap-2">
                <span className="material-symbols-rounded">assessment</span>
                Evaluation Status Breakdown
              </h2>
              {evaluationStatusData.length > 0 && evaluationStatusData.some(item => item.value > 0) ? (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={evaluationStatusData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="value" fill="#10B981" />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-[300px] text-gray-400">
                  <div className="text-center">
                    <span className="material-symbols-rounded text-6xl mb-2">assessment</span>
                    <p className="font-figtree">No evaluation status data available</p>
                  </div>
                </div>
              )}
            </div>

            {/* Progress Overview Card */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
              <h2 className="text-xl font-silkscreen text-[#5425FF] mb-4 flex items-center gap-2">
                <span className="material-symbols-rounded">trending_up</span>
                Progress Overview
              </h2>
              {dashboard.assignedTeamsCount > 0 ? (
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm font-figtree text-gray-600">Completion Rate</span>
                      <span className="text-sm font-figtree font-semibold text-[#5425FF]">
                        {dashboard.evaluationProgress?.completed > 0
                          ? Math.round((dashboard.evaluationProgress.completed / dashboard.assignedTeamsCount) * 100)
                          : 0}%
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-3">
                      <div
                        className="bg-[#10B981] h-3 rounded-full transition-all"
                        style={{
                          width: `${dashboard.evaluationProgress?.completed > 0
                            ? (dashboard.evaluationProgress.completed / dashboard.assignedTeamsCount) * 100
                            : 0}%`,
                        }}
                      />
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm font-figtree text-gray-600">Ready for Evaluation</span>
                      <span className="text-sm font-figtree font-semibold text-[#3B82F6]">
                        {dashboard.evaluationProgress?.readyForEvaluation || 0} / {dashboard.assignedTeamsCount}
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-3">
                      <div
                        className="bg-[#3B82F6] h-3 rounded-full transition-all"
                        style={{
                          width: `${dashboard.evaluationProgress?.readyForEvaluation > 0
                            ? (dashboard.evaluationProgress.readyForEvaluation / dashboard.assignedTeamsCount) * 100
                            : 0}%`,
                        }}
                      />
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm font-figtree text-gray-600">Pending Evaluations</span>
                      <span className="text-sm font-figtree font-semibold text-[#F59E0B]">
                        {dashboard.evaluationProgress?.pending || 0} / {dashboard.assignedTeamsCount}
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-3">
                      <div
                        className="bg-[#F59E0B] h-3 rounded-full transition-all"
                        style={{
                          width: `${dashboard.evaluationProgress?.pending > 0
                            ? (dashboard.evaluationProgress.pending / dashboard.assignedTeamsCount) * 100
                            : 0}%`,
                        }}
                      />
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-center h-[300px] text-gray-400">
                  <div className="text-center">
                    <span className="material-symbols-rounded text-6xl mb-2">trending_up</span>
                    <p className="font-figtree">No teams assigned yet</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Assigned Teams List */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-silkscreen text-[#5425FF] flex items-center gap-2">
              <span className="material-symbols-rounded">groups</span>
              Assigned Teams
            </h2>
            <Link
              href="/judge/assignments"
              className="text-sm font-figtree text-[#5425FF] hover:underline flex items-center gap-1"
            >
              View All
              <span className="material-symbols-rounded text-base">arrow_forward</span>
            </Link>
          </div>

          {assignedTeams.length === 0 ? (
            <div className="text-center py-8">
              <span className="material-symbols-rounded text-6xl text-[#94a3b8] mb-2">groups</span>
              <p className="text-[#64748b] font-figtree">No teams assigned yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {assignedTeams.slice(0, 5).map((team: any) => (
                <Link
                  key={team.teamId}
                  href={`/judge/evaluation/${team.teamId}`}
                  className="block p-4 border border-gray-200 rounded-xl hover:border-[#5425FF] hover:bg-[#EFEAFF]/30 transition-all"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <h3 className="font-figtree font-semibold text-[#0f172a] mb-1">
                        {team.teamName || 'Unnamed Team'}
                      </h3>
                      <div className="flex items-center gap-3 text-sm font-figtree text-[#64748b] flex-wrap">
                        <span>Submission: {getSubmissionStatusBadge(team.submissionStatus || 'no_submission')}</span>
                        <span>•</span>
                        <span>Evaluation: {getEvaluationStatusBadge(team.evaluationStatus || 'none')}</span>
                        {team.isReadyForEvaluation && (
                          <>
                            <span>•</span>
                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-blue-100 text-blue-700 text-xs font-figtree font-semibold">
                              <span className="material-symbols-rounded text-sm">play_circle</span>
                              Ready
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                    <span className="material-symbols-rounded text-[#5425FF]">chevron_right</span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Recent Reviews */}
        {reviews.length > 0 && (
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-silkscreen text-[#5425FF] flex items-center gap-2">
                <span className="material-symbols-rounded">rate_review</span>
                Recent Reviews
              </h2>
              <Link
                href="/judge/reviews"
                className="text-sm font-figtree text-[#5425FF] hover:underline flex items-center gap-1"
              >
                View All
                <span className="material-symbols-rounded text-base">arrow_forward</span>
              </Link>
            </div>

            <div className="space-y-3">
              {reviews.slice(0, 5).map((review: any) => (
                <div
                  key={review.evaluationId}
                  className="p-4 border border-gray-200 rounded-xl"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-figtree font-semibold text-[#0f172a] mb-1">
                        {review.teamName || 'Unknown Team'}
                      </h3>
                      <div className="flex items-center gap-3 text-sm font-figtree text-[#64748b]">
                        <span>{getEvaluationStatusBadge(review.evaluationStatus)}</span>
                        {review.submittedAt && (
                          <>
                            <span>•</span>
                            <span>
                              Submitted: {new Date(review.submittedAt).toLocaleDateString()}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                    {review.isLocked && (
                      <span className="material-symbols-rounded text-yellow-500" title="Locked by Admin">
                        lock
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Notifications Summary */}
        {dashboard?.announcementsSummary && (
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <h2 className="text-xl font-silkscreen text-[#5425FF] mb-4 flex items-center gap-2">
              <span className="material-symbols-rounded">notifications</span>
              Announcements
            </h2>
            {dashboard.announcementsSummary.unreadCount > 0 ? (
              <div className="flex items-center gap-3 p-4 bg-blue-50 border border-blue-200 rounded-xl">
                <span className="material-symbols-rounded text-blue-600">info</span>
                <div className="flex-1">
                  <p className="font-figtree font-semibold text-blue-800">
                    {dashboard.announcementsSummary.unreadCount} unread notification{dashboard.announcementsSummary.unreadCount !== 1 ? 's' : ''}
                  </p>
                  {dashboard.announcementsSummary.latestTitle && (
                    <p className="text-sm font-figtree text-blue-600 mt-1">
                      Latest: {dashboard.announcementsSummary.latestTitle}
                    </p>
                  )}
                </div>
                <Link
                  href="/judge/notifications"
                  className="px-4 py-2 bg-[#5425FF] text-white rounded-lg font-figtree text-sm font-semibold hover:bg-[#4319CC] transition-colors"
                >
                  View All
                </Link>
              </div>
            ) : (
              <p className="text-[#64748b] font-figtree">No new announcements</p>
            )}
          </div>
        )}
      </main>
    </div>
  );
}


