import React, { useState, useEffect, useRef } from 'react';
import { 
  Sparkles, 
  MessageSquare, 
  Search, 
  PanelRight, 
  Clock, 
  Volume2, 
  VolumeX, 
  X, 
  Send, 
  ArrowRight, 
  Heart, 
  Coffee, 
  Moon, 
  Sun, 
  BookOpen, 
  Utensils, 
  Music, 
  Headphones,
  Sliders,
  RotateCcw
} from 'lucide-react';
import { bobRoutines, BobRoutineId, RoutineDetail, ROUTINE_DEFINITIONS } from '../../lib/companion/bobRoutines';
import { BobAudioHelper } from '../../lib/companion/bobAudio';
import { useApp } from '../../context/AppContext';
import { UserInterestsModal } from './UserInterestsModal';

export const BobOverlayBubble: React.FC = () => {
  const { 
    currentPage, 
    navigateTo, 
    activeResearchId, 
    projects, 
    userName,
    openChromeBridge,
    triggerThinking
  } = useApp();

  const activeProject = projects.find((p) => p.id === activeResearchId) || projects[0];

  // Routine state
  const [currentRoutine, setCurrentRoutine] = useState<RoutineDetail>(() => bobRoutines.getCurrentRoutine());
  const [minutesOfDay, setMinutesOfDay] = useState<number>(() => bobRoutines.getCurrentMinutesOfDay());
  const [showTimeScrubber, setShowTimeScrubber] = useState<boolean>(false);
  const [isInterestsModalOpen, setIsInterestsModalOpen] = useState<boolean>(false);

  // Proactive speech ring state
  const [isProactiveSpeaking, setIsProactiveSpeaking] = useState<boolean>(false);
  const [proactiveCountdown, setProactiveCountdown] = useState<number>(45);
  const [proactiveMessage, setProactiveMessage] = useState<string>('');
  const proactiveTimerRef = useRef<any>(null);

  // Bubble modes: 'idle' | 'chat' | 'research'
  const [bubbleMode, setBubbleMode] = useState<'idle' | 'chat' | 'research'>('idle');
  const [isHovered, setIsHovered] = useState<boolean>(false);
  const [isExpanded, setIsExpanded] = useState<boolean>(false);

  // Pacing tracker: 3 messages -> reminder; 10 messages -> reminder
  const [chatTurnCount, setChatTurnCount] = useState<number>(0);
  const [showFocusReminder, setShowFocusReminder] = useState<boolean>(false);

  // Mini chat messages in bubble
  const [chatInput, setChatInput] = useState<string>('');
  const [bubbleMessages, setBubbleMessages] = useState<Array<{ role: 'assistant' | 'user'; text: string }>>([
    {
      role: 'assistant',
      text: `Hey ${userName || 'buddy'}! I'm here beside you. You can speak or chat with me about anything.`,
    },
  ]);

  // Subscribe to routine manager
  useEffect(() => {
    const unsub = bobRoutines.subscribe((r, m) => {
      setCurrentRoutine(r);
      setMinutesOfDay(m);
    });
    return unsub;
  }, []);

  // Proactive trigger loop (Simulate 5m social drift & 15m focus lock-in)
  useEffect(() => {
    // Proactive chime test trigger after 12s on initial mount
    const initialTimer = setTimeout(() => {
      triggerProactiveProposal(
        `Hey ${userName || 'buddy'}! Seems like you've locked in today. What's that worth your full attention?`
      );
    }, 12000);

    return () => clearTimeout(initialTimer);
  }, []);

  // Proactive countdown handler
  useEffect(() => {
    if (isProactiveSpeaking) {
      proactiveTimerRef.current = setInterval(() => {
        setProactiveCountdown((prev) => {
          if (prev <= 1) {
            // Revert arc to white after 45 seconds if user didn't click
            clearInterval(proactiveTimerRef.current);
            setIsProactiveSpeaking(false);
            return 45;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (proactiveTimerRef.current) clearInterval(proactiveTimerRef.current);
      setProactiveCountdown(45);
    }

    return () => {
      if (proactiveTimerRef.current) clearInterval(proactiveTimerRef.current);
    };
  }, [isProactiveSpeaking]);

  const triggerProactiveProposal = (text: string) => {
    setProactiveMessage(text);
    setIsProactiveSpeaking(true);
    setProactiveCountdown(45);
    BobAudioHelper.playProactiveChime();
  };

  const handleBubbleClick = () => {
    if (isProactiveSpeaking) {
      // User clicked on proactive green ring!
      setIsProactiveSpeaking(false);
      setIsExpanded(true);
      setBubbleMode('chat');
      setBubbleMessages((prev) => [
        ...prev,
        { role: 'assistant', text: proactiveMessage || currentRoutine.thoughtSnippet },
      ]);
      BobAudioHelper.speakText(proactiveMessage || currentRoutine.thoughtSnippet);
    } else {
      setIsExpanded((prev) => !prev);
    }
  };

  const handleSendBubbleChat = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!chatInput.trim()) return;

    const query = chatInput.trim();
    setChatInput('');
    const newCount = chatTurnCount + 1;
    setChatTurnCount(newCount);

    setBubbleMessages((prev) => [...prev, { role: 'user', text: query }]);

    // Check Pacing rules:
    // 3 messages: prompt redirect back to focus/research
    // 10 messages: reminder again
    if (newCount === 3 || newCount === 10) {
      setTimeout(() => {
        setShowFocusReminder(true);
        setBubbleMessages((prev) => [
          ...prev,
          {
            role: 'assistant',
            text:
              newCount === 3
                ? `We've shared 3 quick chats! Want to jump back into "${activeProject.title}" or keep chatting freely?`
                : `We've exchanged 10 chats now. Ready to tackle our next research task or stay in chat mode?`,
          },
        ]);
      }, 600);
      return;
    }

    // Assistant response
    setTimeout(() => {
      let reply = '';
      if (bubbleMode === 'research') {
        reply = `Looking at "${activeProject.title}": We have ${activeProject.openTasks || 2} open tasks connected to ${activeProject.sourceCount || 6} sources. Would you like me to outline step 1?`;
      } else {
        // Casual buddy chat
        const lower = query.toLowerCase();
        if (lower.includes('sport') || lower.includes('team') || lower.includes('football') || lower.includes('arsenal')) {
          reply = `Arsenal looked sharp in their recent European fixture! High press structure was crisp. Do you want today's tactical stats?`;
        } else if (lower.includes('news') || lower.includes('tech') || lower.includes('ai')) {
          reply = `In AI research today, sparse KV-cache compression and low-latency audio pipelines are making waves. Exactly what we're tuning!`;
        } else {
          reply = `That sounds great. I'm right here with you while you work. Let me know whenever you need a quick fact-check.`;
        }
      }

      setBubbleMessages((prev) => [...prev, { role: 'assistant', text: reply }]);
      BobAudioHelper.speakText(reply);
    }, 500);
  };

  // Convert minutes to HH:MM format
  const formatTime = (totalMinutes: number) => {
    const h = Math.floor(totalMinutes / 60) % 24;
    const m = totalMinutes % 60;
    const hh = h < 10 ? `0${h}` : `${h}`;
    const mm = m < 10 ? `0${m}` : `${m}`;
    return `${hh}:${mm}`;
  };

  return (
    <>
      {/* Floating Container in bottom-right */}
      <div 
        className="fixed bottom-6 right-6 z-40 flex flex-col items-end select-none pointer-events-auto"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {/* 1. Hover Quick-Pill (Chat | Research | Side Panel) */}
        {(isHovered || isExpanded) && !isProactiveSpeaking && (
          <div className="mb-3 px-1.5 py-1 rounded-full bg-[var(--s)]/90 backdrop-blur-md border border-[var(--line)] shadow-xl flex items-center gap-1 animate-in fade-in slide-in-from-bottom-2 duration-150">
            <button
              type="button"
              onClick={() => {
                setBubbleMode('chat');
                setIsExpanded(true);
              }}
              className={`px-3 py-1 rounded-full text-xs font-bold transition-all flex items-center gap-1.5 ${
                bubbleMode === 'chat' && isExpanded
                  ? 'bg-[var(--y)] text-[#171717] shadow-sm'
                  : 'text-[var(--t)] hover:bg-[var(--s2)]'
              }`}
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span>Chat</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setBubbleMode('research');
                setIsExpanded(true);
              }}
              className={`px-3 py-1 rounded-full text-xs font-bold transition-all flex items-center gap-1.5 ${
                bubbleMode === 'research' && isExpanded
                  ? 'bg-[var(--y)] text-[#171717] shadow-sm'
                  : 'text-[var(--t)] hover:bg-[var(--s2)]'
              }`}
            >
              <Search className="w-3.5 h-3.5" />
              <span>Research</span>
            </button>

            <button
              type="button"
              onClick={() => {
                navigateTo('chrome');
                openChromeBridge();
              }}
              title="Open Chrome Side Panel"
              className="p-1.5 rounded-full text-[var(--m)] hover:text-[var(--t)] hover:bg-[var(--s2)] transition-colors"
            >
              <PanelRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* 2. Expanded Chat / Interaction Drawer */}
        {isExpanded && (
          <div className="mb-3 w-80 sm:w-96 bg-[var(--s)]/95 backdrop-blur-xl border border-[var(--line)] rounded-[26px] shadow-2xl p-4 flex flex-col max-h-[460px] animate-in fade-in zoom-in-95 duration-150 overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-[var(--line)] shrink-0">
              <div className="flex items-center gap-2">
                <span
                  className="w-2.5 h-2.5 rounded-full animate-pulse"
                  style={{ backgroundColor: currentRoutine.bubbleColor }}
                />
                <div>
                  <div className="text-xs font-extrabold text-[var(--t)] flex items-center gap-1.5">
                    <span>Bob</span>
                    <span className="text-[10px] text-[var(--m)] font-normal">· {currentRoutine.label}</span>
                  </div>
                  <div className="text-[10px] text-[var(--m)] truncate max-w-[190px]">
                    {bubbleMode === 'research' ? `Project: ${activeProject.title}` : 'Friendly companion mode'}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setIsInterestsModalOpen(true)}
                  title="Configure Passions & Sports"
                  className="p-1 rounded-lg text-[var(--m)] hover:text-[var(--y)] hover:bg-[var(--s2)] transition-colors"
                >
                  <Heart className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setShowTimeScrubber((prev) => !prev)}
                  title="Toggle 24-Hour Routine Scrubber"
                  className="p-1 rounded-lg text-[var(--m)] hover:text-[var(--t)] hover:bg-[var(--s2)] transition-colors"
                >
                  <Clock className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setIsExpanded(false)}
                  className="p-1 rounded-lg text-[var(--m)] hover:text-[var(--t)] hover:bg-[var(--s2)] transition-colors"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Time Scrubber (Dev tool / testing feature as requested) */}
            {showTimeScrubber && (
              <div className="p-2.5 my-2 bg-[var(--s2)] border border-[var(--line)] rounded-xl text-xs space-y-1.5 animate-in fade-in">
                <div className="flex items-center justify-between font-bold text-[11px] text-[var(--t)]">
                  <span>24-Hour Routine Scrubber</span>
                  <span className="font-mono text-[var(--y)]">{formatTime(minutesOfDay)}</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="1439"
                  value={minutesOfDay}
                  onChange={(e) => {
                    const val = parseInt(e.target.value, 10);
                    bobRoutines.setSimulatedTime(Math.floor(val / 60), val % 60);
                  }}
                  className="w-full accent-[var(--y)] cursor-pointer"
                />
                <div className="flex items-center justify-between text-[10px] text-[var(--m)]">
                  <span>07:00 Breakfast</span>
                  <span>12:00 Lunch</span>
                  <span>20:00 Supper</span>
                  <span>22:00 Sleep</span>
                </div>
                <div className="flex justify-end pt-1">
                  <button
                    type="button"
                    onClick={() => bobRoutines.clearSimulatedTime()}
                    className="text-[10px] text-[var(--m)] hover:text-[var(--t)] flex items-center gap-1 font-semibold"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>Reset to Live Clock</span>
                  </button>
                </div>
              </div>
            )}

            {/* Pacing Focus Reminder Card (3-message and 10-message rule) */}
            {showFocusReminder && (
              <div className="p-3 my-2 rounded-xl bg-[var(--y)]/10 border border-[var(--y)]/40 text-xs text-[var(--t)] space-y-2 animate-in fade-in">
                <div className="font-bold flex items-center gap-1.5 text-[var(--y)]">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Focus Check-In</span>
                </div>
                <p className="text-[11px] text-[var(--m)] leading-relaxed">
                  Would you like to return to your research roadmap, or continue chatting?
                </p>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setShowFocusReminder(false);
                      setBubbleMode('research');
                      navigateTo('research', 'tasks');
                    }}
                    className="px-3 py-1 rounded-lg bg-[var(--y)] text-[#171717] font-bold text-[11px] shadow-sm hover:bg-[#e0ac15]"
                  >
                    Back to Research
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowFocusReminder(false)}
                    className="px-3 py-1 rounded-lg bg-[var(--s)] border border-[var(--line)] text-[var(--t)] text-[11px] font-semibold"
                  >
                    Keep Chatting
                  </button>
                </div>
              </div>
            )}

            {/* Message Feed */}
            <div className="flex-1 overflow-y-auto space-y-2.5 py-3 pr-1 text-xs">
              {bubbleMessages.map((msg, i) => (
                <div
                  key={i}
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[85%] px-3.5 py-2.5 rounded-2xl leading-relaxed ${
                      msg.role === 'user'
                        ? 'bg-[var(--y)] text-[#171717] font-medium'
                        : 'bg-[var(--s2)] text-[var(--t)] border border-[var(--line)]'
                    }`}
                  >
                    {msg.text}
                  </div>
                </div>
              ))}
            </div>

            {/* Input Bar */}
            <form onSubmit={handleSendBubbleChat} className="flex gap-2 pt-2 border-t border-[var(--line)] shrink-0">
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder={bubbleMode === 'research' ? `Ask about ${activeProject.title}...` : "Speak or chat with Bob..."}
                className="flex-1 px-3.5 py-2 rounded-xl bg-[var(--s2)] border border-[var(--line)] text-xs text-[var(--t)] placeholder:text-[var(--m)] focus:outline-none focus:border-[var(--y)]"
              />
              <button
                type="submit"
                className="p-2 rounded-xl bg-[var(--y)] hover:bg-[#e0ac15] text-[#171717] font-bold transition-transform active:scale-95"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </form>
          </div>
        )}

        {/* 3. The Central Overlay Bubble Circle & Ring */}
        <div className="relative group cursor-pointer" onClick={handleBubbleClick}>
          {/* Proactive Emerald Pulsing Arc (45s Timer) OR Idle White Arc */}
          <div
            className={`absolute -inset-1.5 rounded-full transition-all duration-500 pointer-events-none ${
              isProactiveSpeaking
                ? 'ring-4 ring-emerald-500 ring-offset-2 ring-offset-black/50 animate-pulse'
                : 'ring-2 ring-white/80 ring-offset-1 ring-offset-black/30'
            }`}
          />

          {/* Bob Avatar Circle */}
          <div
            className="relative w-14 h-14 sm:w-16 sm:h-16 rounded-full shadow-2xl flex items-center justify-center overflow-hidden transition-transform duration-200 group-hover:scale-105 active:scale-95 border-2 border-white/20"
            style={{
              background: `radial-gradient(circle at 35% 35%, #2a2a2a, #121212)`,
            }}
          >
            {/* Visual Routine Animation Graphics */}
            <div className="relative flex flex-col items-center justify-center text-center">
              {currentRoutine.id === 'waking_up' && (
                <Sun className="w-6 h-6 text-amber-400 animate-spin duration-3000" />
              )}
              {currentRoutine.id === 'eating' && (
                <Utensils className="w-6 h-6 text-emerald-400 animate-pulse" />
              )}
              {currentRoutine.id === 'meditating' && (
                <Sparkles className="w-6 h-6 text-purple-400 animate-pulse" />
              )}
              {currentRoutine.id === 'reading' && (
                <BookOpen className="w-6 h-6 text-blue-400" />
              )}
              {currentRoutine.id === 'cooking' && (
                <Coffee className="w-6 h-6 text-orange-400 animate-bounce" />
              )}
              {currentRoutine.id === 'listening_music' && (
                <Headphones className="w-6 h-6 text-pink-400 animate-pulse" />
              )}
              {currentRoutine.id === 'sleeping' && (
                <Moon className="w-6 h-6 text-indigo-400" />
              )}
              {currentRoutine.id === 'thinking' && (
                <div className="w-5 h-5 rounded-full border-2 border-yellow-400 border-t-transparent animate-spin" />
              )}
              {currentRoutine.id === 'listening' && (
                <div className="flex items-center gap-0.5">
                  <div className="w-1 h-3 bg-cyan-400 animate-pulse" />
                  <div className="w-1 h-5 bg-cyan-400 animate-pulse delay-75" />
                  <div className="w-1 h-3 bg-cyan-400 animate-pulse delay-150" />
                </div>
              )}
              {currentRoutine.id === 'speaking' && (
                <Volume2 className="w-6 h-6 text-green-400 animate-pulse" />
              )}
            </div>

            {/* Micro status badge on the bottom-right */}
            <span
              className="absolute bottom-1 right-1 w-3 h-3 rounded-full border-2 border-black"
              style={{ backgroundColor: isProactiveSpeaking ? '#22c55e' : currentRoutine.bubbleColor }}
            />
          </div>

          {/* Proactive Speech Floating Banner (when arc is green) */}
          {isProactiveSpeaking && !isExpanded && (
            <div className="absolute right-20 top-1/2 -translate-y-1/2 w-64 bg-[var(--s)]/95 backdrop-blur-md border-2 border-emerald-500 rounded-2xl p-3 shadow-2xl text-xs space-y-1.5 animate-in fade-in slide-in-from-right-4 duration-200">
              <div className="flex items-center justify-between text-[10px] font-extrabold uppercase text-emerald-500">
                <span className="flex items-center gap-1">
                  <Sparkles className="w-3 h-3" />
                  <span>Bob wants to speak</span>
                </span>
                <span className="font-mono">{proactiveCountdown}s</span>
              </div>
              <p className="text-xs text-[var(--t)] font-semibold leading-relaxed line-clamp-2">
                {proactiveMessage}
              </p>
              <div className="text-[10px] text-[var(--m)] pt-0.5">
                Click bubble to listen & reply · Saved to memory in {proactiveCountdown}s
              </div>
            </div>
          )}
        </div>
      </div>

      {/* User Interests Modal for sports, teams & news */}
      <UserInterestsModal
        isOpen={isInterestsModalOpen}
        onClose={() => setIsInterestsModalOpen(false)}
        onSave={(interests) => {
          setBubbleMessages((prev) => [
            ...prev,
            {
              role: 'assistant',
              text: `Got it! I saved your interests (${interests.slice(0, 3).join(', ')}). I'll keep you posted with relevant news and friendly banter!`,
            },
          ]);
        }}
      />
    </>
  );
};
