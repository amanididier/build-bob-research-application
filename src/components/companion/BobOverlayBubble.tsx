import React, { useEffect, useRef, useState } from 'react';
import { X, Send, PanelRight, ArrowRight, Heart, Clock, RotateCcw } from 'lucide-react';
import { bobRoutines, RoutineDetail } from '../../lib/companion/bobRoutines';
import { useApp } from '../../context/AppContext';
import { UserInterestsModal } from './UserInterestsModal';
import { bobAi } from '../../lib/aiEngine';

/** Map routine → preferred video then image under public/assets/companion-loops/ */
function mediaForRoutine(id: string): { video?: string; image?: string } {
  const base = '/assets/companion-loops';
  const map: Record<string, { video?: string; image?: string }> = {
    waking_up: { image: `${base}/bob-waking-up.png`, video: `${base}/bob-waking-up.webm` },
    sleeping: { image: `${base}/bob-sleeping.png`, video: `${base}/bob-sleeping.webm` },
    eating: { image: `${base}/bob-eating.png`, video: `${base}/bob-eating.webm` },
    cooking: { image: `${base}/bob-cooking.png`, video: `${base}/bob-cooking.webm` },
    reading: { image: `${base}/bob-reading-book.png`, video: `${base}/bob-reading.webm` },
    meditating: { video: `${base}/bob-meditating.webm`, image: `${base}/bob-meditating.png` },
    listening_music: { video: `${base}/bob-listening-music.webm`, image: `${base}/bob-listening-music.png` },
    thinking: { video: `${base}/bob-thinking.webm`, image: `${base}/bob-thinking.png` },
    listening: { video: `${base}/bob-listening.webm`, image: `${base}/bob-listening.png` },
    speaking: { video: `${base}/bob-speaking.webm`, image: `${base}/bob-speaking.png` },
  };
  return map[id] || { video: `${base}/bob-idle.webm`, image: `${base}/bob-idle.png` };
}

type BubbleMsg = {
  role: 'assistant' | 'user';
  text: string;
  actionType?: 'research_redirect';
};

type PanelTab = 'chat' | 'research';

const CHAT_SYSTEM = `You are Bob, a friendly browsing companion in a small chat bubble.
Reply in 1–3 short sentences. Casual, warm, plain words.
Do not write long research reports. If the user needs deep research, roadmap, or multi-step work, say so briefly and suggest the side panel or desktop research tab.
Never invent sources. Match the user's language.`;

export const BobOverlayBubble: React.FC = () => {
  const { currentPage, navigateTo, userName, activeResearchId, openChromeBridge } = useApp();

  const [currentRoutine, setCurrentRoutine] = useState<RoutineDetail>(() => bobRoutines.getCurrentRoutine());
  const [minutesOfDay, setMinutesOfDay] = useState(() => bobRoutines.getCurrentMinutesOfDay());
  const [showTimeScrubber, setShowTimeScrubber] = useState(false);
  const [isInterestsModalOpen, setIsInterestsModalOpen] = useState(false);

  const [isExpanded, setIsExpanded] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [hasUnreadMessage, setHasUnreadMessage] = useState(false);
  const [videoFailed, setVideoFailed] = useState(false);
  const [imageFailed, setImageFailed] = useState(false);

  const [panelTab, setPanelTab] = useState<PanelTab>('chat');
  const [selectedExcerpt, setSelectedExcerpt] = useState('');
  const [chatInput, setChatInput] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const [bubbleMessages, setBubbleMessages] = useState<BubbleMsg[]>([
    {
      role: 'assistant',
      text: `Hey ${userName || 'buddy'}! I'm right here while you browse. Tap me anytime.`,
    },
  ]);

  const feedRef = useRef<HTMLDivElement>(null);
  const media = mediaForRoutine(currentRoutine.id);

  useEffect(() => {
    setVideoFailed(false);
    setImageFailed(false);
  }, [currentRoutine.id]);

  useEffect(() => {
    const unsub = bobRoutines.subscribe((r, m) => {
      setCurrentRoutine(r);
      setMinutesOfDay(m);
    });
    return unsub;
  }, []);

  useEffect(() => {
    const t = setTimeout(() => {
      setBubbleMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          text: `Hey ${userName || 'buddy'}! Found anything interesting? I'm here if you want a quick chat.`,
        },
      ]);
      setHasUnreadMessage(true);
    }, 16000);
    return () => clearTimeout(t);
  }, [userName]);

  // Selection Ask from extension / desktop events
  useEffect(() => {
    const onAsk = (ev: Event) => {
      const detail = (ev as CustomEvent).detail || {};
      const text = String(detail.text || detail.selection || '').trim();
      if (text) {
        setSelectedExcerpt(text.slice(0, 280));
        setPanelTab('research');
        openPanel();
      }
    };
    window.addEventListener('bob-overlay-ask', onAsk as EventListener);
    return () => window.removeEventListener('bob-overlay-ask', onAsk as EventListener);
  }, []);

  useEffect(() => {
    if (feedRef.current) feedRef.current.scrollTop = feedRef.current.scrollHeight;
  }, [bubbleMessages, isThinking, isExpanded]);

  if (currentPage !== 'chrome') return null;

  const openPanel = () => {
    setIsClosing(false);
    setIsExpanded(true);
    setHasUnreadMessage(false);
  };

  const closePanel = () => {
    setIsClosing(true);
    setTimeout(() => {
      setIsExpanded(false);
      setIsClosing(false);
    }, 220);
  };

  const handleBubbleClick = () => {
    if (isExpanded) closePanel();
    else openPanel();
  };

  const handleSend = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const query = chatInput.trim();
    if (!query || isThinking) return;

    setChatInput('');
    const userLine =
      panelTab === 'research' && selectedExcerpt
        ? `About this text: “${selectedExcerpt.slice(0, 120)}${selectedExcerpt.length > 120 ? '…' : ''}” — ${query}`
        : query;

    setBubbleMessages((prev) => [...prev, { role: 'user', text: query }]);
    setIsThinking(true);

    const lower = query.toLowerCase();
    const needsResearch =
      /research|project|roadmap|task|source|study|summarize this page|deep dive/.test(lower);

    try {
      if (needsResearch) {
        setBubbleMessages((prev) => [
          ...prev,
          {
            role: 'assistant',
            text: 'For research, roadmaps, and project tasks, use the side panel or desktop research tab — more room to work.',
            actionType: 'research_redirect',
          },
        ]);
        return;
      }

      // Prefer Gemini short chat-style reply when available
      let reply = '';
      try {
        if (bobAi?.generateResearchAnswer) {
          const surfaceContext = [
            CHAT_SYSTEM,
            selectedExcerpt ? `Selected page text: ${selectedExcerpt.slice(0, 400)}` : '',
            `Bob routine: ${currentRoutine.label}`,
          ]
            .filter(Boolean)
            .join('\n');
          // Keep the actual user message separate from surface guidance. The AI
          // engine uses its query argument for memory retrieval and tool intent;
          // passing the whole system prompt there made unrelated memories match.
          const res = await bobAi.generateResearchAnswer(
            userLine,
            activeResearchId || undefined,
            undefined,
            'warm short chat',
            surfaceContext,
            query
          );
          reply = (res?.answer || '').trim();
        }
      } catch {
        /* fallback below */
      }

      if (!reply) {
        if (/how are you|what are you doing/.test(lower)) {
          reply = `I'm ${currentRoutine.label.toLowerCase()} beside you. What's on your mind?`;
        } else if (selectedExcerpt && panelTab === 'research') {
          reply = `Got it. From that snippet, the main idea seems useful — want a one-line takeaway or a next step?`;
        } else {
          reply = `I hear you. Tell me a bit more and I'll keep it short.`;
        }
      }

      // Keep bubble replies short
      if (reply.length > 320) reply = reply.slice(0, 300).trim() + '…';

      setBubbleMessages((prev) => [...prev, { role: 'assistant', text: reply }]);
      if (!isExpanded) setHasUnreadMessage(true);
    } finally {
      setIsThinking(false);
    }
  };

  const formatTime = (totalMinutes: number) => {
    const h = Math.floor(totalMinutes / 60) % 24;
    const m = totalMinutes % 60;
    return `${h < 10 ? '0' : ''}${h}:${m < 10 ? '0' : ''}${m}`;
  };

  return (
    <>
      <div className="fixed bottom-5 right-5 z-40 flex flex-col items-end select-none pointer-events-none">
        {/* Slide-up panel */}
        {isExpanded && (
          <div
            className={`pointer-events-auto fixed left-1/2 bottom-20 z-40 -translate-x-1/2 w-[min(100vw-2rem,360px)] bg-white/95 dark:bg-[#151515]/95 backdrop-blur-xl border border-black/5 dark:border-white/10 rounded-[24px] shadow-[0_20px_50px_rgba(0,0,0,0.28)] flex flex-col max-h-[min(70vh,480px)] overflow-hidden ${
              isClosing ? 'bob-panel-out' : 'bob-panel-in'
            }`}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 pt-3.5 pb-2 shrink-0">
              <div className="flex items-center gap-2 min-w-0">
                <span
                  className="w-2 h-2 rounded-full animate-pulse shrink-0"
                  style={{ backgroundColor: currentRoutine.bubbleColor }}
                />
                <div className="min-w-0">
                  <p className="text-[13px] font-semibold text-neutral-900 dark:text-white m-0 truncate">
                    Bob <span className="font-normal text-neutral-500">· {currentRoutine.label}</span>
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-0.5">
                <button
                  type="button"
                  onClick={() => setIsInterestsModalOpen(true)}
                  className="p-1.5 rounded-full text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800"
                  title="Interests"
                >
                  <Heart className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setShowTimeScrubber((v) => !v)}
                  className="p-1.5 rounded-full text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800"
                  title="Routine clock"
                >
                  <Clock className="w-3.5 h-3.5" />
                </button>
                {/* Red close circle */}
                <button
                  type="button"
                  onClick={closePanel}
                  className="ml-1 w-7 h-7 rounded-full bg-[#ff3b30] hover:bg-[#e0342b] text-white grid place-items-center shadow-sm"
                  title="Close"
                  aria-label="Close"
                >
                  <X className="w-3.5 h-3.5" strokeWidth={2.5} />
                </button>
              </div>
            </div>

            {/* Tabs: Chat default · Research when selection */}
            <div className="px-4 pb-2 flex gap-1.5 shrink-0">
              {(['chat', 'research'] as PanelTab[]).map((tab) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setPanelTab(tab)}
                  className={`h-7 px-3 rounded-full text-[11px] font-semibold capitalize transition-colors ${
                    panelTab === tab
                      ? 'bg-neutral-900 text-white dark:bg-white dark:text-neutral-900'
                      : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-500'
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>

            {showTimeScrubber && (
              <div className="mx-4 mb-2 p-2.5 rounded-xl bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 text-[11px] space-y-1.5">
                <div className="flex justify-between font-semibold">
                  <span>Routine clock</span>
                  <span className="font-mono text-amber-600">{formatTime(minutesOfDay)}</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={1439}
                  value={minutesOfDay}
                  onChange={(e) => {
                    const val = parseInt(e.target.value, 10);
                    bobRoutines.setSimulatedTime(Math.floor(val / 60), val % 60);
                  }}
                  className="w-full accent-[#f5c842]"
                />
                <button
                  type="button"
                  onClick={() => bobRoutines.clearSimulatedTime()}
                  className="text-neutral-500 inline-flex items-center gap-1 font-medium"
                >
                  <RotateCcw className="w-3 h-3" /> Live clock
                </button>
              </div>
            )}

            {/* Selected text card (research) */}
            {panelTab === 'research' && selectedExcerpt && (
              <div className="mx-4 mb-2 px-3 py-2.5 rounded-xl bg-[#fff8df] border border-[#f5c842]/50 text-[12px] text-neutral-800 leading-snug">
                <p className="text-[10px] font-bold text-amber-700 uppercase tracking-wide m-0 mb-1">Selected</p>
                <p className="m-0 line-clamp-3">“{selectedExcerpt}”</p>
                <button
                  type="button"
                  onClick={() => setSelectedExcerpt('')}
                  className="mt-1 text-[10px] font-semibold text-neutral-500 hover:text-neutral-800"
                >
                  Clear
                </button>
              </div>
            )}

            {/* Messages */}
            <div ref={feedRef} className="flex-1 overflow-y-auto px-4 py-2 space-y-2.5 min-h-[120px]">
              {bubbleMessages.map((msg, i) => (
                <div key={i} className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                  <div
                    className={`max-w-[88%] px-3.5 py-2 rounded-[16px] text-[12.5px] leading-relaxed ${
                      msg.role === 'user'
                        ? 'bg-[#3797f0] text-white rounded-br-sm font-medium'
                        : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-800 dark:text-neutral-100 rounded-bl-sm'
                    }`}
                  >
                    {msg.text}
                  </div>
                  {msg.actionType === 'research_redirect' && (
                    <div className="flex gap-2 mt-1.5">
                      <button
                        type="button"
                        onClick={() => {
                          openChromeBridge();
                        }}
                        className="h-7 px-2.5 rounded-lg bg-[#f5c842] text-[#171717] text-[11px] font-bold inline-flex items-center gap-1"
                      >
                        <PanelRight className="w-3 h-3" /> Side panel
                      </button>
                      <button
                        type="button"
                        onClick={() => navigateTo('research')}
                        className="h-7 px-2.5 rounded-lg border border-neutral-200 dark:border-neutral-700 text-[11px] font-semibold inline-flex items-center gap-1"
                      >
                        <ArrowRight className="w-3 h-3" /> Research
                      </button>
                    </div>
                  )}
                </div>
              ))}
              {isThinking && (
                <div className="flex items-center gap-1.5 text-[11px] text-neutral-400 pl-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                  Bob is typing…
                </div>
              )}
            </div>

            {/* Composer */}
            <form
              onSubmit={handleSend}
              className="px-3 pb-3 pt-2 border-t border-neutral-100 dark:border-neutral-800 shrink-0 flex gap-2"
            >
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder={
                  panelTab === 'research' && selectedExcerpt
                    ? 'Ask about this selection…'
                    : 'Message Bob…'
                }
                className="flex-1 h-10 px-3.5 rounded-full bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 text-[13px] outline-none focus:border-[#f5c842]"
              />
              <button
                type="submit"
                disabled={isThinking || !chatInput.trim()}
                className="w-10 h-10 rounded-full bg-[#f5c842] hover:bg-[#e0ac15] text-[#171717] grid place-items-center disabled:opacity-40 shrink-0"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </div>
        )}

        {/* Medium floating bubble */}
        <button
          type="button"
          onClick={handleBubbleClick}
          className="pointer-events-auto relative w-[56px] h-[56px] rounded-full shadow-[0_8px_28px_rgba(0,0,0,0.28)] border-2 border-white/80 dark:border-white/20 overflow-hidden transition-transform hover:scale-105 active:scale-95 focus:outline-none"
          style={{
            background: `radial-gradient(circle at 30% 30%, #3a3a3a, #121212)`,
            boxShadow: `0 8px 28px rgba(0,0,0,0.28), 0 0 0 3px ${currentRoutine.glowColor}`,
          }}
          aria-label={isExpanded ? 'Close Bob' : 'Open Bob'}
        >
          {hasUnreadMessage && !isExpanded && (
            <span className="absolute -top-0.5 -right-0.5 z-10 w-3.5 h-3.5 rounded-full bg-[#f5c842] border-2 border-[#121212] animate-bounce" />
          )}

          {!videoFailed && media.video ? (
            <video
              key={media.video}
              src={media.video}
              autoPlay
              loop
              muted
              playsInline
              onError={() => setVideoFailed(true)}
              className="absolute inset-0 w-full h-full object-cover"
            />
          ) : !imageFailed && media.image ? (
            <img
              src={media.image}
              alt=""
              onError={() => setImageFailed(true)}
              className="absolute inset-0 w-full h-full object-cover"
            />
          ) : (
            <span className="relative z-10 text-[#f5c842] font-black text-lg">B</span>
          )}
        </button>
      </div>

      <UserInterestsModal isOpen={isInterestsModalOpen} onClose={() => setIsInterestsModalOpen(false)} />

      <style>{`
        @keyframes bobPanelIn {
          from { opacity: 0; translate: 0 18px; scale: 0.98; }
          to { opacity: 1; translate: 0 0; scale: 1; }
        }
        @keyframes bobPanelOut {
          from { opacity: 1; translate: 0 0; scale: 1; }
          to { opacity: 0; translate: 0 16px; scale: 0.98; }
        }
        .bob-panel-in { animation: bobPanelIn 0.22s ease-out both; }
        .bob-panel-out { animation: bobPanelOut 0.2s ease-in both; }
      `}</style>
    </>
  );
};
