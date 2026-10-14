import React, { useState, useEffect } from 'react';
import { 
  Sparkles, 
  MessageSquare, 
  PanelRight, 
  Clock, 
  Volume2, 
  X, 
  Send, 
  ArrowRight, 
  Heart, 
  Coffee, 
  Moon, 
  Sun, 
  BookOpen, 
  Utensils, 
  Headphones,
  RotateCcw
} from 'lucide-react';
import { bobRoutines, RoutineDetail } from '../../lib/companion/bobRoutines';
import { useApp } from '../../context/AppContext';
import { UserInterestsModal } from './UserInterestsModal';

export const BobOverlayBubble: React.FC = () => {
  const { 
    currentPage, 
    navigateTo, 
    userName,
    openChromeBridge
  } = useApp();

  // Routine state
  const [currentRoutine, setCurrentRoutine] = useState<RoutineDetail>(() => bobRoutines.getCurrentRoutine());
  const [minutesOfDay, setMinutesOfDay] = useState<number>(() => bobRoutines.getCurrentMinutesOfDay());
  const [showTimeScrubber, setShowTimeScrubber] = useState<boolean>(false);
  const [isInterestsModalOpen, setIsInterestsModalOpen] = useState<boolean>(false);

  // Bubble open/close state
  const [isExpanded, setIsExpanded] = useState<boolean>(false);
  const [hasUnreadMessage, setHasUnreadMessage] = useState<boolean>(false);

  // Mini chat messages in bubble (chat only)
  const [chatInput, setChatInput] = useState<string>('');
  const [bubbleMessages, setBubbleMessages] = useState<Array<{ role: 'assistant' | 'user'; text: string; actionType?: 'research_redirect' }>>([
    {
      role: 'assistant',
      text: `Hey ${userName || 'buddy'}! I'm here beside you while you browse. We can chat casually about anything!`,
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

  // Proactive check-in: sends a friendly casual chat message with yellow circle indicator
  useEffect(() => {
    const initialTimer = setTimeout(() => {
      const pingText = `Hey ${userName || 'buddy'}! Found anything interesting while browsing? Let me know if you want to chat.`;
      setBubbleMessages((prev) => [
        ...prev,
        { role: 'assistant', text: pingText }
      ]);
      setHasUnreadMessage(true);
    }, 14000);

    return () => clearTimeout(initialTimer);
  }, [userName]);

  // If user is not inside chrome view, Bob overlay does not render (new messages show in Desktop Chat page)
  if (currentPage !== 'chrome') {
    return null;
  }

  const handleBubbleClick = () => {
    setIsExpanded((prev) => {
      const next = !prev;
      if (next) {
        setHasUnreadMessage(false);
      }
      return next;
    });
  };

  const handleSendBubbleChat = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!chatInput.trim()) return;

    const query = chatInput.trim();
    setChatInput('');
    setBubbleMessages((prev) => [...prev, { role: 'user', text: query }]);

    setTimeout(() => {
      const lower = query.toLowerCase();
      // If user asks about research/projects/roadmap/tasks, suggest Chrome side panel or Desktop
      if (
        lower.includes('research') ||
        lower.includes('project') ||
        lower.includes('task') ||
        lower.includes('roadmap') ||
        lower.includes('source') ||
        lower.includes('study')
      ) {
        setBubbleMessages((prev) => [
          ...prev,
          {
            role: 'assistant',
            text: `For research, roadmaps, and project tasks, I recommend using the Chrome Side Panel or opening the Desktop view where we have full deep-dive tools!`,
            actionType: 'research_redirect'
          },
        ]);
        if (!isExpanded) setHasUnreadMessage(true);
        return;
      }

      // Casual conversational replies
      let reply = '';
      if (lower.includes('sport') || lower.includes('team') || lower.includes('football') || lower.includes('arsenal')) {
        reply = `Arsenal looked sharp in their recent European fixture! High press structure was crisp. Taking a quick break to check match scores?`;
      } else if (lower.includes('news') || lower.includes('tech') || lower.includes('ai')) {
        reply = `Tech moves fast today! There's some exciting work in lightweight on-device models. How's your browsing going so far?`;
      } else if (lower.includes('how are you') || lower.includes('what are you doing')) {
        reply = `I'm just chilling right here beside you while you browse! Ready for a quick chat whenever you need a breather.`;
      } else {
        reply = `I hear you! It's always nice to pause and share a quick thought. What's on your mind?`;
      }

      setBubbleMessages((prev) => [...prev, { role: 'assistant', text: reply }]);
      if (!isExpanded) {
        setHasUnreadMessage(true);
      }
    }, 450);
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
      {/* Floating Container in bottom-right (Chrome overlay only) */}
      <div className="fixed bottom-6 right-6 z-40 flex flex-col items-end select-none pointer-events-auto">
        {/* Expanded chat opens directly from the Bob bubble; no hover quick-pill. */}
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
                    Casual chat & browsing buddy
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

            {/* Time Scrubber (Dev tool / testing feature) */}
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

            {/* Message Feed */}
            <div className="flex-1 overflow-y-auto space-y-2.5 py-3 pr-1 text-xs">
              {bubbleMessages.map((msg, i) => (
                <div
                  key={i}
                  className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}
                >
                  <div
                    className={`max-w-[85%] px-3.5 py-2.5 rounded-2xl leading-relaxed ${
                      msg.role === 'user'
                        ? 'bg-[var(--y)] text-[#171717] font-medium'
                        : 'bg-[var(--s2)] text-[var(--t)] border border-[var(--line)]'
                    }`}
                  >
                    <p className="m-0 text-xs">
                      {msg.text}
                    </p>
                  </div>
                  {/* Research redirect suggestion buttons if user asked about research */}
                  {msg.actionType === 'research_redirect' && (
                    <div className="flex items-center gap-2 mt-2 ml-1">
                      <button
                        type="button"
                        onClick={() => {
                          navigateTo('chrome');
                          openChromeBridge();
                        }}
                        className="px-2.5 py-1 rounded-lg bg-[var(--y)] text-[#171717] font-bold text-[11px] shadow-sm flex items-center gap-1 hover:bg-[#e0ac15]"
                      >
                        <PanelRight className="w-3 h-3" />
                        <span>Chrome Side Panel</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          navigateTo('research');
                        }}
                        className="px-2.5 py-1 rounded-lg bg-[var(--s)] border border-[var(--line)] text-[var(--t)] font-semibold text-[11px] flex items-center gap-1 hover:bg-[var(--s2)]"
                      >
                        <ArrowRight className="w-3 h-3" />
                        <span>Desktop Workspace</span>
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Input Bar */}
            <form onSubmit={handleSendBubbleChat} className="flex gap-2 pt-2 border-t border-[var(--line)] shrink-0">
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder="Chat casually with Bob..."
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

        {/* 3. The Central Overlay Bubble Circle */}
        <div className="relative group cursor-pointer" onClick={handleBubbleClick}>
          {/* Subtle glow ring */}
          <div className="absolute -inset-1 rounded-full ring-2 ring-white/60 ring-offset-1 ring-offset-black/30 pointer-events-none transition-all group-hover:ring-white/90" />

          {/* New message small yellow circle indicator */}
          {hasUnreadMessage && !isExpanded && (
            <span 
              title="New message from Bob"
              className="absolute -top-1 -right-1 z-30 w-4 h-4 rounded-full bg-amber-400 border-2 border-[#121212] shadow-lg flex items-center justify-center animate-bounce"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-amber-950" />
            </span>
          )}

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
              style={{ backgroundColor: currentRoutine.bubbleColor }}
            />
          </div>
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
