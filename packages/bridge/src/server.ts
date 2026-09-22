import { createServer, type IncomingMessage, type ServerResponse } from 'node:http'
import { randomBytes, randomUUID } from 'node:crypto'
import { createEvent } from '@bob/protocol'
import type { BridgeResponse, BrowserTab, TabUpdatedPayload, TestMessagePayload, TestReplyPayload } from '@bob/types'

const browserTabs: BrowserTab[] = []

function upsertBrowserTab(payload: TabUpdatedPayload): BrowserTab {
  const existing = browserTabs.find((tab) => tab.sessionId === payload.sessionId && tab.tabId === payload.tabId)
  if (existing) {
    Object.assign(existing, payload)
    return existing
  }
  const tab: BrowserTab = { ...payload, id: randomUUID(), createdAt: Date.now() }
  browserTabs.unshift(tab)
  return tab
}

export interface BobBridge {
  port: number
  token: string
  close: () => Promise<void>
}

function writeJson(response: ServerResponse, status: number, body: BridgeResponse) {
  response.writeHead(status, { 'content-type': 'application/json', 'access-control-allow-origin': '*' })
  response.end(JSON.stringify(body))
}

export function startBobBridge(port = 54321, token = randomBytes(24).toString('hex')): Promise<BobBridge> {
  return new Promise((resolve, reject) => {
    const server = createServer(async (request: IncomingMessage, response: ServerResponse) => {
      if (request.method === 'OPTIONS') {
        response.writeHead(204, { 'access-control-allow-origin': '*', 'access-control-allow-headers': 'x-bob-token, content-type' })
        response.end()
        return
      }

      if (request.headers['x-bob-token'] !== token) {
        writeJson(response, 401, { ok: false, error: 'Unauthorized bridge request' })
        return
      }

      if (request.method === 'GET' && request.url === '/health') {
        writeJson(response, 200, { ok: true, data: { service: 'bob-bridge', port } })
        return
      }

      if (request.method === 'POST' && request.url === '/events/tab') {
        let raw = ''
        for await (const chunk of request) raw += chunk
        let payload: TabUpdatedPayload
        try {
          payload = JSON.parse(raw) as TabUpdatedPayload
        } catch {
          writeJson(response, 400, { ok: false, error: 'Invalid JSON payload' })
          return
        }
        if (!payload.sessionId || !payload.url || !payload.title || !Number.isInteger(payload.tabId)) {
          writeJson(response, 400, { ok: false, error: 'Invalid tab payload' })
          return
        }
        const tab = upsertBrowserTab(payload)
        writeJson(response, 201, { ok: true, data: tab, event: createEvent<TabUpdatedPayload>('tab.updated', payload, { sessionId: payload.sessionId }) })
        return
      }

      if (request.method === 'GET' && request.url?.startsWith('/sessions/') && request.url.endsWith('/tabs')) {
        const sessionId = request.url.split('/')[2]
        writeJson(response, 200, { ok: true, data: browserTabs.filter((tab) => tab.sessionId === sessionId) })
        return
      }

      if (request.method === 'POST' && request.url === '/events/test') {
        let raw = ''
        for await (const chunk of request) raw += chunk
        let payload: TestMessagePayload
        try {
          payload = JSON.parse(raw) as TestMessagePayload
        } catch {
          writeJson(response, 400, { ok: false, error: 'Invalid JSON payload' })
          return
        }
        if (typeof payload.message !== 'string' || payload.message.length > 500) {
          writeJson(response, 400, { ok: false, error: 'message must be a string under 500 characters' })
          return
        }
        const event = createEvent<TestMessagePayload>('test.message', payload, { requestId: randomUUID() })
        const reply: TestReplyPayload = { message: `Hello from Bob. I received: ${event.payload.message}` }
        writeJson(response, 200, { ok: true, event, data: reply })
        return
      }

      writeJson(response, 404, { ok: false, error: 'Route not found' })
    })

    server.once('error', reject)
    server.listen(port, '127.0.0.1', () => resolve({ port, token, close: () => new Promise((done) => server.close(() => done())) }))
  })
}
