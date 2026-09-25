import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { jsPDF } from 'jspdf';
import { Download, Check, FileText } from 'lucide-react';

export const SummaryView: React.FC = () => {
  const { activeResearchId, projects, triggerThinking } = useApp();
  const [isExporting, setIsExporting] = useState(false);
  const [exportSuccess, setExportSuccess] = useState(false);

  const project = projects.find((p) => p.id === activeResearchId) || projects[1];

  const handleExportPDF = () => {
    setIsExporting(true);
    triggerThinking('Generating PDF', 'Formatting minimal Claude/Apple-style executive brief...', 'Writing vector document', () => {
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

        // Top Header Brand & Date
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);
        doc.setTextColor(130, 130, 130);
        doc.text('BOB RESEARCH COMPANION · EXECUTIVE BRIEFING', margin, y);
        doc.text(new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }), pageWidth - margin - 25, y);
        y += 8;

        // Divider
        doc.setDrawColor(220, 220, 220);
        doc.setLineWidth(0.3);
        doc.line(margin, y, pageWidth - margin, y);
        y += 12;

        // Title
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(22);
        doc.setTextColor(20, 20, 20);
        const titleLines = doc.splitTextToSize(project.title, maxLineWidth);
        doc.text(titleLines, margin, y);
        y += titleLines.length * 8 + 4;

        // Subtitle / Scope
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(10);
        doc.setTextColor(110, 110, 110);
        doc.text(`Scope: 9 verified sources · 2 synthesized discussions · 3 validated tasks`, margin, y);
        y += 14;

        // Section 1: Executive Summary
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(13);
        doc.setTextColor(25, 25, 25);
        doc.text('1. Executive Summary', margin, y);
        y += 6;

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(10);
        doc.setTextColor(60, 60, 60);
        const execSummary = `The collected evidence highlights an immediate initial imperative: resolve core booking and payment transparency before adding secondary application features. User abandonment across channels is primarily driven by unexpected mobile carrier surcharges and ambiguity regarding real-time seat fulfillment.`;
        const execLines = doc.splitTextToSize(execSummary, maxLineWidth);
        doc.text(execLines, margin, y);
        y += execLines.length * 5 + 10;

        // Section 2: Key Findings
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(13);
        doc.setTextColor(25, 25, 25);
        doc.text('2. Core Findings & Evidence', margin, y);
        y += 7;

        // Finding Card 1
        doc.setFillColor(248, 248, 246);
        doc.roundedRect(margin, y, maxLineWidth, 22, 2, 2, 'F');
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(10);
        doc.setTextColor(190, 130, 20);
        doc.text('Finding 01: Pricing Shock at Checkout (45% drop-off rate)', margin + 4, y + 6);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);
        doc.setTextColor(70, 70, 70);
        const f1Text = doc.splitTextToSize('Tested users routinely abandon bookings when service surcharges appear late in checkout rather than upfront on the route search results.', maxLineWidth - 8);
        doc.text(f1Text, margin + 4, y + 12);
        y += 28;

        // Finding Card 2
        doc.setFillColor(248, 248, 246);
        doc.roundedRect(margin, y, maxLineWidth, 22, 2, 2, 'F');
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(10);
        doc.setTextColor(40, 95, 210);
        doc.text('Finding 02: Physical Seat Certainty vs Offline Walk-ups', margin + 4, y + 6);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);
        doc.setTextColor(70, 70, 70);
        const f2Text = doc.splitTextToSize('Passengers require explicit terminal stall locations and vehicle plate verification because operators routinely give priority to walk-up passengers.', maxLineWidth - 8);
        doc.text(f2Text, margin + 4, y + 12);
        y += 30;

        // Section 3: Recommended Actions
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(13);
        doc.setTextColor(25, 25, 25);
        doc.text('3. Actionable Next Steps', margin, y);
        y += 7;

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9.5);
        doc.setTextColor(60, 60, 60);
        const steps = [
          '• Conduct 2 structured operator interviews focusing on cash vs digital seat allocation.',
          '• Implement upfront fee calculation to display total all-inclusive fare prior to checkout.',
          '• Prototype automated SMS ticket confirmation with explicit pickup plate details.'
        ];
        steps.forEach((step) => {
          doc.text(step, margin + 2, y);
          y += 6;
        });

        // Footer
        doc.setFont('helvetica', 'italic');
        doc.setFontSize(8);
        doc.setTextColor(150, 150, 150);
        doc.text('Generated by Bob Research Companion · Private & Grounded Research', margin, 280);

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
    <div className="max-w-[850px] mx-auto py-2 pb-24">
      {/* Header with Title and Export Button */}
      <div className="flex items-start justify-between gap-6 mb-8 border-b border-[var(--line)] pb-6">
        <div>
          <div className="text-[10px] tracking-[0.08em] text-[#999] uppercase font-semibold">
            RESEARCH SYNTHESIS
          </div>
          <h1 className="text-[32px] tracking-[-1px] font-extrabold my-2 text-[var(--t)]">
            {project.title}
          </h1>
          <div className="flex gap-2 flex-wrap mt-3">
            <span className="text-[10px] px-2.5 py-1 rounded-full bg-[var(--s2)] text-[#666] dark:text-[#cfc7be]">
              9 verified sources
            </span>
            <span className="text-[10px] px-2.5 py-1 rounded-full bg-[var(--s2)] text-[#666] dark:text-[#cfc7be]">
              2 conversations
            </span>
            <span className="text-[10px] px-2.5 py-1 rounded-full bg-[var(--s2)] text-[#666] dark:text-[#cfc7be]">
              3 open tasks
            </span>
          </div>
        </div>

        {/* Real PDF Export Button */}
        <button
          onClick={handleExportPDF}
          disabled={isExporting}
          className="h-10 px-5 rounded-full bg-[#171717] dark:bg-[#f2eee7] text-white dark:text-[#171717] font-bold text-[12px] flex items-center gap-2 shadow-md hover:opacity-90 active:scale-95 transition-all flex-shrink-0 disabled:opacity-50"
        >
          {exportSuccess ? (
            <Check className="w-4 h-4 text-[var(--g)]" />
          ) : (
            <Download className="w-4 h-4" />
          )}
          <span>{exportSuccess ? 'Downloaded PDF!' : isExporting ? 'Exporting PDF...' : 'Export PDF'}</span>
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
                <small className="text-[10px] text-[var(--m)]">chatgpt.com/share/transport · 2 claims</small>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[var(--bs)] text-[#1e40af] font-bold">
                88% relevance
              </span>
            </div>
          </div>
        </section>

        {/* Recommended Next Steps */}
        <section className="space-y-2">
          <h2 className="text-[18px] font-bold text-[var(--t)] tracking-tight">
            4. Recommended Next Steps
          </h2>
          <div className="bg-[var(--s2)] rounded-[15px] p-4 space-y-2 text-[12.5px] text-[var(--t)]">
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
