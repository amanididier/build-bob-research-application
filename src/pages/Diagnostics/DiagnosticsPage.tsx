import React, { useState } from 'react';
import { DiagnosticCenter } from '../../components/DiagnosticCenter';
import { AiBrainBench } from '../../components/AiBrainBench';
import { ModelTier } from '../../types';
import { Cpu, Activity, ShieldCheck, ArrowLeft } from 'lucide-react';
import { useApp } from '../../context/AppContext';

export const DiagnosticsPage: React.FC = () => {
  const { navigateTo, notes } = useApp();
  const [activeTier, setActiveTier] = useState<ModelTier>('balanced-8gb');

  return (
    <div className="max-w-[1130px] mx-auto px-6 md:px-10 py-7 pb-36 space-y-6">
      <div className="flex items-center justify-between pb-6 border-b border-[var(--line)]">
        <div>
          <div className="text-[10px] tracking-[0.08em] text-[#999] uppercase font-semibold">
            ENGINEERING & DIAGNOSTICS
          </div>
          <h1 className="text-[32px] tracking-[-1px] font-extrabold my-1 text-[var(--t)]">
            Local AI Brain & Hardware
          </h1>
          <p className="text-[var(--m)] text-[13px] leading-relaxed max-w-[620px] m-0">
            Real-time telemetry, model quantization profiles, and offline browser bridge verification.
          </p>
        </div>

        <button
          onClick={() => navigateTo('home')}
          className="h-8 px-3.5 rounded-full border border-[var(--line)] bg-[var(--s)] hover:bg-[var(--s2)] text-[var(--t)] text-[11px] font-semibold flex items-center gap-1.5 shadow-sm transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Workspace</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <DiagnosticCenter
          onSwitchToFixes={() => {}}
          onSwitchToWorkspace={() => navigateTo('home')}
        />
        <AiBrainBench
          activeTier={activeTier}
          onTierChange={setActiveTier}
          notes={notes.map((n) => ({
            id: n.id,
            projectId: n.projectId,
            sessionId: 'main',
            title: n.title,
            body: n.selectedText,
            color: 'yellow',
            createdAt: n.createdAt,
          }))}
          tabs={[]}
          highlights={[]}
        />
      </div>
    </div>
  );
};
