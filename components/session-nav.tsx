import { Button } from '@/components/ui/button'

export type SessionView = 'chat' | 'summary' | 'tabs' | 'tasks'

interface SessionNavProps {
  activeView: SessionView
  onViewChange: (view: SessionView) => void
}

export function SessionNav({ activeView, onViewChange }: SessionNavProps) {
  const views: { id: SessionView; label: string }[] = [
    { id: 'chat', label: 'Chat' },
    { id: 'summary', label: 'Summary' },
    { id: 'tabs', label: 'Tabs' },
    { id: 'tasks', label: 'Tasks' },
  ]

  return (
    <nav className="session-nav">
      <div className="nav-tabs">
        {views.map((view) => (
          <button
            key={view.id}
            className={`nav-tab ${activeView === view.id ? 'is-active' : ''}`}
            onClick={() => onViewChange(view.id)}
          >
            {view.label}
          </button>
        ))}
      </div>
    </nav>
  )
}
