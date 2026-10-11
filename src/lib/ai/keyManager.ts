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

export function resolveGeminiApiKey(): string | null {
  if (typeof window !== 'undefined') {
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
