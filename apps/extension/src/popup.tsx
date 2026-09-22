import { useEffect, useState } from 'react'
import { createRoot } from 'react-dom/client'
import './popup.css'

function Popup() {
  const [connected, setConnected] = useState<boolean | null>(null)
  const [message, setMessage] = useState('')
  const [reply, setReply] = useState('')

  useEffect(() => { fetch('http://127.0.0.1:54321/health', { headers: { 'x-bob-token': 'development-token' } }).then((response) => setConnected(response.ok)).catch(() => setConnected(false)) }, [])
  function sendTestMessage() { setReply(message.trim() ? `Saved to Bob: ${message.trim()}` : 'Write a message first.') }
  return <main className="popup"><header><span className="logo">B</span><div><h1>Bob</h1><p>Research companion</p></div><span className={`dot ${connected ? 'on' : ''}`} /></header><section className="status"><strong>{connected === null ? 'Connecting…' : connected ? 'Desktop app connected' : 'Start the Bob desktop app'}</strong><span>{connected ? 'Tabs and highlights sync automatically.' : 'Keep Bob open while browsing.'}</span></section><label htmlFor="note">Quick note</label><textarea id="note" value={message} onChange={(event) => setMessage(event.target.value)} placeholder="Capture a thought…" /><button onClick={sendTestMessage}>Save note</button>{reply && <output>{reply}</output>}</main>
}

createRoot(document.getElementById('root')!).render(<Popup />)
