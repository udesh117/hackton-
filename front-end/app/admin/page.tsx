'use client';

import Link from 'next/link';

export default function AdminOverviewPage() {
  const cards = [
    { href: '/admin/judges', title: 'Judges', desc: 'Create and manage judge accounts', icon: 'gavel', color: '#5425FF' },
    { href: '/admin/teams', title: 'Teams', desc: 'Verify teams and review details', icon: 'groups', color: '#10B981' },
    { href: '/admin/assignments', title: 'Assignments', desc: 'View and rebalance judge workloads', icon: 'table_chart', color: '#3B82F6' },
    { href: '/admin/submissions', title: 'Submissions', desc: 'Review submissions and statuses', icon: 'inventory_2', color: '#F59E0B' },
    { href: '/admin/leaderboard', title: 'Leaderboard', desc: 'Aggregate scores and publish results', icon: 'leaderboard', color: '#7C3AED' },
    { href: '/admin/announcements', title: 'Announcements', desc: 'Create, schedule, and send updates', icon: 'campaign', color: '#EF4444' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-silkscreen text-[#0f172a]">Admin Overview</h1>
        <p className="text-[#64748b] font-figtree mt-1">Manage judges, teams, assignments, submissions, and publishing.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {cards.map((c) => (
          <Link
            key={c.href}
            href={c.href}
            className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 hover:border-[#5425FF] hover:bg-[#EFEAFF]/20 transition-all"
          >
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ backgroundColor: `${c.color}22` }}>
                <span className="material-symbols-rounded text-2xl" style={{ color: c.color }}>
                  {c.icon}
                </span>
              </div>
              <div className="flex-1">
                <h2 className="text-lg font-figtree font-semibold text-[#0f172a]">{c.title}</h2>
                <p className="text-sm font-figtree text-[#64748b] mt-1">{c.desc}</p>
              </div>
              <span className="material-symbols-rounded text-[#5425FF]">chevron_right</span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}


