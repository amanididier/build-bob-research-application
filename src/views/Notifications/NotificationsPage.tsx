import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Sparkles, CheckCircle2, ArrowUpRight, Bell, Check } from 'lucide-react';

export const NotificationsPage: React.FC = () => {
  const { navigateTo, unreadNotifications, markNotificationsRead } = useApp();
  const [notifications, setNotifications] = useState([
    {
      id: 'notif-1',
      title: 'Bob found a connection',
      desc: 'Three sources in your transport research support the same booking-friction signal.',
      time: '2 minutes ago · Research',
      color: 'yellow',
      iconChar: '✦',
      unread: true,
      action: () => navigateTo('research', 'chat', 'urugendo'),
    },
    {
      id: 'notif-2',
      title: 'Task due soon',
      desc: '“Validate the core problem” is due today and is connected to 5 sources.',
      time: '34 minutes ago · Tasks',
      color: 'blue',
      iconChar: '✓',
      unread: true,
      action: () => navigateTo('tasks'),
    },
    {
      id: 'notif-3',
      title: 'Research summary ready',
      desc: 'Your Urugendo summary has been updated with the latest connected tabs.',
      time: 'Yesterday · Summary',
      color: 'green',
      iconChar: '↗',
      unread: true,
      action: () => navigateTo('research', 'summary', 'urugendo'),
    },
    {
      id: 'notif-4',
      title: 'New browser context',
      desc: 'Bob connected 4 pages from your latest research session.',
      time: 'Yesterday · Chrome',
      color: 'gray',
      iconChar: '◌',
      unread: false,
      action: () => navigateTo('chrome'),
    },
  ]);

  const handleMarkAll = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, unread: false })));
    markNotificationsRead();
  };

  return (
    <div className="max-w-[850px] mx-auto px-6 md:px-10 py-7 pb-36">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 pb-6 border-b border-[var(--line)] mb-6">
        <div>
          <div className="text-[10px] tracking-[0.08em] text-[#999] uppercase font-semibold">
            ACTIVITY FEED
          </div>
          <h1 className="text-[32px] tracking-[-1px] font-extrabold my-1 text-[var(--t)]">
            Notifications
          </h1>
          <p className="text-[var(--m)] text-[13px] leading-relaxed max-w-[550px] m-0">
            Useful nudges only — research changes, approaching deadlines, and cross-source contradictions.
          </p>
        </div>

        {unreadNotifications > 0 && (
          <button
            onClick={handleMarkAll}
            className="h-8 px-3 rounded-xl border border-[var(--line)] bg-[var(--s)] hover:bg-[var(--s2)] text-[var(--t)] text-[11px] font-semibold flex items-center gap-1.5 shadow-sm transition-colors flex-shrink-0"
          >
            <Check className="w-3.5 h-3.5" />
            <span>Mark all read</span>
          </button>
        )}
      </div>

      {/* Notification List */}
      <div className="bg-[var(--s)] border border-[var(--line)] rounded-[20px] divide-y divide-[var(--line)] overflow-hidden shadow-[0_5px_25px_rgba(0,0,0,0.02)]">
        {notifications.map((n) => (
          <div
            key={n.id}
            onClick={n.action}
            className={`p-4 flex items-start gap-3.5 cursor-pointer hover:bg-[var(--s2)] transition-colors relative ${
              n.unread ? 'bg-[var(--s2)]/40' : ''
            }`}
          >
            {/* Notification Icon */}
            <div
              className={`w-9 h-9 rounded-xl grid place-items-center text-sm font-bold flex-shrink-0 ${
                n.color === 'yellow'
                  ? 'bg-[var(--ys)] text-[#765700]'
                  : n.color === 'blue'
                  ? 'bg-[var(--bs)] text-[#1e40af]'
                  : n.color === 'green'
                  ? 'bg-[#e6f7ed] text-[#14844d]'
                  : 'bg-[var(--s2)] text-[var(--m)]'
              }`}
            >
              {n.iconChar}
            </div>

            {/* Text */}
            <div className="flex-1 min-w-0 pr-4">
              <b className="text-[13px] text-[var(--t)] block font-semibold leading-snug">
                {n.title}
              </b>
              <p className="text-[12px] text-[var(--m)] leading-relaxed m-0 mt-0.5">
                {n.desc}
              </p>
              <small className="text-[10px] text-[#aaa] block mt-1">
                {n.time}
              </small>
            </div>

            {/* Unread yellow dot */}
            {n.unread && (
              <span className="w-2 h-2 rounded-full bg-[var(--y)] flex-shrink-0 mt-2" />
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
