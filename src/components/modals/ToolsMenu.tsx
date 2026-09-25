import React, { useRef, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { BookOpen, ArrowRightLeft, Target, CheckSquare } from 'lucide-react';

export const ToolsMenu: React.FC = () => {
  const { 
    isToolsMenuOpen, 
    setIsToolsMenuOpen, 
    setIsBridgeOpen, 
    navigateTo, 
    isSidebarClosed 
  } = useApp();

  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsToolsMenuOpen(false);
      }
    };
    if (isToolsMenuOpen) {
      document.addEventListener('mousedown', handleClick);
    }
    return () => document.removeEventListener('mousedown', handleClick);
  }, [isToolsMenuOpen, setIsToolsMenuOpen]);

  if (!isToolsMenuOpen) return null;

  return (
    <div
      ref={menuRef}
      className={`fixed z-40 bottom-24 bg-[var(--s)] border border-[var(--line)] shadow-2xl rounded-2xl p-2.5 w-72 animate-in fade-in zoom-in-95 duration-100 ${
        isSidebarClosed
          ? 'left-[calc(50%-340px)]'
          : 'left-[calc(275px+(100vw-275px)/2-340px)]'
      }`}
    >
      <div className="text-[10px] text-[#999] tracking-wider uppercase font-bold px-2 py-1">
        Bob tools
      </div>

      <div className="space-y-1 mt-1">
        {/* Notes */}
        <button
          onClick={() => {
            setIsToolsMenuOpen(false);
            navigateTo('notes');
          }}
          className="w-full text-left p-2 rounded-xl hover:bg-[var(--s2)] flex items-start gap-2.5 transition-colors"
        >
          <div className="w-8 h-8 rounded-lg bg-[var(--s2)] grid place-items-center flex-shrink-0 text-[var(--t)]">
            <BookOpen className="w-4 h-4" />
          </div>
          <div>
            <b className="text-[12px] text-[var(--t)] block">Notes</b>
            <small className="text-[9px] text-[var(--m)] block">
              Capture a thought without leaving research.
            </small>
          </div>
        </button>

        {/* Bridge */}
        <button
          onClick={() => {
            setIsToolsMenuOpen(false);
            setIsBridgeOpen(true);
          }}
          className="w-full text-left p-2 rounded-xl hover:bg-[var(--s2)] flex items-start gap-2.5 transition-colors"
        >
          <div className="w-8 h-8 rounded-lg bg-[var(--s2)] grid place-items-center flex-shrink-0 text-[var(--t)]">
            <ArrowRightLeft className="w-4 h-4 text-[var(--b)]" />
          </div>
          <div>
            <b className="text-[12px] text-[var(--t)] block">Bridge</b>
            <small className="text-[9px] text-[var(--m)] block">
              Move context cleanly from one AI to another.
            </small>
          </div>
        </button>

        {/* Focus & Goals */}
        <button
          onClick={() => {
            setIsToolsMenuOpen(false);
            navigateTo('home');
          }}
          className="w-full text-left p-2 rounded-xl hover:bg-[var(--s2)] flex items-start gap-2.5 transition-colors"
        >
          <div className="w-8 h-8 rounded-lg bg-[var(--s2)] grid place-items-center flex-shrink-0 text-[var(--t)]">
            <Target className="w-4 h-4 text-[var(--y)]" />
          </div>
          <div>
            <b className="text-[12px] text-[var(--t)] block">Focus & goals</b>
            <small className="text-[9px] text-[var(--m)] block">
              See progress toward what matters.
            </small>
          </div>
        </button>

        {/* Tasks & deadlines */}
        <button
          onClick={() => {
            setIsToolsMenuOpen(false);
            navigateTo('tasks');
          }}
          className="w-full text-left p-2 rounded-xl hover:bg-[var(--s2)] flex items-start gap-2.5 transition-colors"
        >
          <div className="w-8 h-8 rounded-lg bg-[var(--s2)] grid place-items-center flex-shrink-0 text-[var(--t)]">
            <CheckSquare className="w-4 h-4 text-[var(--g)]" />
          </div>
          <div>
            <b className="text-[12px] text-[var(--t)] block">Tasks & deadlines</b>
            <small className="text-[9px] text-[var(--m)] block">
              Turn research into finishable actions.
            </small>
          </div>
        </button>
      </div>
    </div>
  );
};
