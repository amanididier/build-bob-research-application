'use client'

import { useState, useRef, useEffect } from 'react'
import { sendMessage, getSessionMessages } from '@/app/actions/ai'
import type { researchMessage } from '@/lib/db/schema'

interface ChatViewProps {
  sessionId: string
  projectName: string
}

export function ChatView({ sessionId, projectName }: ChatViewProps) {
  const [messages, setMessages] = useState<typeof researchMessage.$inferSelect[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    async function loadMessages() {
      const msgs = await getSessionMessages(sessionId)
      setMessages(msgs.reverse())
    }
    loadMessages()
  }, [sessionId])

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages])

  async function handleSend() {
    if (!input.trim() || loading) return
    setLoading(true)
    setInput('')

    try {
      const { userMsg, assistantMsg } = await sendMessage(sessionId, input)
      setMessages((prev) => [...prev, userMsg, assistantMsg])
    } finally {
      setLoading(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div className="chat-view">
      <div className="chat-header">
        <h2>Researching: {projectName}</h2>
        <p className="chat-subtitle">AI-powered research synthesis</p>
      </div>

      <div className="chat-messages" ref={scrollRef}>
        {messages.length === 0 ? (
          <div className="chat-empty">
            <p>Start your research by asking a question about your topic.</p>
          </div>
        ) : (
          messages.map((msg) => (
            <div key={msg.id} className={`chat-message ${msg.role}`}>
              <div className="message-role">{msg.role === 'user' ? 'You' : 'Bob'}</div>
              <div className="message-content">{msg.content}</div>
            </div>
          ))
        )}
        {loading && (
          <div className="chat-message assistant">
            <div className="message-role">Bob</div>
            <div className="message-content thinking">Thinking...</div>
          </div>
        )}
      </div>

      <div className="chat-composer">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask Bob about your research..."
          disabled={loading}
          rows={3}
        />
        <button onClick={handleSend} disabled={!input.trim() || loading}>
          Send
        </button>
      </div>
    </div>
  )
}
