export async function handleStreamChunks(
  reader: ReadableStreamDefaultReader<Uint8Array>,
  onChunk: (chunk: string) => void
): Promise<string> {
  const decoder = new TextDecoder();
  let fullText = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    const chunkText = decoder.decode(value, { stream: true });
    fullText += chunkText;
    onChunk(chunkText);
  }

  return fullText;
}
