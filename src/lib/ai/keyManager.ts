const USER_GROQ_KEY = 'bob_user_groq_key';
const USER_GEMINI_KEY = 'bob_user_gemini_key';
const KEY_LOCK_HASH = 'bob_api_key_lock_hash_v1';
const KEY_LOCKED_FLAG = 'bob_api_key_is_locked_v1';
const KEY_PROVIDER = 'bob_api_key_provider_v1';
const USAGE_STATS = 'bob_token_usage_v1';

export function getGroqKey(): string | null {
  if (typeof window !== 'undefined') {
    return localStorage.getItem(USER_GROQ_KEY) || null;
  }
  return null;
}

export function setGroqKey(key: string): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem(USER_GROQ_KEY, key.trim());
  }
}

export function resolveGeminiApiKey(): string | null {
  if (typeof window !== 'undefined') {
    // Locked keys still resolve for runtime use after unlock session
    const unlocked = sessionStorage.getItem('bob_key_session_unlocked') === '1';
    const locked = localStorage.getItem(KEY_LOCKED_FLAG) === '1';
    if (locked && !unlocked) {
      // Runtime may still need the key if already unlocked this session;
      // when locked and not unlocked, return null for UI reveal only.
    }
    const k =
      localStorage.getItem(USER_GEMINI_KEY) ||
      localStorage.getItem('bob_gemini_api_key') ||
      localStorage.getItem('gemini_api_key') ||
      (window as any).__BOB_GEMINI_KEY ||
      (import.meta as any).env?.VITE_GEMINI_API_KEY ||
      '';
    if (k && k.trim()) return k.trim();
  }
  return null;
}

export function getGeminiKey(): string | null {
  return resolveGeminiApiKey();
}

export function setGeminiKey(key: string): void {
  if (typeof window !== 'undefined') {
    const trimmed = key.trim();
    if (trimmed) {
      localStorage.setItem(USER_GEMINI_KEY, trimmed);
      localStorage.setItem('bob_gemini_api_key', trimmed);
      localStorage.setItem('gemini_api_key', trimmed);
    } else {
      localStorage.removeItem(USER_GEMINI_KEY);
      localStorage.removeItem('bob_gemini_api_key');
      localStorage.removeItem('gemini_api_key');
    }
    pushGeminiKeyToDesktop(trimmed);
  }
}

function pushGeminiKeyToDesktop(key: string): void {
  if (typeof window === 'undefined' || !key) return;
  const bob = (window as any).bob;
  if (bob && typeof bob.setGeminiKey === 'function') {
    Promise.resolve(bob.setGeminiKey(key)).catch(() => {});
  }
}

export function syncGeminiKeyToDesktop(): void {
  if (typeof window === 'undefined') return;
  const key = localStorage.getItem(USER_GEMINI_KEY);
  if (key) pushGeminiKeyToDesktop(key);
}

/** Simple non-crypto hash for local password gate (device-only) */
async function hashPassword(password: string): Promise<string> {
  const enc = new TextEncoder().encode(`bob-lock:${password}`);
  if (typeof crypto !== 'undefined' && crypto.subtle) {
    const buf = await crypto.subtle.digest('SHA-256', enc);
    return Array.from(new Uint8Array(buf))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
  }
  // Fallback
  let h = 0;
  for (let i = 0; i < password.length; i++) h = (h * 31 + password.charCodeAt(i)) >>> 0;
  return `fallback-${h}`;
}

export function isKeyLocked(): boolean {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem(KEY_LOCKED_FLAG) === '1' && !!localStorage.getItem(KEY_LOCK_HASH);
}

export function isKeySessionUnlocked(): boolean {
  if (typeof window === 'undefined') return false;
  return sessionStorage.getItem('bob_key_session_unlocked') === '1';
}

export async function lockApiKeyWithPassword(password: string): Promise<void> {
  if (typeof window === 'undefined') return;
  const hash = await hashPassword(password);
  localStorage.setItem(KEY_LOCK_HASH, hash);
  localStorage.setItem(KEY_LOCKED_FLAG, '1');
  sessionStorage.setItem('bob_key_session_unlocked', '1');
}

export async function unlockApiKeyWithPassword(password: string): Promise<boolean> {
  if (typeof window === 'undefined') return false;
  const stored = localStorage.getItem(KEY_LOCK_HASH);
  if (!stored) return true;
  const hash = await hashPassword(password);
  if (hash === stored) {
    sessionStorage.setItem('bob_key_session_unlocked', '1');
    return true;
  }
  return false;
}

export function clearKeyLock(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(KEY_LOCK_HASH);
  localStorage.removeItem(KEY_LOCKED_FLAG);
  sessionStorage.removeItem('bob_key_session_unlocked');
}

export function setKeyProvider(provider: string): void {
  if (typeof window !== 'undefined') localStorage.setItem(KEY_PROVIDER, provider);
}

export function getKeyProvider(): string {
  if (typeof window === 'undefined') return 'gemini';
  return localStorage.getItem(KEY_PROVIDER) || 'gemini';
}

export function maskKey(key: string | null): string {
  if (!key) return '';
  if (key.length < 12) return '••••••••';
  return `${key.slice(0, 6)}••••${key.slice(-4)}`;
}

export type UsageSnapshot = {
  requests: number;
  estTokens: number;
  lastUsed?: string;
};

export function getUsageSnapshot(): UsageSnapshot {
  try {
    return JSON.parse(localStorage.getItem(USAGE_STATS) || '{"requests":0,"estTokens":0}');
  } catch {
    return { requests: 0, estTokens: 0 };
  }
}

export function recordUsage(tokensApprox = 800): void {
  if (typeof window === 'undefined') return;
  const cur = getUsageSnapshot();
  const next = {
    requests: cur.requests + 1,
    estTokens: cur.estTokens + tokensApprox,
    lastUsed: new Date().toISOString(),
  };
  localStorage.setItem(USAGE_STATS, JSON.stringify(next));
}
