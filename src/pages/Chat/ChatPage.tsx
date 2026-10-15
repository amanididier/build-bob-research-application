import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../../context/AppContext';
import { 
  Send, 
  CheckCheck, 
  Check, 
  Sparkles, 
  Coffee, 
  Smile, 
  Compass, 
  Phone, 
  Video, 
  MoreVertical, 
  Search, 
  Menu,
  PanelLeft,
  Paperclip,
  Mic,
  ArrowRight
} from 'lucide-react';
import bobOrb from '../../assets/images/bob_mascot_orb_1791540734514.jpg';
import { resolveGeminiApiKey } from '../../lib/ai/keyManager';
import { GoogleGenAI } from '@google/genai';
import { RoadmapSheet } from '../../components/roadmap/RoadmapSheet';

interface MessengerMsg {
  id: string;
  role: 'user' | 'bob';
  text: string;
  ts: number;
}

const STORE_KEY = 'bob_messenger_messages_v2';
const NUDGE_KEY = 'bob_messenger_last_nudge';
const IDLE_MS = 8 * 60 * 1000;
const NUDGE_COOLDOWN_MS = 25 * 60 * 1000;
const COMPANION_MEMORY_KEY = 'bob_companion_memory_v1';

function loadCompanionMemory(): string[] {
  try {
    const value = JSON.parse(localStorage.getItem(COMPANION_MEMORY_KEY) || '[]');
    return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string').slice(-12) : [];
  } catch { return []; }
}

function rememberPreference(message: string) {
  if (!/\b(i (?:really )?(?:like|love|enjoy|prefer|usually listen to|usually watch|am into)|my favorite|i'm a fan of|im a fan of)\b/i.test(message)) return;
  const facts = loadCompanionMemory();
  if (!facts.some((fact) => fact.toLowerCase() === message.toLowerCase())) {
    try { localStorage.setItem(COMPANION_MEMORY_KEY, JSON.stringify([...facts, message.slice(0, 240)].slice(-12))); } catch {}
  }
}

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
  return [
    {
      id: 'init-1',
      role: 'bob',
      text: "Hey! Ready for a quick breather. How's your day treating you so far?",
      ts: Date.now() - 60000,
    }
  ];
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

// Casual friendly companion follow-ups (like chatting with a close friend)
const CASUAL_FOLLOWUPS = [
  "By the way, what kind of music have you been enjoying lately?",
  "What movie or series has actually kept your attention recently?",
  "How has your day been outside of the screen?",
  "If you could spend a free afternoon anywhere, where would you go?",
  "What is a small thing that has made you smile lately?",
  "Who is someone you admire at the moment, and what do you like about them?"
];

export const ChatPage: React.FC = () => {
  const { userName, tasks, toggleSidebar, navigateTo, activeResearchId, projects } = useApp();
  const [messages, setMessages] = useState<MessengerMsg[]>(loadMessages);
  const [draft, setDraft] = useState('');
  const [isBobTyping, setIsBobTyping] = useState(false);
  const [messageTurnCount, setMessageTurnCount] = useState(0);
  const [isRoadmapActive, setIsRoadmapActive] = useState(false);
  const [roadmapGoal, setRoadmapGoal] = useState('Project Roadmap');
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const sendingRef = useRef(false);

  const activeProject = projects.find(p => p.id === activeResearchId) || projects[0];

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORE_KEY, JSON.stringify(messages.slice(-200)));
    }
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, isBobTyping, isRoadmapActive]);

  const pushBobMessage = (text: string) => {
    setMessages((prev) => [
      ...prev,
      { id: `m-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, role: 'bob', text, ts: Date.now() },
    ]);
  };

  // Bob is proactive in the casual lounge: after an idle stretch he gently checks in
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
        `Hey ${userName || 'friend'}, just taking a quick moment to check in. ${randomFollowup}`
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

  // Generate casual, relaxing companion response
  const generateRelaxedResponse = async (userInput: string): Promise<string> => {
    const key = resolveGeminiApiKey();
    const nextTurn = messageTurnCount + 1;
    setMessageTurnCount(nextTurn);

    // If user explicitly asks about roadmap, launch the full-page roadmap
    const lower = userInput.toLowerCase();
    if (/\b(create|make|build|generate|start|plan)\b.{0,35}\broadmap\b/i.test(userInput) || /\broadmap\b.{0,25}\b(for my project|please create|please build)\b/i.test(userInput)) {
      setTimeout(() => {
        const goalFromRequest = userInput.replace(/.*?\\broadmap\\b/i, '').replace(/^\\s*(?:for|about|to)\\s+/i, '').trim();
        setRoadmapGoal(goalFromRequest || '');
        setIsRoadmapActive(true);
      }, 500);
      return `Sure thing! Let's build your step-by-step roadmap right now. Launching the full roadmap view for you...`;
    }

    if (key) {
      try {
        const ai = new GoogleGenAI({ apiKey: key });
        const rememberedFacts = loadCompanionMemory();
        const systemPrompt = `You are Bob, a warm, emotionally intelligent conversational AI companion speaking directly with ${userName || 'the user'}.
Treat this like a real ongoing conversation, not a search box: respond to what the person actually said, acknowledge feelings or details, and sometimes ask one natural follow-up question rather than ending every turn with a generic line.
You can discuss everyday life, interests, music, celebrities, films, hobbies, friendships, culture, learning, creativity, decisions, emotions, technology, and practical questions.
Keep replies concise and warm, usually one or two short sentences. Do not make the conversation about yourself. Do not bring up projects, tasks, research sessions, or roadmaps unless the user explicitly asks or the current message clearly concerns them. If a meaningful multi-step goal comes up, ask whether they want help planning before opening any roadmap. Never insert scheduled project reminders.
Known preferences the user has explicitly shared (use naturally, never assume more than these): ${rememberedFacts.join(' | ') || 'No saved preferences yet.'}`);

        const response = await ai.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: [
            ...messages.slice(-12).map((message) => ({
              role: message.role === 'bob' ? 'model' : 'user',
              parts: [{ text: message.text }],
            })),
            { role: 'user', parts: [{ text: userInput }] },
          ],
          config: {
            systemInstruction: `${systemPrompt}\nKeep each reply to at most two short visual lines unless the user explicitly asks for a detailed explanation. Vary your replies naturally, remember details from this conversation, and ask occasional light questions about interests, music, films, hobbies, people they admire, or how their day is going when it feels relevant. Do not invent personal facts or claim to save long-term memory unless a memory feature actually stores them.`,
            maxOutputTokens: 180,
          },
        });

        if (response.text && response.text.trim()) {
          return response.text.trim();
        }
        return "Gemini didn't return a reply this time. Please try sending that again.";
      } catch (err) {
        console.warn('Gemini casual chat failed:', err);
        return "I couldn't reach Gemini just now. Your message is still here—please check your Gemini API key or connection, then try again.";
      }
    }

    if (!key) {
      return "I'm here with you, but Gemini isn't connected in this session yet. Add your Gemini API key in Settings so I can give you real, context-aware replies.";
    }

    // Organic offline casual fallback responses
    const randomFollowup = CASUAL_FOLLOWUPS[Math.floor(Math.random() * CASUAL_FOLLOWUPS.length)];

    if (lower.includes('coffee') || lower.includes('tea') || lower.includes('drink') || lower.includes('snack')) {
      return `A warm cup definitely resets the mind! Take your time to enjoy it. ${randomFollowup}`;
    }
    if (lower.includes('tired') || lower.includes('exhausted') || lower.includes('sleep') || lower.includes('long day')) {
      return `You've put in solid work today. Give yourself some grace and rest up. Did that last step feel like a good wrap-up point?`;
    }
    if (lower.includes('how are you') || lower.includes('what are you doing') || lower.includes('hey bob') || lower.includes('hello') || lower.includes('hi')) {
      return `I'm just chilling right here! Always happy to catch up with you. ${randomFollowup}`;
    }
    if (lower.includes('step') || lower.includes('done') || lower.includes('finished') || lower.includes('progress')) {
      return `That's awesome! Checking things off feels great. Ready to kick back for a bit or letting new ideas simmer?`;
    }

    return `I’m here for a chat 🙂 ${randomFollowup}`;
  };

  const handleSend = async (textToSend?: string) => {
    const text = (textToSend || draft).trim();
    if (!text || sendingRef.current) return;
    rememberPreference(text);
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
      pushBobMessage("I'm right here with you! Take a nice breath and we can chat whenever you want.");
    } finally {
      setIsBobTyping(false);
      sendingRef.current = false;
    }
  };

  // If Roadmap Mode is active, replace the entire Chat UI with the full-page ResumeX Roadmap
  if (isRoadmapActive) {
    return (
      <RoadmapSheet
        isOpen={true}
        initialGoal={roadmapGoal}
        onClose={() => setIsRoadmapActive(false)}
        onFinish={(steps) => {
          setIsRoadmapActive(false);
          const phasePreview = steps.slice(0, 3).map((step, index) => (index + 1) + '. ' + step.title).join('  •  ');
          pushBobMessage(
            `Your roadmap for "${roadmapGoal}" is saved to the project Tasks page with ${steps.length} milestones. Here are the first steps: ${phasePreview}. Which one would you like to discuss or start with?`
          );
        }}
      />
    );
  }

  const lastBobIndex = messages.reduce((acc, m, i) => (m.role === 'bob' ? i : acc), -1);

  return (
    // Clean edge-to-edge WhatsApp Container with full 100% dot pattern background covering the entire page
    <div className="w-full h-full flex flex-col relative select-text bg-gradient-to-b from-[#f7faff] via-white to-[#fffdf4] dark:from-[#10131b] dark:via-[#131927] dark:to-[#1b1a14] overflow-hidden">
      
      {/* 1. Authentic WhatsApp Top Bar (Spans 100% width, no double borders) */}
      <header className="w-full h-15 px-4 sm:px-6 bg-white dark:bg-[#171b25] border-b border-black/5 dark:border-white/5 flex items-center justify-between gap-3 shrink-0 z-10 shadow-xs">
        <div className="flex items-center gap-3 min-w-0">
          {/* Toggle sidebar button */}
          <button
            type="button"
            onClick={toggleSidebar}
            title="Toggle sidebar"
            className="p-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 text-neutral-600 dark:text-neutral-300 transition-colors cursor-pointer"
          >
            <Menu className="w-5 h-5" />
          </button>

          {/* Bob Avatar & Status */}
          <div className="relative shrink-0">
            <img 
              src={bobOrb} 
              alt="Bob" 
              className="w-10 h-10 rounded-full object-cover ring-1 ring-black/10 dark:ring-white/10 shadow-sm" 
            />
            <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-[#f5c842] border-2 border-white dark:border-[#171b25]" />
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-[#172033] dark:text-[#f2f6ff] truncate m-0">
                Bob
              </h2>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#e6f0ff] dark:bg-[#1d3154] text-[#2764d8] dark:text-[#9fc2ff]">
                Companion
              </span>
            </div>
            <p className="text-[11px] text-[#667781] dark:text-[#8696a0] truncate m-0 font-normal">
              {isBobTyping ? 'typing…' : 'online · casual lounge'}
            </p>
          </div>
        </div>

        {/* WhatsApp Top Right Action Icons */}
        <div className="flex items-center gap-1 sm:gap-2 text-[#54656f] dark:text-[#aebac1]">
          <button
            type="button"
            onClick={() => handleSend("Hey Bob! Just felt like saying hi.")}
            className="p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/10 transition-colors cursor-pointer"
            title="Audio check-in"
          >
            <Phone className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={() => handleSend("How's your evening going?")}
            className="p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/10 transition-colors cursor-pointer"
            title="Video call check-in"
          >
            <Video className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={() => navigateTo('tasks')}
            className="p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/10 transition-colors cursor-pointer"
            title="Go to Tasks page"
          >
            <MoreVertical className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* 2. Message Thread (100% full screen canvas with authentic WhatsApp bubbles) */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto px-4 sm:px-12 md:px-24 py-6 space-y-2.5"
      >
        {/* Subtle WhatsApp-style Security & Casual Notice Pill */}
        <div className="flex justify-center my-3">
          <div className="px-3.5 py-1.5 rounded-lg bg-[#fff7d8] dark:bg-[#292516] border border-[#f5c842]/30 shadow-xs text-center max-w-md">
            <span className="text-[11px] text-[#765d08] dark:text-[#f5d56b] font-medium leading-relaxed block">
              ☕ Casual Chat Lounge · Bob is here to unwind and chat casually with you without technical project pressure.
            </span>
          </div>
        </div>

        {messages.map((m, i) => {
          const showDay = i === 0 || formatDay(messages[i - 1].ts) !== formatDay(m.ts);
          const isUser = m.role === 'user';
          const isRead = isUser && lastBobIndex > i;

          return (
            <React.Fragment key={m.id}>
              {showDay && (
                <div className="flex justify-center my-3">
                  <span className="px-3 py-1 rounded-md bg-white/80 dark:bg-[#182229]/80 backdrop-blur-xs border border-black/5 dark:border-white/5 text-[11px] font-semibold text-[#54656f] dark:text-[#8696a0] shadow-2xs">
                    {formatDay(m.ts)}
                  </span>
                </div>
              )}

              <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} animate-in fade-in duration-150`}>
                <div
                  className={`relative max-w-[85%] sm:max-w-[70%] px-3.5 py-2 rounded-2xl shadow-xs ${
                    isUser
                      ? 'bg-gradient-to-br from-[#4388ff] to-[#2764d8] dark:from-[#3b82f6] dark:to-[#1d4ed8] text-white rounded-tr-sm'
                      : 'bg-white dark:bg-[#1b202b] text-[#172033] dark:text-[#f2f6ff] rounded-tl-sm border border-[#e7edf5] dark:border-white/5 shadow-sm'
                  }`}
                >
                  <p className={`text-[13.5px] leading-relaxed m-0 whitespace-pre-wrap select-text ${isUser ? '' : 'line-clamp-2'}`}>
                    {m.text}
                  </p>

                  <div className={`flex items-center justify-end gap-1 mt-0.5 text-[10px] ${
                    isUser ? 'text-[#111b21]/60 dark:text-[#e9edef]/60' : 'text-[#667781] dark:text-[#8696a0]'
                  }`}>
                    <span>{formatTime(m.ts)}</span>
                    {isUser && (
                      isRead ? (
                        <CheckCheck className="w-3.5 h-3.5 text-[#53bdeb]" />
                      ) : (
                        <Check className="w-3.5 h-3.5" />
                      )
                    )}
                  </div>
                </div>
              </div>
            </React.Fragment>
          );
        })}

        {/* WhatsApp Typing Bubble */}
        {isBobTyping && (
          <div className="flex justify-start animate-in fade-in duration-150">
            <div className="px-4 py-2.5 rounded-2xl rounded-tl-xs bg-white dark:bg-[#202c33] text-[#172033] dark:text-[#f2f6ff] shadow-xs flex items-center gap-1.5">
              {[0, 150, 300].map((d) => (
                <span
                  key={d}
                  className="w-2 h-2 rounded-full bg-[#4f83e3] animate-bounce"
                  style={{ animationDelay: `${d}ms` }}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 3. Subtle Quick Chat Chips on bottom */}
      <div className="w-full px-4 sm:px-12 md:px-24 py-1.5 flex items-center gap-2 overflow-x-auto text-xs shrink-0 select-none">
        <span className="text-[10.5px] text-[#667781] dark:text-[#8696a0] font-semibold shrink-0">Quick chats:</span>
        <button
          type="button"
          onClick={() => handleSend("Taking a quick coffee break!")}
          className="px-3 py-1 rounded-full bg-white dark:bg-[#1b202b] hover:bg-[#f5c842] hover:text-[#171717] border border-black/5 dark:border-white/5 text-[11px] font-medium text-[#172033] dark:text-[#f2f6ff] transition-colors shrink-0 shadow-2xs cursor-pointer"
        >
          ☕ Coffee break
        </button>
      </div>

      {/* 4. Authentic WhatsApp Bottom Composer */}
      <footer className="w-full px-4 sm:px-12 md:px-24 py-3 bg-white dark:bg-[#171b25] border-t border-black/5 dark:border-white/5 flex items-center gap-2 shrink-0 z-10">
        <button
          type="button"
          onClick={() => handleSend("😊")}
          className="p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/10 text-[#54656f] dark:text-[#aebac1] transition-colors cursor-pointer shrink-0"
          title="Emoji"
        >
          <Smile className="w-5 h-5" />
        </button>

        <button
          type="button"
          onClick={() => handleSend("Sharing a thought with you!")}
          className="p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/10 text-[#54656f] dark:text-[#aebac1] transition-colors cursor-pointer shrink-0"
          title="Attachment"
        >
          <Paperclip className="w-5 h-5" />
        </button>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }}
          className="flex-1 flex items-center gap-2"
        >
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Type a casual message…"
            className="flex-1 h-11 px-5 rounded-full bg-[#f1f5fb] dark:bg-[#222b3a] border border-[#e5ebf5] dark:border-white/5 text-[13.5px] text-[#172033] dark:text-[#f2f6ff] placeholder:text-[#8696a0] outline-none shadow-inner"
          />

          {draft.trim() ? (
            <button
              type="submit"
              disabled={isBobTyping}
              title="Send message"
              className="w-10 h-10 rounded-full bg-[#3478f6] hover:bg-[#f5c842] hover:text-[#172033] text-white grid place-items-center transition-all active:scale-95 disabled:opacity-40 cursor-pointer shrink-0 shadow-xs"
            >
              <Send className="w-4 h-4 ml-0.5" />
            </button>
          ) : (
            <button
              type="button"
              onClick={() => handleSend("Hey Bob! Just taking a quick break to chat.")}
              title="Voice message"
              className="w-10 h-10 rounded-full bg-[#3478f6] hover:bg-[#f5c842] hover:text-[#172033] text-white grid place-items-center transition-all active:scale-95 cursor-pointer shrink-0 shadow-xs"
            >
              <Mic className="w-4 h-4" />
            </button>
          )}
        </form>
      </footer>
    </div>
  );
};
