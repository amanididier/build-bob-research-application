'use server'

/** Web marketing site does not use these server actions. Full workspace is desktop. */
export async function unavailable() {
  return { ok: false as const, error: 'Use the Bob desktop app for research actions.' }
}
