import { ResearchFinding, ResearchSource, ResearchClaim } from './researchTypes';

export class EvidenceEngine {
  public evaluateCredibility(source: Partial<ResearchSource>): number {
    let score = 0.6; // Default baseline
    const domain = (source.domain || '').toLowerCase();

    // Academic, governmental, educational domains
    if (domain.endsWith('.edu') || domain.endsWith('.ac.rw') || domain.endsWith('.ac.uk')) {
      score += 0.3;
    } else if (domain.endsWith('.gov') || domain.endsWith('.org')) {
      score += 0.2;
    } else if (
      domain.includes('nature.com') ||
      domain.includes('ieee.org') ||
      domain.includes('sciencedirect.com') ||
      domain.includes('arxiv.org') ||
      domain.includes('acm.org')
    ) {
      score += 0.35;
    }

    if (source.author && source.author.trim()) {
      score += 0.05;
    }

    if (source.publishedAt) {
      score += 0.05;
    }

    return Math.min(Math.max(score, 0.1), 1.0);
  }

  public createFinding(params: {
    researchId: string;
    subtopicId?: string | null;
    claim: string;
    summary: string;
    evidence: string;
    sourceIds?: string[];
    confidence?: number;
    importance?: number;
  }): ResearchFinding {
    return {
      id: `fnd_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      researchId: params.researchId,
      subtopicId: params.subtopicId || null,
      claim: params.claim,
      summary: params.summary,
      evidence: params.evidence,
      confidence: params.confidence ?? 0.85,
      importance: params.importance ?? 0.8,
      sourceIds: params.sourceIds || [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }

  public detectContradiction(findingA: ResearchFinding, findingB: ResearchFinding): boolean {
    const aLower = findingA.claim.toLowerCase();
    const bLower = findingB.claim.toLowerCase();

    // Basic heuristic negation check
    const negations = ['not', 'never', 'unlikely', 'disproven', 'ineffective', 'higher than', 'lower than'];
    for (const neg of negations) {
      if ((aLower.includes(neg) && !bLower.includes(neg)) || (!aLower.includes(neg) && bLower.includes(neg))) {
        // Compare overlapping words
        const wordsA = aLower.split(/\s+/).filter((w) => w.length > 4);
        const overlap = wordsA.filter((w) => bLower.includes(w));
        if (overlap.length >= 2) {
          return true;
        }
      }
    }
    return false;
  }
}

export const evidenceEngine = new EvidenceEngine();
