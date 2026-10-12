import React, { useEffect, useRef } from 'react';
import { useApp } from '../../context/AppContext';
import { BookOpen, Map } from 'lucide-react';

export const ToolsMenu: React.FC = () => {
  const { isToolsMenuOpen, setIsToolsMenuOpen, navigateTo, isSidebarClosed } = useApp();
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setIsToolsMenuOpen(false);
    };
    if (isToolsMenuOpen) document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [isToolsMenuOpen, setIsToolsMenuOpen]);

  if (!isToolsMenuOpen) return null;

  return (
    <div
      ref={menuRef}
      className={`fixed z-40 bottom-24 bg-white border border-[#e6e1d6] shadow-[0_18px_50px_rgba(40,35,20,0.12)] rounded-[22px] p-2 w-[280px] ${
        isSidebarClosed ? 'left-[calc(50%-140px)]' : 'left-[calc(275px+(100vw-275px)/2-140px)]'
      }`}
    >
      <div className="text-[10px] tracking-[0.14em] uppercase font-bold text-[#8a8175] px-3 pt-2 pb-1">Tools</div>
      <button
        type="button"
        onClick={() => { setIsToolsMenuOpen(false); navigateTo('notes'); }}
        className="w-full text-left px-3 py-2.5 rounded-2xl hover:bg-[#f6f3ec] flex items-center gap-3 cursor-pointer"
      >
        <span className="w-9 h-9 rounded-xl bg-[#f6f3ec] grid place-items-center"><BookOpen className="w-4 h-4" /></span>
        <span>
          <b className="block text-[13px] text-[#171717]">Notes</b>
          <small className="block text-[11px] text-[#6b6560]">A thought, kept with the work.</small>
        </span>
      </button>
      <button
        type="button"
        onClick={() => {
          setIsToolsMenuOpen(false);
          window.dispatchEvent(new Event('bob-open-roadmap'));
        }}
        className="w-full text-left px-3 py-2.5 rounded-2xl hover:bg-[#f6f3ec] flex items-center gap-3 cursor-pointer"
      >
        <span className="w-9 h-9 rounded-xl bg-[#f6f3ec] grid place-items-center"><Map className="w-4 h-4" /></span>
        <span>
          <b className="block text-[13px] text-[#171717]">Roadmap</b>
          <small className="block text-[11px] text-[#6b6560]">Name the work, then the order.</small>
        </span>
      </button>
    </div>
  );
};
