import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../../context/AppContext';
import { Send, CheckCheck, Check, Sparkles, Coffee, Smile, Compass, RefreshCw } from 'lucide-react';
import bobOrb from '../../assets/images/bob_mascot_orb_1791540734514.jpg';
import { resolveGeminiApiKey } from '../../lib/ai/keyManager';
import { GoogleGenAI } from '@google/genai';

interface MessengerMsg {
  id: string;
  role: 'user' | 'bob';
  text: string;
  ts: number;
}

const STORE_KEY = 'bob_messenger_messages_v1';
const NUDGE_KEY = 'bob_messenger_last_nudge';
const IDLE_MS = 6 * 60 * 1000;
const NUDGE_COOLDOWN_MS = 25 * 60 * 1000;

function loadMessages(): MessengerMsg[] {
  try {
    const raw = typeof window !== 'undefined' ? localStorage.getItem(STORE_KEY) : null;
    if (raw) {
      const parsed = JSON.parse(raw) as MessengerMsg[];
      // Filter out old technical research dump essays so the chat is purely casual
      const cleaned = parsed.filter(m => !m.text.includes('### Next Steps') && !m.text.includes('Define the Scope Boundary') && m.text.length < 500);
      if (cleaned.length > 0) return cleaned;
    }
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

// Casual fallback responses with caring follow-up questions
const CASUAL_FOLLOWUPS = [
  "What has been the nicest part of your day so far?",
  "Have you heard any good music or watched anything you enjoyed lately?",
  "Is there something small you are looking forward to this week?",
  "Have you had a chance to enjoy a good meal or take a little break today?",
  "What kind of thing helps you feel relaxed when your mind is busy?"
];

export const ChatPage: React.FC = () => {
  const { userName } = useApp();
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

  // Bob is proactive in the casual lounge: after an idle stretch he gently checks in on the user's wellbeing and recent steps
  useEffect(() => {
    let idle = 0;
    const tick = window.setInterval(() => {
      idle += 15000;
      if (idle < IDLE_MS) return;
      idle = 0;
      const last = Number(localStorage.getItem(NUDGE_KEY) || 0);
      if (Date.now() - last < NUDGE_COOLDOWN_MS) return;
      localStorage.setItem(NUDGE_KEY, String(Date.now()));
      
      const randomFollowup = CASUAL_FOLLOWUPS[Math.floor(Math.random() * CASUAL_FOLLOWUPS.length)];
      pushBobMessage(
        `Hey ${userName || 'friend'}, just taking a quiet moment to check in. ${randomFollowup}`
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
  }, [userName]);

  // Generate casual, relaxing companion response with occasional gentle follow-up question
  const generateRelaxedResponse = async (userInput: string): Promise<string> => {
    const key = resolveGeminiApiKey();

    if (key) {
      try {
        const ai = new GoogleGenAI({ apiKey: key });
        const systemPrompt = `You are Bob, a warm, relaxed, and thoughtful companion chatting casually with ${userName || 'your friend'} in their quiet lounge.
This is NOT a technical project dashboard or research lecture. Keep this a relaxing haven.
Rules:
1. Speak casually, warmly, and concisely (1 to 3 natural sentences max).
2. Avoid bullet lists, corporate jargon, or heavy essays.
3. Do not bring up research, projects, tasks, deadlines, or work unless the user asks about them first.
4. At natural moments, ask a friendly follow-up about their day, interests, music, food, entertainment, or how they are feeling.
5. Keep this chat separate from the research workspace: no unsolicited work reminders or project advice.`;

        const response = await ai.models.generateContent({
          model: 'gemini-3.1-flash-lite',
          contents: `${systemPrompt}\n\nUser: "${userInput}"\nBob:`,
        });

        if (response.text && response.text.trim()) {
          return response.text.trim();
        }
      } catch (err) {
        console.warn('Gemini casual chat fallback:', err);
      }
    }

    // Organic offline / fallback casual conversational generator
    const lower = userInput.toLowerCase();
    const randomFollowup = CASUAL_FOLLOWUPS[Math.floor(Math.random() * CASUAL_FOLLOWUPS.length)];

    if (lower.includes('coffee') || lower.includes('tea') || lower.includes('drink') || lower.includes('eat') || lower.includes('break')) {
      return `A good warm brew always resets the mind! I hope you're taking your time to enjoy it. ${randomFollowup}`;
    }
    if (lower.includes('tired') || lower.includes('exhausted') || lower.includes('sleep') || lower.includes('long day')) {
      return `You've put in honest effort today. Don't hesitate to lean back and let the mind wander. Did that last step you tackled feel like a good spot to pause?`;
    }
    if (lower.includes('how are you') || lower.includes('what are you doing') || lower.includes('hey bob') || lower.includes('hello')) {
      return `I'm feeling calm and happy to hang out with you here! Just soaking in the peaceful atmosphere. ${randomFollowup}`;
    }
    return `It's really nice just chatting without all the hustle and bustle. ${randomFollowup}`;
  };

  const handleSend = async (textToSend?: string) => {
    const text = (textToSend || draft).trim();
    if (!text || sendingRef.current) return;
    sendingRef.current = true;
    setDraft('');

    setMessages((prev) => [
      ...prev,
      { id: `m-${Date.now()}`, role: 'user', text, ts: Date.now() },
    ]);
    setIsBobTyping(true);

    try {
      const reply = await generateRelaxedResponse(text);
      pushBobMessage(reply);
    } catch {
      pushBobMessage("I'm right here beside you. Take a nice breath and we can chat whenever you're ready.");
    } finally {
      setIsBobTyping(false);
      sendingRef.current = false;
    }
  };

  const lastBobIndex = messages.reduce((acc, m, i) => (m.role === 'bob' ? i : acc), -1);

  return (
    <div className="w-full h-full flex flex-col bg-[#efeae2] dark:bg-[#0b141a] [background-image:radial-gradient(circle_at_1px_1px,rgba(0,0,0,0.035)_1px,transparent_0)] dark:[background-image:radial-gradient(circle_at_1px_1px,rgba(255,255,255,0.035)_1px,transparent_0)] [background-size:22px_22px] animate-in fade-in duration-300">
      {/* Minimal WhatsApp-inspired chat header — no connection/status card. */}
      <div className="w-full flex items-center justify-between px-5 sm:px-7 py-3 border-b border-black/5 dark:border-white/10 bg-[#f7f5f0]/90 dark:bg-[#111b21]/90 backdrop-blur-md shrink-0">
        <div>
          <b className="block text-[14px] text-[var(--t)] leading-tight">Chat</b>
          <small className="block text-[11px] text-[var(--m)] mt-0.5">{isBobTyping ? 'Bob is typing…' : 'A quiet place to talk about anything'}</small>
        </div>
      </div>

      {/* Message thread: 100% full canvas */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto px-4 sm:px-10 py-6 space-y-3"
      >
        {messages.length === 0 && (
          <div className="text-center mt-12 max-w-md mx-auto animate-in fade-in zoom-in-95 duration-500 p-6 rounded-2xl bg-[var(--s)] border border-[var(--line)] shadow-sm">
            <img src={bobOrb} alt="" className="w-16 h-16 rounded-full mx-auto mb-3 opacity-95 border border-[var(--line)] shadow-md" />
            <h3 className="text-base font-bold text-[var(--t)] mb-1">
              Welcome to the Relaxing Lounge
            </h3>
            <p className="text-[13px] text-[var(--m)] leading-relaxed mb-4">
              Hey {userName || 'friend'}! This is your quiet haven to talk with Bob casually about anything—ideas, your day, or just unwinding without the heavy project pressure.
            </p>
            <div className="flex flex-wrap justify-center gap-2 pt-1">
              <button
                type="button"
                onClick={() => handleSend("Hey Bob, just taking a quick coffee break!")}
                className="px-3 py-1.5 rounded-full bg-[var(--s2)] hover:bg-[var(--y)] hover:text-[#171717] border border-[var(--line)] text-xs font-semibold text-[var(--t)] transition-colors"
              >
                ☕ Coffee break
              </button>
              <button
                type="button"
                onClick={() => handleSend("How's your day going, Bob?")}
                className="px-3 py-1.5 rounded-full bg-[var(--s2)] hover:bg-[var(--y)] hover:text-[#171717] border border-[var(--line)] text-xs font-semibold text-[var(--t)] transition-colors"
              >
                🌿 Just unwinding
              </button>
              <button
                type="button"
                onClick={() => handleSend("I have something on my mind and would like to talk casually.")}
                className="px-3 py-1.5 rounded-full bg-[var(--s2)] hover:bg-[var(--y)] hover:text-[#171717] border border-[var(--line)] text-xs font-semibold text-[var(--t)] transition-colors"
              >
                ✨ Share a thought
              </button>
            </div>
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
                  className={`max-w-[80%] sm:max-w-[70%] px-4 py-3 rounded-2xl shadow-sm animate-in zoom-in-95 fade-in duration-200 ${
                    m.role === 'user'
                      ? 'bg-[var(--y)] text-[#171717] rounded-br-md font-medium'
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
                  className="w-2 h-2 rounded-full bg-amber-400 animate-bounce"
                  style={{ animationDelay: `${d}ms` }}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Relaxing quick conversation chips */}
      <div className="px-4 sm:px-6 py-2 bg-[var(--s)]/50 border-t border-[var(--line)] flex items-center gap-2 overflow-x-auto text-xs">
        <span className="text-[11px] text-[var(--m)] font-semibold shrink-0">Quick chats:</span>
        <button
          type="button"
          onClick={() => handleSend("Taking a quick breather to clear my head.")}
          className="px-2.5 py-1 rounded-full bg-[var(--s2)] hover:bg-[var(--y)] hover:text-[#171717] text-[11px] font-medium text-[var(--m)] hover:text-[var(--t)] transition-colors shrink-0"
        >
          ☕ Taking a breather
        </button>
        <button
          type="button"
          onClick={() => handleSend("Hey Bob, can we talk about something fun or interesting?")}
          className="px-2.5 py-1 rounded-full bg-[var(--s2)] hover:bg-[var(--y)] hover:text-[#171717] text-[11px] font-medium text-[var(--m)] hover:text-[var(--t)] transition-colors shrink-0"
        >
          ✨ Share a thought
        </button>
        <button
          type="button"
          onClick={() => handleSend("What do you think is a good way to unwind right now?")}
          className="px-2.5 py-1 rounded-full bg-[var(--s2)] hover:bg-[var(--y)] hover:text-[#171717] text-[11px] font-medium text-[var(--m)] hover:text-[var(--t)] transition-colors shrink-0"
        >
          🌿 Ways to unwind
        </button>
      </div>

      {/* Composer */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSend();
        }}
        className="px-4 sm:px-6 py-3 border-t border-[var(--line)] bg-[var(--s)]/80 backdrop-blur-md flex items-center gap-2"
      >
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Chat casually with Bob…"
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
      <p className="px-4 py-2 text-center text-[10.5px] text-[#6c756d] dark:text-[#869b91] bg-[#f7f5f0]/85 dark:bg-[#111b21]/85 border-t border-black/5 dark:border-white/10">
        {userName || 'You'}, don’t worry — your chat is saved only on this device.
      </p>
    </div>
  );
};
