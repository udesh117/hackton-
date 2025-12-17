'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { getCurrentUser, getNotifications, markNotificationRead, logout } from '@/lib/api';

interface Notification {
  id: string;
  title: string;
  content: string;
  target_role: string;
  category: string | null;
  created_at: string;
  is_read: boolean;
}

export default function NotificationsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        setError(null);

        // Check authentication
        const me = await getCurrentUser();
        if (!me.user) {
          router.push('/login');
          return;
        }

        // Load notifications
        const result = await getNotifications();
        if (result.notifications) {
          setNotifications(result.notifications);
          const unread = result.notifications.filter((n: Notification) => !n.is_read).length;
          setUnreadCount(unread);
        }
      } catch (err: any) {
        console.error('Failed to load notifications:', err);
        setError(err.message || 'Failed to load notifications');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [router]);

  const handleMarkAsRead = async (notificationId: string) => {
    try {
      const result = await markNotificationRead([notificationId]);
      if (result.error) {
        setError(result.error);
        return;
      }

      // Update local state
      setNotifications(prev =>
        prev.map(n =>
          n.id === notificationId ? { ...n, is_read: true } : n
        )
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (err: any) {
      setError(err.message || 'Failed to mark notification as read');
    }
  };

  const handleMarkAllAsRead = async () => {
    const unreadIds = notifications.filter(n => !n.is_read).map(n => n.id);
    if (unreadIds.length === 0) return;

    try {
      const result = await markNotificationRead(unreadIds);
      if (result.error) {
        setError(result.error);
        return;
      }

      // Update all notifications to read
      setNotifications(prev =>
        prev.map(n => ({ ...n, is_read: true }))
      );
      setUnreadCount(0);
    } catch (err: any) {
      setError(err.message || 'Failed to mark all notifications as read');
    }
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) return 'Just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`;
    
    return date.toLocaleDateString();
  };

  const getCategoryColor = (category: string | null) => {
    if (!category) return 'bg-gray-100 text-gray-700';
    const colors: Record<string, string> = {
      announcement: 'bg-blue-100 text-blue-700',
      deadline: 'bg-red-100 text-red-700',
      team: 'bg-green-100 text-green-700',
      submission: 'bg-purple-100 text-purple-700',
      general: 'bg-gray-100 text-gray-700',
    };
    return colors[category.toLowerCase()] || colors.general;
  };

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
            <span>Loading notifications...</span>
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
          <Link href="/participant/submission" className="flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-gray-100">
            <span className="material-symbols-rounded text-lg">inventory_2</span> Submission
          </Link>
          <Link href="/participant/profile" className="flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-gray-100">
            <span className="material-symbols-rounded text-lg">person</span> Profile
          </Link>
          <Link href="/participant/notifications" className="flex items-center gap-3 px-3 py-2 rounded-xl bg-[#EFEAFF] text-[#5425FF] font-semibold">
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
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-silkscreen text-[#5425FF] flex items-center gap-2">
              <span className="material-symbols-rounded">notifications</span>
              Notifications
            </h1>
            <p className="text-[#64748b] font-figtree mt-1">
              Stay updated with announcements and important updates
            </p>
          </div>
          {unreadCount > 0 && (
            <button
              onClick={handleMarkAllAsRead}
              className="px-4 py-2 bg-[#5425FF] text-white rounded-xl font-figtree font-semibold hover:bg-[#4319CC] transition-colors flex items-center gap-2"
            >
              <span className="material-symbols-rounded text-lg">done_all</span>
              Mark All as Read
            </button>
          )}
        </div>

        {/* Unread Count Badge */}
        {unreadCount > 0 && (
          <div className="bg-blue-50 border border-blue-200 text-blue-800 px-4 py-3 rounded-xl font-figtree flex items-center gap-2">
            <span className="material-symbols-rounded">info</span>
            <span className="font-semibold">{unreadCount}</span>
            <span>unread notification{unreadCount !== 1 ? 's' : ''}</span>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-xl font-figtree flex items-center gap-2">
            <span className="material-symbols-rounded">error</span>
            {error}
          </div>
        )}

        {/* Notifications List */}
        {notifications.length === 0 ? (
          <div className="bg-white rounded-2xl p-12 shadow-sm border border-gray-100 text-center">
            <div className="flex justify-center mb-4">
              <span className="material-symbols-rounded text-8xl text-[#94a3b8]">notifications_off</span>
            </div>
            <h2 className="text-2xl font-silkscreen text-[#5425FF] mb-2">No Notifications</h2>
            <p className="text-[#64748b] font-figtree">
              You're all caught up! Check back later for new announcements.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {notifications.map((notification) => (
              <div
                key={notification.id}
                className={`bg-white rounded-2xl p-6 shadow-sm border transition-all ${
                  notification.is_read
                    ? 'border-gray-200 opacity-75'
                    : 'border-[#5425FF]/30 bg-[#EFEAFF]/30'
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-start gap-3 mb-2">
                      {!notification.is_read && (
                        <span className="material-symbols-rounded text-[#5425FF] mt-1">circle</span>
                      )}
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3
                            className={`text-lg font-figtree font-semibold ${
                              notification.is_read ? 'text-[#64748b]' : 'text-[#0f172a]'
                            }`}
                          >
                            {notification.title}
                          </h3>
                          {notification.category && (
                            <span
                              className={`px-2 py-1 rounded-lg text-xs font-figtree font-semibold ${getCategoryColor(
                                notification.category
                              )}`}
                            >
                              {notification.category}
                            </span>
                          )}
                        </div>
                        <p className="text-[#475569] font-figtree mb-3 whitespace-pre-wrap">
                          {notification.content}
                        </p>
                        <div className="flex items-center gap-4 text-sm text-[#94a3b8] font-figtree">
                          <span className="flex items-center gap-1">
                            <span className="material-symbols-rounded text-base">schedule</span>
                            {formatTimeAgo(notification.created_at)}
                          </span>
                          {notification.target_role && notification.target_role !== 'all' && (
                            <span className="flex items-center gap-1">
                              <span className="material-symbols-rounded text-base">people</span>
                              {notification.target_role}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                  {!notification.is_read && (
                    <button
                      onClick={() => handleMarkAsRead(notification.id)}
                      className="px-4 py-2 text-sm bg-[#5425FF] text-white rounded-lg font-figtree font-semibold hover:bg-[#4319CC] transition-colors flex items-center gap-2 whitespace-nowrap"
                    >
                      <span className="material-symbols-rounded text-base">check</span>
                      Mark Read
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

