import { HardwareProfile, ModelPreset, TuningParameters } from '../types';

export const USER_HARDWARE_PROFILE: HardwareProfile = {
  name: 'AMD Ryzen 5 2400G + Radeon RX 580 (20GB RAM)',
  cpuName: 'AMD Ryzen 5 PRO 2400G with Radeon Vega Graphics',
  cpuCores: 4,
  cpuThreads: 8,
  systemRamTotalMB: 20480, // 20.0 GB
  systemRamUsableMB: 19353, // 18.9 GB usable
  gpuName: 'AMD Radeon RX 580 2048SP (8 GB)',
  gpuVramTotalMB: 8192,
  gpuVramUsableMB: 7168, // ~1024 MB reserved for Windows DWM & Desktop
  gpuArchitecture: 'Polaris 20 / GCN 4.0 (GFX803)',
  streamProcessors: 2048,
  memoryBandwidthGBs: 224, // GDDR5 256-bit bus
  systemMemoryBandwidthGBs: 38.4, // Dual-channel DDR4-2400/2666
};

export const MODEL_PRESETS: ModelPreset[] = [
  {
    id: 'qwen3.8-27b-q4',
    name: 'hf.co/JonathanColetti/Qwen3.8-27B-Uncensored-GGUF:Q4_K_M',
    displayName: 'Qwen 3.8 / 2.5 27B (Q4_K_M)',
    parameterCountB: 27,
    quantization: 'Q4_K_M (4.5 bpw)',
    bitsPerWeight: 4.5,
    fileSizeGB: 16.8,
    totalLayers: 64,
    hiddenDimension: 5120,
    defaultCtx: 2048,
    recommendedGpuLayersRx580: 16,
    estimatedTpsRx580: {
      pureCpu: 1.2,
      hybridBalanced: 5.6,
      pureGpu: 0, // Impossible on 8GB VRAM
    },
    notes: 'Your currently installed model. 16.8 GB file cannot fit in 8 GB VRAM. Without tuning, spills over to CPU getting ~1.2 tok/s. Offloading 16 layers achieves ~5.6 tok/s.',
    isInstalledByUser: true,
  },
  {
    id: 'qwen2.5-27b-q2k',
    name: 'qwen2.5:27b-instruct-q2_K',
    displayName: 'Qwen 2.5 27B (IQ2_XXS / Q2_K)',
    parameterCountB: 27,
    quantization: 'Q2_K (2.6 bpw)',
    bitsPerWeight: 2.6,
    fileSizeGB: 9.8,
    totalLayers: 64,
    hiddenDimension: 5120,
    defaultCtx: 2048,
    recommendedGpuLayersRx580: 38,
    estimatedTpsRx580: {
      pureCpu: 2.1,
      hybridBalanced: 11.4,
      pureGpu: 0,
    },
    notes: 'Aggressively quantized 27B model. Shrinks memory from 16.8 GB to 9.8 GB, allowing ~60% of layers directly into RX 580 VRAM for a 2x speedup.',
  },
  {
    id: 'qwen2.5-14b-q3km',
    name: 'qwen2.5:14b-instruct-q3_K_M',
    displayName: 'Qwen 2.5 14B (Q3_K_M)',
    parameterCountB: 14,
    quantization: 'Q3_K_M (3.4 bpw)',
    bitsPerWeight: 3.4,
    fileSizeGB: 7.2,
    totalLayers: 48,
    hiddenDimension: 5120,
    defaultCtx: 2048,
    recommendedGpuLayersRx580: 42,
    estimatedTpsRx580: {
      pureCpu: 2.8,
      hybridBalanced: 18.5,
      pureGpu: 24.2,
    },
    notes: 'Sweet spot for 8GB VRAM! High intelligence, fits almost 90-100% inside GPU with 2k context, yielding 18-24 tokens/sec.',
  },
  {
    id: 'qwen2.5-7b-q4km',
    name: 'qwen2.5:7b-instruct-q4_K_M',
    displayName: 'Qwen 2.5 7B (Q4_K_M)',
    parameterCountB: 7.6,
    quantization: 'Q4_K_M (4.5 bpw)',
    bitsPerWeight: 4.5,
    fileSizeGB: 4.7,
    totalLayers: 28,
    hiddenDimension: 3584,
    defaultCtx: 4096,
    recommendedGpuLayersRx580: 28, // 100% offload
    estimatedTpsRx580: {
      pureCpu: 5.4,
      hybridBalanced: 26.0,
      pureGpu: 38.5,
    },
    notes: 'Blazing fast full GPU offload. Fits 100% inside the 8GB RX 580 with 4k context. Generates ~38 tokens/sec with near zero latency.',
  },
  {
    id: 'qwen2.5-1.5b-draft',
    name: 'qwen2.5:1.5b-instruct-q4_K_M',
    displayName: 'Qwen 2.5 1.5B (Speculative Draft Model)',
    parameterCountB: 1.5,
    quantization: 'Q4_K_M (4.5 bpw)',
    bitsPerWeight: 4.5,
    fileSizeGB: 1.1,
    totalLayers: 28,
    hiddenDimension: 1536,
    defaultCtx: 2048,
    recommendedGpuLayersRx580: 28,
    estimatedTpsRx580: {
      pureCpu: 18.0,
      hybridBalanced: 45.0,
      pureGpu: 75.0,
    },
    notes: 'Used for Speculative Decoding. Fits in 1.1 GB VRAM alongside your 27B model to pre-guess tokens, accelerating 27B output by 2x to 3x!',
  },
];

/**
 * Computes KV Cache memory requirement in Megabytes
 */
export function calculateKvCacheMB(
  layers: number,
  contextWindow: number,
  hiddenDim: number,
  quantKv: 'f16' | 'q8_0' | 'q4_0'
): number {
  // KV Cache = 2 (K & V) * layers * contextWindow * hiddenDim * bytesPerElement
  let bytesPerElement = 2; // f16
  if (quantKv === 'q8_0') bytesPerElement = 1;
  if (quantKv === 'q4_0') bytesPerElement = 0.5;

  const totalBytes = 2 * layers * contextWindow * hiddenDim * bytesPerElement;
  return Math.round(totalBytes / (1024 * 1024));
}

/**
 * Computes memory distribution between GPU VRAM and CPU System RAM
 */
export function calculateMemoryBreakdown(
  model: ModelPreset,
  tuning: TuningParameters,
  hardware: HardwareProfile
) {
  const totalModelWeightMB = model.fileSizeGB * 1024;
  const layerWeightMB = totalModelWeightMB / model.totalLayers;

  const clampedGpuLayers = Math.min(tuning.numGpuLayers, model.totalLayers);
  const cpuLayers = model.totalLayers - clampedGpuLayers;

  // KV cache on GPU for offloaded layers
  const gpuKvCacheMB = calculateKvCacheMB(
    clampedGpuLayers,
    tuning.contextWindow,
    model.hiddenDimension,
    tuning.quantKv
  );

  // KV cache on CPU for remaining layers
  const cpuKvCacheMB = calculateKvCacheMB(
    cpuLayers,
    tuning.contextWindow,
    model.hiddenDimension,
    tuning.quantKv
  );

  const draftModelWeightMB = tuning.draftModel !== 'none' ? 1126 : 0; // ~1.1 GB for 1.5B

  const gpuWeightsMB = Math.round(clampedGpuLayers * layerWeightMB) + draftModelWeightMB;
  const cpuWeightsMB = Math.round(cpuLayers * layerWeightMB);

  const totalGpuUsedMB = gpuWeightsMB + gpuKvCacheMB;
  const totalCpuUsedMB = cpuWeightsMB + cpuKvCacheMB;

  const gpuOverflowMB = Math.max(0, totalGpuUsedMB - hardware.gpuVramUsableMB);
  const isGpuOverflow = gpuOverflowMB > 0;

  const vramPercentUsed = Math.min(100, Math.round((totalGpuUsedMB / hardware.gpuVramTotalMB) * 100));
  const ramPercentUsed = Math.min(100, Math.round((totalCpuUsedMB / hardware.systemRamTotalMB) * 100));

  const gpuOffloadRatio = model.totalLayers > 0 ? (clampedGpuLayers / model.totalLayers) * 100 : 0;

  return {
    totalModelWeightMB,
    layerWeightMB: Math.round(layerWeightMB),
    clampedGpuLayers,
    cpuLayers,
    gpuWeightsMB,
    cpuWeightsMB,
    gpuKvCacheMB,
    cpuKvCacheMB,
    draftModelWeightMB,
    totalGpuUsedMB,
    totalCpuUsedMB,
    gpuVramAvailableMB: Math.max(0, hardware.gpuVramUsableMB - totalGpuUsedMB),
    isGpuOverflow,
    gpuOverflowMB,
    vramPercentUsed,
    ramPercentUsed,
    gpuOffloadRatio,
  };
}

/**
 * Estimates generation throughput (Tokens/second) based on hardware bandwidth & layer split
 */
export function estimatePerformance(
  model: ModelPreset,
  tuning: TuningParameters,
  hardware: HardwareProfile
): {
  tokensPerSecond: number;
  timeToFirstTokenMs: number;
  bottleneckReason: string;
  speedMultiplierVsBaseline: number;
} {
  const breakdown = calculateMemoryBreakdown(model, tuning, hardware);
  const baselineCpuTps = model.estimatedTpsRx580.pureCpu;

  if (breakdown.isGpuOverflow) {
    return {
      tokensPerSecond: 0.8,
      timeToFirstTokenMs: 2500,
      bottleneckReason: 'Severe VRAM Thrashing! GPU memory overflowed into Windows paging file, causing continuous PCIe stalling.',
      speedMultiplierVsBaseline: 0.7,
    };
  }

  // Pure GPU offload (all layers on GPU)
  if (breakdown.clampedGpuLayers >= model.totalLayers) {
    const tps = model.estimatedTpsRx580.pureGpu > 0 ? model.estimatedTpsRx580.pureGpu : 25;
    return {
      tokensPerSecond: tps,
      timeToFirstTokenMs: 220,
      bottleneckReason: 'Optimal! 100% of layers running on Radeon RX 580 GDDR5 memory (224 GB/s). Zero CPU-GPU sync stalls.',
      speedMultiplierVsBaseline: Number((tps / baselineCpuTps).toFixed(1)),
    };
  }

  // Pure CPU offload (0 layers on GPU)
  if (breakdown.clampedGpuLayers === 0) {
    return {
      tokensPerSecond: baselineCpuTps,
      timeToFirstTokenMs: 1400,
      bottleneckReason: 'Pure CPU bound. Model reading 16.8 GB from DDR4 RAM (~38 GB/s) on 4-core Ryzen 2400G.',
      speedMultiplierVsBaseline: 1.0,
    };
  }

  // Hybrid Split (Layer offloading)
  // Amdahl's law for layer latency + PCIe bus transfer per token step
  const gpuFraction = breakdown.clampedGpuLayers / model.totalLayers;
  const cpuFraction = 1 - gpuFraction;

  // GPU layer time in ms per token
  const gpuTimePerTokenMs = (gpuFraction * model.fileSizeGB * 1024) / (hardware.memoryBandwidthGBs * 0.7);
  // CPU layer time in ms per token
  const cpuTimePerTokenMs = (cpuFraction * model.fileSizeGB * 1024) / (hardware.systemMemoryBandwidthGBs * 0.8);
  // PCIe 3.0 x16 latency for hidden states ping-pong per layer switch (~2.5ms)
  const pcieLatencyMs = 2.5;

  let totalMsPerToken = gpuTimePerTokenMs + cpuTimePerTokenMs + pcieLatencyMs;

  // Speculative decoding boost if enabled (accepts 2-3 tokens per target forward pass)
  if (tuning.draftModel !== 'none') {
    totalMsPerToken = totalMsPerToken / 1.85;
  }

  const calculatedTps = Math.max(1.0, Number((1000 / totalMsPerToken).toFixed(1)));
  const ttft = Math.round(cpuFraction * 800 + gpuFraction * 200 + 150);

  let bottleneckReason = `Hybrid split (${breakdown.clampedGpuLayers} GPU layers / ${breakdown.cpuLayers} CPU layers). `;
  if (tuning.draftModel !== 'none') {
    bottleneckReason += 'Speculative drafting enabled (~1.85x speedup). ';
  }
  bottleneckReason += `CPU system RAM bandwidth (${hardware.systemMemoryBandwidthGBs} GB/s) is the primary constraint.`;

  return {
    tokensPerSecond: calculatedTps,
    timeToFirstTokenMs: ttft,
    bottleneckReason,
    speedMultiplierVsBaseline: Number((calculatedTps / baselineCpuTps).toFixed(1)),
  };
}

/**
 * Calculates optimal GPU layers to fit comfortably in RX 580 8GB
 */
export function findOptimalGpuLayers(
  model: ModelPreset,
  hardware: HardwareProfile,
  contextWindow: number,
  quantKv: 'f16' | 'q8_0' | 'q4_0',
  includeDraftModel: boolean
): number {
  const draftSizeMB = includeDraftModel ? 1150 : 0;
  const targetVramBudgetMB = hardware.gpuVramUsableMB - draftSizeMB - 300; // 300MB safety buffer

  const totalModelWeightMB = model.fileSizeGB * 1024;
  const layerWeightMB = totalModelWeightMB / model.totalLayers;

  let bestLayers = 0;
  for (let l = model.totalLayers; l >= 0; l--) {
    const weightMB = l * layerWeightMB;
    const kvMB = calculateKvCacheMB(l, contextWindow, model.hiddenDimension, quantKv);
    if (weightMB + kvMB <= targetVramBudgetMB) {
      bestLayers = l;
      break;
    }
  }

  return bestLayers;
}
