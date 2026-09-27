import { evidenceEngine } from './evidenceEngine';
import { researchGraph } from './researchGraph';
import { ResearchFinding } from './researchTypes';
import { addImportantFact } from '../memory/memoryManager';

export interface ResearchPlan {
  mainQuestion: string;
  subQuestions: string[];
  focusAreas: string[];
}

export class ResearchOrchestrator {
  public shouldTriggerDeepResearch(prompt: string): boolean {
    const lower = prompt.toLowerCase();
    const researchTriggers = [
      'compare',
      'investigate',
      'literature review',
      'deep dive',
      'case study',
      'pros and cons',
      'methodology',
      'evidence for',
      'architecture comparison',
      'comprehensive analysis',
      'citations',
    ];
    return researchTriggers.some((t) => lower.includes(t)) || prompt.split(/\s+/).length > 28;
  }

  public generateResearchPlan(prompt: string): ResearchPlan {
    const cleanPrompt = prompt.trim();
    return {
      mainQuestion: cleanPrompt,
      subQuestions: [
        `Underlying principles and context of ${cleanPrompt.slice(0, 45)}`,
        'Empirical evidence, case studies, and technical trade-offs',
        'Practical implementation constraints and best practices',
      ],
      focusAreas: ['Technical feasibility', 'Comparative metrics', 'Actionable outcomes'],
    };
  }

  public processResponseFindings(researchId: string, answerText: string, subtopicId?: string | null): ResearchFinding[] {
    const findings: ResearchFinding[] = [];
    // Extract key claims from bullet points or numbered lists
    const lines = answerText.split('\n');
    for (const line of lines) {
      const match = line.match(/^[\s*-•\d.]+\s*(.+[:—].+)$/);
      if (match && match[1]) {
        const text = match[1].trim();
        if (text.length > 25 && text.length < 250) {
          const finding = evidenceEngine.createFinding({
            researchId,
            subtopicId,
            claim: text.split(/[:—]/)[0].trim(),
            summary: text,
            evidence: text,
            confidence: 0.88,
            importance: 0.85,
          });
          findings.push(finding);
          researchGraph.addFinding(finding);
        }
      }
    }
    return findings;
  }

  public extractAndPersistUserMemory(userPrompt: string): void {
    // Distinguish personal preferences from research claims
    const prefMatch = userPrompt.match(/i (?:prefer|like|always use|focus on|specialize in) (.*)/i);
    if (prefMatch && prefMatch[1]) {
      const pref = prefMatch[1].replace(/[.!?,;]+$/, '').trim();
      if (pref.length > 3 && pref.length < 90) {
        addImportantFact(`Prefers: ${pref}`);
      }
    }
  }
}

export const researchOrchestrator = new ResearchOrchestrator();
