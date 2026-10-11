import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { jsPDF } from 'jspdf';
import { Download, Check, FileText, Quote, ArrowRight, CheckCircle2 } from 'lucide-react';

interface SummaryViewProps {
  isSidePanel?: boolean;
}

export const SummaryView: React.FC<SummaryViewProps> = ({ isSidePanel = false }) => {
  const { activeResearchId, projects, tasks, triggerThinking } = useApp();
  const [isExporting, setIsExporting] = useState(false);
  const [exportSuccess, setExportSuccess] = useState(false);

  const project = projects.find((p) => p.id === activeResearchId) || projects[0];
  const openTasks = tasks.filter((t) => !t.completed);

  // Quotes from tabs with colored left bars as requested by user
  const tabQuotes = [
    {
      id: 'q-1',
      text: 'Users often abandon booking workflows when real-time seat availability and pickup points remain uncertain until step 4.',
      source: 'research.example.com/transport-booking',
      color: 'border-emerald-500 bg-emerald-500/5',
      domain: 'research.example.com',
    },
    {
      id: 'q-2',
      text: 'Cross-verifying claims across multiple conversational tabs eliminates model hallucinations and isolates true operational bottlenecks.',
      source: 'chatgpt.com/share/transport',
      color: 'border-amber-500 bg-amber-500/5',
      domain: 'chatgpt.com',
    },
    {
      id: 'q-3',
      text: 'Local cooperative drivers maintain paper registers alongside smartphone apps. Ground reality requires two-way offline syncing.',
      source: 'docs.google.com/document/transport',
      color: 'border-sky-500 bg-sky-500/5',
      domain: 'docs.google.com',
    },
  ];

  // Best supporting sources with green relevance
  const topSources = [
    {
      title: 'Why people abandon online transport booking',
      url: 'https://research.example.com/transport-booking',
      relevance: 96,
      snippet: 'Key findings on price transparency, local carrier surcharges, and check-out friction.',
    },
    {
      title: 'Rwanda transport booking workflow notes',
      url: 'https://docs.google.com/document/transport',
      relevance: 92,
      snippet: 'Operational breakdown of ticket registers, station dispatching, and walk-up traffic.',
    },
    {
      title: 'ChatGPT — transport research synthesis',
      url: 'https://chatgpt.com/c/transport-flow',
      relevance: 88,
      snippet: 'Comparative analysis of 4 East African bus ticketing applications.',
    },
  ];

  const handleExportPDF = () => {
    setIsExporting(true);
    triggerThinking('Generating PDF', 'Formatting minimal executive brief...', 'Writing vector document', () => {
      try {
        const doc = new jsPDF({
          orientation: 'portrait',
          unit: 'mm',
          format: 'a4',
        });

        const pageWidth = 210;
        const margin = 20;
        const maxLineWidth = pageWidth - margin * 2;
        let y = 25;

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);
        doc.setTextColor(130, 130, 130);
        doc.text('BOB RESEARCH COMPANION · EXECUTIVE BRIEFING', margin, y);
        doc.text(new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }), pageWidth - margin - 25, y);
        y += 8;

        doc.setDrawColor(220, 220, 220);
        doc.setLineWidth(0.3);
        doc.line(margin, y, pageWidth - margin, y);
        y += 12;

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(22);
        doc.setTextColor(20, 20, 20);
        const titleLines = doc.splitTextToSize(project.title, maxLineWidth);
        doc.text(titleLines, margin, y);
        y += titleLines.length * 8 + 4;

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(10);
        doc.setTextColor(110, 110, 110);
        doc.text(`Scope: ${topSources.length} verified sources · ${openTasks.length} open roadmap tasks`, margin, y);
        y += 14;

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(13);
        doc.setTextColor(25, 25, 25);
        doc.text('1. Executive Summary', margin, y);
        y += 6;

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(10);
        doc.setTextColor(60, 60, 60);
        const execSummary = `The collected evidence highlights an immediate imperative: resolve core booking and payment transparency before adding secondary application features. User abandonment across channels is primarily driven by unexpected mobile carrier surcharges and ambiguity regarding real-time seat fulfillment.`;
        const execLines = doc.splitTextToSize(execSummary, maxLineWidth);
        doc.text(execLines, margin, y);
        y += execLines.length * 5 + 10;

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(13);
        doc.setTextColor(25, 25, 25);
        doc.text('2. Core Findings & Verified Quotes', margin, y);
        y += 7;

        tabQuotes.forEach((q) => {
          doc.setFont('helvetica', 'italic');
          doc.setFontSize(9);
          doc.setTextColor(80, 80, 80);
          const qLines = doc.splitTextToSize(`"${q.text}"`, maxLineWidth);
          doc.text(qLines, margin, y);
          y += qLines.length * 4.5;
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(8);
          doc.setTextColor(140, 140, 140);
          doc.text(`Source: ${q.source}`, margin, y);
          y += 6;
        });

        y += 4;
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(13);
        doc.setTextColor(25, 25, 25);
        doc.text('3. Recommended Next Steps', margin, y);
        y += 7;

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9.5);
        doc.setTextColor(60, 60, 60);
        openTasks.slice(0, 3).forEach((task) => {
          doc.text(`• ${task.title} (${task.dueDate || 'Pending'})`, margin + 2, y);
          y += 6;
        });

        doc.save(`Bob-${project.id}-research-summary.pdf`);
        setExportSuccess(true);
        setTimeout(() => setExportSuccess(false), 2500);
      } catch (e) {
        console.error('PDF generation error:', e);
      } finally {
        setIsExporting(false);
      }
    });
  };

  return (
    <div className={`mx-auto ${isSidePanel ? 'max-w-none px-2 py-1' : 'max-w-[850px] py-2 pb-24'}`}>
      {/* Header with Title and Export Button */}
      <div className="flex items-start justify-between gap-4 mb-6 border-b border-[var(--line)] pb-5">
        <div>
          <div className="text-[10px] tracking-[0.08em] text-[var(--m)] uppercase font-semibold">
            UNIFIED RESEARCH SUMMARY
          </div>
          <h1 className={`${isSidePanel ? 'text-xl' : 'text-3xl'} tracking-tight font-extrabold my-1 text-[var(--t)]`}>
            {project.title}
          </h1>
          {/* Zero-Pill Metadata */}
          <div className="flex items-center gap-2 text-xs text-[var(--m)] mt-2">
            <span>{topSources.length} verified sources</span>
            <span aria-hidden="true">·</span>
            <span>All active tabs unified</span>
            <span aria-hidden="true">·</span>
            <span className="text-[var(--y)] font-semibold">{openTasks.length} pending roadmap steps</span>
          </div>
        </div>

        {!isSidePanel && (
          <button
            onClick={handleExportPDF}
            disabled={isExporting}
            className="h-9 px-4 rounded-xl bg-[#171717] dark:bg-[#f2eee7] text-white dark:text-[#171717] font-bold text-xs flex items-center gap-2 shadow-sm hover:opacity-90 active:scale-95 transition-all shrink-0 disabled:opacity-50"
          >
            {exportSuccess ? <Check className="w-3.5 h-3.5 text-[var(--g)]" /> : <Download className="w-3.5 h-3.5" />}
            <span>{exportSuccess ? 'Saved PDF' : isExporting ? 'Exporting...' : 'Export PDF'}</span>
          </button>
        )}
      </div>

      <div className="space-y-6">
        {/* 1. Executive Summary */}
        <section className="space-y-2">
          <h2 className="text-sm uppercase font-bold text-[var(--m)] tracking-wider">
            1. Executive Synthesis
          </h2>
          <div className="p-4 rounded-2xl bg-[var(--s)] border border-[var(--line)] text-xs text-[var(--t)] leading-relaxed">
            The collected evidence across all open tabs indicates a direct conclusion: resolve fundamental booking and payment transparency before adding secondary application features. Passenger drop-off is predominantly driven by unexpected carrier fees and lack of guaranteed seat assignment.
          </div>
        </section>

        {/* 2. Quotes with Colored Bars on the Left (User Request) */}
        <section className="space-y-2.5">
          <div className="flex items-center justify-between">
            <h2 className="text-sm uppercase font-bold text-[var(--m)] tracking-wider">
              2. Core Tab Quotes & Evidence
            </h2>
            <span className="text-[11px] text-[var(--m)]">Direct passages</span>
          </div>
          <div className="space-y-2.5">
            {tabQuotes.map((q) => (
              <div
                key={q.id}
                className={`p-3.5 rounded-r-2xl border-l-4 border-y border-r border-[var(--line)] ${q.color} transition-all`}
              >
                <div className="text-xs text-[var(--t)] leading-relaxed font-medium italic">
                  "{q.text}"
                </div>
                <div className="flex items-center gap-2 text-[10px] text-[var(--m)] mt-2 font-mono">
                  <span>{q.domain}</span>
                  <span aria-hidden="true">·</span>
                  <span>Verified highlight</span>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* 3. Supporting Sources with Green Relevance Level */}
        <section className="space-y-2.5">
          <h2 className="text-sm uppercase font-bold text-[var(--m)] tracking-wider">
            3. Supporting Sources (Top Priority)
          </h2>
          <div className="bg-[var(--s)] border border-[var(--line)] rounded-2xl divide-y divide-[var(--line)] overflow-hidden">
            {topSources.map((source, idx) => (
              <div key={idx} className="p-3.5 flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <a
                    href={source.url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs font-bold text-[var(--t)] hover:text-[var(--y)] transition-colors line-clamp-1"
                  >
                    {source.title}
                  </a>
                  <p className="text-[11px] text-[var(--m)] line-clamp-1 leading-normal">
                    {source.snippet}
                  </p>
                </div>
                {/* Green level of relevance tag */}
                <div className="px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 font-mono text-[11px] font-extrabold shrink-0">
                  {source.relevance}% relevance
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* 4. Recommended Next Steps Matching Tasks Page */}
        <section className="space-y-2.5">
          <h2 className="text-sm uppercase font-bold text-[var(--m)] tracking-wider">
            4. Recommended Next Steps (Synchronized)
          </h2>
          <div className="p-4 rounded-2xl bg-[var(--s)] border border-[var(--line)] space-y-2.5">
            {openTasks.slice(0, 3).map((task, idx) => (
              <div key={task.id} className="flex items-center gap-3 text-xs text-[var(--t)]">
                <span className="w-5 h-5 rounded-lg bg-[var(--y)] text-[#171717] font-extrabold text-[10px] flex items-center justify-center shrink-0">
                  {idx + 1}
                </span>
                <span className="font-semibold flex-1 truncate">{task.title}</span>
                <span className="text-[10px] text-[var(--m)] font-mono shrink-0">{task.dueDate}</span>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
};
