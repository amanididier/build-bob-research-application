import React from 'react';
import { Bell } from 'lucide-react';

export const NotificationsPage: React.FC = () => {
  // Notifications are intentionally empty until real workspace events are persisted.
  // Never present fabricated activity as if it happened in the user's workspace.
  const notifications: Array<{
    id: string;
    title: string;
    desc: string;
    time: string;
    color: string;
    iconChar: string;
    unread: boolean;
    action?: () => void;
  }> = [];

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
      {notifications.length === 0 ? (
        <div className="bg-[var(--s)] border border-[var(--line)] rounded-[20px] px-6 py-14 text-center">
          <div className="mx-auto mb-4 w-12 h-12 rounded-2xl bg-[var(--s2)] grid place-items-center text-[var(--m)]">
            <Bell className="w-5 h-5" />
          </div>
          <h2 className="text-[15px] font-semibold text-[var(--t)] m-0">You're all caught up</h2>
          <p className="text-[12px] leading-relaxed text-[var(--m)] max-w-sm mx-auto mt-2 mb-0">
            New activity will appear here when Bob has real updates from your workspace.
          </p>
        </div>
      ) : (
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
      )}
    </div>
  );
};
