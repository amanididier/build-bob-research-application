import React from 'react';
import { 
  Check, 
  ChevronRight, 
  Upload, 
  ExternalLink, 
  ArrowRight, 
  FileText, 
  Sparkles,
  Calendar,
  Layers,
  Clock,
  Compass,
  CheckCircle2,
  Sliders
} from 'lucide-react';

// Fixed logo registry: model output can select a known tool key, never a URL.
const TOOL_FAVICONS: Record<string, string> = {
  chatgpt: 'https://www.google.com/s2/favicons?domain=chatgpt.com&sz=64',
  openai: 'https://www.google.com/s2/favicons?domain=openai.com&sz=64',
  claude: 'https://www.google.com/s2/favicons?domain=claude.ai&sz=64',
  claude_code: 'https://www.google.com/s2/favicons?domain=claude.ai&sz=64',
  gemini: 'https://www.google.com/s2/favicons?domain=gemini.google.com&sz=64',
  gemini_api: 'https://www.google.com/s2/favicons?domain=ai.google.dev&sz=64',
  notes: 'https://www.google.com/s2/favicons?domain=notion.so&sz=64',
  notion: 'https://www.google.com/s2/favicons?domain=notion.so&sz=64',
  browser: 'https://www.google.com/s2/favicons?domain=google.com&sz=64',
  browser_tabs: 'https://www.google.com/s2/favicons?domain=google.com&sz=64',
  timer: 'https://www.google.com/s2/favicons?domain=clockify.me&sz=64',
  sheets: 'https://www.google.com/s2/favicons?domain=sheets.google.com&sz=64',
  google_sheets: 'https://www.google.com/s2/favicons?domain=sheets.google.com&sz=64',
  docs: 'https://www.google.com/s2/favicons?domain=docs.google.com&sz=64',
  google_docs: 'https://www.google.com/s2/favicons?domain=docs.google.com&sz=64',
  git: 'https://www.google.com/s2/favicons?domain=github.com&sz=64',
  github: 'https://www.google.com/s2/favicons?domain=github.com&sz=64',
  excel: 'https://www.google.com/s2/favicons?domain=excel.cloud.microsoft&sz=64',
  microsoft_excel: 'https://www.google.com/s2/favicons?domain=excel.cloud.microsoft&sz=64',
  figma: 'https://www.google.com/s2/favicons?domain=figma.com&sz=64',
  gmail: 'https://www.google.com/s2/favicons?domain=gmail.com&sz=64',
  youtube: 'https://www.google.com/s2/favicons?domain=youtube.com&sz=64',
  vscode: 'https://www.google.com/s2/favicons?domain=code.visualstudio.com&sz=64',
  visual_studio_code: 'https://www.google.com/s2/favicons?domain=code.visualstudio.com&sz=64',
  supabase: 'https://www.google.com/s2/favicons?domain=supabase.com&sz=64',
  slack: 'https://www.google.com/s2/favicons?domain=slack.com&sz=64',
  trello: 'https://www.google.com/s2/favicons?domain=trello.com&sz=64',
  linear: 'https://www.google.com/s2/favicons?domain=linear.app&sz=64',
  drive: 'https://www.google.com/s2/favicons?domain=drive.google.com&sz=64'
};

function getToolFavicon(value: string, label: string): string | null {
  const key = value.toLowerCase().trim().replace(/[\s/-]+/g, '_');
  const labelKey = label.toLowerCase().trim().replace(/[\s/-]+/g, '_');
  return TOOL_FAVICONS[key] || TOOL_FAVICONS[labelKey] || null;
}

export type PageLayoutType = 
  | 'fact_card'
  | 'option_rows'
  | 'option_tiles'
  | 'segmented_choice'
  | 'chip_select'
  | 'slider_value'
  | 'text_input'
  | 'dropzone_optional'
  | 'timeline_estimate'
  | 'step_list';

export interface PageModel {
  page_id: string;
  role: 'question' | 'reveal' | 'roadmap';
  progress: { step: number; of: number };
  eyebrow: string;
  title: string;
  subtitle?: string;
  layout: PageLayoutType;
  options?: Array<{ value: string; label: string; reveals_input?: boolean; sublabel?: string }>;
  fact?: { number: string; sentence: string };
  slider?: { min: number; max: number; step?: number; default: number; unit?: string; format?: (v: number) => string };
  chips?: Array<{ value: string; label: string }>;
  phases?: string[];
  current_phase?: number;
  estimate?: { range: string; basis: string };
  roadmap_phases?: Array<{
    phase: string;
    steps: Array<{
      title: string;
      why: string;
      tools: string[];
      input?: { type: string; label: string };
      handoff?: string | null;
      status: 'todo' | 'done';
    }>;
  }>;
  prefill?: any;
  primary: { label: string; action: 'submit' | 'next' };
  skip?: { label: string } | null;
  sticker?: { set: string; stage: number } | null;
}

// 1. Fact Card Component
export const FactCardLayout: React.FC<{
  fact?: { number: string; sentence: string };
  subtitle?: string;
  isDark: boolean;
}> = ({ fact, subtitle, isDark }) => {
  return (
    <div className="py-6 text-center space-y-4 animate-in fade-in duration-300">
      <div className="text-[64px] sm:text-[76px] font-black tracking-[-0.04em] font-mono text-[var(--accent,#F5B82E)] leading-none">
        {fact?.number || '7s'}
      </div>
      <p className={`text-[17px] sm:text-[19px] font-medium leading-relaxed max-w-[480px] mx-auto ${isDark ? 'text-[#e5dec9]' : 'text-[#2e261d]'}`}>
        {fact?.sentence || subtitle || 'A focused researcher forms a strong signal in the first moments.'}
      </p>
    </div>
  );
};

// 2. Option Rows Component
export const OptionRowsLayout: React.FC<{
  options?: Array<{ value: string; label: string; sublabel?: string; reveals_input?: boolean }>;
  value: string;
  customText?: string;
  onChange: (val: string) => void;
  onCustomTextChange?: (text: string) => void;
  isDark: boolean;
}> = ({ options = [], value, customText = '', onChange, onCustomTextChange, isDark }) => {
  return (
    <div className="space-y-3 py-2 animate-in fade-in duration-300">
      {options.map((opt) => {
        const isSelected = value === opt.value;
        return (
          <div key={opt.value} className="space-y-2">
            <button
              type="button"
              onClick={() => onChange(opt.value)}
              className={`w-full p-4 rounded-[12px] border text-left transition-all flex items-center justify-between gap-3 cursor-pointer ${
                isSelected
                  ? 'border-[var(--accent,#F5B82E)] ring-2 ring-[var(--accent,#F5B82E)]/30 ' + (isDark ? 'bg-[#1e1b15]' : 'bg-[#fffaf0]')
                  : (isDark ? 'bg-[#17150F] hover:bg-[#1f1d16] border-[#2A2620]' : 'bg-white hover:bg-[#fbf8f2] border-[#E7E0D3]')
              }`}
            >
              <div>
                <b className={`block text-[14px] font-bold ${isSelected ? (isDark ? 'text-white' : 'text-[#171717]') : (isDark ? 'text-[#e5dec9]' : 'text-[#2e261d]')}`}>
                  {opt.label}
                </b>
                {opt.sublabel && (
                  <span className={`block text-[12px] mt-0.5 ${isDark ? 'text-[#8A8175]' : 'text-[#6B6358]'}`}>
                    {opt.sublabel}
                  </span>
                )}
              </div>
              <div className={`w-5 h-5 rounded-full border grid place-items-center shrink-0 ${
                isSelected 
                  ? 'bg-[var(--accent,#F5B82E)] border-[var(--accent,#F5B82E)] text-[#171717]' 
                  : (isDark ? 'border-[#3a352a]' : 'border-[#d0c8b8]')
              }`}>
                {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
              </div>
            </button>

            {opt.reveals_input && isSelected && (
              <input
                type="text"
                value={customText}
                onChange={(e) => onCustomTextChange?.(e.target.value)}
                placeholder="Specify your own..."
                className={`w-full h-11 px-4 text-[13px] rounded-[10px] border outline-none font-medium ${
                  isDark ? 'bg-[#14120e] border-[#2A2620] text-white focus:border-[var(--accent,#F5B82E)]' : 'bg-white border-[#E7E0D3] text-[#171717] focus:border-[var(--accent,#F5B82E)]'
                }`}
                autoFocus
              />
            )}
          </div>
        );
      })}
    </div>
  );
};

// 2b. Colorful Option Tiles — for visual, single-choice questions.
export const OptionTilesLayout: React.FC<{
  options?: Array<{ value: string; label: string; sublabel?: string; reveals_input?: boolean }>;
  value: string;
  customText?: string;
  onChange: (val: string) => void;
  onCustomTextChange?: (text: string) => void;
  isDark: boolean;
}> = ({ options = [], value, customText = '', onChange, onCustomTextChange, isDark }) => {
  const tones = [
    isDark ? 'bg-[#18372f] border-[#28584a]' : 'bg-[#e6f5ed] border-[#c9e6d5]',
    isDark ? 'bg-[#1b2f47] border-[#2c4c70]' : 'bg-[#e8f2ff] border-[#ccdef7]',
    isDark ? 'bg-[#352744] border-[#59406f]' : 'bg-[#f2eaff] border-[#e0d0f3]',
    isDark ? 'bg-[#3b311b] border-[#645326]' : 'bg-[#fff3d6] border-[#f0dfad]'
  ];
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 py-3">
      {options.slice(0, 4).map((option, index) => {
        const selected = value === option.value;
        return (
          <div key={option.value} className="space-y-2">
            <button type="button" onClick={() => onChange(option.value)} className={`relative w-full min-h-[112px] p-4 rounded-[16px] border text-left transition-all hover:-translate-y-0.5 ${tones[index % tones.length]} ${selected ? 'ring-2 ring-[var(--accent,#F5B82E)] ring-offset-2 ring-offset-[#0E0D0B]' : ''}`}>
              <span className={`block text-[13px] font-extrabold leading-snug ${isDark ? 'text-white' : 'text-[#202018]'}`}>{option.label}</span>
              {option.sublabel && <span className={`block mt-2 text-[11px] leading-relaxed ${isDark ? 'text-white/65' : 'text-[#5c5b54]'}`}>{option.sublabel}</span>}
              {selected && <span className="absolute top-3 right-3 w-5 h-5 rounded-full bg-[var(--accent,#F5B82E)] text-[#171717] grid place-items-center"><Check className="w-3 h-3 stroke-[3]" /></span>}
            </button>
            {option.reveals_input && selected && <input value={customText} onChange={(event) => onCustomTextChange?.(event.target.value)} placeholder="Add a few details…" className={`w-full h-10 px-3 rounded-xl border text-[12px] outline-none ${isDark ? 'bg-[#14120e] border-[#2A2620] text-white' : 'bg-white border-[#E7E0D3] text-[#171717]'}`} />}
          </div>
        );
      })}
    </div>
  );
};

// 3. Segmented Choice Component
export const SegmentedChoiceLayout: React.FC<{
  options?: Array<{ value: string; label: string }>;
  value: string;
  onChange: (val: string) => void;
  isDark: boolean;
}> = ({ options = [], value, onChange, isDark }) => {
  return (
    <div className={`p-1.5 rounded-[12px] border flex gap-1.5 py-1.5 ${isDark ? 'bg-[#14120e] border-[#2A2620]' : 'bg-[#f4efe6] border-[#E7E0D3]'}`}>
      {options.map((opt) => {
        const isSelected = value === opt.value;
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            className={`flex-1 py-3 px-2 rounded-[9px] text-[13px] font-bold transition-all text-center cursor-pointer ${
              isSelected
                ? 'bg-[var(--accent,#F5B82E)] text-[#17150F] shadow-sm font-extrabold'
                : (isDark ? 'text-[#8A8175] hover:text-white' : 'text-[#6B6358] hover:text-[#171717]')
            }`}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
};

// 4. Chip Select Component
export const ChipSelectLayout: React.FC<{
  chips?: Array<{ value: string; label: string }>;
  selectedValues: string[];
  onChange: (vals: string[]) => void;
  isDark: boolean;
}> = ({ chips = [], selectedValues, onChange, isDark }) => {
  const toggle = (v: string) => {
    if (selectedValues.includes(v)) {
      onChange(selectedValues.filter((x) => x !== v));
    } else {
      onChange([...selectedValues, v]);
    }
  };

  return (
    <div className="flex flex-wrap gap-2.5 py-3">
      {chips.map((c) => {
        const isSelected = selectedValues.includes(c.value);
        return (
          <button
            key={c.value}
            type="button"
            onClick={() => toggle(c.value)}
            className={`px-4 py-2.5 rounded-[10px] text-[12.5px] font-bold border transition-all flex items-center gap-2 cursor-pointer ${
              isSelected
                ? 'bg-[var(--accent,#F5B82E)] border-[var(--accent,#F5B82E)] text-[#17150F] shadow-sm'
                : (isDark ? 'bg-[#17150F] border-[#2A2620] text-[#e5dec9] hover:border-[#3e382e]' : 'bg-white border-[#E7E0D3] text-[#2e261d] hover:border-[#b8afa0]')
            }`}
          >
            <span className="flex items-center gap-2">
              {getToolFavicon(c.value, c.label) && (
                <img
                  src={getToolFavicon(c.value, c.label) || ''}
                  alt=""
                  loading="lazy"
                  className={`w-5 h-5 rounded-md object-contain ${isSelected ? 'bg-white p-0.5' : 'bg-white p-0.5'}`}
                  onError={(event) => { event.currentTarget.style.display = 'none'; }}
                />
              )}
              <span>{c.label}</span>
            </span>
            {isSelected && <Check className="w-3.5 h-3.5 stroke-[2.5]" />}
          </button>
        );
      })}
    </div>
  );
};

// 5. Slider Value Component
export const SliderValueLayout: React.FC<{
  slider?: { min: number; max: number; step?: number; default: number; unit?: string; format?: (v: number) => string };
  value: number;
  onChange: (val: number) => void;
  isDark: boolean;
}> = ({ slider, value, onChange, isDark }) => {
  const min = slider?.min ?? 0;
  const max = slider?.max ?? 100;
  const step = slider?.step ?? 5;
  const unit = slider?.unit ?? 'hours';
  const displayVal = slider?.format ? slider.format(value) : `${value} ${unit}`;

  return (
    <div className="py-6 space-y-6">
      <div className="text-center">
        <span className="text-[44px] font-black font-mono tracking-tight text-[var(--accent,#F5B82E)]">
          {displayVal}
        </span>
      </div>

      <div className="px-2">
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="w-full h-2 bg-neutral-300 dark:bg-neutral-800 rounded-lg appearance-none cursor-pointer accent-[var(--accent,#F5B82E)]"
        />
        <div className={`flex justify-between text-[11px] font-mono mt-2 ${isDark ? 'text-[#8A8175]' : 'text-[#6B6358]'}`}>
          <span>{min} {unit}</span>
          <span>{max} {unit}</span>
        </div>
      </div>
    </div>
  );
};

// 6. Text Input Component
export const TextInputComponent: React.FC<{
  value: string;
  placeholder?: string;
  onChange: (val: string) => void;
  isDark: boolean;
}> = ({ value, placeholder, onChange, isDark }) => {
  return (
    <div className="py-3">
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder || 'Write in plain words...'}
        rows={4}
        className={`w-full p-4 rounded-[12px] border text-[14px] font-medium outline-none leading-relaxed transition-colors ${
          isDark 
            ? 'bg-[#17150F] border-[#2A2620] text-white focus:border-[var(--accent,#F5B82E)]' 
            : 'bg-white border-[#E7E0D3] text-[#171717] focus:border-[var(--accent,#F5B82E)]'
        }`}
      />
    </div>
  );
};

// 7. Dropzone Optional Component
export const DropzoneOptionalLayout: React.FC<{
  fileInfo?: { name: string; size: string } | null;
  onFileSelect: (name: string, size: string) => void;
  onSkipUpload: () => void;
  isDark: boolean;
}> = ({ fileInfo, onFileSelect, onSkipUpload, isDark }) => {
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files?.[0]) {
      const f = e.dataTransfer.files[0];
      onFileSelect(f.name, `${Math.round(f.size / 1024)} KB`);
    }
  };

  return (
    <div className="py-3 space-y-3">
      <div
        onDragOver={(e) => e.preventDefault()}
        onDrop={handleDrop}
        className={`border-2 border-dashed rounded-[16px] p-8 text-center transition-colors cursor-pointer ${
          isDark 
            ? 'border-[#2A2620] hover:border-[var(--accent,#F5B82E)] bg-[#17150F]/50' 
            : 'border-[#E7E0D3] hover:border-[var(--accent,#F5B82E)] bg-[#faf8f2]'
        }`}
        onClick={() => {
          onFileSelect('reference-research-brief.pdf', '340 KB');
        }}
      >
        <Upload className="w-8 h-8 mx-auto mb-3 text-[var(--accent,#F5B82E)] opacity-90" />
        <b className={`block text-[14px] ${isDark ? 'text-white' : 'text-[#171717]'}`}>
          {fileInfo ? fileInfo.name : 'Drop existing notes, outline or resume, or click to choose'}
        </b>
        <span className={`block text-[11px] mt-1 font-mono uppercase tracking-wider ${isDark ? 'text-[#8A8175]' : 'text-[#6B6358]'}`}>
          {fileInfo ? `${fileInfo.size} · Uploaded` : 'PDF, DOCX, TXT, MD (Optional)'}
        </span>
      </div>

      <div className="text-center">
        <button
          type="button"
          onClick={onSkipUpload}
          className={`text-[12px] font-semibold underline cursor-pointer ${isDark ? 'text-[#8A8175] hover:text-white' : 'text-[#6B6358] hover:text-[#171717]'}`}
        >
          I do not have one yet
        </button>
      </div>
    </div>
  );
};

// 8. Timeline Estimate Reveal Component (YOUR PATH)
export const TimelineEstimateLayout: React.FC<{
  phases?: string[];
  current_phase?: number;
  estimate?: { range: string; basis: string };
  isDark: boolean;
}> = ({ phases = ['Clarify', 'Plan', 'Build', 'Launch'], current_phase = 0, estimate, isDark }) => {
  return (
    <div className="py-6 space-y-6 animate-in fade-in duration-300">
      {/* Timeline track */}
      <div className="relative pt-6 pb-2">
        <div className={`h-1.5 w-full rounded-full ${isDark ? 'bg-[#2A2620]' : 'bg-[#E7E0D3]'}`} />
        <div 
          className="absolute top-6 left-0 h-1.5 rounded-full bg-[var(--accent,#F5B82E)] transition-all duration-700"
          style={{ width: `${((current_phase + 1) / phases.length) * 100}%` }}
        />

        <div className="flex justify-between relative -mt-3.5">
          {phases.map((ph, idx) => {
            const isPassed = idx <= current_phase;
            return (
              <div key={ph} className="flex flex-col items-center">
                <div className={`w-6 h-6 rounded-full border-2 grid place-items-center text-[10px] font-bold ${
                  isPassed
                    ? 'bg-[var(--accent,#F5B82E)] border-[var(--accent,#F5B82E)] text-[#17150F]'
                    : (isDark ? 'bg-[#17150F] border-[#2A2620] text-[#8A8175]' : 'bg-white border-[#E7E0D3] text-[#6B6358]')
                }`}>
                  {isPassed ? '✓' : idx + 1}
                </div>
                <span className={`text-[10px] font-mono uppercase tracking-wider font-bold mt-2 ${
                  isPassed ? (isDark ? 'text-white' : 'text-[#171717]') : (isDark ? 'text-[#8A8175]' : 'text-[#6B6358]')
                }`}>
                  {ph}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Estimate Card */}
      <div className={`p-5 rounded-[16px] border ${isDark ? 'bg-[#17150F] border-[#2A2620]' : 'bg-white border-[#E7E0D3]'} space-y-2`}>
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-[var(--accent,#F5B82E)] animate-ping" />
          <span className="text-[11px] font-mono uppercase tracking-wider font-bold text-[var(--accent,#F5B82E)]">
            Timeline Estimate
          </span>
        </div>
        <h3 className={`text-[24px] font-extrabold tracking-tight ${isDark ? 'text-white' : 'text-[#171717]'}`}>
          {estimate?.range || '5 to 7 weeks'}
        </h3>
        <p className={`text-[13px] leading-relaxed ${isDark ? 'text-[#8A8175]' : 'text-[#6B6358]'}`}>
          {estimate?.basis || 'Based on 6 focused hours per week and steady incremental execution.'}
        </p>
        <div className={`text-[11px] italic pt-1 ${isDark ? 'text-[#665e52]' : 'text-[#9c9384]'}`}>
          * This is an estimate based on your answers. It adjusts as you work.
        </div>
      </div>
    </div>
  );
};

// 9. Step List Roadmap Component
export const StepListLayout: React.FC<{
  phases?: Array<{
    phase: string;
    steps: Array<{
      title: string;
      why: string;
      tools: string[];
      input?: { type: string; label: string };
      handoff?: string | null;
      status: 'todo' | 'done';
    }>;
  }>;
  onToggleStep?: (phaseIdx: number, stepIdx: number) => void;
  onSendToChatGPT?: (title: string, why: string) => void;
  isDark: boolean;
}> = ({ phases = [], onToggleStep, onSendToChatGPT, isDark }) => {
  return (
    <div className="space-y-6 py-2">
      {phases.map((ph, pIdx) => (
        <div key={ph.phase} className={`p-5 rounded-[18px] border ${isDark ? 'bg-[#17150F] border-[#2A2620]' : 'bg-white border-[#E7E0D3]'} space-y-4`}>
          <div className="flex items-center justify-between pb-2 border-b border-[#2A2620]/30">
            <span className="text-[11px] font-mono uppercase tracking-wider font-extrabold text-[var(--accent,#F5B82E)]">
              Phase {pIdx + 1} · {ph.phase}
            </span>
            <span className={`text-[11px] font-mono ${isDark ? 'text-[#8A8175]' : 'text-[#6B6358]'}`}>
              {ph.steps.filter(s => s.status === 'done').length}/{ph.steps.length} completed
            </span>
          </div>

          <div className="space-y-3">
            {ph.steps.map((st, sIdx) => {
              const isDone = st.status === 'done';
              return (
                <div 
                  key={sIdx} 
                  className={`p-3.5 rounded-[12px] border transition-all ${
                    isDone 
                      ? 'opacity-60 bg-neutral-900/10 border-transparent line-through' 
                      : (isDark ? 'bg-[#14120e] border-[#2A2620]' : 'bg-[#faf8f2] border-[#E7E0D3]')
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-2.5">
                      <button
                        type="button"
                        onClick={() => onToggleStep?.(pIdx, sIdx)}
                        className={`w-5 h-5 rounded-md border grid place-items-center mt-0.5 transition-colors cursor-pointer ${
                          isDone 
                            ? 'bg-[var(--accent,#F5B82E)] border-[var(--accent,#F5B82E)] text-[#17150F]' 
                            : (isDark ? 'border-[#3a352a]' : 'border-[#cfc6b5]')
                        }`}
                      >
                        {isDone && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                      </button>
                      <div>
                        <b className={`block text-[13.5px] font-bold ${isDark ? 'text-white' : 'text-[#171717]'}`}>
                          {st.title}
                        </b>
                        <p className={`text-[12px] mt-0.5 leading-relaxed ${isDark ? 'text-[#8A8175]' : 'text-[#6B6358]'}`}>
                          {st.why}
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => onSendToChatGPT?.(st.title, st.why)}
                      className="px-2.5 py-1.5 rounded-[8px] bg-[#10a37f] hover:bg-[#0e8f6f] text-white text-[11px] font-bold flex items-center gap-1 shrink-0 transition-colors shadow-xs"
                      title="Open prompt in ChatGPT"
                    >
                      <Sparkles className="w-3 h-3" />
                      <span>ChatGPT</span>
                    </button>
                  </div>

                  {st.tools && st.tools.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-2 pl-7">
                      {st.tools.map((t, idx) => (
                        <span key={idx} className={`px-2 py-0.5 rounded text-[10px] font-mono uppercase tracking-wider ${isDark ? 'bg-[#221f18] text-[#8A8175]' : 'bg-[#eae3d5] text-[#6B6358]'}`}>
                          {t}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
};
