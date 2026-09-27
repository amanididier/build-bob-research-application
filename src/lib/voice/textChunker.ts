export function cleanTextForSpeech(text: string): string {
  if (!text) return '';

  let cleaned = text
    // Replace markdown code blocks with speech summary
    .replace(/```[\s\S]*?```/g, 'Here is the relevant code snippet.')
    // Replace inline code `code`
    .replace(/`([^`]+)`/g, '$1')
    // Remove markdown headers
    .replace(/^#+\s+/gm, '')
    // Remove markdown bold / italics
    .replace(/[*_]{1,3}([^*_]+)[*_]{1,3}/g, '$1')
    // Clean URLs to just the domain or "source link"
    .replace(/https?:\/\/(?:www\.)?([^\/\s]+)[^\s]*/g, 'source from $1')
    // Remove bullet points / asterisks at line starts
    .replace(/^[\s*-•]+\s*/gm, '')
    // Clean JSON structures
    .replace(/\{[\s\S]*?\}/g, '')
    // Replace multiple spaces/newlines with single space
    .replace(/\s+/g, ' ')
    .trim();

  return cleaned;
}

export class ResponseTextChunker {
  private buffer = '';
  private onChunkReady: (chunk: string) => void;

  constructor(onChunkReady: (chunk: string) => void) {
    this.onChunkReady = onChunkReady;
  }

  public feed(deltaText: string): void {
    this.buffer += deltaText;
    this.processBuffer(false);
  }

  public flush(): void {
    this.processBuffer(true);
  }

  private processBuffer(forceFlush: boolean): void {
    const sentenceDelimiters = /([.?!;:]\s+|\n+)/;
    let parts = this.buffer.split(sentenceDelimiters);

    // If we have at least one complete sentence
    while (parts.length > 2) {
      const sentence = (parts.shift() || '') + (parts.shift() || '');
      const cleaned = cleanTextForSpeech(sentence);
      if (cleaned.length >= 8) {
        this.onChunkReady(cleaned);
      }
    }

    this.buffer = parts.join('');

    if (forceFlush && this.buffer.trim()) {
      const cleaned = cleanTextForSpeech(this.buffer);
      if (cleaned.length > 0) {
        this.onChunkReady(cleaned);
      }
      this.buffer = '';
    }
  }

  public reset(): void {
    this.buffer = '';
  }
}
