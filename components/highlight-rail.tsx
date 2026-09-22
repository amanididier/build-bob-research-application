'use client'

import { useState } from 'react'

type Highlight = {
  id: string
  url: string
  selectedText: string
  relevanceScore: number
  color: string
}

const colorClass = {
  green: 'rail-dot-green',
  blue: 'rail-dot-blue',
  yellow: 'rail-dot-yellow',
  red: 'rail-dot-red',
} satisfies Record<string, string>

export function HighlightRail({ highlights }: { highlights: Highlight[] }) {
  const [active, setActive] = useState<Highlight | null>(null)

  return (
    <aside className="highlight-rail" aria-label="Relevance highlights">
      <div className="rail-dots">
        {highlights.map((highlight) => (
          <button
            key={highlight.id}
            className={`rail-dot ${colorClass[highlight.color as keyof typeof colorClass] ?? colorClass.red}`}
            aria-label={`${highlight.relevanceScore}% relevance`}
            onMouseEnter={() => setActive(highlight)}
            onFocus={() => setActive(highlight)}
            onClick={() => window.open(highlight.url, '_blank', 'noopener,noreferrer')}
          />
        ))}
      </div>
      {active ? (
        <div className="highlight-card" role="status">
          <strong>{active.relevanceScore}% relevant</strong>
          <p>{active.selectedText || 'No passage captured yet.'}</p>
          <button onClick={() => window.open(active.url, '_blank', 'noopener,noreferrer')}>Navigate highlight</button>
        </div>
      ) : null}
    </aside>
  )
}
