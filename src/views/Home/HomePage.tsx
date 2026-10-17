import React, { useMemo, useRef, useState } from 'react';
import { useApp } from '../../context/AppContext';
import {
  CircleArrowUp,
  Menu,
  Plus,
  LayoutDashboard,
  MessageCircle,
  Search,
  BookOpen,
  GitCompare,
  Map,
  Dumbbell,
  Lightbulb,
  Sprout,
  Heart,
} from 'lucide-react';
import sunflowerMorning from '../../assets/images/sunflower_garden_morning_user.png';
import sunflowerNight from '../../assets/images/sunflower_garden_night_1791540711934.jpg';
import bobOrb from '../../assets/images/bob_mascot_orb_1791540734514.jpg';
import bobLogo from '../../assets/images/bob_mascot_logo_1790332628517.jpg';

/** Casual rotating headlines — pick by day-of-year so it feels stable within a day but changes over time */
const CASUAL_HEADLINES = [
  'What are you in the mood to do?',
  'Hi captain — where should we start?',
  'What’s on your mind today?',
  'Ready when you are. What’s first?',
  'Where do you want to begin?',
  'Got a spark of an idea?',
  'Shall we make something move today?',
  'What feels worth your attention right now?',
  'Pick a thread — I’ll follow with you.',
  'How can Bob help you today?',
];

const TIME_GREETINGS = {
  morning: ['Good morning', 'Morning', 'Rise and shine'],
  afternoon: ['Good afternoon', 'Hey', 'Afternoon'],
  evening: ['Good evening', 'Evening', 'Welcome back'],
  night: ['Still up?', 'Quiet hours', 'Late focus'],
};

function getTimeBucket(): keyof typeof TIME_GREETINGS {
  const h = new Date().getHours();
  if (h >= 5 && h < 12) return 'morning';
  if (h >= 12 && h < 17) return 'afternoon';
  if (h >= 17 && h < 22) return 'evening';
  return 'night';
}

function pickStable<T>(list: T[], salt: string): T {
  const day = Math.floor(Date.now() / 86_400_000);
  let hash = day;
  for (let i = 0; i < salt.length; i++) hash = (hash * 31 + salt.charCodeAt(i)) >>> 0;
  return list[hash % list.length];
}

type SuggestionCard = {
  id: string;
  title: string;
  prompt: string;
  image: string;
  tint: string;
  icon: React.ElementType;
  kind: 'research' | 'life';
};

function buildSuggestions(
  projects: Array<{ title: string; status?: string }>,
  memoryFacts: string[]
): SuggestionCard[] {
  const researchPool: SuggestionCard[] = [
    {
      id: 'r1',
      title: projects[0] ? `Continue ${projects[0].title.slice(0, 22)}` : 'Start a research session',
      prompt: projects[0]
        ? `Help me continue working on "${projects[0].title}". What’s the smartest next step?`
        : 'Help me explore a question and understand what I should investigate first.',
      image: bobOrb,
      tint: 'bg-[#e6f4ff]',
      icon: Search,
      kind: 'research',
    },
    {
      id: 'r2',
      title: 'Plan a project',
      prompt: 'I want to create a project roadmap. Help me plan my goal.',
      image: bobLogo,
      tint: 'bg-[#e4f6e9]',
      icon: Map,
      kind: 'research',
    },
    {
      id: 'r3',
      title: 'Compare ideas',
      prompt: 'Help me compare a few options and identify the strongest evidence for each.',
      image: sunflowerNight,
      tint: 'bg-[#e8e8ff]',
      icon: GitCompare,
      kind: 'research',
    },
    {
      id: 'r4',
      title: 'Summarize a source',
      prompt: 'Help me summarize a source into the most important ideas and evidence.',
      image: sunflowerMorning,
      tint: 'bg-[#fff4d5]',
      icon: BookOpen,
      kind: 'research',
    },
    {
      id: 'r5',
      title: 'Learn a new skill',
      prompt: 'Help me plan how to learn a new skill step by step.',
      image: bobOrb,
      tint: 'bg-[#f0f7ff]',
      icon: Lightbulb,
      kind: 'research',
    },
  ];

  const lifePool: SuggestionCard[] = [
    {
      id: 'l1',
      title: 'Workout ideas',
      prompt: 'Suggest a simple workout I can do today based on what I usually enjoy.',
      image: bobLogo,
      tint: 'bg-[#ffe8e0]',
      icon: Dumbbell,
      kind: 'life',
    },
    {
      id: 'l2',
      title: 'DIY projects',
      prompt: 'Give me a small DIY project idea I can start this weekend.',
      image: sunflowerMorning,
      tint: 'bg-[#e8f8ef]',
      icon: Sprout,
      kind: 'life',
    },
    {
      id: 'l3',
      title: 'Story ideas',
      prompt: 'Help me brainstorm a short creative story idea.',
      image: sunflowerNight,
      tint: 'bg-[#f3eaff]',
      icon: Lightbulb,
      kind: 'life',
    },
    {
      id: 'l4',
      title: 'Something personal',
      prompt: memoryFacts[0]
        ? `Based on what I care about (${memoryFacts[0].slice(0, 80)}), suggest one small thing I could enjoy today.`
        : 'Suggest one small personal thing I could enjoy today — not work.',
      image: bobOrb,
      tint: 'bg-[#fff0f5]',
      icon: Heart,
      kind: 'life',
    },
    {
      id: 'l5',
      title: 'Mindful break',
      prompt: 'Guide me through a 5-minute mindful break.',
      image: sunflowerMorning,
      tint: 'bg-[#eef7ff]',
      icon: Heart,
      kind: 'life',
    },
  ];

  // Prefer project-aware research cards; rotate life cards from memory/day
  const r0 = researchPool[0];
  const r1 = pickStable(researchPool.slice(1), 'research-b');
  const l0 = pickStable(lifePool, 'life-a');
  const l1 = pickStable(
    lifePool.filter((c) => c.id !== l0.id),
    'life-b'
  );

  return [r0, r1, l0, l1];
}

export const HomePage: React.FC = () => {
  const {
    userName,
    navigateTo,
    createNewResearchSession,
    toggleSidebar,
    setIsAddFilesOpen,
    projects,
  } = useApp();
  const [draft, setDraft] = useState('');
  const composerRef = useRef<HTMLInputElement>(null);

  const bucket = getTimeBucket();
  const isDay = bucket === 'morning' || bucket === 'afternoon';
  const heroImage = isDay ? sunflowerMorning : sunflowerNight;

  const timeGreeting = useMemo(
    () => pickStable(TIME_GREETINGS[bucket], 'time') + (userName ? `, ${userName}` : ''),
    [bucket, userName]
  );
  const casualHeadline = useMemo(() => pickStable(CASUAL_HEADLINES, 'headline'), []);

  const memoryFacts = useMemo(() => {
    try {
      const raw = JSON.parse(localStorage.getItem('bob_companion_memory_v1') || '[]');
      return Array.isArray(raw) ? raw.filter((x): x is string => typeof x === 'string') : [];
    } catch {
      return [];
    }
  }, []);

  const suggestions = useMemo(
    () => buildSuggestions(projects || [], memoryFacts),
    [projects, memoryFacts]
  );

  const startResearch = (prompt: string) => {
    const clean = prompt.trim();
    if (!clean) return;
    try {
      localStorage.setItem('bob_pending_research_prompt', clean);
    } catch {}
    const id = createNewResearchSession();
    navigateTo('research', 'chat', id);
  };

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    startResearch(draft);
  };

  return (
    <div className="relative isolate min-h-full overflow-hidden">
      {/* Full-bleed sunflower garden */}
      <img
        src={heroImage}
        alt=""
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-20 h-full min-h-[100dvh] w-full object-cover object-center"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10 bg-gradient-to-b from-black/40 via-black/25 to-black/50"
      />

      {/* Top: menu + ChatGPT-style Dashboard | Chat toggle */}
      <div className="absolute top-0 inset-x-0 z-30 flex items-center justify-between px-4 pt-4">
        <button
          type="button"
          onClick={toggleSidebar}
          aria-label="Open navigation"
          className="grid h-10 w-10 place-items-center rounded-full border border-white/30 bg-black/20 text-white backdrop-blur-md transition hover:bg-black/35"
        >
          <Menu className="h-5 w-5" />
        </button>

        <nav className="flex items-center gap-0.5 p-1 rounded-full bg-black/30 border border-white/20 backdrop-blur-xl shadow-lg">
          <button
            type="button"
            onClick={() => navigateTo('dashboard')}
            className="flex items-center gap-1.5 px-4 py-2 rounded-full text-[12.5px] font-semibold text-white/80 hover:text-white hover:bg-white/10 transition-colors"
          >
            <LayoutDashboard className="w-3.5 h-3.5" strokeWidth={2} />
            <span>Dashboard</span>
          </button>
          <button
            type="button"
            onClick={() => navigateTo('chat')}
            className="flex items-center gap-1.5 px-4 py-2 rounded-full text-[12.5px] font-semibold text-white bg-white/20 transition-colors"
          >
            <MessageCircle className="w-3.5 h-3.5" strokeWidth={2} />
            <span>Chat</span>
          </button>
        </nav>

        <div className="w-10" aria-hidden />
      </div>

      {/* Center stage: time greeting + casual line + composer + cards */}
      <section className="relative min-h-[100dvh] flex flex-col items-center justify-center px-4 pb-16 pt-20">
        <div className="w-full max-w-[720px] mx-auto text-center">
          <p className="text-[13px] sm:text-[14px] font-medium text-white/85 tracking-wide drop-shadow-sm mb-2">
            {timeGreeting}
          </p>
          <h1 className="text-[28px] sm:text-[40px] md:text-[44px] font-semibold tracking-[-0.03em] text-white drop-shadow-md leading-[1.15] mb-8">
            {casualHeadline}
          </h1>

          {/* ChatGPT-style composer */}
          <form
            onSubmit={submit}
            className="mx-auto w-full max-w-[680px] flex items-center gap-1.5 p-1.5 pl-2 rounded-[28px] bg-white shadow-[0_8px_40px_rgba(0,0,0,0.18)] border border-white/80"
          >
            <button
              type="button"
              onClick={() => setIsAddFilesOpen(true)}
              className="shrink-0 grid h-10 w-10 place-items-center rounded-full text-neutral-500 hover:bg-neutral-100 hover:text-neutral-800 transition-colors"
              title="Add files"
              aria-label="Add files"
            >
              <Plus className="w-[18px] h-[18px]" strokeWidth={2} />
            </button>
            <input
              ref={composerRef}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="Message Bob…"
              className="flex-1 min-w-0 h-11 bg-transparent outline-none text-[15px] text-neutral-900 placeholder:text-neutral-400"
              aria-label="Message Bob"
            />
            <button
              type="submit"
              disabled={!draft.trim()}
              className="shrink-0 grid h-10 w-10 place-items-center rounded-full bg-neutral-900 text-white hover:bg-neutral-800 disabled:opacity-30 disabled:hover:bg-neutral-900 transition-all"
              aria-label="Send"
              title="Send"
            >
              <CircleArrowUp className="w-5 h-5" strokeWidth={2} />
            </button>
          </form>

          {/* Suggestion gallery — same width as composer, no white board behind */}
          <div className="mt-8 mx-auto w-full max-w-[680px] grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3">
            {suggestions.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    setDraft(item.prompt);
                    composerRef.current?.focus();
                  }}
                  className="group text-left rounded-2xl overflow-hidden border border-white/40 bg-white/90 shadow-md hover:shadow-xl hover:-translate-y-0.5 transition-all backdrop-blur-sm"
                >
                  <div className={`relative h-[88px] sm:h-[96px] overflow-hidden ${item.tint}`}>
                    <img
                      src={item.image}
                      alt=""
                      className="w-full h-full object-cover opacity-90 group-hover:scale-[1.05] transition-transform duration-500"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
                    <span className="absolute bottom-2 left-2 w-7 h-7 rounded-lg bg-white/95 text-[#171717] grid place-items-center shadow-sm">
                      <Icon className="w-3.5 h-3.5" />
                    </span>
                  </div>
                  <div className="px-2.5 py-2.5">
                    <h3 className="text-[12px] sm:text-[12.5px] font-semibold text-neutral-900 leading-snug line-clamp-2">
                      {item.title}
                    </h3>
                  </div>
                </button>
              );
            })}
          </div>

          <p className="mt-5 text-[11px] text-white/70">
            Suggestions adapt to your projects and what you’ve shared with Bob.
          </p>
        </div>
      </section>
    </div>
  );
};
