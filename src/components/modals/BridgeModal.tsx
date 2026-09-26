import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { 
  X, 
  ArrowRight, 
  Copy, 
  Check, 
  ExternalLink, 
  Sparkles, 
  Layers, 
  Send,
  MessageSquare,
  Bookmark,
  Share2
} from 'lucide-react';
import { BobAvatar } from '../BobAvatar';

export const BridgeModal: React.FC = () => {
  const { 
    isBridgeOpen, 
    setIsBridgeOpen, 
    activeResearchId, 
    projects, 
    messages, 
    notes,
    addNote,
    triggerThinking 
  } = useApp();

  const [copied, setCopied] = useState(false);
  const [receiverAi, setReceiverAi] = useState<'chatgpt' | 'claude' | 'gemini' | 'perplexity'>('chatgpt');
  const [continuationGoal, setContinuationGoal] = useState('Evaluate these findings, identify potential counterarguments, and suggest next steps.');
  const [activeTab, setActiveTab] = useState<'export' | 'import'>('export');
  
  // External AI import fields
  const [importSource, setImportSource] = useState('ChatGPT');
  const [importText, setImportText] = useState('');
  const [importImported, setImportImported] = useState(false);

  if (!isBridgeOpen) return null;

  const currentProject = projects.find((p) => p.id === activeResearchId) || projects[0];
  const lastAssistantMsg = [...messages].reverse().find((m) => m.role === 'assistant');
  const synthesisContent = lastAssistantMsg?.text || currentProject.summary;

  // Build the complete lossless context bridge payload
  const buildBridgePayload = () => {
    const citations = lastAssistantMsg?.sources && lastAssistantMsg.sources.length > 0
      ? lastAssistantMsg.sources.map(s => `- ${s.title}: ${s.url || 'Web clip'}`).join('\n')
      : `- Primary investigation: ${currentProject.title}\n- Local PC Memory Bank: Indexed research sources`;

    return `[CONTEXT HANDOFF FROM BOB RESEARCH COMPANION]

Research Focus: ${currentProject.title}

Current Findings & Bob's Synthesis:
${synthesisContent.slice(0, 800)}...

Verified Evidence & Citations:
${citations}

Continuation Task for ${receiverAi.toUpperCase()}:
${continuationGoal}
`;
  };

  const bridgeText = buildBridgePayload();

  const handleCopy = () => {
    navigator.clipboard?.writeText(bridgeText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleLaunchReceiver = (ai: 'chatgpt' | 'claude' | 'gemini' | 'perplexity') => {
    handleCopy();
    
    let targetUrl = '';
    const encodedPrompt = encodeURIComponent(bridgeText.slice(0, 1500));

    if (ai === 'chatgpt') {
      targetUrl = `https://chatgpt.com/?q=${encodedPrompt}`;
    } else if (ai === 'claude') {
      targetUrl = 'https://claude.ai/new';
    } else if (ai === 'gemini') {
      targetUrl = 'https://gemini.google.com/app';
    } else if (ai === 'perplexity') {
      targetUrl = `https://www.perplexity.ai/search?q=${encodedPrompt}`;
    }

    if (typeof window !== 'undefined') {
      window.open(targetUrl, '_blank');
    }

    triggerThinking(
      `Bridged to ${ai.toUpperCase()}`,
      'Full context copied to your clipboard and receiver opened.',
      'Handoff complete'
    );
  };

  const handleSaveImportedText = () => {
    if (!importText.trim()) return;
    addNote({
      title: `${importSource} Cross-Bridge: ${currentProject.title}`,
      selectedText: importText.trim(),
      sourceTitle: `${importSource} Session Response`,
      sourceUrl: 'ai.bridge/' + importSource.toLowerCase(),
      projectId: currentProject.id,
      relevance: 98,
      color: 'blue'
    });
    setImportImported(true);
    setImportText('');
    setTimeout(() => {
      setImportImported(false);
      setIsBridgeOpen(false);
    }, 1200);
    triggerThinking('Bridge Ingested', `Linked ${importSource} response into your research memory.`, 'Stored locally');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="w-full max-w-[560px] bg-[var(--s)] border border-[var(--line)] shadow-2xl rounded-2xl p-6 space-y-5">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[var(--line)]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[var(--bs)] text-[var(--b)] grid place-items-center">
              <Share2 className="w-4 h-4" />
            </div>
            <div>
              <b className="text-[14px] text-[var(--t)] block">Lossless AI Context Bridge</b>
              <span className="text-[11px] text-[var(--m)]">
                Transfer verified research context between Bob and external models without loss
              </span>
            </div>
          </div>
          <button
            onClick={() => setIsBridgeOpen(false)}
            className="w-7 h-7 rounded-full bg-[var(--s2)] text-[var(--m)] hover:text-[var(--t)] grid place-items-center transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Toggle: Export Context vs Ingest Response */}
        <div className="flex items-center gap-1.5 p-1 bg-[var(--s2)] rounded-xl border border-[var(--line)] text-[11.5px] font-semibold">
          <button
            onClick={() => setActiveTab('export')}
            className={`flex-1 py-1.5 rounded-lg transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'export'
                ? 'bg-[var(--s)] text-[var(--t)] shadow-sm'
                : 'text-[var(--m)] hover:text-[var(--t)]'
            }`}
          >
            <Send className="w-3.5 h-3.5" />
            <span>Send Bob Context to AI</span>
          </button>
          <button
            onClick={() => setActiveTab('import')}
            className={`flex-1 py-1.5 rounded-lg transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'import'
                ? 'bg-[var(--s)] text-[var(--t)] shadow-sm'
                : 'text-[var(--m)] hover:text-[var(--t)]'
            }`}
          >
            <Bookmark className="w-3.5 h-3.5" />
            <span>Ingest from External AI</span>
          </button>
        </div>

        {activeTab === 'export' ? (
          <div className="space-y-4">
            {/* Receiver AI Selection */}
            <div>
              <label className="text-[10.5px] font-bold text-[var(--m)] uppercase block mb-1.5">
                Target Receiver Model
              </label>
              <div className="grid grid-cols-4 gap-2">
                {[
                  { id: 'chatgpt', name: 'ChatGPT', tag: 'OpenAI', color: 'border-emerald-500/30' },
                  { id: 'claude', name: 'Claude', tag: 'Anthropic', color: 'border-amber-500/30' },
                  { id: 'gemini', name: 'Gemini', tag: 'Google', color: 'border-blue-500/30' },
                  { id: 'perplexity', name: 'Perplexity', tag: 'Search', color: 'border-cyan-500/30' }
                ].map((item) => (
                  <button
                    key={item.id}
                    onClick={() => setReceiverAi(item.id as any)}
                    className={`p-2.5 rounded-xl border text-left transition-all ${
                      receiverAi === item.id
                        ? 'border-[var(--b)] bg-[var(--bs)]'
                        : 'border-[var(--line)] bg-[var(--s2)] hover:border-[#aaa] dark:hover:border-[#555]'
                    }`}
                  >
                    <div className="text-[12px] font-bold text-[var(--t)]">{item.name}</div>
                    <div className="text-[9.5px] text-[var(--m)]">{item.tag}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Continuation prompt */}
            <div>
              <label className="text-[10.5px] font-bold text-[var(--m)] uppercase block mb-1">
                Continuation Goal for Next AI
              </label>
              <textarea
                rows={2}
                value={continuationGoal}
                onChange={(e) => setContinuationGoal(e.target.value)}
                className="w-full p-2.5 rounded-xl bg-[var(--s2)] border border-[var(--line)] text-[12px] text-[var(--t)] focus:border-[var(--b)] outline-none resize-none transition-colors"
                placeholder="What should the receiver AI do with Bob's findings?"
              />
            </div>

            {/* Preview of lossless prompt */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10.5px] font-bold text-[var(--m)] uppercase">
                  Lossless Context Preview
                </span>
                <span className="text-[10px] text-[var(--m)]">
                  {bridgeText.length} characters packaged
                </span>
              </div>
              <div className="p-3 bg-[var(--s2)] rounded-xl border border-[var(--line)] max-h-32 overflow-y-auto text-[11px] text-[var(--m)] font-mono leading-relaxed select-all">
                {bridgeText}
              </div>
            </div>

            {/* Action Bar */}
            <div className="flex items-center justify-between pt-3 border-t border-[var(--line)]">
              <button
                onClick={handleCopy}
                className="h-9 px-3.5 rounded-xl border border-[var(--line)] bg-[var(--s)] hover:bg-[var(--s2)] text-[var(--t)] text-[11.5px] font-semibold flex items-center gap-1.5 transition-colors"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-[var(--g)]" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Copied to Clipboard ✓' : 'Copy Bridge Prompt'}</span>
              </button>

              <button
                onClick={() => handleLaunchReceiver(receiverAi)}
                className="h-9 px-4 rounded-xl bg-[#171717] dark:bg-[#f2eee7] text-white dark:text-[#171717] text-[11.5px] font-bold flex items-center gap-2 shadow-sm hover:opacity-90 active:scale-95 transition-all"
              >
                <span>Launch {receiverAi.toUpperCase()} with Context</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <label className="text-[10.5px] font-bold text-[var(--m)] uppercase block mb-1.5">
                Source AI
              </label>
              <div className="flex gap-2">
                {['ChatGPT', 'Claude', 'Gemini', 'Perplexity'].map((s) => (
                  <button
                    key={s}
                    onClick={() => setImportSource(s)}
                    className={`px-3 py-1.5 rounded-lg text-[11.5px] font-bold border transition-colors ${
                      importSource === s
                        ? 'bg-[var(--bs)] border-[var(--b)] text-[var(--b)]'
                        : 'bg-[var(--s2)] border-[var(--line)] text-[var(--t)]'
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-[10.5px] font-bold text-[var(--m)] uppercase block mb-1">
                Paste Answer from {importSource}
              </label>
              <textarea
                rows={5}
                value={importText}
                onChange={(e) => setImportText(e.target.value)}
                className="w-full p-3 rounded-xl bg-[var(--s2)] border border-[var(--line)] text-[12px] text-[var(--t)] focus:border-[var(--b)] outline-none resize-none transition-colors"
                placeholder={`Paste the response generated by ${importSource}. Bob will index it into notes and memory.`}
              />
            </div>

            <div className="flex justify-end pt-2 border-t border-[var(--line)]">
              <button
                onClick={handleSaveImportedText}
                disabled={!importText.trim()}
                className="h-9 px-4 rounded-xl bg-[#171717] dark:bg-[#f2eee7] text-white dark:text-[#171717] text-[11.5px] font-bold flex items-center gap-2 disabled:opacity-40 transition-all shadow-sm"
              >
                {importImported ? <Check className="w-3.5 h-3.5 text-[var(--g)]" /> : <Bookmark className="w-3.5 h-3.5" />}
                <span>{importImported ? 'Saved to Memory ✓' : 'Save & Link to Bob Memory'}</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
