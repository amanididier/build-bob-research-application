import React, { useState, useEffect, useCallback } from 'react';
import { useApp } from '../../context/AppContext';
import { 
  X, 
  ExternalLink, 
  Download, 
  CheckCircle2, 
  Zap, 
  RefreshCw, 
  Check, 
  Copy 
} from 'lucide-react';
import { BobAvatar } from '../BobAvatar';
import { downloadExtensionZip } from '../../lib/downloadHelper';

export const ChromeExtensionModal: React.FC = () => {
  const { isChromeModalOpen, setIsChromeModalOpen, activeResearchId, projects } = useApp();
  const [testingPing, setTestingPing] = useState(false);
  const [pingSuccess, setPingSuccess] = useState(false);
  const [copiedPath, setCopiedPath] = useState(false);
  const [bridgeMessage, setBridgeMessage] = useState<string>('');
  const [panelMessage, setPanelMessage] = useState<{ tone: 'idle' | 'ok' | 'err'; text: string }>({ tone: 'idle', text: '' });
  const [downloadState, setDownloadState] = useState<{ state: 'idle' | 'saving' | 'saved' | 'error'; message: string }>({
    state: 'idle',
    message: ''
  });

  const bob = typeof window !== 'undefined' ? ((window as any).bob || null) : null;

  const testBridge = useCallback(async (): Promise<boolean> => {
    setTestingPing(true);
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 2000);
      const res = await fetch('http://127.0.0.1:54321/health', {
        headers: { 'x-bob-token': 'development-token' },
        signal: controller.signal
      });
      clearTimeout(timer);
      if (res.status === 401) {
        setPingSuccess(false);
        setBridgeMessage('Bob Desktop answered but rejected the bridge token (401). Set BOB_BRIDGE_TOKEN to the same value on both sides.');
        return false;
      }
      if (!res.ok) {
        setPingSuccess(false);
        setBridgeMessage(`Unexpected bridge response (HTTP ${res.status}).`);
        return false;
      }
      const data = await res.json().catch(() => ({}));
      setPingSuccess(true);
      setBridgeMessage(`Bridge live on 127.0.0.1:54321 · Bob Desktop v${data?.version || 'unknown'}.`);
      return true;
    } catch {
      setPingSuccess(false);
      setBridgeMessage('No answer on 127.0.0.1:54321. The bridge only runs while the Bob Desktop app is open.');
      return false;
    } finally {
      setTestingPing(false);
    }
  }, []);

  useEffect(() => {
    if (!isChromeModalOpen) return;
    setPanelMessage({ tone: 'idle', text: '' });
    testBridge();
  }, [isChromeModalOpen, testBridge]);

  if (!isChromeModalOpen) return null;

  const currentProject = projects.find(p => p.id === activeResearchId) || projects[0];

  const handleTestBridge = () => {
    testBridge();
  };

  const handleCopyFolderInstruction = () => {
    navigator.clipboard?.writeText('chrome-extension');
    setCopiedPath(true);
    setTimeout(() => setCopiedPath(false), 2000);
  };

  // Chrome refuses to let anything but a real user click open the side panel,
  // so the desktop queues the request on the bridge and the extension raises a
  // notification whose click is that gesture.
  const handleOpenInChrome = async () => {
    if (!bob?.requestExtensionPanel) {
      setPanelMessage({
        tone: 'err',
        text: 'This build cannot talk to the extension bridge. Install the extension with the steps below, then click the Bob icon in the Chrome toolbar.'
      });
      return;
    }
    const result = await bob.requestExtensionPanel();
    if (result?.bridgeListening) {
      setPanelMessage({
        tone: 'ok',
        text: 'Request queued. In Chrome, click the “Bob Desktop is waiting” notification — or the Bob toolbar icon — to open the side panel. Chrome only allows the panel to open from your own click.'
      });
    } else {
      setPanelMessage({
        tone: 'err',
        text: 'The local bridge is not listening, so the request cannot reach Chrome. Restart Bob Desktop, make sure the extension is loaded, then try again.'
      });
    }
  };

  const handleDownloadZip = async () => {
    if (downloadState.state === 'saving') return;
    setDownloadState({ state: 'saving', message: 'Preparing bob-chrome-extension.zip…' });
    const result = await downloadExtensionZip();
    if (result.ok) {
      setDownloadState({
        state: 'saved',
        message: result.path ? `Saved to ${result.path}` : 'Extension archive downloaded.'
      });
    } else if (result.reason === 'canceled') {
      setDownloadState({ state: 'idle', message: 'Download canceled — nothing was saved.' });
    } else if (result.reason === 'missing-archive') {
      setDownloadState({
        state: 'error',
        message: 'The archive is missing from this build. Reinstall Bob or copy the chrome-extension folder from the repository.'
      });
    } else {
      setDownloadState({ state: 'error', message: `Download failed (${result.reason}). Nothing was written to disk.` });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="w-full max-w-[540px] bg-[var(--s)] border border-[var(--line)] shadow-2xl rounded-2xl p-6 space-y-5 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[var(--line)]">
          <div className="flex items-center gap-3">
            <BobAvatar size={34} />
            <div>
              <h2 className="text-[16px] font-bold text-[var(--t)] flex items-center gap-2">
                Bob Chrome Side Panel
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#e1f5ea] dark:bg-[#163325] text-[#147c4c] dark:text-[#86efac]">
                  Real Side Panel API
                </span>
              </h2>
              <p className="text-[12px] text-[var(--m)]">
                Browse any webpage with Bob anchored directly in your Chrome side panel.
              </p>
            </div>
          </div>
          <button
            onClick={() => setIsChromeModalOpen(false)}
            className="w-7 h-7 rounded-full bg-[var(--s2)] text-[var(--m)] hover:text-[var(--t)] grid place-items-center transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Active Session Sync Status */}
        <div className="p-3.5 rounded-xl bg-[var(--s2)] border border-[var(--line)] flex items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="text-[10px] font-bold tracking-wider text-[var(--y)] uppercase">
              Current Synced Workspace
            </div>
            <div className="text-[13px] font-semibold text-[var(--t)] truncate">
              {currentProject.title}
            </div>
            <div className="text-[11px] text-[var(--m)]">
              {currentProject.sourceCount} sources connected · Local bridge port 54321
            </div>
          </div>
          <button
            onClick={handleTestBridge}
            disabled={testingPing}
            className="h-8 px-3 rounded-lg bg-[var(--s)] border border-[var(--line)] hover:bg-[var(--line)]/50 text-[11px] font-semibold text-[var(--t)] flex items-center gap-1.5 flex-shrink-0 transition-colors"
          >
            {testingPing ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin text-[var(--m)]" />
            ) : pingSuccess ? (
              <Check className="w-3.5 h-3.5 text-[var(--g)]" />
            ) : (
              <Zap className="w-3.5 h-3.5 text-[var(--y)]" />
            )}
            <span>{pingSuccess ? 'Bridge Active ✓' : 'Test Bridge'}</span>
          </button>
        </div>

        {bridgeMessage && (
          <p className={`text-[11px] leading-relaxed ${pingSuccess ? 'text-[var(--g)]' : 'text-[var(--m)]'}`}>{bridgeMessage}</p>
        )}

        {/* Primary Action Button */}
        <div className="space-y-2">
          <button
            onClick={handleOpenInChrome}
            className="w-full h-11 rounded-xl bg-[#171717] dark:bg-[#f5f4f0] text-white dark:text-[#171717] font-bold text-[13px] flex items-center justify-center gap-2 hover:opacity-95 shadow-md active:scale-[0.99] transition-all"
          >
            <span className="w-4 h-4 rounded-full relative p-0.5 bg-[conic-gradient(from_-35deg,#db4437_0_31%,#f4b400_31%_64%,#0f9d58_64%_100%)] flex items-center justify-center">
              <span className="w-2.5 h-2.5 rounded-full bg-[#4285f4] ring-1 ring-white" />
            </span>
            <span>Open Bob in Chrome</span>
            <ExternalLink className="w-3.5 h-3.5 ml-1 opacity-70" />
          </button>
          {panelMessage.text && (
            <p className={`text-[11.5px] leading-relaxed ${panelMessage.tone === 'err' ? 'text-[#c0392b]' : 'text-[var(--m)]'}`}>
              {panelMessage.text}
            </p>
          )}
        </div>

        {/* Chrome Extension Installation Guidance */}
        <div className="space-y-3 pt-2 border-t border-[var(--line)]">
          <div className="flex items-center justify-between">
            <span className="text-[12px] font-bold text-[var(--t)]">
              How to load the unpacked extension in Chrome:
            </span>
            <button
              onClick={handleDownloadZip}
              disabled={downloadState.state === 'saving'}
              className="text-[11px] font-bold text-[#4385f5] hover:underline disabled:opacity-60 flex items-center gap-1 cursor-pointer bg-transparent border-none p-0"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{downloadState.state === 'saving' ? 'Preparing…' : 'Download .zip'}</span>
            </button>
          </div>

          {downloadState.message && (
            <p
              className={`text-[11px] leading-relaxed ${
                downloadState.state === 'error' ? 'text-[#c0392b]' : downloadState.state === 'saved' ? 'text-[var(--g)]' : 'text-[var(--m)]'
              }`}
            >
              {downloadState.message}
            </p>
          )}

          <div className="space-y-2 text-[12px] text-[var(--m)]">
            <div className="flex items-start gap-2.5 p-2 rounded-lg bg-[var(--s2)]/70">
              <span className="w-5 h-5 rounded-full bg-[var(--s)] border border-[var(--line)] text-[11px] font-bold grid place-items-center text-[var(--t)] flex-shrink-0">
                1
              </span>
              <div>
                Open <code className="px-1.5 py-0.5 bg-[var(--s)] border border-[var(--line)] rounded text-[11px] text-[var(--t)] font-mono">chrome://extensions</code> in your Google Chrome address bar.
              </div>
            </div>

            <div className="flex items-start gap-2.5 p-2 rounded-lg bg-[var(--s2)]/70">
              <span className="w-5 h-5 rounded-full bg-[var(--s)] border border-[var(--line)] text-[11px] font-bold grid place-items-center text-[var(--t)] flex-shrink-0">
                2
              </span>
              <div>
                Toggle on <strong className="text-[var(--t)]">Developer mode</strong> in the top right corner.
              </div>
            </div>

            <div className="flex items-start gap-2.5 p-2 rounded-lg bg-[var(--s2)]/70">
              <span className="w-5 h-5 rounded-full bg-[var(--s)] border border-[var(--line)] text-[11px] font-bold grid place-items-center text-[var(--t)] flex-shrink-0">
                3
              </span>
              <div className="flex-1">
                Click <strong className="text-[var(--t)]">Load unpacked</strong> and select the downloaded & extracted <code className="px-1 py-0.5 bg-[var(--s)] border border-[var(--line)] rounded text-[11px] text-[var(--t)] font-mono">chrome-extension</code> folder.
              </div>
              <button
                onClick={handleCopyFolderInstruction}
                className="text-[10px] px-2 py-1 bg-[var(--s)] border border-[var(--line)] rounded-md hover:bg-[var(--line)]/50 text-[var(--t)] font-medium flex items-center gap-1 flex-shrink-0"
              >
                {copiedPath ? <Check className="w-3 h-3 text-[var(--g)]" /> : <Copy className="w-3 h-3" />}
                <span>{copiedPath ? 'Copied' : 'Copy name'}</span>
              </button>
            </div>

            <div className="flex items-start gap-2.5 p-2 rounded-lg bg-[var(--s2)]/70">
              <span className="w-5 h-5 rounded-full bg-[var(--s)] border border-[var(--line)] text-[11px] font-bold grid place-items-center text-[var(--t)] flex-shrink-0">
                4
              </span>
              <div>
                Click the Bob icon in Chrome or highlight text on any page to immediately start capturing notes!
              </div>
            </div>
          </div>
        </div>

        {/* Footer info */}
        <div className="pt-2 border-t border-[var(--line)] flex items-center justify-between text-[11px] text-[var(--m)]">
          <div className="flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-[var(--g)]" />
            <span>Side panel Manifest V3 ready</span>
          </div>
          <button
            onClick={() => setIsChromeModalOpen(false)}
            className="text-[var(--t)] font-semibold hover:underline"
          >
            Dismiss
          </button>
        </div>
      </div>
    </div>
  );
};
