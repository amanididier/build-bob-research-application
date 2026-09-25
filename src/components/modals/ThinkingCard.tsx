import React from 'react';
import { useApp } from '../../context/AppContext';
import { BobAvatar } from '../BobAvatar';
import { X } from 'lucide-react';

export const ThinkingCard: React.FC = () => {
  const { thinkingState, closeThinking } = useApp();

  if (!thinkingState.show) return null;

  return (
    <div className="fixed right-6 top-20 z-50 w-72 bg-[var(--s)] border border-[var(--line)] shadow-2xl rounded-2xl p-4 animate-in fade-in slide-in-from-right-4 duration-200">
      <div className="flex items-center gap-2.5">
        <BobAvatar size={30} />
        <div className="flex-1 min-w-0">
          <b className="text-[12px] text-[var(--t)] block truncate leading-tight font-bold">
            {thinkingState.title}
          </b>
          <small className="text-[10px] text-[var(--m)] block truncate">
            {thinkingState.sub}
          </small>
        </div>

        <button
          onClick={closeThinking}
          title="Close indicator"
          className="w-6 h-6 rounded-full hover:bg-[var(--s2)] text-[var(--m)] hover:text-[var(--t)] grid place-items-center transition-colors flex-shrink-0"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Progress animation line */}
      <div className="h-1 bg-[var(--s2)] rounded-full mt-3 overflow-hidden">
        <div className="h-full bg-[var(--y)] rounded-full animate-thinking-bar w-1/2" />
      </div>

      <div className="text-[10px] text-[var(--m)] mt-2 font-medium">
        {thinkingState.step}
      </div>
    </div>
  );
};
