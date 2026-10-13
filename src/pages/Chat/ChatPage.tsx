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

const ROADMAP_INTENT = /\b(roadmap|help me plan|plan this project|turn this into a plan|make a plan|create a plan|break this down into steps)\b/i;

export const ChatPage: React.FC = () => {
  const { userName, activeResearchId } = useApp();
  const [messages, setMessages] = useState<MessengerMsg[]>(loadMessages);
  const [draft, setDraft] = useState('');
  const [isBobTyping, setIsBobTyping] = useState(false);
  const [showRoadmapSuggestion, setShowRoadmapSuggestion] = useState(false);
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

  const handleSend = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const text = draft.trim();
    if (!text || sendingRef.current) return;
    sendingRef.current = true;
    setDraft('');
    setShowRoadmapSuggestion(ROADMAP_INTENT.test(text));
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

  const openRoadmap = () => {
    const lastUserMessage = [...messages].reverse().find((m) => m.role === 'user')?.text || '';
    window.dispatchEvent(new CustomEvent('bob-open-roadmap', { detail: { title: lastUserMessage } }));
    setShowRoadmapSuggestion(false);
  };

  const lastBobIndex = messages.reduce((acc, m, i) => (m.role === 'bob' ? i : acc), -1);

  return (
    <div className="mx-auto flex h-full w-full max-w-[860px] flex-col animate-in fade-in duration-300">
      <header className="flex items-center gap-3 border-b border-[var(--line)] bg-[var(--s)]/70 px-5 py-3 backdrop-blur-md">
        <div className="relative">
          <img src={bobOrb} alt="Bob" className="h-10 w-10 rounded-full border border-[var(--line)] object-cover" />
          <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-[var(--s)] bg-emerald-500" />
        </div>
        <div className="min-w-0">
          <b className="block text-[14px] leading-tight text-[var(--t)]">Bob</b>
          <small className="block text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
            {isBobTyping ? 'thinking…' : 'Here with you'}
          </small>
        </div>
        <span className="ml-auto flex items-center gap-1.5 text-[11px] text-[var(--m)]">
          <Sparkles className="h-3.5 w-3.5 text-[var(--y)]" />
          Saved on this device
        </span>
      </header>

      <div
        ref={scrollRef}
        className="flex-1 space-y-2.5 overflow-y-auto bg-[var(--bg)] px-4 py-5 [background-image:radial-gradient(circle_at_1px_1px,var(--line)_1px,transparent_0)] [background-size:22px_22px] sm:px-6"
      >
        {messages.length === 0 && (
          <div className="mt-16 animate-in fade-in zoom-in-95 text-center duration-500">
            <img src={bobOrb} alt="" className="mx-auto mb-3 h-16 w-16 rounded-full border border-[var(--line)] opacity-90" />
            <p className="m-0 text-[13px] leading-relaxed text-[var(--m)]">
              Hey {userName || 'friend'} — how are you doing?
              <br />
              We can talk about anything, or pick up something you’ve been working on.
            </p>
            <button
              type="button"
              onClick={() => window.dispatchEvent(new CustomEvent('bob-open-roadmap', { detail: { title: '' } }))}
              className="mx-auto mt-4 inline-flex items-center gap-2 rounded-full border border-[var(--line)] bg-[var(--s)] px-3.5 py-2 text-[12px] font-semibold text-[var(--t)] transition-colors hover:border-[var(--y)]"
            >
              <Sparkles className="h-3.5 w-3.5 text-[var(--y)]" />
              Create roadmap
            </button>
          </div>
        )}

        {messages.map((m, i) => {
          const showDay = i === 0 || formatDay(messages[i - 1].ts) !== formatDay(m.ts);
          const isRead = m.role === 'user' && lastBobIndex > i;
          return (
            <React.Fragment key={m.id}>
              {showDay && (
                <div className="my-3 flex justify-center">
                  <span className="rounded-full border border-[var(--line)] bg-[var(--s2)] px-3 py-1 text-[10.5px] font-semibold text-[var(--m)]">
                    {formatDay(m.ts)}
                  </span>
                </div>
              )}
              <div className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[82%] rounded-2xl px-3.5 py-2.5 shadow-sm animate-in zoom-in-95 fade-in duration-200 sm:max-w-[72%] ${
                  m.role === 'user'
                    ? 'rounded-br-md bg-[var(--y)] text-[#171717]'
                    : 'rounded-bl-md border border-[var(--line)] bg-[var(--s)] text-[var(--t)]'
                }`}>
                  <p className="m-0 whitespace-pre-wrap text-[13px] leading-relaxed">{m.text}</p>
                  <span className={`mt-1 flex items-center justify-end gap-1 text-[10px] ${m.role === 'user' ? 'text-[#171717]/60' : 'text-[var(--m)]'}`}>
                    {formatTime(m.ts)}
                    {m.role === 'user' && (isRead ? <CheckCheck className="h-3.5 w-3.5 text-sky-600" /> : <Check className="h-3.5 w-3.5" />)}
                  </span>
                </div>
              </div>
            </React.Fragment>
          );
        })}

        {showRoadmapSuggestion && (
          <div className="ml-1 max-w-sm rounded-2xl border border-[var(--line)] bg-[var(--s)] p-3.5 shadow-sm animate-in fade-in duration-200">
            <p className="mb-2 text-[12px] leading-relaxed text-[var(--t)]">Want to shape this into a clear, practical plan?</p>
            <div className="flex items-center gap-2">
              <button type="button" onClick={openRoadmap} className="rounded-full bg-[var(--y)] px-3 py-1.5 text-[11px] font-bold text-[#171717]">Create roadmap</button>
              <button type="button" onClick={() => setShowRoadmapSuggestion(false)} className="rounded-full px-3 py-1.5 text-[11px] font-medium text-[var(--m)] hover:bg-[var(--s2)]">Not now</button>
            </div>
          </div>
        )}

        {isBobTyping && (
          <div className="flex animate-in fade-in justify-start duration-200">
            <div className="flex items-center gap-1.5 rounded-2xl rounded-bl-md border border-[var(--line)] bg-[var(--s)] px-4 py-3">
              {[0, 150, 300].map((d) => (
                <span key={d} className="h-2 w-2 animate-bounce rounded-full bg-[var(--m)]" style={{ animationDelay: `${d}ms` }} />
              ))}
            </div>
          </div>
        )}
      </div>

      <form onSubmit={handleSend} className="flex items-center gap-2 border-t border-[var(--line)] bg-[var(--s)]/80 px-4 py-3 backdrop-blur-md sm:px-6">
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Message Bob…"
          className="h-11 flex-1 rounded-full border border-[var(--line)] bg-[var(--s2)] px-4 text-[13px] text-[var(--t)] placeholder:text-[var(--m)] outline-none transition-all focus:border-[var(--y)] focus:ring-2 focus:ring-[var(--y)]/25"
        />
        <button type="submit" disabled={!draft.trim() || isBobTyping} title="Send message" className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-[var(--y)] text-[#171717] transition-all hover:bg-[#ebd200] active:scale-95 disabled:cursor-not-allowed disabled:opacity-40">
          <Send className="h-4 w-4" />
        </button>
      </form>
    </div>
  );
};
