import React from 'react';
import { ArrowRight, X } from 'lucide-react';

// Set to 0 for a perfectly flat card. The slight tilt is part of the Duolingo-style look.
export const ONBOARDING_CARD_TILT_DEG = -0.6;

interface OnboardingCardProps {
  step: number;
  total: number;
  eyebrow: string;
  cta: string;
  onCta: () => void;
  onClose: () => void;
  onBack?: () => void;
  hero?: React.ReactNode;
  children: React.ReactNode;
  footerNote?: React.ReactNode;
}

export const OnboardingProgressBar: React.FC<{ step: number; total: number }> = ({ step, total }) => (
  <div
    className="flex items-center gap-1.5"
    role="progressbar"
    aria-label="Onboarding progress"
    aria-valuemin={1}
    aria-valuemax={total}
    aria-valuenow={step}
  >
    {Array.from({ length: total }, (_, i) => i + 1).map((n) => (
      <span
        key={n}
        className={`h-1.5 flex-1 rounded-full transition-colors duration-500 ${
          n <= step ? 'bg-[var(--y)]' : 'bg-[var(--line)]'
        }`}
      />
    ))}
  </div>
);

export const OnboardingCard: React.FC<OnboardingCardProps> = ({
  step,
  total,
  eyebrow,
  cta,
  onCta,
  onClose,
  onBack,
  hero,
  children,
  footerNote
}) => (
  <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6 bg-[#f4f3ef] dark:bg-[#0f0f0f] animate-in fade-in duration-200">
    <div
      className="w-full max-w-[560px] max-h-[92vh] overflow-y-auto bg-[var(--s)] rounded-[28px] border border-black/5 dark:border-[var(--line)] shadow-[0_32px_80px_-24px_rgba(0,0,0,0.45),0_10px_28px_rgba(0,0,0,0.14)]"
      style={{ transform: `rotate(${ONBOARDING_CARD_TILT_DEG}deg)` }}
    >
      <div className="px-7 pt-6">
        <OnboardingProgressBar step={step} total={total} />
        <div className="flex items-center justify-between mt-4">
          <span className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-[#e8a800] dark:text-[var(--y)]">
            {eyebrow}
          </span>
          <div className="flex items-center gap-3">
            <span className="text-[10.5px] font-mono text-[var(--m)]">
              {step} / {total}
            </span>
            <button
              onClick={onClose}
              aria-label="Skip onboarding"
              className="text-[var(--m)] hover:text-[var(--t)] transition-colors"
            >
              <X className="w-[18px] h-[18px]" />
            </button>
          </div>
        </div>
      </div>

      {hero}

      <div className="px-7 pt-5 pb-7 animate-in fade-in duration-200" key={step}>
        {children}

        <button
          onClick={onCta}
          className="mt-6 w-full h-12 rounded-2xl bg-[#171717] dark:bg-[#f5f4f0] text-white dark:text-[#171717] text-[13.5px] font-bold flex items-center justify-center gap-2 hover:opacity-95 active:scale-[0.98] shadow-md transition-all"
        >
          <span>{cta}</span>
          <ArrowRight className="w-4 h-4" />
        </button>

        {onBack && (
          <button
            onClick={onBack}
            className="mt-3 w-full text-center text-[12px] font-semibold text-[var(--m)] hover:text-[var(--t)] transition-colors"
          >
            Back
          </button>
        )}

        {footerNote && <div className="mt-3">{footerNote}</div>}
      </div>
    </div>
  </div>
);
