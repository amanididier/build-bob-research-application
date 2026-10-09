import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { 
  ArrowUpRight, 
  Plus, 
  Sparkles, 
  Sun, 
  Moon, 
  Mic, 
  Send, 
  ArrowRight,
  Clock,
  Compass,
  FileText
} from 'lucide-react';
import sunflowerMorning from '../../assets/images/sunflower_garden_morning_1791540694993.jpg';
import sunflowerNight from '../../assets/images/sunflower_garden_night_1791540711934.jpg';

export const HomePage: React.FC = () => {
  const { 
    navigateTo, 
    projects, 
    userName, 
    createNewResearchSession,
    sendMessage,
    triggerThinking
  } = useApp();

  // Determine daytime vs night from current clock
  const [timeMode, setTimeMode] = useState<'morning' | 'night'>(() => {
    const hour = new Date().getHours();
    return hour >= 6 && hour < 18 ? 'morning' : 'night';
  });

  const [composerInput, setComposerInput] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isMorning = timeMode === 'morning';
  const heroImage = isMorning ? sunflowerMorning : sunflowerNight;

  const handleComposerSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!composerInput.trim() || isSubmitting) return;
    const query = composerInput.trim();
    setComposerInput('');
    setIsSubmitting(true);

    triggerThinking('Initiating Study', `Analyzing query: "${query}"`, 'Connecting sources');
    const newId = createNewResearchSession();
    navigateTo('research', 'chat', newId);
    await sendMessage(query);
    setIsSubmitting(false);
  };

  return (
    <div className="max-w-[1140px] mx-auto px-5 md:px-8 py-6 pb-36 animate-in fade-in duration-300">
      {/* 1. Tab Bar */}
      <div className="h-12 border-b border-[var(--line)] flex gap-8 mb-6">
        <button className="h-12 text-[var(--t)] font-bold relative after:content-[''] after:h-[2.5px] after:bg-[var(--y)] after:absolute after:left-0 after:right-0 after:-bottom-[1px] cursor-pointer">
          Overview
        </button>
        <button
          onClick={() => navigateTo('research', 'chat')}
          className="h-12 text-[#888] hover:text-[var(--t)] transition-colors font-medium cursor-pointer"
        >
          Research
        </button>
        <button
          onClick={() => navigateTo('tasks')}
          className="h-12 text-[#888] hover:text-[var(--t)] transition-colors font-medium cursor-pointer"
        >
          Tasks
        </button>
      </div>

      {/* 2. Sunflower Garden Hero Banner with Composer in the middle */}
      <div className="relative rounded-[28px] overflow-hidden shadow-xl border border-[var(--line)] mb-8 min-h-[360px] md:min-h-[400px] flex flex-col justify-between p-6 sm:p-9 text-white group">
        {/* Background Image with Ambient Overlay */}
        <div 
          className="absolute inset-0 bg-cover bg-center transition-all duration-700 transform scale-100 group-hover:scale-[1.01]"
          style={{ backgroundImage: `url(${heroImage})` }}
        />
        {/* Gradient backdrop for legibility */}
        <div 
          className={`absolute inset-0 transition-opacity duration-500 ${
            isMorning 
              ? 'bg-gradient-to-t from-black/85 via-black/45 to-black/30' 
              : 'bg-gradient-to-t from-black/90 via-black/55 to-black/40'
          }`}
        />

        {/* Top bar of the Hero: Greeting Tag & Time Toggle */}
        <div className="relative z-10 flex items-center justify-between">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/40 backdrop-blur-md border border-white/20 text-white/90 text-[11px] font-semibold tracking-wide uppercase">
            <span className={`w-2 h-2 rounded-full ${isMorning ? 'bg-amber-400' : 'bg-indigo-300'} animate-pulse`} />
            <span>
              {isMorning ? 'Bright Morning Sunflower Garden' : 'Starlit Evening Sunflower Garden'}
            </span>
          </div>

          {/* Quick Day / Night Switcher */}
          <button
            onClick={() => setTimeMode((m) => (m === 'morning' ? 'night' : 'morning'))}
            title={`Switch to ${isMorning ? 'Night' : 'Morning'} view`}
            className="px-3 py-1.5 rounded-full bg-black/40 hover:bg-black/60 backdrop-blur-md border border-white/20 text-white/90 text-[11px] font-medium flex items-center gap-1.5 transition-all cursor-pointer hover:border-white/40 active:scale-95"
          >
            {isMorning ? (
              <>
                <Moon className="w-3.5 h-3.5 text-indigo-300" />
                <span>Night view</span>
              </>
            ) : (
              <>
                <Sun className="w-3.5 h-3.5 text-amber-400" />
                <span>Morning view</span>
              </>
            )}
          </button>
        </div>

        {/* Center of the Hero: Distinct Greetings & Middle Composer */}
        <div className="relative z-10 max-w-[760px] mx-auto w-full my-6 text-center">
          <h1 className="text-[32px] sm:text-[40px] font-black tracking-tight drop-shadow-md leading-tight mb-2 text-white">
            {isMorning ? `Good morning, ${userName}.` : `Good evening, ${userName}.`}
          </h1>
          <p className="text-[14px] sm:text-[15px] text-white/85 max-w-[620px] mx-auto mb-6 leading-relaxed drop-shadow-sm font-normal">
            {isMorning
              ? 'The garden is bright and clear. What would you like to investigate, synthesize, or finish today?'
              : 'The stars are out over the sunflowers. Let’s distill today’s reading into clear, actionable outcomes.'}
          </p>

          {/* Composer in the middle as requested */}
          <form 
            onSubmit={handleComposerSubmit}
            className="w-full bg-white/95 dark:bg-[#1a1a1a]/95 backdrop-blur-xl border border-white/30 dark:border-white/10 rounded-[22px] p-2 sm:p-2.5 shadow-2xl flex items-center gap-2 transition-all focus-within:ring-2 ring-[var(--y)] ring-offset-2 ring-offset-black/20"
          >
            <div className="pl-3 text-[var(--m)]">
              <Sparkles className="w-5 h-5 text-[var(--y)]" />
            </div>

            <input
              type="text"
              value={composerInput}
              onChange={(e) => setComposerInput(e.target.value)}
              placeholder="Ask Bob anything, start a fresh study, or drop a research topic..."
              className="flex-1 bg-transparent border-none text-[14px] text-neutral-900 dark:text-neutral-100 placeholder:text-neutral-500 dark:placeholder:text-neutral-400 outline-none px-2 py-2"
            />

            <button
              type="button"
              onClick={() => {
                const newId = createNewResearchSession();
                navigateTo('research', 'chat', newId);
              }}
              title="Speak with Bob"
              className="w-9 h-9 rounded-xl hover:bg-neutral-200/60 dark:hover:bg-neutral-800 text-neutral-600 dark:text-neutral-300 grid place-items-center transition-colors cursor-pointer shrink-0"
            >
              <Mic className="w-4 h-4" />
            </button>

            <button
              type="submit"
              disabled={!composerInput.trim() || isSubmitting}
              className="h-10 px-4 rounded-xl bg-[var(--y)] hover:bg-[#ebd200] text-[#171717] font-bold text-[13px] flex items-center gap-1.5 transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer shrink-0 shadow-sm"
            >
              <span>Research</span>
              <Send className="w-3.5 h-3.5" />
            </button>
          </form>

          {/* Suggested Quick Prompt Pills */}
          <div className="flex items-center justify-center gap-2 flex-wrap mt-3 text-[11.5px] text-white/80 font-medium">
            <span>Try:</span>
            <button
              type="button"
              onClick={() => {
                setComposerInput('Synthesize pricing friction in payment checkout');
              }}
              className="px-2.5 py-0.5 rounded-full bg-white/15 hover:bg-white/25 backdrop-blur-md transition-colors cursor-pointer"
            >
              Pricing checkout friction
            </button>
            <button
              type="button"
              onClick={() => {
                setComposerInput('Draft executive brief from current tab sources');
              }}
              className="px-2.5 py-0.5 rounded-full bg-white/15 hover:bg-white/25 backdrop-blur-md transition-colors cursor-pointer"
            >
              Draft executive brief
            </button>
            <button
              type="button"
              onClick={() => {
                setComposerInput('Compare carrier fee tariffs across East Africa');
              }}
              className="px-2.5 py-0.5 rounded-full bg-white/15 hover:bg-white/25 backdrop-blur-md transition-colors cursor-pointer"
            >
              Carrier fee tariffs
            </button>
          </div>
        </div>

        {/* Bottom indicator of garden hero */}
        <div className="relative z-10 flex items-center justify-between text-[11px] text-white/70">
          <span>Local-first workspace · Real-time reasoning</span>
          <span className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            On-device memory connected
          </span>
        </div>
      </div>

      {/* 3. Below the hero: ONLY 2 cards (Recents & Today's Focus) as requested */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* CARD 1: Recents */}
        <div className="bg-[var(--s)] border border-[var(--line)] rounded-[24px] p-6 shadow-[0_5px_25px_rgba(0,0,0,0.03)] flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-[var(--y)]" />
                <h3 className="text-[17px] font-bold text-[var(--t)] m-0">Recents</h3>
              </div>
              <button
                onClick={() => {
                  const newId = createNewResearchSession();
                  navigateTo('research', 'chat', newId);
                }}
                className="inline-flex items-center gap-1 text-[12px] font-bold text-[var(--y)] hover:underline cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>New study</span>
              </button>
            </div>

            <div className="divide-y divide-[var(--line)]">
              {projects.map((proj) => (
                <div
                  key={proj.id}
                  onClick={() => navigateTo('research', 'chat', proj.id)}
                  className="py-3.5 flex items-center justify-between gap-3 cursor-pointer hover:bg-[var(--s2)] -mx-2 px-3 rounded-xl transition-all group"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span
                      className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                      style={{ backgroundColor: proj.dotColor || '#f59e0b' }}
                    />
                    <div className="min-w-0">
                      <b className="block text-[13px] text-[var(--t)] truncate group-hover:text-[var(--y)] transition-colors">
                        {proj.title}
                      </b>
                      <small className="block text-[11px] text-[var(--m)] mt-0.5">
                        {proj.sourceCount} sources · {proj.status}
                      </small>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-[11px] font-semibold text-[var(--m)] px-2 py-0.5 rounded-md bg-[var(--s2)] group-hover:bg-[var(--line)] transition-colors">
                      Open
                    </span>
                    <ArrowUpRight className="w-4 h-4 text-[var(--m)] group-hover:text-[var(--t)] transition-colors" />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-5 pt-3 border-t border-[var(--line)] flex items-center justify-between text-[11.5px] text-[var(--m)]">
            <span>{projects.length} research projects stored</span>
            <button
              onClick={() => navigateTo('research', 'chat')}
              className="font-semibold text-[var(--t)] hover:underline flex items-center gap-1"
            >
              <span>View research workspace</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>
        </div>

        {/* CARD 2: Today's Focus */}
        <div className="bg-[var(--s)] border border-[var(--line)] rounded-[24px] p-6 shadow-[0_5px_25px_rgba(0,0,0,0.03)] flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Compass className="w-4 h-4 text-[var(--y)]" />
                <h3 className="text-[17px] font-bold text-[var(--t)] m-0">Today's Focus</h3>
              </div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--y)] bg-[var(--ys)] dark:bg-[#4a3818] px-2.5 py-1 rounded-full">
                Active Goal
              </span>
            </div>

            <h2 className="text-[24px] font-black mt-2 mb-2 tracking-tight text-[var(--t)] leading-tight">
              Validate the core problem
            </h2>
            <p className="text-[13px] text-[var(--m)] leading-relaxed m-0">
              68% of this research goal is connected across 9 sources, 2 discussions, and real-time user feedback.
            </p>

            {/* Progress bar */}
            <div className="mt-5">
              <div className="flex justify-between text-[11px] font-semibold text-[var(--t)] mb-1.5">
                <span>Problem validation completeness</span>
                <span className="font-mono text-[var(--y)] font-bold">68%</span>
              </div>
              <div className="h-2 bg-[var(--s2)] rounded-full overflow-hidden">
                <div
                  className="h-full bg-[var(--y)] rounded-full transition-all duration-700 shadow-sm"
                  style={{ width: '68%' }}
                />
              </div>
            </div>

            {/* Focus Metrics Badges */}
            <div className="grid grid-cols-3 gap-2.5 mt-5">
              <div className="p-3 rounded-xl bg-[var(--s2)] border border-[var(--line)] text-center">
                <b className="text-[15px] font-bold text-[var(--t)] block">12</b>
                <span className="text-[10.5px] text-[var(--m)]">Tabs linked</span>
              </div>
              <div className="p-3 rounded-xl bg-[var(--s2)] border border-[var(--line)] text-center">
                <b className="text-[15px] font-bold text-[var(--t)] block">7</b>
                <span className="text-[10.5px] text-[var(--m)]">Verified sources</span>
              </div>
              <div className="p-3 rounded-xl bg-[var(--s2)] border border-[var(--line)] text-center">
                <b className="text-[15px] font-bold text-[var(--t)] block">2</b>
                <span className="text-[10.5px] text-[var(--m)]">Tasks due</span>
              </div>
            </div>
          </div>

          <div className="mt-5 pt-3 border-t border-[var(--line)] flex items-center justify-between">
            <span className="text-[11.5px] text-[var(--m)]">
              Next action: Finalize passenger drop-off metric
            </span>
            <button
              onClick={() => navigateTo('research', 'chat', 'urugendo')}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#171717] dark:bg-[#f2eee7] text-white dark:text-[#171717] text-[12px] font-bold hover:opacity-90 active:scale-95 transition-all shadow-xs cursor-pointer"
            >
              <span>Open research</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
