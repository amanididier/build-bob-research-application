/**
 * Reliable file downloader for web, sandboxed iframes, and Electron
 */
export async function downloadExtensionZip() {
  try {
    const filename = 'bob-chrome-extension.zip';
    // Attempt fetch first to get real blob
    const response = await fetch(`./${filename}`, { cache: 'no-cache' });
    if (!response.ok) throw new Error('Network fetch failed');
    const blob = await response.blob();
    const objectUrl = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = objectUrl;
    link.download = filename;
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    setTimeout(() => {
      URL.revokeObjectURL(objectUrl);
    }, 15000);
  } catch (err) {
    // Fallback direct link trigger
    const link = document.createElement('a');
    link.href = './bob-chrome-extension.zip';
    link.download = 'bob-chrome-extension.zip';
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
}
