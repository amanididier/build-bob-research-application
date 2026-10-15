import React, { useRef, useState } from 'react';
import { useApp } from '../../context/AppContext';
import { ArrowUp, LayoutDashboard, MessageSquare, Settings, Sparkles, Search, BookOpen, GitCompare, Map } from 'lucide-react';
import sunflowerMorning from '../../assets/images/sunflower_garden_morning_user.png';
import sunflowerNight from '../../assets/images/sunflower_garden_night_1791540711934.jpg';
import bobOrb from '../../assets/images/bob_mascot_orb_1791540734514.jpg';
import bobLogo from '../../assets/images/bob_mascot_logo_1790332628517.jpg';

const SUGGESTIONS = [
  { title: 'Start a research session', description: 'Explore a question with Bob, one step at a time.', prompt: 'Help me explore a question and understand what I should investigate first.', image: bobOrb, icon: Search, tint: 'bg-[#e6f4ff]' },
  { title: 'Summarize a source', description: 'Turn a long article or document into clear takeaways.', prompt: 'Help me summarize a source into the most important ideas and evidence.', image: sunflowerMorning, icon: BookOpen, tint: 'bg-[#fff4d5]' },
  { title: 'Compare ideas', description: 'Put options side by side and find meaningful differences.', prompt: 'Help me compare a few options and identify the strongest evidence for each.', image: sunflowerNight, icon: GitCompare, tint: 'bg-[#e8e8ff]' },
  { title: 'Plan a project', description: 'Build a practical roadmap shaped around your goal.', prompt: 'I want to create a project roadmap. Help me plan my goal.', image: bobLogo, icon: Map, tint: 'bg-[#e4f6e9]' }
];

export const HomePage: React.FC = () => {
  const { userName, navigateTo, createNewResearchSession } = useApp();
  const [draft, setDraft] = useState('');
  const composerRef = useRef<HTMLInputElement>(null);

  const startResearch = (prompt: string) => {
    const clean = prompt.trim();
    if (!clean) return;
    try { localStorage.setItem('bob_pending_research_prompt', clean); } catch {}
    const id = createNewResearchSession();
    navigateTo('research', 'chat', id);
  };

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    startResearch(draft);
  };

  return (
    <div className="min-h-full bg-[var(--bg)] pb-14">
      <header className="sticky top-0 z-20 flex items-center justify-center px-4 py-4 bg-[var(--bg)]/85 backdrop-blur-xl border-b border-[var(--line)]">
        <nav className="inline-flex items-center gap-1 p-1 rounded-full border border-[var(--line)] bg-[var(--s)] shadow-sm" aria-label="Main navigation">
          <button type="button" onClick={() => navigateTo('dashboard')} className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-[12px] font-semibold text-[var(--t)] hover:bg-[var(--s2)]"><LayoutDashboard className="w-3.5 h-3.5" />Dashboard</button>
          <button type="button" onClick={() => navigateTo('chat')} className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-[12px] font-semibold text-[var(--t)] hover:bg-[var(--s2)]"><MessageSquare className="w-3.5 h-3.5" />Chat</button>
          <button type="button" onClick={() => navigateTo('settings')} className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-[12px] font-semibold text-[var(--t)] hover:bg-[var(--s2)]"><Settings className="w-3.5 h-3.5" />Settings</button>
        </nav>
      </header>

      <section className="relative min-h-[450px] md:min-h-[490px] flex items-center justify-center overflow-hidden">
        <img src={sunflowerMorning} alt="" className="absolute inset-0 w-full h-full object-cover object-center" />
        <div className="absolute inset-0 bg-gradient-to-b from-black/45 via-black/45 to-black/70" />
        <div className="relative z-10 w-full max-w-3xl mx-auto px-5 py-12 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/15 border border-white/20 text-white/90 text-[10px] font-bold tracking-[0.16em] uppercase mb-5 backdrop-blur-md"><Sparkles className="w-3.5 h-3.5 text-[#f5c842]" />Your research companion</div>
          <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-white drop-shadow-md leading-tight">What would you like to explore{userName ? `, ${userName}` : ''}?</h1>
          <p className="mt-3 text-[14px] sm:text-[16px] leading-relaxed text-white/85 max-w-xl mx-auto">Start with a question, a source, or an idea that you have not figured out yet. We’ll work through it together.</p>
          <form onSubmit={submit} className="mt-7 max-w-2xl mx-auto flex items-center gap-2 p-2 pl-4 rounded-[22px] bg-white/95 dark:bg-[#171717]/95 border border-white/40 shadow-2xl backdrop-blur-xl">
            <input ref={composerRef} value={draft} onChange={(event) => setDraft(event.target.value)} placeholder="Ask Bob anything you want to understand…" className="flex-1 min-w-0 h-11 bg-transparent outline-none text-[13px] text-neutral-900 dark:text-white placeholder:text-neutral-500 dark:placeholder:text-neutral-400" aria-label="Message Bob" />
            <button type="submit" disabled={!draft.trim()} className="w-11 h-11 rounded-[15px] bg-[#f5c842] text-[#171717] grid place-items-center hover:bg-[#edbd29] disabled:opacity-40 transition-all" aria-label="Start with Bob"><ArrowUp className="w-5 h-5" /></button>
          </form>
          <p className="mt-3 text-[10.5px] text-white/70">You can start small. Bob will ask only for the details that matter.</p>
        </div>
      </section>

      <section className="max-w-[1120px] mx-auto px-5 md:px-8 pt-9">
        <div className="flex items-end justify-between gap-4 mb-4">
          <div>
            <p className="text-[10px] uppercase tracking-[0.15em] font-extrabold text-[var(--m)]">A GOOD PLACE TO BEGIN</p>
            <h2 className="mt-1 text-[20px] sm:text-[23px] font-extrabold tracking-tight text-[var(--t)]">What are you working on today?</h2>
          </div>
          <span className="hidden sm:block text-[11px] text-[var(--m)]">Choose a starting point</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {SUGGESTIONS.map((item) => {
            const Icon = item.icon;
            return (
              <button key={item.title} type="button" onClick={() => { setDraft(item.prompt); composerRef.current?.focus(); }} className="group text-left rounded-[22px] overflow-hidden border border-[var(--line)] bg-[var(--s)] hover:-translate-y-0.5 hover:shadow-lg transition-all">
                <div className={`relative h-[112px] overflow-hidden ${item.tint}`}>
                  <img src={item.image} alt="" className="w-full h-full object-cover opacity-90 group-hover:scale-[1.04] transition-transform duration-500" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/25 to-transparent" />
                  <span className="absolute bottom-3 left-3 w-8 h-8 rounded-xl bg-white/90 text-[#171717] grid place-items-center shadow-sm"><Icon className="w-4 h-4" /></span>
                </div>
                <div className="p-4">
                  <h3 className="text-[13px] font-extrabold text-[var(--t)]">{item.title}</h3>
                  <p className="mt-1.5 text-[11.5px] leading-relaxed text-[var(--m)] min-h-[34px]">{item.description}</p>
                  <span className="mt-3 inline-flex items-center gap-1.5 text-[10.5px] font-bold text-[var(--t)] group-hover:text-[#b88b00]">Use this starting point <ArrowUp className="w-3 h-3 rotate-45" /></span>
                </div>
              </button>
            );
          })}
        </div>
      </section>
    </div>
  );
};
