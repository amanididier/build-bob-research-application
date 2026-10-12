/**
 * Local-first account service.
 * Accounts and sessions live on this device (salted SHA-256 password hashes).
 * If the user supplies their own Supabase URL + anon key (Settings → Personalization),
 * every signed-in user is also upserted to their `bob_users` table for cloud sync.
 * Google sign-in uses Google Identity Services when a client ID is configured.
 */

export interface BobUser {
  id: string;
  name: string;
  email: string;
  avatarUrl: string;
  provider: 'email' | 'google';
  createdAt: string;
}

interface StoredAccount extends BobUser {
  salt: string;
  passwordHash: string;
}

export interface SupabaseConfig {
  url: string;
  anonKey: string;
}

const ACCOUNTS_KEY = 'bob_accounts_db_v1';
const SESSION_KEY = 'bob_auth_user';
const EMAIL_KEY = 'bob_user_email';
const SUPABASE_CFG_KEY = 'bob_supabase_config';
const GOOGLE_CLIENT_ID_KEY = 'bob_google_client_id';

function readAccounts(): StoredAccount[] {
  try {
    const raw = localStorage.getItem(ACCOUNTS_KEY);
    if (raw) return JSON.parse(raw) as StoredAccount[];
  } catch {}
  return [];
}

function writeAccounts(accounts: StoredAccount[]): void {
  localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(accounts));
}

async function hashPassword(password: string, salt: string): Promise<string> {
  const data = new TextEncoder().encode(`${salt}::${password}`);
  if (globalThis.crypto?.subtle) {
    const digest = await crypto.subtle.digest('SHA-256', data);
    return Array.from(new Uint8Array(digest))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
  }
  // Non-WebCrypto fallback (never used in Electron/Chrome, kept for safety)
  let h = 5381;
  const s = `${salt}::${password}`;
  for (let i = 0; i < s.length; i++) h = (h * 33) ^ s.charCodeAt(i);
  return `fb${(h >>> 0).toString(16)}`;
}

function toPublicUser(account: StoredAccount): BobUser {
  const { salt: _s, passwordHash: _p, ...pub } = account;
  return pub;
}

function persistSession(user: BobUser): void {
  localStorage.setItem(SESSION_KEY, JSON.stringify(user));
  localStorage.setItem(EMAIL_KEY, user.email);
  void syncUserToCloud(user);
}

export function getSession(): BobUser | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (raw) return JSON.parse(raw) as BobUser;
  } catch {}
  return null;
}

export function signOut(): void {
  localStorage.removeItem(SESSION_KEY);
  localStorage.removeItem(EMAIL_KEY);
}

export async function signInOrSignUpWithEmail(
  name: string,
  email: string,
  password: string
): Promise<BobUser> {
  const cleanEmail = email.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
    throw new Error('That email address does not look valid.');
  }
  if (!password || password.length < 6) {
    throw new Error('Password must be at least 6 characters.');
  }

  const accounts = readAccounts();
  const existing = accounts.find((a) => a.email === cleanEmail);

  if (existing) {
    const hash = await hashPassword(password, existing.salt);
    if (hash !== existing.passwordHash) {
      throw new Error('Wrong password for that email. Try again.');
    }
    const user = toPublicUser(existing);
    persistSession(user);
    return user;
  }

  const salt = crypto.randomUUID ? crypto.randomUUID() : String(Date.now());
  const account: StoredAccount = {
    id: `usr_${Date.now()}`,
    name: name.trim() || cleanEmail.split('@')[0],
    email: cleanEmail,
    avatarUrl: '',
    provider: 'email',
    createdAt: new Date().toISOString(),
    salt,
    passwordHash: await hashPassword(password, salt),
  };
  accounts.push(account);
  writeAccounts(accounts);
  const user = toPublicUser(account);
  persistSession(user);
  return user;
}

export function getGoogleClientId(): string {
  return localStorage.getItem(GOOGLE_CLIENT_ID_KEY) || '';
}

export function setGoogleClientId(id: string): void {
  localStorage.setItem(GOOGLE_CLIENT_ID_KEY, id.trim());
}

/** Real Google Identity Services popup. Requires the user's own OAuth client ID. */
export function signInWithGoogle(): Promise<BobUser> {
  const clientId = getGoogleClientId();
  if (!clientId) {
    return Promise.reject(
      new Error('Google sign-in is not configured yet. Add your Google Client ID in Settings → Personalization, or continue with email.')
    );
  }

  return new Promise((resolve, reject) => {
    const onReady = () => {
      try {
        const google = (window as any).google;
        google.accounts.id.initialize({
          client_id: clientId,
          callback: (resp: any) => {
            try {
              const payload = JSON.parse(atob(resp.credential.split('.')[1]));
              const user: BobUser = {
                id: payload.sub ? `g_${payload.sub}` : `usr_${Date.now()}`,
                name: payload.name || payload.email?.split('@')[0] || 'Friend',
                email: payload.email || '',
                avatarUrl: payload.picture || '',
                provider: 'google',
                createdAt: new Date().toISOString(),
              };
              upsertGoogleAccount(user);
              persistSession(user);
              resolve(user);
            } catch (err) {
              reject(err);
            }
          },
        });
        google.accounts.id.prompt((notification: any) => {
          if (notification.isNotDisplayed() || notification.isSkippedMoment()) {
            reject(new Error('Google sign-in was closed before finishing.'));
          }
        });
      } catch (err) {
        reject(err);
      }
    };

    if ((window as any).google?.accounts?.id) {
      onReady();
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.onload = onReady;
    script.onerror = () => reject(new Error('Could not reach Google sign-in. Check your connection.'));
    document.head.appendChild(script);
  });
}

function upsertGoogleAccount(user: BobUser): void {
  const accounts = readAccounts();
  if (!accounts.some((a) => a.email === user.email)) {
    accounts.push({ ...user, salt: '', passwordHash: '' });
    writeAccounts(accounts);
  }
}

export function getSupabaseConfig(): SupabaseConfig | null {
  try {
    const raw = localStorage.getItem(SUPABASE_CFG_KEY);
    if (raw) {
      const cfg = JSON.parse(raw) as SupabaseConfig;
      if (cfg.url && cfg.anonKey) return cfg;
    }
  } catch {}
  return null;
}

export function setSupabaseConfig(cfg: SupabaseConfig | null): void {
  if (!cfg || !cfg.url.trim() || !cfg.anonKey.trim()) {
    localStorage.removeItem(SUPABASE_CFG_KEY);
    return;
  }
  localStorage.setItem(SUPABASE_CFG_KEY, JSON.stringify({ url: cfg.url.trim(), anonKey: cfg.anonKey.trim() }));
}

/** Upserts the signed-in user into the owner's own Supabase `bob_users` table. */
export async function syncUserToCloud(user: BobUser): Promise<boolean> {
  const cfg = getSupabaseConfig();
  if (!cfg) return false;
  try {
    const res = await fetch(`${cfg.url.replace(/\/$/, '')}/rest/v1/bob_users`, {
      method: 'POST',
      headers: {
        apikey: cfg.anonKey,
        Authorization: `Bearer ${cfg.anonKey}`,
        'Content-Type': 'application/json',
        Prefer: 'resolution=merge-duplicates',
      },
      body: JSON.stringify([{ id: user.id, name: user.name, email: user.email, provider: user.provider, created_at: user.createdAt }]),
      signal: AbortSignal.timeout(8000),
    });
    return res.ok;
  } catch {
    return false;
  }
}
