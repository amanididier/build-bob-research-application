import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../../context/AppContext';
import { bobAi } from '../../lib/aiEngine';
import { Send, CheckCheck, Check, Sparkles } from 'lucide-react';
import bobOrb from '../../assets/images/bob_mascot_orb_1791540734514.jpg';

interface MessengerMsg {
  id: string;
  role: 'user' | 'bob';
  text: string;
  ts: number;
}

const STORE_KEY = 'bob_messenger_messages_v1';
const NUDGE_KEY = 'bob_messenger_last_nudge';
const IDLE_MS = 5 * 60 * 1000;
const NUDGE_COOLDOWN_MS = 30 * 60 * 1000;

function loadMessages(): MessengerMsg[] {
  try {
    const raw = typeof window !== 'undefined' ? localStorage.getItem(STORE_KEY) : null;
    if (raw) return JSON.parse(raw) as MessengerMsg[];
  } catch {}
  return [];
}

const formatTime = (ts: number) =>
  new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

const formatDay = (ts: number) => {
  const d = new Date(ts);
  const today = new Date();
  const yesterday = new Date(today.getTime() - 86400000);
  if (d.toDateString() === today.toDateString()) return 'Today';
  if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
  return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
};

export const ChatPage: React.FC = () => {
  const { userName, projects, activeResearchId } = useApp();
  const [messages, setMessages] = useState<MessengerMsg[]>(loadMessages);
  const [draft, setDraft] = useState('');
  const [isBobTyping, setIsBobTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const sendingRef = useRef(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORE_KEY, JSON.stringify(messages.slice(-200)));
    }
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, isBobTyping]);

  const pushBobMessage = (text: string) => {
    setMessages((prev) => [
      ...prev,
      { id: `m-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, role: 'bob', text, ts: Date.now() },
    ]);
  };

  // Bob is proactive: after a long idle stretch he checks in, at most once per cooldown.
  useEffect(() => {
    let idle = 0;
    const tick = window.setInterval(() => {
      idle += 15000;
      if (idle < IDLE_MS) return;
      idle = 0;
      const last = Number(localStorage.getItem(NUDGE_KEY) || 0);
      if (Date.now() - last < NUDGE_COOLDOWN_MS) return;
      localStorage.setItem(NUDGE_KEY, String(Date.now()));
      const proj = projects.find((p) => p.id === activeResearchId) || projects[0];
      pushBobMessage(
        proj
          ? `You've been quiet for a while, ${userName || 'friend'}. Want me to recap where we left off on “${proj.title}”, or shall we pick a next step together?`
          : `Still here, ${userName || 'friend'}! Tell me what you're curious about today and I'll start pulling sources together.`
      );
    }, 15000);
    const reset = () => {
      idle = 0;
    };
    window.addEventListener('mousemove', reset);
    window.addEventListener('keydown', reset);
    window.addEventListener('click', reset);
    return () => {
      window.clearInterval(tick);
      window.removeEventListener('mousemove', reset);
      window.removeEventListener('keydown', reset);
      window.removeEventListener('click', reset);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projects, activeResearchId, userName]);

  const handleSend = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const text = draft.trim();
    if (!text || sendingRef.current) return;
    sendingRef.current = true;
    setDraft('');
    setMessages((prev) => [
      ...prev,
      { id: `m-${Date.now()}`, role: 'user', text, ts: Date.now() },
    ]);
    setIsBobTyping(true);
    try {
      const res = await bobAi.generateResearchAnswer(
        text,
        activeResearchId || 'urugendo',
        undefined,
        bobAi.getTastePreference()
      );
      pushBobMessage(res.answer);
    } catch {
      pushBobMessage("I couldn't reach my reasoning engine just now. Try again in a moment?");
    } finally {
      setIsBobTyping(false);
      sendingRef.current = false;
    }
  };

  const lastBobIndex = messages.reduce((acc, m, i) => (m.role === 'bob' ? i : acc), -1);

  return (
    <div className="h-full flex flex-col max-w-[860px] mx-auto w-full animate-in fade-in duration-300">
      {/* Messenger header */}
      <div className="flex items-center gap-3 px-5 py-3 border-b border-[var(--line)] bg-[var(--s)]/70 backdrop-blur-md">
        <div className="relative">
          <img src={bobOrb} alt="Bob" className="w-10 h-10 rounded-full object-cover border border-[var(--line)]" />
          <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-500 border-2 border-[var(--s)]" />
        </div>
        <div className="min-w-0">
          <b className="block text-[14px] text-[var(--t)] leading-tight">Bob</b>
          <small className="block text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
            {isBobTyping ? 'typing…' : 'online · your research companion'}
          </small>
        </div>
        <span className="ml-auto text-[11px] text-[var(--m)] flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-[var(--y)]" />
          Saved on this device
        </span>
      </div>

      {/* Message thread */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto px-4 sm:px-6 py-5 space-y-2.5 bg-[var(--bg)] [background-image:radial-gradient(circle_at_1px_1px,var(--line)_1px,transparent_0)] [background-size:22px_22px]"
      >
        {messages.length === 0 && (
          <div className="text-center mt-16 animate-in fade-in zoom-in-95 duration-500">
            <img src={bobOrb} alt="" className="w-16 h-16 rounded-full mx-auto mb-3 opacity-90 border border-[var(--line)]" />
            <p className="text-[13px] text-[var(--m)] m-0">
              Hey {userName || 'friend'} — this is your private thread with Bob.
              <br />
              Messages stay on this device.
            </p>
          </div>
        )}

        {messages.map((m, i) => {
          const showDay = i === 0 || formatDay(messages[i - 1].ts) !== formatDay(m.ts);
          const isRead = m.role === 'user' && lastBobIndex > i;
          return (
            <React.Fragment key={m.id}>
              {showDay && (
                <div className="flex justify-center my-3">
                  <span className="px-3 py-1 rounded-full bg-[var(--s2)] border border-[var(--line)] text-[10.5px] font-semibold text-[var(--m)]">
                    {formatDay(m.ts)}
                  </span>
                </div>
              )}
              <div className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`max-w-[78%] sm:max-w-[68%] px-3.5 py-2.5 rounded-2xl shadow-sm animate-in zoom-in-95 fade-in duration-200 ${
                    m.role === 'user'
                      ? 'bg-[var(--y)] text-[#171717] rounded-br-md'
                      : 'bg-[var(--s)] border border-[var(--line)] text-[var(--t)] rounded-bl-md'
                  }`}
                >
                  <p className="text-[13px] leading-relaxed m-0 whitespace-pre-wrap">{m.text}</p>
                  <span
                    className={`flex items-center justify-end gap-1 mt-1 text-[10px] ${
                      m.role === 'user' ? 'text-[#171717]/60' : 'text-[var(--m)]'
                    }`}
                  >
                    {formatTime(m.ts)}
                    {m.role === 'user' &&
                      (isRead ? <CheckCheck className="w-3.5 h-3.5 text-sky-600" /> : <Check className="w-3.5 h-3.5" />)}
                  </span>
                </div>
              </div>
            </React.Fragment>
          );
        })}

        {isBobTyping && (
          <div className="flex justify-start animate-in fade-in duration-200">
            <div className="px-4 py-3 rounded-2xl rounded-bl-md bg-[var(--s)] border border-[var(--line)] flex items-center gap-1.5">
              {[0, 150, 300].map((d) => (
                <span
                  key={d}
                  className="w-2 h-2 rounded-full bg-[var(--m)] animate-bounce"
                  style={{ animationDelay: `${d}ms` }}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Composer */}
      <form
        onSubmit={handleSend}
        className="px-4 sm:px-6 py-3 border-t border-[var(--line)] bg-[var(--s)]/80 backdrop-blur-md flex items-center gap-2"
      >
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Message Bob…"
          className="flex-1 h-11 px-4 rounded-full bg-[var(--s2)] border border-[var(--line)] text-[13px] text-[var(--t)] placeholder:text-[var(--m)] outline-none focus:border-[var(--y)] focus:ring-2 focus:ring-[var(--y)]/25 transition-all"
        />
        <button
          type="submit"
          disabled={!draft.trim() || isBobTyping}
          title="Send message"
          className="w-11 h-11 rounded-full bg-[var(--y)] hover:bg-[#ebd200] text-[#171717] grid place-items-center transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer shrink-0"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
};
