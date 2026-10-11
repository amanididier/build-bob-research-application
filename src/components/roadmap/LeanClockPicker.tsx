import React, { useState } from 'react';
import { Clock, Check } from 'lucide-react';

interface LeanClockPickerProps {
  initialTime?: string; // e.g. "14:30" or "08:00"
  onSelectTime: (timeString: string) => void;
  onClose: () => void;
}

export const LeanClockPicker: React.FC<LeanClockPickerProps> = ({
  initialTime = '12:00',
  onSelectTime,
  onClose,
}) => {
  const [hour, setHour] = useState<number>(() => {
    const parts = initialTime.split(':');
    return parseInt(parts[0], 10) || 12;
  });
  const [minute, setMinute] = useState<number>(() => {
    const parts = initialTime.split(':');
    return parseInt(parts[1], 10) || 0;
  });
  const [mode, setMode] = useState<'hour' | 'minute'>('hour');
  const [isPm, setIsPm] = useState<boolean>(() => {
    const parts = initialTime.split(':');
    const h = parseInt(parts[0], 10) || 12;
    return h >= 12;
  });

  const displayHour = hour % 12 === 0 ? 12 : hour % 12;
  const formattedMinutes = minute < 10 ? `0${minute}` : `${minute}`;
  const period = isPm ? 'PM' : 'AM';

  const handleHourSelect = (val: number) => {
    let finalHour = val % 12;
    if (isPm) finalHour += 12;
    setHour(finalHour);
    setMode('minute');
  };

  const handleMinuteSelect = (val: number) => {
    setMinute(val);
  };

  const handleTogglePeriod = (pm: boolean) => {
    setIsPm(pm);
    const baseHour = hour % 12;
    setHour(pm ? baseHour + 12 : baseHour);
  };

  const handleConfirm = () => {
    const finalH = hour < 10 ? `0${hour}` : `${hour}`;
    onSelectTime(`${finalH}:${formattedMinutes}`);
    onClose();
  };

  // Clock numbers layout (12 positions in a circle)
  const clockNumbers = mode === 'hour'
    ? [12, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]
    : [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55];

  const currentAngle = mode === 'hour'
    ? (displayHour % 12) * 30
    : minute * 6;

  return (
    <div className="bg-[var(--s)] border border-[var(--line)] rounded-[22px] p-5 shadow-2xl w-72 text-center select-none animate-in fade-in zoom-in-95 duration-150">
      <div className="flex items-center justify-between mb-4 border-b border-[var(--line)] pb-3">
        <div className="flex items-center gap-1.5 text-xs font-bold text-[var(--t)]">
          <Clock className="w-3.5 h-3.5 text-[var(--y)]" />
          <span>Set Exact Time</span>
        </div>
        {/* AM / PM Segmented Control */}
        <div className="flex bg-[var(--s2)] p-0.5 rounded-lg text-[10px] font-bold">
          <button
            type="button"
            onClick={() => handleTogglePeriod(false)}
            className={`px-2 py-0.5 rounded-md transition-all ${
              !isPm ? 'bg-[var(--s)] text-[var(--t)] shadow-sm' : 'text-[var(--m)] hover:text-[var(--t)]'
            }`}
          >
            AM
          </button>
          <button
            type="button"
            onClick={() => handleTogglePeriod(true)}
            className={`px-2 py-0.5 rounded-md transition-all ${
              isPm ? 'bg-[var(--s)] text-[var(--t)] shadow-sm' : 'text-[var(--m)] hover:text-[var(--t)]'
            }`}
          >
            PM
          </button>
        </div>
      </div>

      {/* Time Display Header */}
      <div className="flex items-center justify-center gap-1 my-3 text-3xl font-extrabold tracking-tight">
        <button
          type="button"
          onClick={() => setMode('hour')}
          className={`px-2.5 py-1 rounded-xl transition-all ${
            mode === 'hour'
              ? 'bg-[var(--y)] text-[#171717] shadow-sm'
              : 'text-[var(--t)] hover:bg-[var(--s2)]'
          }`}
        >
          {displayHour < 10 ? `0${displayHour}` : displayHour}
        </button>
        <span className="text-[var(--m)]">:</span>
        <button
          type="button"
          onClick={() => setMode('minute')}
          className={`px-2.5 py-1 rounded-xl transition-all ${
            mode === 'minute'
              ? 'bg-[var(--y)] text-[#171717] shadow-sm'
              : 'text-[var(--t)] hover:bg-[var(--s2)]'
          }`}
        >
          {formattedMinutes}
        </button>
        <span className="text-xs font-bold text-[var(--m)] uppercase ml-1">{period}</span>
      </div>

      {/* Circular Clock Face */}
      <div className="relative w-48 h-48 mx-auto my-3 rounded-full bg-[var(--s2)]/70 border border-[var(--line)] flex items-center justify-center shadow-inner">
        {/* Center dot */}
        <div className="absolute w-2.5 h-2.5 rounded-full bg-[var(--y)] z-20 shadow-sm" />

        {/* Hand indicator line */}
        <div
          className="absolute origin-bottom w-0.5 bg-[var(--y)] z-10 pointer-events-none transition-transform duration-200"
          style={{
            height: '70px',
            bottom: '50%',
            transform: `rotate(${currentAngle}deg)`,
          }}
        >
          <div className="w-5 h-5 -ml-[9px] -mt-2 rounded-full bg-[var(--y)]/20 border border-[var(--y)] flex items-center justify-center" />
        </div>

        {/* Clock Number Buttons around the dial */}
        {clockNumbers.map((num, i) => {
          const angle = (i * 30 - 90) * (Math.PI / 180);
          const radius = 72; // distance from center
          const x = Math.round(radius * Math.cos(angle));
          const y = Math.round(radius * Math.sin(angle));

          const isSelected = mode === 'hour' ? (num === displayHour || (num === 12 && displayHour === 12)) : num === minute;

          return (
            <button
              key={num}
              type="button"
              onClick={() => (mode === 'hour' ? handleHourSelect(num) : handleMinuteSelect(num))}
              className={`absolute w-7 h-7 -ml-3.5 -mt-3.5 rounded-full text-xs font-bold flex items-center justify-center transition-transform hover:scale-110 ${
                isSelected
                  ? 'bg-[var(--y)] text-[#171717] shadow-sm z-30 font-extrabold'
                  : 'text-[var(--t)] hover:bg-[var(--s)]/80'
              }`}
              style={{
                left: `calc(50% + ${x}px)`,
                top: `calc(50% + ${y}px)`,
              }}
            >
              {mode === 'minute' && num < 10 ? `0${num}` : num}
            </button>
          );
        })}
      </div>

      {/* Done & Cancel Buttons */}
      <div className="flex items-center justify-between pt-3 border-t border-[var(--line)] mt-3">
        <button
          type="button"
          onClick={onClose}
          className="px-3 py-1.5 text-xs text-[var(--m)] hover:text-[var(--t)] font-medium rounded-lg"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handleConfirm}
          className="px-4 py-1.5 text-xs font-bold bg-[var(--y)] hover:bg-[#e0ac15] text-[#171717] rounded-xl flex items-center gap-1 shadow-sm transition-all"
        >
          <Check className="w-3.5 h-3.5" />
          <span>Apply Time</span>
        </button>
      </div>
    </div>
  );
};
