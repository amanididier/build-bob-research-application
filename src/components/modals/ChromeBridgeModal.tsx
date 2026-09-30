import React, { useState, useEffect } from 'react';
import { X, Download, ExternalLink, CheckCircle, RefreshCw, Sparkles, Layers } from 'lucide-react';
import { downloadExtensionZip } from '../../lib/downloadHelper';

interface ChromeBridgeModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeResearchTitle?: string;
}

export const ChromeBridgeModal: React.FC<ChromeBridgeModalProps> = ({
  isOpen,
  onClose,
  activeResearchTitle,
}) => {
  const [bridgeStatus, setBridgeStatus] = useState<'checking' | 'connected' | 'disconnected'>('checking');
  const [downloading, setDownloading] = useState(false);

  const checkConnection = async () => {
    setBridgeStatus('checking');
    try {
      const res = await fetch('http://127.0.0.1:54321/health', { method: 'GET' });
      if (res.ok) {
        setBridgeStatus('connected');
      } else {
        setBridgeStatus('disconnected');
      }
    } catch {
      setBridgeStatus('disconnected');
    }
  };

  useEffect(() => {
    if (isOpen) {
      checkConnection();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleDownload = async () => {
    setDownloading(true);
    await downloadExtensionZip();
    setTimeout(() => setDownloading(false), 1200);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div
        className="w-full max-w-lg bg-[var(--s)] border border-[var(--line)] rounded-2xl shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-150 text-[var(--t)]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-[var(--line)] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="w-7 h-7 rounded-full relative p-1 bg-[conic-gradient(from_-35deg,#db4437_0_31%,#f4b400_31%_64%,#0f9d58_64%_100%)] flex items-center justify-center">
              <span className="w-4 h-4 rounded-full bg-[#4285f4] ring-2 ring-white" />
            </span>
            <div>
              <h2 className="text-[15px] font-bold tracking-tight">Bob in Chrome Side Panel</h2>
              <p className="text-[11.5px] text-[var(--m)]">
                {activeResearchTitle ? `Active context: ${activeResearchTitle}` : 'Research companion alongside any webpage'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-lg hover:bg-[var(--s2)] text-[var(--m)] hover:text-[var(--t)] flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" strokeWidth={1.8} />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4 max-h-[75vh] overflow-y-auto">
          {/* Bridge Status Indicator */}
          <div className="p-3 rounded-xl bg-[var(--s2)] border border-[var(--line)]/60 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <span
                className={`w-2.5 h-2.5 rounded-full ${
                  bridgeStatus === 'connected'
                    ? 'bg-emerald-500 animate-pulse'
                    : bridgeStatus === 'checking'
                    ? 'bg-amber-400 animate-ping'
                    : 'bg-neutral-400'
                }`}
              />
              <span className="text-[12.5px] font-medium">
                {bridgeStatus === 'connected'
                  ? 'Desktop Bridge Active (127.0.0.1:54321)'
                  : bridgeStatus === 'checking'
                  ? 'Checking connection...'
                  : 'Desktop Bridge Waiting'}
              </span>
            </div>
            <button
              onClick={checkConnection}
              className="text-[11.5px] text-[var(--m)] hover:text-[var(--t)] flex items-center gap-1 font-medium transition-colors cursor-pointer"
            >
              <RefreshCw className={`w-3 h-3 ${bridgeStatus === 'checking' ? 'animate-spin' : ''}`} />
              Check
            </button>
          </div>

          {/* Quick How to Use */}
          <div className="space-y-2">
            <div className="text-[11px] font-bold uppercase tracking-wider text-[var(--m)]">How It Works</div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div className="p-3 rounded-xl bg-[var(--s2)]/70 border border-[var(--line)]/50">
                <div className="flex items-center gap-1.5 text-[12.5px] font-semibold text-[var(--y)] mb-1">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Shortcut: Alt + B</span>
                </div>
                <p className="text-[11px] text-[var(--m)] leading-relaxed">
                  Press <b>Alt + B</b> on any webpage in Chrome to open Bob's native Side Panel immediately.
                </p>
              </div>

              <div className="p-3 rounded-xl bg-[var(--s2)]/70 border border-[var(--line)]/50">
                <div className="flex items-center gap-1.5 text-[12.5px] font-semibold text-blue-500 mb-1">
                  <Layers className="w-3.5 h-3.5" />
                  <span>Highlight: Ctrl+Shift+H</span>
                </div>
                <p className="text-[11px] text-[var(--m)] leading-relaxed">
                  Select any text on the web and press <b>Ctrl+Shift+H</b> (or ⌘+Shift+H) to save into your project notes.
                </p>
              </div>
            </div>
          </div>

          {/* 3 Step Installation Guide */}
          <div className="space-y-2.5">
            <div className="text-[11px] font-bold uppercase tracking-wider text-[var(--m)]">Installation Steps</div>
            <ol className="space-y-2 text-[12px] text-[var(--t)]">
              <li className="flex items-start gap-2">
                <span className="w-4 h-4 rounded-full bg-[var(--y)] text-black font-bold text-[10px] flex items-center justify-center shrink-0 mt-0.5">1</span>
                <span>Download the <b>bob-chrome-extension.zip</b> package below and unzip it to any folder.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-4 h-4 rounded-full bg-[var(--y)] text-black font-bold text-[10px] flex items-center justify-center shrink-0 mt-0.5">2</span>
                <span>Open <b>chrome://extensions</b> in Google Chrome and turn on <b>Developer mode</b> (top right).</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-4 h-4 rounded-full bg-[var(--y)] text-black font-bold text-[10px] flex items-center justify-center shrink-0 mt-0.5">3</span>
                <span>Click <b>Load unpacked</b> and select the unzipped <b>chrome-extension</b> folder. Done!</span>
              </li>
            </ol>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-5 py-3.5 bg-[var(--s2)]/40 border-t border-[var(--line)] flex items-center justify-between">
          <button
            onClick={() => window.open('https://developer.chrome.com/docs/extensions/reference/api/sidePanel', '_blank')}
            className="text-[11.5px] text-[var(--m)] hover:text-[var(--t)] flex items-center gap-1 font-medium cursor-pointer"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            Side Panel Docs
          </button>

          <button
            onClick={handleDownload}
            disabled={downloading}
            className="px-4 py-2 rounded-xl bg-[var(--y)] hover:bg-[#e0ab12] text-neutral-900 text-[12.5px] font-bold flex items-center gap-2 shadow-xs transition-all active:scale-95 cursor-pointer disabled:opacity-50"
          >
            {downloading ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span>Downloading...</span>
              </>
            ) : (
              <>
                <Download className="w-3.5 h-3.5" />
                <span>Download Extension (.zip)</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
