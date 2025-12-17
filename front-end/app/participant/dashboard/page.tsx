'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  getCurrentUser,
  getParticipantDashboard,
  getNotifications,
  getEventInfo,
  getMyTeam,
  logout,
} from '@/lib/api';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

type DashboardResponse = {
  dashboard?: {
    teamStatus?: {
      id?: string;
      name?: string;
      status?: string;
      memberCount?: number;
      isLeader?: boolean;
    };
    submissionStatus?: {
      state?: string;
      submissionId?: string;
    };
    announcementsSummary?: {
      total?: number;
      unreadCount?: number;
      latestTitle?: string;
    };
    upcomingDeadlines?: { name?: string; date?: string }[];
  };
};

export default function ParticipantDashboardPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dashboard, setDashboard] = useState<DashboardResponse['dashboard']>();
  const [notifications, setNotifications] = useState<any[]>([]);
  const [eventInfo, setEventInfo] = useState<any>(null);
  const [team, setTeam] = useState<any>(null);

  useEffect(() => {
    const load = async () => {
      try {
        // Check auth and role
        const me = await getCurrentUser();
        if (!me.user) {
          router.replace('/login');
          return;
        }
        if (me.user.role && me.user.role !== 'participant') {
          // Basic role-based redirect
          router.replace('/');
          return;
        }

        const [dashRes, notifRes, eventRes, teamRes] = await Promise.all([
          getParticipantDashboard().catch(() => ({})),
          getNotifications().catch(() => ({ notifications: [] })),
          getEventInfo().catch(() => null),
          getMyTeam().catch(() => null),
        ]);

        setDashboard((dashRes as DashboardResponse).dashboard);
        setNotifications((notifRes as any)?.notifications || []);
        setEventInfo(eventRes);
        setTeam((teamRes as any)?.team || null);
      } catch (err: any) {
        setError(err.message || 'Failed to load dashboard');
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [router]);

  const cards = useMemo(() => {
    const teamStatus = dashboard?.teamStatus;
    const submission = dashboard?.submissionStatus;
    const deadlines = dashboard?.upcomingDeadlines || [];
    const firstDeadline = deadlines[0];
    const daysUntil = firstDeadline?.date
      ? Math.max(
          0,
          Math.ceil(
            (new Date(firstDeadline.date).getTime() - Date.now()) /
              (1000 * 60 * 60 * 24)
          )
        )
      : null;

    const submissionLabel = (() => {
      if (submission?.state === 'submitted') return { label: 'Submitted', color: '#10B981' };
      if (submission?.state === 'draft') return { label: 'Draft Saved', color: '#EAB308' };
      if (submission?.state === 'no_submission') return { label: 'Pending', color: '#F97316' };
      return { label: 'Pending', color: '#F97316' };
    })();

    const teamStatusLabel = (() => {
      if (!teamStatus?.name) return { title: 'No Team', sub: 'Not verified', color: '#CBD5E1' };
      const sub =
        teamStatus?.status === 'verified'
          ? { text: 'Verified', color: '#10B981' }
          : teamStatus?.status === 'rejected'
          ? { text: 'Rejected', color: '#EF4444' }
          : { text: teamStatus?.status || 'Pending', color: '#F59E0B' };
      return { title: teamStatus.name, sub: sub.text, color: sub.color };
    })();

    return [
      {
        title: 'Team Status',
        value: teamStatusLabel.title,
        caption: teamStatusLabel.sub,
        color: '#7C3AED', // purple
        accent: teamStatusLabel.color,
        icon: 'emoji_events',
        iconBg: '#E9D5FF',
      },
      {
        title: 'Submission',
        value: submissionLabel.label,
        caption: submission?.submissionId ? 'Draft saved' : 'No submission',
        color: '#10B981', // green
        accent: submissionLabel.color,
        icon: 'inventory_2',
        iconBg: '#D1FAE5',
      },
      {
        title: 'Days Until Deadline',
        value: daysUntil !== null ? `${daysUntil} Days Left` : '--',
        caption: firstDeadline?.name || 'Deadline',
        color: '#2563EB', // blue
        accent: '#2563EB',
        icon: 'schedule',
        iconBg: '#DBEAFE',
      },
      {
        title: 'Announcements',
        value: `${dashboard?.announcementsSummary?.unreadCount ?? 0}`,
        caption: 'Unread Messages',
        color: '#F59E0B', // orange
        accent: '#F97316',
        icon: 'notifications',
        iconBg: '#FEF3C7',
      },
    ];
  }, [dashboard, team]);

  const progress = useMemo(() => {
    let completed = 0;
    if (dashboard?.teamStatus?.name) completed += 33;
    if (dashboard?.submissionStatus?.state && dashboard.submissionStatus.state !== 'no_submission')
      completed += 33;
    if (dashboard?.submissionStatus?.state === 'submitted') completed += 34;
    if (completed > 100) completed = 100;
    return completed;
  }, [dashboard]);

  const deadlinesChart = useMemo(() => {
    const deadlines = dashboard?.upcomingDeadlines || [];
    const items = deadlines.map((d) => {
      const days = d?.date
        ? Math.max(
            0,
            Math.ceil((new Date(d.date).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
          )
        : 0;
      return { name: d?.name || 'Deadline', days };
    });
    const maxDays = Math.max(...items.map((i) => i.days), 1);
    return { items, maxDays };
  }, [dashboard]);

  // Progress breakdown data
  const progressBreakdown = useMemo(() => {
    const steps = [
      { name: 'Team Joined', completed: dashboard?.teamStatus?.name ? 1 : 0, color: '#7C3AED' },
      { name: 'Team Verified', completed: dashboard?.teamStatus?.status === 'verified' ? 1 : 0, color: '#10B981' },
      { name: 'Submission Started', completed: dashboard?.submissionStatus?.state && dashboard.submissionStatus.state !== 'no_submission' ? 1 : 0, color: '#2563EB' },
      { name: 'Submission Finalized', completed: dashboard?.submissionStatus?.state === 'submitted' ? 1 : 0, color: '#10B981' },
    ];
    return steps;
  }, [dashboard]);

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
          Participant Portal
        </div>
        <nav className="flex flex-col gap-3 text-[#475569] font-figtree">
          <Link
            href="/participant/dashboard"
            className="flex items-center gap-3 px-3 py-2 rounded-xl bg-[#EFEAFF] text-[#5425FF] font-semibold"
          >
            <span className="material-symbols-rounded text-lg">home</span> Dashboard
          </Link>
          <Link href="/participant/teams" className="flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-gray-100">
            <span className="material-symbols-rounded text-lg">groups</span> Team
          </Link>
          <Link href="/participant/submission" className="flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-gray-100">
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
      <main className="flex-1 px-8 py-8 space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-silkscreen text-[#0f172a]">
              Dashboard
            </h1>
            <p className="text-[#64748b] font-figtree">
              Track your team, submissions, and event status.
            </p>
          </div>
        <div className="flex items-center gap-4 text-sm font-figtree text-[#475569]">
          <span>Team Leader</span>
        </div>
        </div>

        {/* Stats cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          {cards.map((card) => {
            const CardWrapper = card.title === 'Submission' ? Link : 'div';
            const cardProps = card.title === 'Submission' 
              ? { href: '/participant/submission', className: 'cursor-pointer hover:opacity-90 transition-opacity' }
              : {};
            
            return (
              <CardWrapper
                key={card.title}
                {...cardProps}
                className={`rounded-2xl px-5 py-4 flex items-center shadow-sm ${cardProps.className || ''}`}
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
              </CardWrapper>
            );
          })}
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Progress Overview */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <h2 className="text-xl font-silkscreen text-[#5425FF] mb-4 flex items-center gap-2">
              <span className="material-symbols-rounded">trending_up</span>
              My Progress
            </h2>
            <div className="space-y-4">
              <div className="flex items-center justify-center">
                <div className="relative w-40 h-40">
                  <svg viewBox="0 0 36 36" className="w-full h-full transform -rotate-90">
                    <path
                      className="text-gray-200"
                      strokeWidth="3"
                      stroke="currentColor"
                      fill="none"
                      d="M18 2.0845
                        a 15.9155 15.9155 0 0 1 0 31.831
                        a 15.9155 15.9155 0 0 1 0 -31.831"
                    />
                    <path
                      className="text-[#5425FF]"
                      strokeWidth="3"
                      strokeDasharray={`${progress}, 100`}
                      strokeLinecap="round"
                      stroke="currentColor"
                      fill="none"
                      d="M18 2.0845
                        a 15.9155 15.9155 0 0 1 0 31.831
                        a 15.9155 15.9155 0 0 1 0 -31.831"
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-2xl font-semibold text-[#5425FF]">{progress}%</span>
                    <span className="text-xs text-[#64748b] font-figtree">Complete</span>
                  </div>
                </div>
              </div>
              <div className="space-y-3">
                {progressBreakdown.map((step, index) => (
                  <div key={index}>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm font-figtree text-gray-600">{step.name}</span>
                      <span
                        className={`text-sm font-figtree font-semibold ${step.completed ? 'text-green-600' : 'text-gray-400'}`}
                      >
                        {step.completed ? '✓' : '○'}
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="h-2 rounded-full transition-all"
                        style={{
                          width: `${step.completed * 100}%`,
                          backgroundColor: step.completed ? step.color : '#CBD5E1',
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Deadlines Timeline */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <h2 className="text-xl font-silkscreen text-[#5425FF] mb-4 flex items-center gap-2">
              <span className="material-symbols-rounded">schedule</span>
              Deadlines Timeline
            </h2>
            {deadlinesChart.items.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={deadlinesChart.items}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="days" fill="#2563EB" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[300px] text-gray-400">
                <div className="text-center">
                  <span className="material-symbols-rounded text-6xl mb-2">schedule</span>
                  <p className="font-figtree">No deadlines available</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Notifications & deadlines */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-semibold text-[#0f172a]">
                Notifications
              </h2>
              <span className="text-sm text-[#475569] font-figtree">
                Unread: {dashboard?.announcementsSummary?.unreadCount ?? 0}
              </span>
            </div>
            <div className="space-y-3">
              {(notifications || []).slice(0, 4).map((n) => (
                <div
                  key={n.id}
                  className="border border-gray-100 rounded-xl px-4 py-3 bg-[#f8fafc]"
                >
                  <p className="text-sm font-semibold text-[#0f172a]">
                    {n.title || 'Announcement'}
                  </p>
                  <p className="text-xs text-[#475569] font-figtree">
                    {n.content || n.latestTitle || 'New update available.'}
                  </p>
                </div>
              ))}
              {(!notifications || notifications.length === 0) && (
                <p className="text-sm text-[#94a3b8] font-figtree">
                  No notifications yet.
                </p>
              )}
            </div>
          </div>

          <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
            <h2 className="text-lg font-semibold text-[#0f172a] mb-3">
              Event Info
            </h2>
            <div className="space-y-2 text-sm text-[#475569] font-figtree">
              <p>
                Event: {eventInfo?.eventInfo?.event_name || 'HackOnX'}
              </p>
              <p>
                Submission Deadline:{' '}
                {eventInfo?.eventInfo?.submission_deadline || '--'}
              </p>
              <p>Max Team Size: {eventInfo?.eventInfo?.max_team_size || 4}</p>
              <p>
                Venue: {eventInfo?.eventInfo?.venue || 'Offline / Hybrid'}
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

