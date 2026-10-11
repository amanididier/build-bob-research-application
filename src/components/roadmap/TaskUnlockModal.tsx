import React, { useState } from 'react';
import { CheckCircle2, Lock, Sparkles, X, ArrowRight, Clock, HelpCircle } from 'lucide-react';
import { BobAudioHelper } from '../../lib/companion/bobAudio';

interface TaskUnlockModalProps {
  isOpen: boolean;
  taskTitle: string;
  nextTaskTitle: string;
  estimatedTime?: string;
  onClose: () => void;
  onConfirmUnlock: () => void;
  onRequestHelp?: (topic: string) => void;
}

export const TaskUnlockModal: React.FC<TaskUnlockModalProps> = ({
  isOpen,
  taskTitle,
  nextTaskTitle,
  estimatedTime = '45 mins',
  onClose,
  onConfirmUnlock,
  onRequestHelp,
}) => {
  const [showCelebration, setShowCelebration] = useState(false);
  const [needMoreTime, setNeedMoreTime] = useState(false);
  const [selectedExtraTime, setSelectedExtraTime] = useState<string>('30 minutes');
  const [isStuck, setIsStuck] = useState<boolean>(false);

  if (!isOpen) return null;

  const handleCompleteAndUnlock = () => {
    BobAudioHelper.playSuccessChime();
    setShowCelebration(true);
    setTimeout(() => {
      onConfirmUnlock();
      onClose();
      setShowCelebration(false);
    }, 1400);
  };

  const handleAskBobStuck = () => {
    if (onRequestHelp) {
      onRequestHelp(`I'm feeling stuck on "${taskTitle}". Can you analyze my open tabs and help me finish this step?`);
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-md bg-[var(--s)] border border-[var(--line)] rounded-[26px] shadow-2xl p-6 sm:p-7 overflow-hidden">
        {/* Ambient background glow */}
        <div className="absolute top-0 right-0 w-48 h-48 bg-[var(--g)]/10 rounded-full blur-3xl pointer-events-none" />

        {showCelebration ? (
          <div className="py-8 text-center space-y-3 animate-in zoom-in-95 duration-200">
            <div className="w-16 h-16 rounded-full bg-[var(--g)]/20 border-2 border-[var(--g)] text-[var(--g)] flex items-center justify-center mx-auto shadow-lg animate-bounce">
              <CheckCircle2 className="w-9 h-9" />
            </div>
            <h3 className="text-xl font-extrabold text-[var(--t)] tracking-tight">
              Task Completed!
            </h3>
            <p className="text-xs text-[var(--m)] max-w-xs mx-auto">
              Brilliant work. Unlocking next phase: <span className="text-[var(--t)] font-semibold">{nextTaskTitle}</span>.
            </p>
          </div>
        ) : (
          <div className="space-y-5">
            {/* Header */}
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-[var(--y)]/20 border border-[var(--y)]/50 flex items-center justify-center text-[var(--y)]">
                  <Lock className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-[10px] font-bold text-[var(--m)] uppercase tracking-wider">
                    Sequential Gate
                  </div>
                  <h3 className="text-lg font-extrabold text-[var(--t)] tracking-tight">
                    Confirm Completion
                  </h3>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-1.5 rounded-full hover:bg-[var(--s2)] text-[var(--m)] hover:text-[var(--t)] transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Description */}
            <div className="p-3.5 rounded-2xl bg-[var(--s2)]/50 border border-[var(--line)] space-y-1.5">
              <div className="text-xs font-bold text-[var(--t)]">Current Active Task:</div>
              <div className="text-xs text-[var(--m)] font-medium leading-relaxed">{taskTitle}</div>
              <div className="flex items-center gap-2 text-[11px] text-[var(--y)] font-semibold pt-1">
                <Clock className="w-3.5 h-3.5" />
                <span>Estimated duration: {estimatedTime}</span>
              </div>
            </div>

            {/* Need More Time / Feeling Stuck accordion */}
            <div className="pt-1">
              {!needMoreTime ? (
                <button
                  type="button"
                  onClick={() => setNeedMoreTime(true)}
                  className="text-xs font-semibold text-[var(--m)] hover:text-[var(--t)] underline transition-colors"
                >
                  Need more time or feeling stuck?
                </button>
              ) : (
                <div className="p-3.5 rounded-2xl bg-[var(--s2)] border border-[var(--line)] space-y-3 animate-in fade-in">
                  <div className="text-xs font-bold text-[var(--t)]">Need more time?</div>
                  <div className="grid grid-cols-4 gap-1.5">
                    {['15 mins', '30 mins', '1 hour', '2 hours'].map((slot) => (
                      <button
                        key={slot}
                        type="button"
                        onClick={() => setSelectedExtraTime(slot)}
                        className={`py-1.5 text-[11px] font-bold rounded-lg border text-center transition-all ${
                          selectedExtraTime === slot
                            ? 'bg-[var(--y)] text-[#171717] border-[var(--y)] shadow-sm'
                            : 'bg-[var(--s)] text-[var(--m)] border-[var(--line)] hover:text-[var(--t)]'
                        }`}
                      >
                        {slot}
                      </button>
                    ))}
                  </div>

                  <div className="pt-2 border-t border-[var(--line)]">
                    <div className="text-xs text-[var(--m)] font-medium mb-2">
                      Or you’re feeling stuck somewhere?
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setIsStuck(false)}
                        className={`px-3 py-1 rounded-lg text-xs font-bold border transition-all ${
                          !isStuck
                            ? 'bg-[var(--s)] text-[var(--t)] border-[var(--line)] shadow-sm'
                            : 'text-[var(--m)] border-transparent'
                        }`}
                      >
                        No, just pacing
                      </button>
                      <button
                        type="button"
                        onClick={() => setIsStuck(true)}
                        className={`px-3 py-1 rounded-lg text-xs font-bold border transition-all ${
                          isStuck
                            ? 'bg-[var(--y)] text-[#171717] border-[var(--y)] shadow-sm'
                            : 'text-[var(--m)] border-transparent'
                        }`}
                      >
                        Yes, I'm stuck
                      </button>
                    </div>

                    {isStuck && (
                      <div className="mt-3 p-2.5 rounded-xl bg-[var(--y)]/10 border border-[var(--y)]/30 text-xs text-[var(--t)] space-y-2">
                        <p className="leading-relaxed">
                          Bob can read your active tabs and current problem statement to clarify and unblock this step.
                        </p>
                        <button
                          type="button"
                          onClick={handleAskBobStuck}
                          className="w-full py-1.5 rounded-lg bg-[var(--y)] text-[#171717] font-extrabold text-xs shadow-sm hover:bg-[#e0ac15]"
                        >
                          Ask Bob to Unblock Me
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-2 pt-3 border-t border-[var(--line)]">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-semibold text-[var(--m)] hover:text-[var(--t)] rounded-xl"
              >
                Keep Working
              </button>
              <button
                type="button"
                onClick={handleCompleteAndUnlock}
                className="px-5 py-2.5 text-xs font-extrabold bg-[var(--g)] hover:bg-[#16a34a] text-white rounded-xl shadow-md active:scale-95 transition-all flex items-center gap-1.5"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Mark All Completed & Unlock Next</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
