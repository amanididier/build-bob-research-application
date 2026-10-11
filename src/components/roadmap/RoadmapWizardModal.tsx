import React, { useState } from 'react';
import { 
  X, 
  Sparkles, 
  ArrowRight, 
  ArrowLeft, 
  Check, 
  Clock, 
  Calendar, 
  Layers, 
  GripVertical, 
  HelpCircle, 
  AlertCircle, 
  ChevronDown, 
  ChevronUp, 
  Wrench, 
  ShieldAlert, 
  Target,
  ExternalLink,
  Copy,
  Plus
} from 'lucide-react';
import { LeanClockPicker } from './LeanClockPicker';
import { useApp } from '../../context/AppContext';

export interface PhasedTask {
  id: string;
  phase: string;
  title: string;
  estimatedTime: string;
  priority: number;
  steps: Array<{
    id: string;
    stepNumber: number;
    title: string;
    instruction: string;
    tool: 'youtube' | 'chatgpt' | 'claude_code' | 'docs' | 'other';
    links?: Array<{ title: string; url: string }>;
    prompts?: string[];
  }>;
}

interface RoadmapWizardModalProps {
  isOpen: boolean;
  onClose: () => void;
  onFinishRoadmap: (roadmapData: {
    goal: string;
    tools: string[];
    constraints: string[];
    deadline: string;
    tasks: PhasedTask[];
  }) => void;
}

export const RoadmapWizardModal: React.FC<RoadmapWizardModalProps> = ({
  isOpen,
  onClose,
  onFinishRoadmap,
}) => {
  const { activeResearchId, projects, addTask, triggerThinking } = useApp();

  const [currentSlide, setCurrentSlide] = useState<number>(0);

  // Form State
  const [goal, setGoal] = useState('Build real-time low latency Text-to-Speech & Speech synthesis for Bob assistant');
  const [selectedTools, setSelectedTools] = useState<string[]>([
    'ChatGPT',
    'Claude Code',
    'YouTube Architecture Videos',
    'Web Audio API Docs',
  ]);
  const [customToolInput, setCustomToolInput] = useState('');

  const [selectedConstraints, setSelectedConstraints] = useState<string[]>([
    'Sub-500ms initial response latency',
    'No expensive GPU server requirement',
    'Zero external paid API keys for speech baseline',
  ]);
  const [customConstraintInput, setCustomConstraintInput] = useState('');

  const [deadlinePeriod, setDeadlinePeriod] = useState<string>('Today');
  const [customDate, setCustomDate] = useState<string>('2026-10-12');
  const [customTime, setCustomTime] = useState<string>('20:00');
  const [isClockOpen, setIsClockOpen] = useState(false);

  // Phases & Tasks
  const [proposedTasks, setProposedTasks] = useState<PhasedTask[]>([
    {
      id: 'pt-1',
      phase: 'Phase 1: Architecture & TTS Research',
      title: 'Analyze TTS models & evaluate latency benchmarks',
      estimatedTime: '45 mins',
      priority: 1,
      steps: [
        {
          id: 's-1',
          stepNumber: 1,
          title: 'Watch TTS & Streaming Audio Architectural breakdown',
          instruction: 'Watch suggested high-yield video breakdowns on how modern real-time Web Audio and speech synthesis pipelines achieve sub-500ms voice output.',
          tool: 'youtube',
          links: [
            { title: 'YouTube: Ultra-low latency TTS streaming architectures', url: 'https://youtube.com/results?search_query=low+latency+tts+streaming+architecture' },
            { title: 'YouTube: Web Audio API & AudioBuffer worklets deep dive', url: 'https://youtube.com/results?search_query=web+audio+api+streaming+playback' }
          ]
        },
        {
          id: 's-2',
          stepNumber: 2,
          title: 'Plan integration prompts with ChatGPT / Claude',
          instruction: 'Prompt your AI reasoning model using the structured deep inquiry prompts below. Click Copy to clipboard on each prompt.',
          tool: 'chatgpt',
          prompts: [
            'How does streaming TTS work under the hood and which lightweight models or Web Speech fallbacks work best for immediate feedback?',
            'Which streaming architecture delivers faster Time-To-First-Byte (TTFB) and feels genuinely real-time to users?',
            'How do I integrate a zero-latency audio buffer and speech synthesizer directly into my Bob Companion project?',
            'Create for me a strong complete prompt to provide my building AI (Claude Code) including verification tests and error boundaries.'
          ]
        },
        {
          id: 's-3',
          stepNumber: 3,
          title: 'Execute implementation prompts in Claude Code',
          instruction: 'Paste the generated prompts into Claude Code in your terminal. Paste them one at a time and run the verification tests between each step.',
          tool: 'claude_code'
        }
      ]
    },
    {
      id: 'pt-2',
      phase: 'Phase 2: Local Audio Pipeline Integration',
      title: 'Connect Web Audio Chime generator & synthesis fallback',
      estimatedTime: '1 hour',
      priority: 2,
      steps: [
        {
          id: 's-4',
          stepNumber: 1,
          title: 'Verify audio worklet and chime frequencies',
          instruction: 'Test dual harmonic chime oscillators (659Hz, 830Hz, 987Hz) for proactive speech rings.',
          tool: 'docs'
        },
        {
          id: 's-5',
          stepNumber: 2,
          title: 'Benchmark memory allocation',
          instruction: 'Ensure Web Audio context never leaks oscillators and handles browser autoplay policies.',
          tool: 'chatgpt'
        }
      ]
    },
    {
      id: 'pt-3',
      phase: 'Phase 3: End-to-End User Verification',
      title: 'Validate 45s proactive speech ring and focus pacing',
      estimatedTime: '30 mins',
      priority: 3,
      steps: [
        {
          id: 's-6',
          stepNumber: 1,
          title: 'Simulate idle and active tab transitions',
          instruction: 'Trigger the green outer arc and verify the 45-second timer transitions smoothly to white if unanswered.',
          tool: 'other'
        }
      ]
    }
  ]);

  const [expandedTask, setExpandedTask] = useState<string>('pt-1');
  const [bobCorrectionNotice, setBobCorrectionNotice] = useState<string | null>(null);

  if (!isOpen) return null;

  // Move tasks up/down
  const moveTask = (index: number, direction: 'up' | 'down') => {
    const newTasks = [...proposedTasks];
    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= newTasks.length) return;

    const temp = newTasks[index];
    newTasks[index] = newTasks[targetIdx];
    newTasks[targetIdx] = temp;

    // Recalculate priority
    newTasks.forEach((t, i) => (t.priority = i + 1));
    setProposedTasks(newTasks);

    // Bob intelligent check
    if (newTasks[0].id === 'pt-3') {
      setBobCorrectionNotice(
        'Bob Suggestion: "End-to-End Verification" is typically best after Phase 1 and 2 are built. You can keep this arrangement if you prefer, or move it back to the end.'
      );
    } else {
      setBobCorrectionNotice(null);
    }
  };

  const handleFinish = () => {
    triggerThinking('Roadmap Activated', 'Bob locked in your 3-phase research roadmap.', 'Unlocking Task 1 steps');
    onFinishRoadmap({
      goal,
      tools: selectedTools,
      constraints: selectedConstraints,
      deadline: `${deadlinePeriod} (${customDate} ${customTime})`,
      tasks: proposedTasks,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-[var(--s)] border border-[var(--line)] rounded-[26px] shadow-2xl p-6 sm:p-8 flex flex-col max-h-[90vh] overflow-hidden">
        {/* Glow corner ambient */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-[var(--y)]/10 rounded-full blur-3xl pointer-events-none" />

        {/* Modal Top Header */}
        <div className="flex items-center justify-between pb-4 border-b border-[var(--line)] shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[var(--y)]/20 border border-[var(--y)]/50 flex items-center justify-center text-[var(--y)]">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <div className="text-[10px] uppercase font-bold tracking-wider text-[var(--y)]">
                Project Roadmapping Phase
              </div>
              <h2 className="text-lg sm:text-xl font-extrabold text-[var(--t)] tracking-tight">
                {currentSlide === 0 && '1. Identify Core Research Goal'}
                {currentSlide === 1 && '2. Research & Building Tools'}
                {currentSlide === 2 && '3. Constraints & Guardrails'}
                {currentSlide === 3 && '4. Deadlines & Scheduling'}
                {currentSlide === 4 && '5. Approve Phased Project Plan'}
              </h2>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-[var(--s2)] text-[var(--m)] hover:text-[var(--t)] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Slide Steps Progress Indicator */}
        <div className="flex items-center gap-1.5 my-4 shrink-0">
          {[0, 1, 2, 3, 4].map((step) => (
            <div
              key={step}
              className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${
                step <= currentSlide ? 'bg-[var(--y)]' : 'bg-[var(--line)]'
              }`}
            />
          ))}
        </div>

        {/* Content Body based on currentSlide */}
        <div className="flex-1 overflow-y-auto pr-1 py-1">
          {/* SLIDE 0: MAIN GOAL */}
          {currentSlide === 0 && (
            <div className="space-y-4">
              <p className="text-xs text-[var(--m)] leading-relaxed">
                Tell Bob what you are aiming to accomplish. Bob will structure your phases, research tabs, and step-by-step verification accordingly.
              </p>
              <div>
                <label className="block text-xs font-semibold text-[var(--t)] mb-1.5">
                  Main Research & Build Goal:
                </label>
                <textarea
                  value={goal}
                  onChange={(e) => setGoal(e.target.value)}
                  rows={3}
                  className="w-full px-4 py-3 rounded-2xl bg-[var(--s2)] border border-[var(--line)] text-xs text-[var(--t)] focus:outline-none focus:border-[var(--y)] resize-none leading-relaxed"
                  placeholder="Describe your research objective..."
                />
              </div>

              <div>
                <div className="text-[11px] font-semibold text-[var(--m)] mb-2">Or select a quick starter goal:</div>
                <div className="space-y-2">
                  {[
                    'Design ultra-low latency TTS & Voice synthesis with Web Audio',
                    'Validate passenger booking friction and cancellation reasons across transit apps',
                    'Implement sub-400MB sparse attention local LLM allocation on consumer hardware',
                  ].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setGoal(preset)}
                      className={`w-full p-3 rounded-xl border text-left text-xs font-medium transition-all ${
                        goal === preset
                          ? 'border-[var(--y)] bg-[var(--y)]/10 text-[var(--t)] font-semibold'
                          : 'border-[var(--line)] bg-[var(--s2)]/40 hover:bg-[var(--s2)] text-[var(--m)] hover:text-[var(--t)]'
                      }`}
                    >
                      {preset}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* SLIDE 1: TOOLS */}
          {currentSlide === 1 && (
            <div className="space-y-4">
              <p className="text-xs text-[var(--m)]">
                Which AI chatbots, coding engines, or documentation tools will you use during this research?
              </p>
              <div className="grid grid-cols-2 gap-2">
                {[
                  'ChatGPT',
                  'Claude',
                  'Claude Code',
                  'YouTube Architecture Videos',
                  'Google Scholar',
                  'Web Audio API Docs',
                  'GitHub Repositories',
                  'Stack Overflow',
                ].map((tool) => {
                  const isSelected = selectedTools.includes(tool);
                  return (
                    <button
                      key={tool}
                      type="button"
                      onClick={() =>
                        setSelectedTools((prev) =>
                          isSelected ? prev.filter((t) => t !== tool) : [...prev, tool]
                        )
                      }
                      className={`p-3 rounded-xl border text-left text-xs font-medium flex items-center justify-between transition-all ${
                        isSelected
                          ? 'border-[var(--y)] bg-[var(--y)]/10 text-[var(--t)] font-semibold'
                          : 'border-[var(--line)] bg-[var(--s2)]/40 hover:bg-[var(--s2)] text-[var(--m)] hover:text-[var(--t)]'
                      }`}
                    >
                      <span>{tool}</span>
                      {isSelected && <Check className="w-3.5 h-3.5 text-[var(--y)]" />}
                    </button>
                  );
                })}
              </div>

              {/* Custom tool input */}
              <div className="flex gap-2 pt-2">
                <input
                  type="text"
                  value={customToolInput}
                  onChange={(e) => setCustomToolInput(e.target.value)}
                  placeholder="Enter custom tool (e.g., Perplexity, vLLM, Cursor)..."
                  className="flex-1 px-3.5 py-2 text-xs rounded-xl bg-[var(--s2)] border border-[var(--line)] text-[var(--t)] focus:outline-none focus:border-[var(--y)]"
                />
                <button
                  type="button"
                  onClick={() => {
                    if (customToolInput.trim() && !selectedTools.includes(customToolInput.trim())) {
                      setSelectedTools((prev) => [...prev, customToolInput.trim()]);
                      setCustomToolInput('');
                    }
                  }}
                  className="px-3 py-2 rounded-xl bg-[var(--s2)] border border-[var(--line)] text-xs font-semibold hover:bg-[var(--line)]"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}

          {/* SLIDE 2: CONSTRAINTS */}
          {currentSlide === 2 && (
            <div className="space-y-4">
              <p className="text-xs text-[var(--m)]">
                What constraints should Bob respect while prioritizing tasks and steps?
              </p>
              <div className="space-y-2">
                {[
                  'Sub-500ms initial response latency',
                  'Zero external paid API keys for speech baseline',
                  'Local-first privacy: no tab content sent to third parties',
                  'Memory cap: under 400MB RAM footprint on laptop',
                  'Completion required before end-of-day sprint review',
                ].map((constraint) => {
                  const isSelected = selectedConstraints.includes(constraint);
                  return (
                    <button
                      key={constraint}
                      type="button"
                      onClick={() =>
                        setSelectedConstraints((prev) =>
                          isSelected ? prev.filter((c) => c !== constraint) : [...prev, constraint]
                        )
                      }
                      className={`w-full p-3 rounded-xl border text-left text-xs font-medium flex items-center justify-between transition-all ${
                        isSelected
                          ? 'border-[var(--y)] bg-[var(--y)]/10 text-[var(--t)] font-semibold'
                          : 'border-[var(--line)] bg-[var(--s2)]/40 hover:bg-[var(--s2)] text-[var(--m)] hover:text-[var(--t)]'
                      }`}
                    >
                      <span>{constraint}</span>
                      {isSelected && <Check className="w-3.5 h-3.5 text-[var(--y)]" />}
                    </button>
                  );
                })}
              </div>

              {/* Custom constraint */}
              <div className="flex gap-2 pt-2">
                <input
                  type="text"
                  value={customConstraintInput}
                  onChange={(e) => setCustomConstraintInput(e.target.value)}
                  placeholder="Enter custom constraint (e.g. must support offline mode)..."
                  className="flex-1 px-3.5 py-2 text-xs rounded-xl bg-[var(--s2)] border border-[var(--line)] text-[var(--t)] focus:outline-none focus:border-[var(--y)]"
                />
                <button
                  type="button"
                  onClick={() => {
                    if (customConstraintInput.trim() && !selectedConstraints.includes(customConstraintInput.trim())) {
                      setSelectedConstraints((prev) => [...prev, customConstraintInput.trim()]);
                      setCustomConstraintInput('');
                    }
                  }}
                  className="px-3 py-2 rounded-xl bg-[var(--s2)] border border-[var(--line)] text-xs font-semibold hover:bg-[var(--line)]"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}

          {/* SLIDE 3: DEADLINES & LEAN CLOCK */}
          {currentSlide === 3 && (
            <div className="space-y-4">
              <p className="text-xs text-[var(--m)]">
                Choose estimated milestones. Bob will pace check-ins and suggest rest intervals accordingly.
              </p>

              {/* Quick Period Selection Buttons */}
              <div className="grid grid-cols-4 gap-2">
                {['Today', 'In 2 Days', 'This Weekend', 'Next Week'].map((period) => (
                  <button
                    key={period}
                    type="button"
                    onClick={() => setDeadlinePeriod(period)}
                    className={`py-2 px-3 rounded-xl border text-center text-xs font-medium transition-all ${
                      deadlinePeriod === period
                        ? 'border-[var(--y)] bg-[var(--y)]/10 text-[var(--t)] font-bold'
                        : 'border-[var(--line)] bg-[var(--s2)]/40 hover:bg-[var(--s2)] text-[var(--m)] hover:text-[var(--t)]'
                    }`}
                  >
                    {period}
                  </button>
                ))}
              </div>

              {/* Date & Lean Clock Section */}
              <div className="bg-[var(--s2)]/50 border border-[var(--line)] rounded-2xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs font-bold text-[var(--t)]">
                    <Calendar className="w-3.5 h-3.5 text-[var(--y)]" />
                    <span>Target Date:</span>
                  </div>
                  <input
                    type="date"
                    value={customDate}
                    onChange={(e) => setCustomDate(e.target.value)}
                    className="px-3 py-1.5 rounded-xl bg-[var(--s)] border border-[var(--line)] text-xs text-[var(--t)] focus:outline-none"
                  />
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-[var(--line)]">
                  <div className="flex items-center gap-2 text-xs font-bold text-[var(--t)]">
                    <Clock className="w-3.5 h-3.5 text-[var(--y)]" />
                    <span>Target Hour & Minute:</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsClockOpen((prev) => !prev)}
                    className="px-3.5 py-1.5 rounded-xl bg-[var(--y)]/20 border border-[var(--y)]/60 text-[var(--t)] text-xs font-extrabold flex items-center gap-1.5 hover:bg-[var(--y)]/30 transition-all"
                  >
                    <span>{customTime}</span>
                    <span className="text-[10px] text-[var(--m)]">(Open Lean Clock)</span>
                  </button>
                </div>
              </div>

              {/* Lean Clock Picker Modal Popup */}
              {isClockOpen && (
                <div className="flex justify-center py-2 animate-in fade-in duration-150">
                  <LeanClockPicker
                    initialTime={customTime}
                    onSelectTime={(newTime) => setCustomTime(newTime)}
                    onClose={() => setIsClockOpen(false)}
                  />
                </div>
              )}
            </div>
          )}

          {/* SLIDE 4: PHASES, REORDERING & PROPOSALS */}
          {currentSlide === 4 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-xs text-[var(--m)]">
                  Bob organized your project into 3 phased tasks. You can re-arrange priorities below:
                </p>
                <div className="text-[10px] font-bold text-[var(--y)] uppercase">Drag / Reorder</div>
              </div>

              {bobCorrectionNotice && (
                <div className="p-3 rounded-xl bg-[var(--y)]/10 border border-[var(--y)]/40 flex items-start gap-2.5 text-xs text-[var(--t)] animate-in fade-in">
                  <AlertCircle className="w-4 h-4 text-[var(--y)] shrink-0 mt-0.5" />
                  <div className="flex-1 leading-relaxed">{bobCorrectionNotice}</div>
                  <button
                    onClick={() => setBobCorrectionNotice(null)}
                    className="text-[10px] text-[var(--m)] hover:text-[var(--t)] font-semibold underline"
                  >
                    Ignore
                  </button>
                </div>
              )}

              {/* Re-orderable Phased Tasks List */}
              <div className="space-y-2.5">
                {proposedTasks.map((task, idx) => (
                  <div
                    key={task.id}
                    className="bg-[var(--s2)]/40 border border-[var(--line)] rounded-2xl p-3.5 hover:border-[var(--y)]/40 transition-colors"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="flex flex-col gap-0.5">
                          <button
                            type="button"
                            disabled={idx === 0}
                            onClick={() => moveTask(idx, 'up')}
                            className="p-0.5 text-[var(--m)] hover:text-[var(--t)] disabled:opacity-20"
                          >
                            <ChevronUp className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            disabled={idx === proposedTasks.length - 1}
                            onClick={() => moveTask(idx, 'down')}
                            className="p-0.5 text-[var(--m)] hover:text-[var(--t)] disabled:opacity-20"
                          >
                            <ChevronDown className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        <div className="w-6 h-6 rounded-lg bg-[var(--y)] text-[#171717] font-extrabold text-xs flex items-center justify-center shrink-0">
                          {task.priority}
                        </div>
                        <div className="min-w-0">
                          <div className="text-[10px] font-semibold text-[var(--m)] uppercase">
                            {task.phase} · Est. {task.estimatedTime}
                          </div>
                          <div className="text-xs font-bold text-[var(--t)] truncate">{task.title}</div>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() =>
                          setExpandedTask((prev) => (prev === task.id ? '' : task.id))
                        }
                        className="px-2.5 py-1 text-[11px] font-semibold text-[var(--m)] hover:text-[var(--t)] rounded-lg hover:bg-[var(--s2)] transition-colors shrink-0"
                      >
                        {expandedTask === task.id ? 'Hide Steps' : `View ${task.steps.length} Steps`}
                      </button>
                    </div>

                    {/* Step details dropdown */}
                    {expandedTask === task.id && (
                      <div className="mt-3 pt-3 border-t border-[var(--line)] space-y-2 pl-9 animate-in fade-in duration-150">
                        {task.steps.map((st) => (
                          <div
                            key={st.id}
                            className="p-2.5 rounded-xl bg-[var(--s)] border border-[var(--line)] text-xs space-y-1"
                          >
                            <div className="font-bold text-[var(--t)] flex items-center gap-1.5">
                              <span className="text-[var(--y)]">Step {st.stepNumber}:</span>
                              <span>{st.title}</span>
                            </div>
                            <p className="text-[var(--m)] text-[11px] leading-relaxed">{st.instruction}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Modal Bottom Footer Navigation */}
        <div className="flex items-center justify-between pt-4 border-t border-[var(--line)] mt-4 shrink-0">
          {currentSlide > 0 ? (
            <button
              type="button"
              onClick={() => setCurrentSlide((prev) => prev - 1)}
              className="px-4 py-2 text-xs font-semibold text-[var(--m)] hover:text-[var(--t)] rounded-xl flex items-center gap-1.5 transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back</span>
            </button>
          ) : (
            <div />
          )}

          {currentSlide < 4 ? (
            <button
              type="button"
              onClick={() => setCurrentSlide((prev) => prev + 1)}
              className="px-5 py-2.5 text-xs font-bold bg-[var(--y)] hover:bg-[#e0ac15] text-[#171717] rounded-xl flex items-center gap-1.5 shadow-sm transition-all"
            >
              <span>Next</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleFinish}
              className="px-6 py-2.5 text-xs font-extrabold bg-[var(--y)] hover:bg-[#e0ac15] text-[#171717] rounded-xl flex items-center gap-1.5 shadow-md active:scale-95 transition-all"
            >
              <Check className="w-4 h-4" />
              <span>Approve Roadmap & Unlock Task 1</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
