import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Download, ArrowUpRight, Check, FileText } from 'lucide-react';

export const SummaryView: React.FC = () => {
  const { activeResearchId, projects, triggerThinking } = useApp();
  const [isExporting, setIsExporting] = useState(false);

  const project = projects.find((p) => p.id === activeResearchId) || projects[1];

  const handleExport = () => {
    setIsExporting(true);
    triggerThinking(
      'Exporting Research Synthesis',
      'Generating Markdown & PDF executive briefing...',
      'Compiling sources and action items',
      () => {
        setIsExporting(false);
      }
    );
  };

  return (
    <div className="max-w-[850px] mx-auto py-2 pb-24">
      {/* Header with Title and Export Button */}
      <div className="flex items-start justify-between gap-6 mb-8 border-b border-[var(--line)] pb-6">
        <div>
          <div className="text-[10px] tracking-[0.08em] text-[#999] uppercase font-semibold">
            RESEARCH SYNTHESIS · SEPTEMBER 2026
          </div>
          <h1 className="text-[32px] tracking-[-1px] font-extrabold my-2 text-[var(--t)]">
            {project.title}
          </h1>
          <div className="flex gap-2 flex-wrap mt-3">
            <span className="text-[10px] px-2.5 py-1 rounded-full bg-[var(--s2)] text-[#666] dark:text-[#cfc7be]">
              9 verified sources
            </span>
            <span className="text-[10px] px-2.5 py-1 rounded-full bg-[var(--s2)] text-[#666] dark:text-[#cfc7be]">
              2 AI conversations
            </span>
            <span className="text-[10px] px-2.5 py-1 rounded-full bg-[var(--s2)] text-[#666] dark:text-[#cfc7be]">
              3 open tasks
            </span>
          </div>
        </div>

        {/* Polished Black Pill Export Button as requested */}
        <button
          onClick={handleExport}
          className="h-9 px-4 rounded-full bg-[#171717] dark:bg-[#f2eee7] text-white dark:text-[#171717] font-semibold text-[11px] flex items-center gap-2 shadow-md hover:opacity-90 active:scale-95 transition-all flex-shrink-0"
        >
          <Download className="w-3.5 h-3.5" />
          <span>{isExporting ? 'Exporting...' : 'Export'}</span>
        </button>
      </div>

      {/* Structured Sections */}
      <div className="space-y-8">
        {/* Executive Summary */}
        <section className="space-y-2">
          <h2 className="text-[18px] font-bold text-[var(--t)] tracking-tight">
            1. Executive Summary
          </h2>
          <p className="text-[13px] text-[#50504b] dark:text-[#d3ccc3] leading-relaxed">
            The research points to a clear and immediate starting point: understand the real transport booking problem before adding architectural complexity. Multiple independent channels indicate that user drop-off is driven by ambiguity around real-time seat availability and pickup certainty.
          </p>
        </section>

        {/* Key Findings */}
        <section className="space-y-3">
          <h2 className="text-[18px] font-bold text-[var(--t)] tracking-tight">
            2. Key Findings
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            <div className="bg-[var(--s)] border border-[var(--line)] rounded-[15px] p-4">
              <span className="text-[10px] font-bold text-[var(--y)] uppercase tracking-wider block mb-1">
                Finding 01
              </span>
              <h4 className="text-[13px] font-bold text-[var(--t)] m-0 mb-1.5">
                Hidden Fees & Pricing Shock
              </h4>
              <p className="text-[12px] text-[var(--m)] leading-relaxed m-0">
                Over 45% of tested users drop out during fare calculation when local service surcharges appear unexpectedly before checkout.
              </p>
            </div>

            <div className="bg-[var(--s)] border border-[var(--line)] rounded-[15px] p-4">
              <span className="text-[10px] font-bold text-[var(--b)] uppercase tracking-wider block mb-1">
                Finding 02
              </span>
              <h4 className="text-[13px] font-bold text-[var(--t)] m-0 mb-1.5">
                Lack of Guaranteed Dispatch
              </h4>
              <p className="text-[12px] text-[var(--m)] leading-relaxed m-0">
                Unlike ride-hailing in mature markets, inter-city transport passengers require explicit physical station location and vehicle plate validation.
              </p>
            </div>
          </div>
        </section>

        {/* Evidence & Sources */}
        <section className="space-y-3">
          <h2 className="text-[18px] font-bold text-[var(--t)] tracking-tight">
            3. Supporting Evidence & Sources
          </h2>
          <div className="bg-[var(--s)] border border-[var(--line)] rounded-[17px] divide-y divide-[var(--line)] overflow-hidden">
            <div className="p-3.5 flex items-center justify-between">
              <div>
                <b className="text-[12px] text-[var(--t)] block">Why people abandon online transport booking</b>
                <small className="text-[10px] text-[var(--m)]">research.example.com/transport-booking · 3 highlights</small>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[var(--ys)] text-[#765700] font-bold">
                96% relevance
              </span>
            </div>

            <div className="p-3.5 flex items-center justify-between">
              <div>
                <b className="text-[12px] text-[var(--t)] block">ChatGPT — transport research synthesis</b>
                <small className="text-[10px] text-[var(--m)]">chatgpt.com/share/transport · 2 useful claims</small>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[var(--bs)] text-[#1e40af] font-bold">
                88% relevance
              </span>
            </div>

            <div className="p-3.5 flex items-center justify-between">
              <div>
                <b className="text-[12px] text-[var(--t)] block">Rwanda transport booking workflow notes</b>
                <small className="text-[10px] text-[var(--m)]">docs.google.com/document/transport · 5 notes</small>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#e6f7ed] text-[#14844d] font-bold">
                92% relevance
              </span>
            </div>
          </div>
        </section>

        {/* Knowledge Gaps */}
        <section className="space-y-2">
          <h2 className="text-[18px] font-bold text-[var(--t)] tracking-tight">
            4. Knowledge Gaps
          </h2>
          <div className="bg-[var(--s)] border border-[var(--line)] rounded-[15px] p-4 text-[12px] text-[#50504b] dark:text-[#d3ccc3] leading-relaxed space-y-1.5">
            <p className="m-0">
              • How do operators reconcile offline walk-up ticket purchases with real-time digital seat allocations?
            </p>
            <p className="m-0">
              • What is the exact merchant fee tolerance threshold among regional transport cooperatives?
            </p>
          </div>
        </section>

        {/* Next Steps */}
        <section className="space-y-2">
          <h2 className="text-[18px] font-bold text-[var(--t)] tracking-tight">
            5. Recommended Next Steps
          </h2>
          <div className="bg-[var(--s2)] rounded-[15px] p-4 space-y-2 text-[12px] text-[var(--t)]">
            <div className="flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-[var(--y)] text-neutral-900 font-bold text-[10px] grid place-items-center">1</span>
              <span>Complete 2 operator interviews focusing on seat inventory sync.</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-[var(--y)] text-neutral-900 font-bold text-[10px] grid place-items-center">2</span>
              <span>Draft a 1-page hypothesis brief summarizing operator onboarding friction.</span>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};
