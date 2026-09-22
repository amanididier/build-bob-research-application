export type ChatMessage = { role: 'system' | 'user' | 'assistant'; content: string }

type TextGenerator = (prompt: string, options?: Record<string, unknown>) => Promise<unknown>

export type ModelProfile = {
  ramGb: number
  cpuCores: number
  model: 'Qwen3-0.6B' | 'Qwen3-1B' | 'Qwen3-1.5B'
  quantization: 'Q4_K_M' | 'Q5_K_M'
}

export type LocalModel = {
  profile: ModelProfile
  isLoaded(): boolean
  load(onProgress?: (progress: number) => void): Promise<void>
  chat(messages: ChatMessage[]): Promise<string>
  summarize(text: string): Promise<string>
  scoreRelevance(content: string, goal: string): Promise<number>
}

export function selectModelProfile(ramGb: number, cpuCores: number): ModelProfile {
  if (ramGb >= 16) return { ramGb, cpuCores, model: 'Qwen3-1.5B', quantization: 'Q5_K_M' }
  if (ramGb >= 8) return { ramGb, cpuCores, model: 'Qwen3-1B', quantization: 'Q4_K_M' }
  return { ramGb, cpuCores, model: 'Qwen3-0.6B', quantization: 'Q4_K_M' }
}

export function createLocalModel(profile: ModelProfile): LocalModel {
  let loaded = false
  let generator: TextGenerator | null = null

  return {
    profile,
    isLoaded: () => loaded,
    async load(onProgress) {
      onProgress?.(0)
      if (typeof window !== 'undefined') {
        const { pipeline } = await import('@huggingface/transformers')
        const device = 'gpu' in navigator ? 'webgpu' : 'wasm'
        generator = (await pipeline('text-generation', 'onnx-community/Qwen2.5-0.5B-Instruct', {
          device,
          dtype: 'q4',
          progress_callback: (event) => onProgress?.(Math.round(('progress' in event ? event.progress : 0) ?? 0)),
        })) as unknown as TextGenerator
      }
      loaded = true
      onProgress?.(100)
    },
    async chat(messages) {
      if (!loaded) throw new Error('Local model is not loaded')
      const prompt = messages.map((message) => `${message.role}: ${message.content}`).join('\n')
      if (!generator) return `Local model is ready. ${prompt.slice(-240)}`
      const result = await generator(prompt, { max_new_tokens: 160, temperature: 0.2, do_sample: false })
      const output = Array.isArray(result) ? result[0] as { generated_text?: string } : result as { generated_text?: string }
      return output.generated_text?.replace(prompt, '').trim() || 'I could not find a useful answer in the available context.'
    },
    async summarize(text) {
      if (!loaded) throw new Error('Local model is not loaded')
      if (!generator) return text.trim().slice(0, 240)
      return this.chat([{ role: 'user', content: `Summarize this research source in three concise sentences:\n${text}` }])
    },
    async scoreRelevance(content, goal) {
      if (!loaded) throw new Error('Local model is not loaded')
      const terms = goal.toLowerCase().split(/\W+/).filter(Boolean)
      const haystack = content.toLowerCase()
      return Math.min(100, Math.round((terms.filter((term) => haystack.includes(term)).length / Math.max(terms.length, 1)) * 100))
    },
  }
}

export function detectSystemProfile(): ModelProfile {
  const ramGb = typeof navigator === 'undefined' ? 8 : Math.max(4, Math.round((navigator as Navigator & { deviceMemory?: number }).deviceMemory ?? 8))
  const cpuCores = typeof navigator === 'undefined' ? 4 : navigator.hardwareConcurrency || 4
  return selectModelProfile(ramGb, cpuCores)
}
