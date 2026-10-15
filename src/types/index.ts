export interface HardwareProfile {
  name: string;
  cpuName: string;
  cpuCores: number;
  cpuThreads: number;
  systemRamTotalMB: number;
  systemRamUsableMB: number;
  gpuName: string;
  gpuVramTotalMB: number;
  gpuVramUsableMB: number;
  gpuArchitecture: string; // e.g. Polaris 20 / GCN 4.0 (GFX803)
  streamProcessors: number;
  memoryBandwidthGBs: number; // e.g. 224 GB/s
  systemMemoryBandwidthGBs: number; // e.g. 38 GB/s
}

export interface TuningParameters {
  numGpuLayers: number;
  contextWindow: number; // e.g. 2048
  cpuThreads: number;
  temperature: number;
  topP: number;
  repeatPenalty: number;
  quantKv: 'f16' | 'q8_0' | 'q4_0';
  flashAttention: boolean;
  draftModel: string; // e.g. "qwen2.5:1.5b-instruct-q4_K_M" or "none"
}

export interface ModelPreset {
  id: string;
  name: string;
  displayName: string;
  parameterCountB: number;
  quantization: string;
  bitsPerWeight: number;
  fileSizeGB: number;
  totalLayers: number;
  hiddenDimension: number;
  defaultCtx: number;
  recommendedGpuLayersRx580: number;
  estimatedTpsRx580: {
    pureCpu: number;
    hybridBalanced: number;
    pureGpu: number;
  };
  notes: string;
  isInstalledByUser?: boolean;
}

export interface InferenceTelemetry {
  tokensPerSecond: number;
  totalTokens: number;
  evalDurationMs: number;
  promptTokens: number;
  promptEvalDurationMs: number;
  promptEvalTokensPerSecond: number;
  timeToFirstTokenMs: number;
  vramUsedMB: number;
  ramUsedMB: number;
  gpuOffloadRatioPercent: number;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
  telemetry?: InferenceTelemetry;
}

export interface OllamaModelTag {
  name: string;
  modified_at: string;
  size: number;
  digest: string;
  details?: {
    format?: string;
    family?: string;
    families?: string[];
    parameter_size?: string;
    quantization_level?: string;
  };
}

export interface DiagnosticResult {
  step: 'port' | 'cors' | 'model';
  status: 'pending' | 'success' | 'warning' | 'error';
  message: string;
  details?: string;
}
