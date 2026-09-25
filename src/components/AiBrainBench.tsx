import { useState, useEffect } from 'react';
import { 
  Cpu, 
  Zap, 
  HardDrive, 
  Sliders, 
  CheckCircle, 
  Play, 
  Gauge, 
  Info,
  Layers,
  Sparkles
} from 'lucide-react';
import { ModelTier, ModelProfile, ResearchNote, BrowserTabItem, ResearchHighlight } from '../types';
import { MODEL_CATALOG, detectSystemHardware, SystemHardwareInfo } from '../lib/hardware';
import { runLocalAiSynthesis, LocalSynthesisResult } from '../lib/localAi';

interface AiBrainBenchProps {
  activeTier: ModelTier;
  onTierChange: (tier: ModelTier) => void;
  notes: ResearchNote[];
  tabs: BrowserTabItem[];
  highlights: ResearchHighlight[];
}

export function AiBrainBench({
  activeTier,
  onTierChange,
  notes,
  tabs,
  highlights,
}: AiBrainBenchProps) {
  const [hardware, setHardware] = useState<SystemHardwareInfo>({
    detectedRamGb: 8,
    cpuCores: 4,
    hasGpu: true,
    webGpuAvailable: true,
    recommendedTier: 'balanced-8gb',
  });

  const [benchmarkQuery, setBenchmarkQuery] = useState(
    'What are the key findings and source connections across my research notes?'
  );
  const [isInferencing, setIsInferencing] = useState(false);
  const [benchmarkResult, setBenchmarkResult] = useState<LocalSynthesisResult | null>(null);

  useEffect(() => {
    const hw = detectSystemHardware();
    setHardware(hw);
  }, []);

  const activeProfile: ModelProfile = MODEL_CATALOG[activeTier];

  const handleRunBenchmark = async () => {
    setIsInferencing(true);
    try {
      const res = await runLocalAiSynthesis({
        question: benchmarkQuery,
        notes,
        tabs,
        highlights,
        tier: activeTier,
      });
      setBenchmarkResult(res);
    } finally {
      setIsInferencing(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-neutral-900 border border-neutral-800 p-6 rounded-2xl">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 text-xs font-semibold uppercase tracking-wider bg-violet-500/20 text-violet-300 rounded border border-violet-500/30">
              Offline Neural Engine
            </span>
            <span className="text-xs text-neutral-400">Zero Cloud Network Dependency</span>
          </div>
          <h2 className="text-xl font-bold text-neutral-100 mt-1">
            Local AI Brain & Adaptive RAM Scaling
          </h2>
          <p className="text-sm text-neutral-400 mt-1 max-w-xl">
            Automatically profiles user computer memory: Lightweight 4GB mode for fast, low-power PCs,
            and High Precision 16GB+ mode for deep contextual synthesis.
          </p>
        </div>

        {/* Detected Hardware Badge */}
        <div className="bg-neutral-950 border border-neutral-800 rounded-xl p-4 flex items-center gap-4 shrink-0">
          <div className="w-10 h-10 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30">
            <Cpu className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs text-neutral-400">Detected System Specs</div>
            <div className="text-sm font-bold text-neutral-200">
              {hardware.detectedRamGb} GB RAM · {hardware.cpuCores} CPU Cores
            </div>
            <div className="text-xs text-emerald-400 flex items-center gap-1 mt-0.5">
              <CheckCircle className="w-3 h-3" />
              Optimal: {MODEL_CATALOG[hardware.recommendedTier].name.split(' ')[0]}
            </div>
          </div>
        </div>
      </div>

      {/* Model Tier Selector Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {(Object.keys(MODEL_CATALOG) as ModelTier[]).map((tierKey) => {
          const profile = MODEL_CATALOG[tierKey];
          const isSelected = activeTier === tierKey;
          const isAutoRecommended = hardware.recommendedTier === tierKey;

          return (
            <div
              key={tierKey}
              onClick={() => onTierChange(tierKey)}
              className={`p-5 rounded-2xl border transition-all cursor-pointer relative overflow-hidden ${
                isSelected
                  ? 'bg-neutral-900 border-violet-500 shadow-xl shadow-violet-500/10 ring-1 ring-violet-500'
                  : 'bg-neutral-900/60 border-neutral-800 hover:border-neutral-700 hover:bg-neutral-900'
              }`}
            >
              {isAutoRecommended && (
                <div className="absolute top-3 right-3 px-2 py-0.5 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-bold rounded-full uppercase">
                  Hardware Match
                </div>
              )}

              <div className="flex items-center gap-2 mb-3">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold ${
                  tierKey === 'ultra-light-4gb'
                    ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                    : tierKey === 'balanced-8gb'
                    ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                    : 'bg-violet-500/20 text-violet-400 border border-violet-500/30'
                }`}>
                  {profile.minRamGb}GB
                </div>
                <div>
                  <h3 className="text-sm font-bold text-neutral-100">{profile.name}</h3>
                  <div className="text-[11px] text-neutral-400">{profile.parameters} · {profile.quantization}</div>
                </div>
              </div>

              <p className="text-xs text-neutral-400 leading-relaxed mb-4 min-h-[48px]">
                {profile.description}
              </p>

              <div className="grid grid-cols-2 gap-2 pt-3 border-t border-neutral-800/80 text-xs">
                <div className="p-2 bg-neutral-950 rounded-lg">
                  <span className="text-neutral-500 block text-[10px] uppercase font-semibold">RAM Usage</span>
                  <span className="font-bold text-neutral-200">~{profile.memoryUsageMb} MB</span>
                </div>
                <div className="p-2 bg-neutral-950 rounded-lg">
                  <span className="text-neutral-500 block text-[10px] uppercase font-semibold">Inference Speed</span>
                  <span className="font-bold text-emerald-400">{profile.tokensPerSec} tok/s</span>
                </div>
              </div>

              <div className="mt-3 flex items-center justify-between text-xs pt-1">
                <span className="text-neutral-500">Min. Hardware:</span>
                <span className="font-medium text-neutral-300">{profile.minRamGb}GB RAM</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Interactive Inference Benchmark Workbench */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-neutral-800">
          <div>
            <h3 className="text-base font-bold text-neutral-100 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-violet-400" />
              Live On-Device Inference Tester
            </h3>
            <p className="text-xs text-neutral-400 mt-0.5">
              Simulates local transformer synthesis across your active research corpus ({notes.length} notes, {tabs.length} tabs, {highlights.length} highlights).
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-neutral-400">Active Profile:</span>
            <span className="px-2.5 py-1 bg-violet-500/20 text-violet-300 border border-violet-500/30 rounded-md text-xs font-semibold">
              {activeProfile.name}
            </span>
          </div>
        </div>

        <div className="space-y-3">
          <label className="text-xs font-semibold text-neutral-300 block">
            Research Prompt / Synthesis Question:
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={benchmarkQuery}
              onChange={(e) => setBenchmarkQuery(e.target.value)}
              className="flex-1 bg-neutral-950 border border-neutral-800 focus:border-violet-500 rounded-xl px-4 py-3 text-sm text-neutral-200 outline-none transition-all"
              placeholder="Ask Bob about your research..."
            />
            <button
              onClick={handleRunBenchmark}
              disabled={isInferencing}
              className="px-5 py-3 rounded-xl bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white font-semibold text-sm flex items-center gap-2 transition-all cursor-pointer shadow-lg shadow-violet-600/20 shrink-0"
            >
              {isInferencing ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Inferencing...
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 fill-white" />
                  Run Offline Synthesis
                </>
              )}
            </button>
          </div>
        </div>

        {/* Benchmark Results */}
        {benchmarkResult && (
          <div className="bg-neutral-950 border border-neutral-800 rounded-xl p-5 space-y-4">
            {/* Metrics Bar */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div className="p-3 bg-neutral-900 border border-neutral-800 rounded-lg">
                <span className="text-neutral-500 block text-[10px] uppercase font-semibold">Latency</span>
                <span className="text-base font-bold text-neutral-100">{benchmarkResult.latencyMs} ms</span>
              </div>
              <div className="p-3 bg-neutral-900 border border-neutral-800 rounded-lg">
                <span className="text-neutral-500 block text-[10px] uppercase font-semibold">Tokens Generated</span>
                <span className="text-base font-bold text-neutral-100">{benchmarkResult.tokensGenerated}</span>
              </div>
              <div className="p-3 bg-neutral-900 border border-neutral-800 rounded-lg">
                <span className="text-neutral-500 block text-[10px] uppercase font-semibold">Memory Allocated</span>
                <span className="text-base font-bold text-emerald-400">{benchmarkResult.memoryUsedMb} MB</span>
              </div>
              <div className="p-3 bg-neutral-900 border border-neutral-800 rounded-lg">
                <span className="text-neutral-500 block text-[10px] uppercase font-semibold">Grounding Confidence</span>
                <span className="text-base font-bold text-violet-400">{benchmarkResult.confidenceScore}%</span>
              </div>
            </div>

            {/* Generated Synthesis */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs text-neutral-400">
                <span className="font-semibold text-neutral-300">Generated Synthesis Output:</span>
                <span className="text-emerald-400 font-mono text-[11px]">100% Offline · Zero Telemetry</span>
              </div>
              <div className="p-4 bg-neutral-900 border border-neutral-800 rounded-lg text-sm text-neutral-200 whitespace-pre-wrap leading-relaxed font-sans">
                {benchmarkResult.answer}
              </div>
            </div>

            {/* Cited Sources */}
            {benchmarkResult.citedSources.length > 0 && (
              <div className="space-y-2 pt-2 border-t border-neutral-900">
                <span className="text-xs font-semibold text-neutral-400">Correlated Internal Sources ({benchmarkResult.citedSources.length}):</span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {benchmarkResult.citedSources.map((src, i) => (
                    <div key={i} className="p-2.5 bg-neutral-900/60 border border-neutral-800 rounded-lg text-xs">
                      <div className="font-medium text-neutral-200 truncate">{src.title}</div>
                      {src.snippet && <div className="text-neutral-400 text-[11px] mt-1 line-clamp-1">{src.snippet}</div>}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
