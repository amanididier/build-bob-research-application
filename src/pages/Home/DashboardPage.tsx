import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { 
  ArrowUpRight, 
  Plus, 
  Sparkles, 
  Sun, 
  Moon, 
  ArrowRight,
  Clock,
  Compass,
  Target,
  X
} from 'lucide-react';
import sunflowerMorning from '../../assets/images/sunflower_garden_morning_user.png';
import sunflowerNight from '../../assets/images/sunflower_garden_night_1791540711934.jpg';
import { RoadmapWizardModal } from '../../components/roadmap/RoadmapWizardModal';

export const DashboardPage: React.FC = () => {
  const { 
    navigateTo, 
    projects, 
    tasks,
    userName, 
    createNewResearchSession,
    triggerThinking,
    addTask,
    activeResearchId
  } = useApp();

  // Determine daytime vs night from current clock
  const [timeMode, setTimeMode] = useState<'morning' | 'night'>(() => {
    const hour = new Date().getHours();
    return hour >= 6 && hour < 18 ? 'morning' : 'night';
  });

  const [isRoadmapWizardOpen, setIsRoadmapWizardOpen] = useState(false);
  const [isSetFocusModalOpen, setIsSetFocusModalOpen] = useState(false);
  const [customFocusText, setCustomFocusText] = useState('');
  const [selectedFocusProjectId, setSelectedFocusProjectId] = useState<string>(() => typeof window !== 'undefined' ? localStorage.getItem('bob_focus_project_id') || '' : '');
  const [showFocusPrompt, setShowFocusPrompt] = useState(false);
  const [focusPickerStep, setFocusPickerStep] = useState<'project' | 'task'>('project');
  const [selectedFocusOverride, setSelectedFocusOverride] = useState<string | null>(() => {
    return typeof window !== 'undefined' ? localStorage.getItem('bob_custom_focus_goal') : null;
  });

  const isMorning = timeMode === 'morning';
  const heroImage = isMorning ? sunflowerMorning : sunflowerNight;

  // The selected focus belongs to a project; tasks shown in the focus chooser stay scoped to it.
  const openTasks = tasks.filter((t) => !t.completed);
  const focusProject = projects.find((project) => project.id === selectedFocusProjectId) || projects[0] || null;
  const projectTasks = focusProject ? tasks.filter((task) => task.projectId === focusProject.id) : [];
  const projectOpenTasks = projectTasks.filter((task) => !task.completed);
  const dueToday = projectOpenTasks.filter((task) => (task.dueDate || '').toLowerCase().startsWith('today'));
  const focusTask = projectTasks.find((task) => task.title === selectedFocusOverride && !task.completed)
    || dueToday[0]
    || projectOpenTasks[0]
    || null;
  const doneInProject = projectTasks.filter((t) => t.completed).length;
  const focusProgress = projectTasks.length ? Math.round((doneInProject / projectTasks.length) * 100) : 0;
  const doneToday = tasks.filter((t) => t.completed).length;
  const activeFocusTitle = selectedFocusOverride || (focusTask ? focusTask.title : focusProject ? focusProject.title : 'Plan your first study');

  useEffect(() => {
    if (!selectedFocusOverride || !selectedFocusProjectId) return;
    const finishedFocus = tasks.some((task) => task.projectId === selectedFocusProjectId && task.title === selectedFocusOverride && task.completed);
    if (finishedFocus) setShowFocusPrompt(true);
  }, [tasks, selectedFocusOverride, selectedFocusProjectId]);

  const handleSaveCustomFocus = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customFocusText.trim()) return;
    const text = customFocusText.trim();
    const projectId = selectedFocusProjectId || focusProject?.id || activeResearchId;
    setSelectedFocusOverride(text);
    setSelectedFocusProjectId(projectId);
    setShowFocusPrompt(false);
    if (typeof window !== 'undefined') {
      localStorage.setItem('bob_custom_focus_goal', text);
      localStorage.setItem('bob_focus_project_id', projectId);
    }
    addTask(text, 'Today', projectId);
    setCustomFocusText('');
    setIsSetFocusModalOpen(false);
    triggerThinking('Focus Updated', `Set today’s focus for ${focusProject?.title || 'your project'} to "${text}"`, 'Focus active');
  };

  const handleSelectTaskAsFocus = (taskTitle: string, projectId = focusProject?.id || activeResearchId) => {
    setSelectedFocusOverride(taskTitle);
    setSelectedFocusProjectId(projectId);
    setShowFocusPrompt(false);
    if (typeof window !== 'undefined') {
      localStorage.setItem('bob_custom_focus_goal', taskTitle);
      localStorage.setItem('bob_focus_project_id', projectId);
    }
    setIsSetFocusModalOpen(false);
    triggerThinking('Focus Set', `Prioritized "${taskTitle}" in ${projects.find((project) => project.id === projectId)?.title || 'your project'}.`, 'Focus set');
  };

  return (
    <div className="w-full min-h-full pb-36 bg-[var(--bg)] animate-in fade-in duration-300">
      {/* 1. Full-bleed hero — spans the entire top of the page, no card wrapper */}
      <div className="relative w-full min-h-[220px] md:min-h-[280px] flex items-center justify-center overflow-hidden text-white group">
        {/* Background Image spanning 100% */}
        <div
          className="absolute inset-0 bg-cover bg-center transition-all duration-700 transform scale-100 group-hover:scale-[1.02]"
          style={{ backgroundImage: `url(${heroImage})` }}
        />
        {/* Ambient gradient overlay */}
        <div
          className={`absolute inset-0 transition-opacity duration-500 ${
            isMorning
              ? 'bg-gradient-to-t from-black/80 via-black/40 to-black/25'
              : 'bg-gradient-to-t from-black/85 via-black/50 to-black/35'
          }`}
        />

        {/* Center of the Hero: ONLY greeting question with user name */}
        <div className="relative z-10 max-w-3xl mx-auto px-6 py-10 sm:py-14 text-center animate-in fade-in zoom-in-95 duration-500">
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-black tracking-tight drop-shadow-md text-white mb-2">
            {isMorning ? `Good morning, ${userName || 'friend'}.` : `Good evening, ${userName || 'friend'}.`}
          </h1>
          <p className="text-sm sm:text-base text-white/90 max-w-2xl mx-auto font-normal leading-relaxed drop-shadow-sm">
            {isMorning
              ? 'What is the one thing you want to move forward today?'
              : 'What would you like to finish or clarify before the day ends?'}
          </p>
        </div>
      </div>

      {showFocusPrompt && (
        <div className="max-w-[1140px] mx-auto px-5 md:px-8 pt-5">
          <div className="rounded-2xl border border-[var(--y)]/50 bg-[var(--ys)] dark:bg-[#352b15] px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div><b className="text-[12px] text-[var(--t)]">Nice work finishing your focus.</b><p className="text-[11px] text-[var(--m)] mt-0.5">Would you like to choose the next important task for this project?</p></div>
            <div className="flex items-center gap-2"><button onClick={() => setShowFocusPrompt(false)} className="px-3 py-2 rounded-lg text-[11px] font-semibold text-[var(--m)] hover:bg-black/5">Not now</button><button onClick={() => { setFocusPickerStep('project'); setIsSetFocusModalOpen(true); setShowFocusPrompt(false); }} className="px-3 py-2 rounded-lg bg-[var(--y)] text-[#171717] text-[11px] font-bold">Choose another focus</button></div>
          </div>
        </div>
      )}

      {/* 2. Main Dashboard Content inside max-w container */}
      <div className="max-w-[1140px] mx-auto px-5 md:px-8 py-8 space-y-8">
        {/* Tab Navigation & Roadmap Wizard action */}
        <div className="h-12 border-b border-[var(--line)] flex items-center justify-between mb-6">
          <div className="flex gap-8 h-full">
            <button className="h-full text-[var(--t)] font-bold relative after:content-[''] after:h-[2.5px] after:bg-[var(--y)] after:absolute after:left-0 after:right-0 after:-bottom-[1px] cursor-pointer">
              Overview
            </button>
            <button
              onClick={() => navigateTo('research', 'chat')}
              className="h-full text-[#888] hover:text-[var(--t)] transition-colors font-medium cursor-pointer"
            >
              Research
            </button>
            <button
              onClick={() => navigateTo('tasks')}
              className="h-full text-[#888] hover:text-[var(--t)] transition-colors font-medium cursor-pointer"
            >
              Tasks
            </button>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setTimeMode((m) => (m === 'morning' ? 'night' : 'morning'))}
              title={`Switch to ${isMorning ? 'Night' : 'Morning'} view`}
              className="p-1.5 rounded-full bg-[var(--s2)] hover:bg-[var(--line)] border border-[var(--line)] text-[var(--m)] hover:text-[var(--t)] transition-colors cursor-pointer"
            >
              {isMorning ? <Moon className="w-4 h-4 text-indigo-400" /> : <Sun className="w-4 h-4 text-amber-400" />}
            </button>
          </div>
        </div>

      {/* 3. Below the hero: ONLY 2 cards (Recents & Today's Focus) as requested */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-5">
        
        {/* CARD 1: Recents */}
        <div className="bg-gradient-to-br from-[#eef7ff] to-white dark:from-[#18283b] dark:to-[var(--s)] border border-[#d7eaff] dark:border-[#29425c] rounded-[24px] p-6 shadow-[0_5px_25px_rgba(0,0,0,0.03)] flex flex-col justify-between animate-in fade-in slide-in-from-bottom-3 duration-500">
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
              {projects.slice(0, 4).map((proj) => (
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

            {projects.length > 4 && (
              <button
                onClick={() => navigateTo('research', 'chat')}
                className="w-full py-2.5 text-[11.5px] font-semibold text-[var(--m)] hover:text-[var(--t)] transition-colors cursor-pointer"
              >
                +{projects.length - 4} more in the research workspace
              </button>
            )}
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
        <div
          className="bg-gradient-to-br from-[#fff8df] to-white dark:from-[#332b18] dark:to-[var(--s)] border border-[#f5e7b4] dark:border-[#5b4b27] rounded-[24px] p-6 shadow-[0_5px_25px_rgba(0,0,0,0.03)] flex flex-col justify-between animate-in fade-in slide-in-from-bottom-3 duration-500"
          style={{ animationDelay: '120ms' }}
        >
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Compass className="w-4 h-4 text-[var(--y)]" />
                <h3 className="text-[17px] font-bold text-[var(--t)] m-0">Today's Focus</h3>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => { setFocusPickerStep('project'); setIsSetFocusModalOpen(true); }}
                  className="px-2.5 py-1 text-xs font-bold rounded-lg bg-[var(--y)]/20 hover:bg-[var(--y)]/30 border border-[var(--y)]/50 text-[var(--t)] flex items-center gap-1 transition-all"
                >
                  <Target className="w-3 h-3 text-[var(--y)]" />
                  <span>Set Focus</span>
                </button>
                <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--y)] bg-[var(--ys)] dark:bg-[#4a3818] px-2.5 py-1 rounded-full">
                  Active Goal
                </span>
              </div>
            </div>

            <h2 className="text-[22px] font-black mt-2 mb-2 tracking-tight text-[var(--t)] leading-tight truncate">
              {activeFocusTitle}
            </h2>
            <p className="text-[13px] text-[var(--m)] leading-relaxed m-0 line-clamp-2">
              {focusProject
                ? `${focusProgress}% of “${focusProject.title}” is complete across ${focusProject.sourceCount} linked sources and ${projectTasks.length} tracked tasks.`
                : 'Start a study and Bob will surface today’s priorities here automatically.'}
            </p>

            {/* Progress bar */}
            <div className="mt-5">
              <div className="flex justify-between text-[11px] font-semibold text-[var(--t)] mb-1.5">
                <span>Goal completeness</span>
                <span className="font-mono text-[var(--y)] font-bold">{focusProgress}%</span>
              </div>
              <div className="h-2 bg-[var(--s2)] rounded-full overflow-hidden">
                <div
                  className="h-full bg-[var(--y)] rounded-full transition-all duration-700 shadow-sm"
                  style={{ width: `${focusProgress}%` }}
                />
              </div>
            </div>

            {/* Focus Metrics Badges */}
            <div className="grid grid-cols-3 gap-2.5 mt-5">
              <div className="p-3 rounded-xl bg-[var(--s2)] border border-[var(--line)] text-center">
                <b className="text-[15px] font-bold text-[var(--t)] block">{focusProject ? focusProject.sourceCount : 0}</b>
                <span className="text-[10.5px] text-[var(--m)]">Sources linked</span>
              </div>
              <div className="p-3 rounded-xl bg-[var(--s2)] border border-[var(--line)] text-center">
                <b className="text-[15px] font-bold text-[var(--t)] block">{openTasks.length}</b>
                <span className="text-[10.5px] text-[var(--m)]">Open tasks</span>
              </div>
              <div className="p-3 rounded-xl bg-[var(--s2)] border border-[var(--line)] text-center">
                <b className="text-[15px] font-bold text-[var(--t)] block">{doneToday}</b>
                <span className="text-[10.5px] text-[var(--m)]">Done so far</span>
              </div>
            </div>
          </div>

          <div className="mt-5 pt-3 border-t border-[var(--line)] flex items-center justify-between gap-3">
            <span className="text-[11.5px] text-[var(--m)] truncate">
              {focusTask ? `Next action: ${focusTask.title}` : 'Next action: start a new study'}
            </span>
            <button
              onClick={() => navigateTo('research', 'chat', focusProject ? focusProject.id : undefined)}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#171717] dark:bg-[#f2eee7] text-white dark:text-[#171717] text-[12px] font-bold hover:opacity-90 active:scale-95 transition-all shadow-xs cursor-pointer shrink-0"
            >
              <span>Open research</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* CARD 3: Create / discover — a distinct, colorful entry point */}
        <div className="rounded-[24px] p-6 border border-[#dcd8ff] dark:border-[#38345c] bg-gradient-to-br from-[#f0efff] via-white to-[#eaf7ff] dark:from-[#25233f] dark:via-[#171b25] dark:to-[#172b3c] shadow-[0_5px_25px_rgba(0,0,0,0.03)] flex flex-col justify-between animate-in fade-in slide-in-from-bottom-3 duration-500" style={{ animationDelay: '220ms' }}>
          <div>
            <div className="w-10 h-10 rounded-2xl bg-[#e4e0ff] dark:bg-[#38345c] text-[#6555d9] dark:text-[#c4baff] grid place-items-center mb-4">
              <Sparkles className="w-5 h-5" />
            </div>
            <p className="text-[10px] uppercase tracking-[0.14em] font-extrabold text-[#6555d9] dark:text-[#c4baff] mb-2">A FRESH START</p>
            <h3 className="text-[19px] font-extrabold tracking-tight text-[var(--t)] mb-2">Explore a new idea</h3>
            <p className="text-[12.5px] leading-relaxed text-[var(--m)]">Start with a question or a source. Bob will help you explore it first; a roadmap is optional and only appears when it makes sense.</p>
          </div>
          <button
            type="button"
            onClick={() => { const newId = createNewResearchSession(); navigateTo('research', 'chat', newId); }}
            className="mt-6 w-full inline-flex items-center justify-center gap-2 rounded-xl px-4 py-3 bg-[#6555d9] hover:bg-[#5545c9] text-white text-[12px] font-bold transition-colors shadow-sm"
          >
            Start exploring <ArrowRight className="w-4 h-4" />
          </button>
        </div>

      </div>

      {/* Set Focus Modal */}
      {isSetFocusModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative w-full max-w-md bg-[var(--s)] border border-[var(--line)] rounded-[24px] shadow-2xl p-6">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Target className="w-4 h-4 text-[var(--y)]" />
                <h3 className="text-base font-extrabold text-[var(--t)]">Set Today's Focus</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsSetFocusModalOpen(false)}
                className="p-1.5 rounded-full hover:bg-[var(--s2)] text-[var(--m)] hover:text-[var(--t)]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Yellow accent bar — this info customizes the experience */}
            <div className="mb-4 px-3 py-2 rounded-xl bg-[var(--y)]/15 border border-[var(--y)]/40 text-[11px] text-[var(--t)]">
              This focus is always used to customize your experience with Bob.
            </div>

            <p className="text-xs text-[var(--m)] mb-3">
              First choose the project you want to move forward. Then select the one task that matters most today.
            </p>

            {focusPickerStep === 'project' ? (
              <div className="mb-4">
                <div className="text-[11px] font-bold text-[var(--m)] mb-2">1 · Choose your main project</div>
                <div className="space-y-2">
                  {projects.map((project) => (
                    <button key={project.id} type="button" onClick={() => {
                      setSelectedFocusProjectId(project.id);
                      setSelectedFocusOverride(null);
                      if (typeof window !== 'undefined') { localStorage.setItem('bob_focus_project_id', project.id); localStorage.removeItem('bob_custom_focus_goal'); }
                      setFocusPickerStep('task');
                    }} className={`w-full px-3.5 py-3 rounded-xl border text-left flex items-center justify-between gap-3 transition-colors ${(selectedFocusProjectId || focusProject?.id) === project.id ? 'bg-[var(--y)]/15 border-[var(--y)] text-[var(--t)]' : 'bg-[var(--s2)] border-[var(--line)] text-[var(--m)] hover:border-[var(--y)]'}`}>
                      <span className="min-w-0"><b className="block text-[12px] truncate">{project.title}</b><small className="block mt-0.5 text-[10px] opacity-70">{project.sourceCount} sources · {project.openTasks} open tasks</small></span>
                      <ArrowRight className="w-4 h-4 shrink-0" />
                    </button>
                  ))}
                </div>
                <button type="button" onClick={() => setFocusPickerStep('task')} className="mt-3 w-full px-3 py-2.5 rounded-xl border border-dashed border-[var(--line)] text-[11px] font-semibold text-[var(--m)] hover:border-[var(--y)] hover:text-[var(--t)]">Other · define a custom focus</button>
              </div>
            ) : (
              <div className="mb-4">
                <div className="flex items-center justify-between gap-2 mb-2">
                  <div className="text-[11px] font-bold text-[var(--m)]">2 · What matters most in {focusProject?.title || 'this project'}?</div>
                  <button type="button" onClick={() => setFocusPickerStep('project')} className="text-[10px] font-semibold text-[var(--y)] hover:underline">Change project</button>
                </div>
                <div className="space-y-1.5 max-h-40 overflow-y-auto">
                  {projectOpenTasks.length ? projectOpenTasks.slice(0, 8).map((task) => (
                    <button key={task.id} type="button" onClick={() => handleSelectTaskAsFocus(task.title, focusProject?.id)} className="w-full p-2.5 rounded-xl border border-[var(--line)] hover:border-[var(--y)] bg-[var(--s2)]/40 hover:bg-[var(--s2)] text-left text-xs font-semibold text-[var(--t)] flex items-center justify-between transition-colors">
                      <span className="truncate">{task.title}</span><span className="text-[10px] text-[var(--m)] font-mono">{task.dueDate}</span>
                    </button>
                  )) : <p className="text-[11px] text-[var(--m)] py-2">No open tasks in this project yet. You can create a custom focus below.</p>}
                </div>
              </div>
            )}
            {/* Custom Focus Form */}
            {focusPickerStep === 'task' && <form onSubmit={handleSaveCustomFocus} className="space-y-3">
              <div className="text-[11px] font-bold text-[var(--m)]">Or Custom Goal:</div>
              <input
                type="text"
                value={customFocusText}
                onChange={(e) => setCustomFocusText(e.target.value)}
                placeholder="e.g., Finalize low latency TTS audio synthesis..."
                className="w-full px-3.5 py-2.5 rounded-xl bg-[var(--s2)] border border-[var(--line)] text-xs text-[var(--t)] focus:outline-none focus:border-[var(--y)]"
              />
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-[var(--line)]">
                <button
                  type="button"
                  onClick={() => setIsSetFocusModalOpen(false)}
                  className="px-3 py-1.5 text-xs text-[var(--m)] hover:text-[var(--t)] font-semibold rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-bold bg-[var(--y)] hover:bg-[#e0ac15] text-[#171717] rounded-xl shadow-sm transition-all"
                >
                  Set as Today's Focus
                </button>
              </div>
            </form>}
          </div>
        </div>
      )}

      {/* Roadmap Wizard Modal */}
      <RoadmapWizardModal
        isOpen={isRoadmapWizardOpen}
        onClose={() => setIsRoadmapWizardOpen(false)}
        onFinishRoadmap={(data) => {
          data.tasks.forEach((t) => {
            addTask(t.title, data.deadline);
          });
          navigateTo('research', 'tasks');
        }}
      />
      </div>
    </div>
  );
};
