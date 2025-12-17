'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { getCurrentUser, logout } from '@/lib/api';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const guard = async () => {
      try {
        const me = await getCurrentUser();
        if (!me.user) {
          router.replace('/login');
          return;
        }
        if (me.user.role !== 'admin') {
          router.replace('/');
          return;
        }
      } finally {
        setChecking(false);
      }
    };
    guard();
  }, [router]);

  if (checking) {
    return (
      <div className="min-h-screen bg-[#f8f8ff] flex items-center justify-center">
        <div className="flex items-center gap-3 text-[#5425FF] font-figtree">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#5425FF]" />
          <span>Loading admin portal...</span>
        </div>
      </div>
    );
  }

  const nav = [
    { href: '/admin', label: 'Overview', icon: 'dashboard' },
    { href: '/admin/judges', label: 'Judges', icon: 'gavel' },
    { href: '/admin/teams', label: 'Teams', icon: 'groups' },
    { href: '/admin/assignments', label: 'Assignments', icon: 'table_chart' },
    { href: '/admin/submissions', label: 'Submissions', icon: 'inventory_2' },
    { href: '/admin/leaderboard', label: 'Leaderboard', icon: 'leaderboard' },
    { href: '/admin/announcements', label: 'Announcements', icon: 'campaign' },
  ];

  return (
    <div className="min-h-screen bg-[#f8f8ff] text-[#0f172a] flex">
      <aside className="w-64 bg-white border-r border-gray-200 px-6 py-8 flex flex-col">
        <div className="text-2xl font-silkscreen text-[#5425FF] mb-6">Admin Portal</div>
        <nav className="flex flex-col gap-2 text-[#475569] font-figtree">
          {nav.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-gray-100 ${
                  active ? 'bg-[#EFEAFF] text-[#5425FF] font-semibold' : ''
                }`}
              >
                <span className="material-symbols-rounded text-lg">{item.icon}</span>
                {item.label}
              </Link>
            );
          })}
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

      <main className="flex-1 px-8 py-8 overflow-y-auto">{children}</main>
    </div>
  );
}


