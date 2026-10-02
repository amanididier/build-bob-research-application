const USER_GROQ_KEY = 'bob_user_groq_key';
const USER_GEMINI_KEY = 'bob_user_gemini_key';

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

export function getGeminiKey(): string | null {
  if (typeof window !== 'undefined') {
    return localStorage.getItem(USER_GEMINI_KEY) || null;
  }
  return null;
}

export function setGeminiKey(key: string): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem(USER_GEMINI_KEY, key.trim());
    pushGeminiKeyToDesktop(key.trim());
  }
}

// Mirror the renderer-held key into the Electron main store so the local
// bridge can hand it to the Chrome extension (which never stores its own).
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
