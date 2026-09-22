import type { BobEvent, BobEventType } from '@bob/types'

export function createEvent<TPayload>(
  type: BobEventType | string,
  payload: TPayload,
  metadata: Pick<BobEvent, 'requestId' | 'researchId' | 'sessionId'> = {},
): BobEvent<TPayload> {
  return {
    id: crypto.randomUUID(),
    type,
    timestamp: Date.now(),
    payload,
    ...metadata,
  }
}

export function isBobEvent(value: unknown): value is BobEvent {
  if (!value || typeof value !== 'object') return false
  const event = value as Record<string, unknown>
  return (
    typeof event.id === 'string' &&
    typeof event.type === 'string' &&
    typeof event.timestamp === 'number' &&
    'payload' in event
  )
}
