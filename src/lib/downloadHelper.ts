/**
 * Downloads the Bob Chrome extension archive.
 *
 * In the desktop app the renderer is loaded from file://, where fetch() cannot
 * read packaged assets — the main process writes the file through a real save
 * dialog instead. The web build serves it as a normal static asset.
 */
export type ExtensionDownloadResult =
  | { ok: true; path?: string; bytes?: number }
  | { ok: false; reason: string; detail?: string };

const FILENAME = 'bob-chrome-extension.zip';

function triggerAnchor(href: string) {
  const link = document.createElement('a');
  link.href = href;
  link.download = FILENAME;
  link.style.display = 'none';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export async function downloadExtensionZip(): Promise<ExtensionDownloadResult> {
  const bridge = typeof window !== 'undefined' ? (window as any).bob : null;

  if (bridge?.downloadExtension) {
    try {
      const result = await bridge.downloadExtension();
      if (result?.ok) return { ok: true, path: result.path, bytes: result.bytes };
      return { ok: false, reason: result?.reason || 'desktop-download-failed' };
    } catch (err: any) {
      return { ok: false, reason: 'desktop-download-failed', detail: err?.message };
    }
  }

  try {
    const response = await fetch(`./${FILENAME}`, { cache: 'no-cache' });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const blob = await response.blob();
    if (blob.size < 1024) throw new Error('archive is empty');
    const objectUrl = URL.createObjectURL(blob);
    triggerAnchor(objectUrl);
    setTimeout(() => URL.revokeObjectURL(objectUrl), 15000);
    return { ok: true, bytes: blob.size };
  } catch (err: any) {
    return { ok: false, reason: 'fetch-failed', detail: err?.message };
  }
}
