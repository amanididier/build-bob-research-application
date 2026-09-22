export const BOB_EVENT_TYPES = [
  'research.created',
  'message.created',
  'tab.updated',
  'tab.selected',
  'highlight.created',
  'note.created',
  'subtopic.created',
  'task.updated',
  'summary.generated',
] as const

export type BobEventType = (typeof BOB_EVENT_TYPES)[number]

export interface BobEvent<TPayload = unknown> {
  id: string
  type: BobEventType | string
  timestamp: number
  requestId?: string
  researchId?: string
  sessionId?: string
  payload: TPayload
}

export interface BridgeResponse<T = unknown> {
  ok: boolean
  data?: T
  error?: string
  event?: BobEvent
}

export interface TestMessagePayload {
  message: string
}

export interface TestReplyPayload {
  message: string
}

export interface BrowserTab {
  id: string
  sessionId: string
  url: string
  title: string
  tabId: number
  favicon?: string
  selectedText: string
  createdAt: number
}

export interface TabUpdatedPayload {
  sessionId: string
  url: string
  title: string
  tabId: number
  favicon?: string
  selectedText: string
}
