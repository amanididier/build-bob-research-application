import { ResearchFinding, ResearchSource, ResearchQuestion } from './researchTypes';

interface ResearchKnowledgeStore {
  findings: Record<string, ResearchFinding[]>; // key: researchId
  sources: Record<string, ResearchSource>;
  questions: Record<string, ResearchQuestion[]>;
}

const STORAGE_KEY = 'bob_research_knowledge_graph_v1';

class ResearchGraph {
  private store: ResearchKnowledgeStore = {
    findings: {},
    sources: {},
    questions: {},
  };

  private initialized = false;

  constructor() {
    this.init();
  }

  private init() {
    if (this.initialized) return;
    if (typeof window !== 'undefined') {
      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) {
          this.store = JSON.parse(raw);
        }
      } catch (e) {
        console.warn('ResearchGraph init warning:', e);
      }
    }
    this.initialized = true;
  }

  private persist() {
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(this.store));
      } catch (e) {
        console.warn('ResearchGraph persist warning:', e);
      }
    }
  }

  public addFinding(finding: ResearchFinding): void {
    if (!this.store.findings[finding.researchId]) {
      this.store.findings[finding.researchId] = [];
    }
    // Avoid exact duplicate claims
    const existing = this.store.findings[finding.researchId].find(
      (f) => f.claim.toLowerCase() === finding.claim.toLowerCase()
    );
    if (!existing) {
      this.store.findings[finding.researchId].push(finding);
      this.persist();
    }
  }

  public getFindingsForResearch(researchId: string): ResearchFinding[] {
    return this.store.findings[researchId] || [];
  }

  public addSource(source: ResearchSource): void {
    this.store.sources[source.id] = source;
    this.persist();
  }

  public getSource(id: string): ResearchSource | null {
    return this.store.sources[id] || null;
  }

  public searchCrossResearch(query: string, currentResearchId?: string, limit = 4): ResearchFinding[] {
    const terms = query.toLowerCase().split(/\s+/).filter((w) => w.length > 3);
    if (terms.length === 0) return [];

    const allFindings: ResearchFinding[] = [];
    for (const [resId, findingsList] of Object.entries(this.store.findings)) {
      if (currentResearchId && resId === currentResearchId) continue;
      allFindings.push(...findingsList);
    }

    const scored = allFindings.map((f) => {
      let score = 0;
      const text = `${f.claim} ${f.summary} ${f.evidence}`.toLowerCase();
      for (const t of terms) {
        if (text.includes(t)) score += 1;
      }
      return { finding: f, score };
    });

    return scored
      .filter((s) => s.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map((s) => s.finding);
  }
}

export const researchGraph = new ResearchGraph();
