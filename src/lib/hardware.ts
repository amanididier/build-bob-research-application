import { ModelProfile, ModelTier } from '../types';

export const MODEL_CATALOG: Record<ModelTier, ModelProfile> = {
  'ultra-light-4gb': {
    id: 'ultra-light-4gb',
    name: 'Qwen2.5-0.5B-Instruct (Quantized)',
    parameters: '0.49 Billion',
    quantization: 'Q4_K_M (4-bit INT)',
    minRamGb: 4,
    memoryUsageMb: 285,
    tokensPerSec: 42,
    description: 'Ultra-lean weights built for fast on-device inference on PCs with 4GB RAM or entry-level CPUs.',
    recommendedFor: 'Laptops, 4GB RAM machines, battery preservation, near-zero startup latency.',
    hfModelId: 'onnx-community/Qwen2.5-0.5B-Instruct',
  },
  'balanced-8gb': {
    id: 'balanced-8gb',
    name: 'SmolLM2-1.7B-Instruct (Balanced)',
    parameters: '1.71 Billion',
    quantization: 'Q4_K_M (4-bit INT)',
    minRamGb: 8,
    memoryUsageMb: 680,
    tokensPerSec: 32,
    description: 'Golden ratio of deep contextual comprehension, factual accuracy, and low memory consumption.',
    recommendedFor: 'Standard 8GB developer laptops and modern office PCs.',
    hfModelId: 'HuggingFaceTB/SmolLM2-1.7B-Instruct',
  },
  'high-perf-16gb': {
    id: 'high-perf-16gb',
    name: 'Qwen2.5-3B-Instruct (High Precision)',
    parameters: '3.09 Billion',
    quantization: 'Q5_K_M (5-bit Medium)',
    minRamGb: 16,
    memoryUsageMb: 1450,
    tokensPerSec: 24,
    description: 'Maximum local synthesis power with nuanced multi-source synthesis, complex synthesis reasoning, and citation grounding.',
    recommendedFor: 'Workstations with 16GB+ RAM, dedicated GPUs, or Apple Silicon M-series.',
    hfModelId: 'onnx-community/Qwen2.5-3B-Instruct',
  },
};

export interface SystemHardwareInfo {
  detectedRamGb: number;
  cpuCores: number;
  hasGpu: boolean;
  webGpuAvailable: boolean;
  recommendedTier: ModelTier;
}

export function detectSystemHardware(): SystemHardwareInfo {
  let detectedRamGb = 8; // standard fallback
  let cpuCores = 4;
  let hasGpu = false;
  let webGpuAvailable = false;

  if (typeof window !== 'undefined') {
    // navigator.deviceMemory returns approximate RAM in GiB (e.g. 2, 4, 8)
    const nav = window.navigator as any;
    if (nav.deviceMemory) {
      detectedRamGb = Math.round(nav.deviceMemory);
    }
    if (nav.hardwareConcurrency) {
      cpuCores = nav.hardwareConcurrency;
    }
    if ('gpu' in nav && nav.gpu) {
      webGpuAvailable = true;
      hasGpu = true;
    }
  }

  let recommendedTier: ModelTier = 'balanced-8gb';
  if (detectedRamGb <= 4) {
    recommendedTier = 'ultra-light-4gb';
  } else if (detectedRamGb >= 16) {
    recommendedTier = 'high-perf-16gb';
  } else {
    recommendedTier = 'balanced-8gb';
  }

  return {
    detectedRamGb,
    cpuCores,
    hasGpu,
    webGpuAvailable,
    recommendedTier,
  };
}
