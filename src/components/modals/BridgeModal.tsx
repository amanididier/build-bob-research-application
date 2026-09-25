import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { X, ArrowRight, Copy, Check, Send } from 'lucide-react';

export const BridgeModal: React.FC = () => {
  const { isBridgeOpen, setIsBridgeOpen, triggerThinking } = useApp();
  const [copied, setCopied] = useState(false);
  const [fromAiText, setFromAiText] = useState('Initial AI: compare user problems and evidence');
  const [continuationText, setContinuationText] = useState('Continue from this context and identify the strongest next step.');

  if (!isBridgeOpen) return null;

  const handleCopy = () => {
    navigator.clipboard?.writeText(`${fromAiText} -> ${continuationText}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSend = () => {
    setIsBridgeOpen(false);
    triggerThinking('Bridge prepared', 'Packaging context for the next AI...', 'Building clean handoff');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="w-full max-w-[460px] bg-[var(--s)] border border-[var(--line)] shadow-2xl rounded-2xl p-5 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <b className="text-[14px] text-[var(--t)] block">Bridge context</b>
            <span className="text-[10px] text-[var(--m)]">Clean, lossless AI handoff</span>
          </div>
          <button
            onClick={() => setIsBridgeOpen(false)}
            className="w-7 h-7 rounded-full bg-[var(--s2)] text-[var(--m)] hover:text-[var(--t)] grid place-items-center transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Bridge Visual Flow */}
        <div className="flex items-center gap-2">
          <span className="px-2 py-1 rounded-full text-[10px] font-bold bg-[#fff0d7] dark:bg-[#4a321c] text-[#995a21] dark:text-[#fcd34d]">
            CLAUDE
          </span>
          <input
            type="text"
            value={fromAiText}
            onChange={(e) => setFromAiText(e.target.value)}
            className="flex-1 h-9 px-3 rounded-xl bg-[#fff7d3] dark:bg-[#3d3215] border border-[#ebd16e] dark:border-[#715c1e] text-[11px] text-[var(--t)] outline-none"
          />
          <ArrowRight className="w-4 h-4 text-[var(--m)] flex-shrink-0" />
          <span className="px-2 py-1 rounded-full text-[10px] font-bold bg-[#e1f5ea] dark:bg-[#163325] text-[#147c4c] dark:text-[#86efac]">
            CHATGPT
          </span>
        </div>

        {/* Prompt continuation */}
        <div>
          <label className="text-[10px] font-bold text-[var(--m)] uppercase block mb-1">
            Continuation Prompt
          </label>
          <input
            type="text"
            value={continuationText}
            onChange={(e) => setContinuationText(e.target.value)}
            className="w-full h-9 px-3 rounded-xl bg-[var(--s2)] border border-[var(--line)] text-[11px] text-[var(--t)] outline-none"
          />
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-2 pt-2 border-t border-[var(--line)]">
          <button
            onClick={handleCopy}
            className="h-8 px-3 rounded-xl border border-[var(--line)] bg-[var(--s)] hover:bg-[var(--s2)] text-[var(--t)] text-[11px] font-semibold flex items-center gap-1.5 transition-colors"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-[var(--g)]" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? 'Copied ✓' : 'Copy bridge'}</span>
          </button>

          <button
            onClick={handleSend}
            className="h-8 px-3.5 rounded-xl bg-[#171717] dark:bg-[#f2eee7] text-white dark:text-[#171717] text-[11px] font-bold flex items-center gap-1.5 shadow-sm hover:opacity-90 active:scale-95 transition-all"
          >
            <Send className="w-3.5 h-3.5" />
            <span>Send to next AI</span>
          </button>
        </div>
      </div>
    </div>
  );
};
