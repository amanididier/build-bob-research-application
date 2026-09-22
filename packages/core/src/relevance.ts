export type RelevanceColor = 'green' | 'blue' | 'yellow' | 'red'

const TRUSTED_DOMAINS = ['.edu', '.gov', '.org', 'nature.com', 'sciencedirect.com', 'arxiv.org', 'pubmed.ncbi.nlm.nih.gov']

export function scoreRelevance(title: string, url: string, goal: string): number {
  const haystack = `${title} ${url}`.toLowerCase()
  const keywords = goal.toLowerCase().split(/[^a-z0-9]+/).filter((word) => word.length > 3)
  if (!keywords.length) return 20
  const titleMatches = keywords.filter((keyword) => title.toLowerCase().includes(keyword)).length
  const urlMatches = keywords.filter((keyword) => url.toLowerCase().includes(keyword)).length
  const topicMatches = keywords.filter((keyword) => haystack.includes(keyword)).length
  let score = 0
  if (topicMatches > 0) score += 25
  if (titleMatches > 0) score += 30
  if (urlMatches > 0) score += 15
  if (TRUSTED_DOMAINS.some((domain) => new URL(url).hostname.includes(domain))) score += 20
  return Math.min(100, score)
}

export function relevanceColor(score: number): RelevanceColor {
  if (score >= 80) return 'green'
  if (score >= 66) return 'blue'
  if (score >= 50) return 'yellow'
  return 'red'
}

export function relevanceLabel(score: number): string {
  if (score >= 80) return 'High relevance'
  if (score >= 66) return 'Strong relevance'
  if (score >= 50) return 'Possible relevance'
  return 'Low relevance'
}

export function scoreTab(title: string, url: string, goal: string) {
  const score = scoreRelevance(title, url, goal)
  return { score, color: relevanceColor(score), label: relevanceLabel(score) }
}

export type RelevanceResult = ReturnType<typeof scoreTab>

export function safeScoreTab(title: string, url: string, goal: string) {
  try { return scoreTab(title, url, goal) } catch { return { score: 0, color: 'red' as const, label: 'Low relevance' } }
}

// Keep this package dependency-free so the extension can reuse the same deterministic rules.
export const RELEVANCE_THRESHOLDS = { green: 80, blue: 66, yellow: 50 } as const
