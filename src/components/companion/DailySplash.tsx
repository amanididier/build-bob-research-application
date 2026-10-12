import React, { useEffect, useState } from 'react';

const KEY = 'bob_splash_day';

function todayKey() {
  const d = new Date();
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}

export const DailySplash: React.FC = () => {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    try {
      if (localStorage.getItem(KEY) !== todayKey()) setOpen(true);
    } catch {}
  }, []);

  if (!open) return null;

  const close = () => {
    try { localStorage.setItem(KEY, todayKey()); } catch {}
    setOpen(false);
  };

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-6 bg-[#f6f3ec]">
      <div className="w-full max-w-[420px] text-center">
        <div className="mx-auto mb-6 w-14 h-14 rounded-2xl bg-[#f4bc18] text-[#171717] grid place-items-center text-[22px] font-extrabold">B</div>
        <p className="text-[11px] tracking-[0.16em] uppercase text-[#8a8175] font-semibold m-0">First open today</p>
        <h1 className="mt-2 mb-3 text-[34px] leading-[1.05] tracking-[-0.04em] font-extrabold text-[#171717]">Pick up where you left the work.</h1>
        <p className="text-[14px] leading-relaxed text-[#5c564c] m-0">Notes, the thread with Bob, and your roadmap stay on this machine. Nothing here is a new account.</p>
        <button type="button" onClick={close} className="mt-8 h-12 px-6 rounded-full bg-[#171717] text-white text-[13px] font-bold cursor-pointer">Continue</button>
      </div>
    </div>
  );
};
