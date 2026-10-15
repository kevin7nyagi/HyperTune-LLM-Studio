import React from 'react';
import { HardwareProfile, ModelPreset, TuningParameters } from '../types';
import {
  calculateMemoryBreakdown,
  estimatePerformance,
  findOptimalGpuLayers,
} from '../utils/hardwareMath';
import { Cpu, HardDrive, Zap, AlertTriangle, CheckCircle2, Sliders, Sparkles } from 'lucide-react';

interface HardwareProfilerProps {
  hardware: HardwareProfile;
  model: ModelPreset;
  tuning: TuningParameters;
  onUpdateTuning: (newTuning: Partial<TuningParameters>) => void;
}

export const HardwareProfiler: React.FC<HardwareProfilerProps> = ({
  hardware,
  model,
  tuning,
  onUpdateTuning,
}) => {
  const breakdown = calculateMemoryBreakdown(model, tuning, hardware);
  const perf = estimatePerformance(model, tuning, hardware);

  const handleAutoTune = () => {
    const optimalLayers = findOptimalGpuLayers(
      model,
      hardware,
      2048,
      'q8_0',
      tuning.draftModel !== 'none'
    );

    onUpdateTuning({
      numGpuLayers: optimalLayers,
      contextWindow: 2048,
      cpuThreads: 6,
      quantKv: 'q8_0',
    });
  };

  return (
    <div className="space-y-6">
      {/* Hardware Profile Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-800">
          <div>
            <div className="flex items-center gap-2 text-xs text-slate-400 mb-1">
              <span>Detected Workstation</span>
              <span aria-hidden="true">·</span>
              <span>Windows 64-bit</span>
            </div>
            <h2 className="text-lg font-bold text-white tracking-tight">
              {hardware.gpuName} + {hardware.cpuName}
            </h2>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleAutoTune}
              className="flex items-center gap-2 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold shadow-sm transition-all whitespace-nowrap"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Auto-Tune for RX 580 (8GB)</span>
            </button>
          </div>
        </div>

        {/* Specs Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 text-xs">
          <div>
            <span className="text-slate-500 block mb-0.5">GPU VRAM</span>
            <span className="font-mono font-semibold text-slate-200">
              8,192 MB GDDR5 ({hardware.memoryBandwidthGBs} GB/s)
            </span>
          </div>
          <div>
            <span className="text-slate-500 block mb-0.5">Usable VRAM (Post-DWM)</span>
            <span className="font-mono font-semibold text-slate-200">
              {hardware.gpuVramUsableMB} MB (~7.0 GB)
            </span>
          </div>
          <div>
            <span className="text-slate-500 block mb-0.5">System Memory</span>
            <span className="font-mono font-semibold text-slate-200">
              20.0 GB DDR4 ({hardware.systemMemoryBandwidthGBs} GB/s)
            </span>
          </div>
          <div>
            <span className="text-slate-500 block mb-0.5">Compute Architecture</span>
            <span className="font-mono font-semibold text-slate-200">
              {hardware.streamProcessors} Stream Processors (GFX803)
            </span>
          </div>
        </div>
      </div>

      {/* Real-Time Memory Allocation Visualizers */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* VRAM Allocation Bar */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <HardDrive className="w-4 h-4 text-cyan-400" />
              <h3 className="text-sm font-semibold text-white">GPU VRAM Allocation (8,192 MB)</h3>
            </div>
            <span className="font-mono text-xs text-slate-300">
              {breakdown.totalGpuUsedMB} MB / {hardware.gpuVramTotalMB} MB ({breakdown.vramPercentUsed}%)
            </span>
          </div>

          {/* Stacked Progress Bar */}
          <div className="w-full h-5 bg-slate-950 rounded-lg overflow-hidden flex border border-slate-800 p-0.5 gap-0.5">
            {/* Windows DWM ~1024MB */}
            <div
              style={{ width: `${(1024 / hardware.gpuVramTotalMB) * 100}%` }}
              className="bg-slate-700 h-full rounded-sm"
              title="Windows DWM / Desktop reservation (~1024 MB)"
            />
            {/* GPU Weights */}
            <div
              style={{ width: `${(breakdown.gpuWeightsMB / hardware.gpuVramTotalMB) * 100}%` }}
              className="bg-cyan-500 h-full rounded-sm transition-all"
              title={`Model Layers in VRAM (${breakdown.gpuWeightsMB} MB)`}
            />
            {/* KV Cache */}
            <div
              style={{ width: `${(breakdown.gpuKvCacheMB / hardware.gpuVramTotalMB) * 100}%` }}
              className="bg-purple-500 h-full rounded-sm transition-all"
              title={`KV Cache in VRAM (${breakdown.gpuKvCacheMB} MB)`}
            />
            {/* Overflow in red if exceeds usable */}
            {breakdown.isGpuOverflow && (
              <div
                style={{ width: `${(breakdown.gpuOverflowMB / hardware.gpuVramTotalMB) * 100}%` }}
                className="bg-rose-500 h-full rounded-sm animate-pulse"
                title={`VRAM Overflow (${breakdown.gpuOverflowMB} MB) causing severe paging!`}
              />
            )}
          </div>

          {/* Bar Legend */}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-400">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 bg-slate-700 rounded-sm" />
              <span>Windows DWM (1.0 GB)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 bg-cyan-500 rounded-sm" />
              <span>Model Layers ({breakdown.gpuWeightsMB} MB)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 bg-purple-500 rounded-sm" />
              <span>KV Cache ({breakdown.gpuKvCacheMB} MB)</span>
            </div>
            {breakdown.isGpuOverflow ? (
              <div className="flex items-center gap-1.5 text-rose-400 font-semibold">
                <span className="w-2.5 h-2.5 bg-rose-500 rounded-sm" />
                <span>Overflow ({breakdown.gpuOverflowMB} MB)</span>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 text-slate-500">
                <span>Free VRAM Headroom: {breakdown.gpuVramAvailableMB} MB</span>
              </div>
            )}
          </div>
        </div>

        {/* System RAM Allocation Bar */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Cpu className="w-4 h-4 text-emerald-400" />
              <h3 className="text-sm font-semibold text-white">System RAM Allocation (20,480 MB)</h3>
            </div>
            <span className="font-mono text-xs text-slate-300">
              {breakdown.totalCpuUsedMB + 4500} MB / {hardware.systemRamTotalMB} MB
            </span>
          </div>

          {/* Stacked Progress Bar */}
          <div className="w-full h-5 bg-slate-950 rounded-lg overflow-hidden flex border border-slate-800 p-0.5 gap-0.5">
            {/* Windows OS ~4500MB */}
            <div
              style={{ width: `${(4500 / hardware.systemRamTotalMB) * 100}%` }}
              className="bg-slate-700 h-full rounded-sm"
              title="Windows OS and background services (~4.5 GB)"
            />
            {/* CPU Model Weights */}
            <div
              style={{ width: `${(breakdown.cpuWeightsMB / hardware.systemRamTotalMB) * 100}%` }}
              className="bg-emerald-500 h-full rounded-sm transition-all"
              title={`Model Layers in RAM (${breakdown.cpuWeightsMB} MB)`}
            />
            {/* CPU KV Cache */}
            <div
              style={{ width: `${(breakdown.cpuKvCacheMB / hardware.systemRamTotalMB) * 100}%` }}
              className="bg-purple-500 h-full rounded-sm transition-all"
              title={`KV Cache in RAM (${breakdown.cpuKvCacheMB} MB)`}
            />
          </div>

          {/* Bar Legend */}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-400">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 bg-slate-700 rounded-sm" />
              <span>OS & Apps (4.5 GB)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 bg-emerald-500 rounded-sm" />
              <span>CPU Layers ({breakdown.cpuWeightsMB} MB)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 bg-purple-500 rounded-sm" />
              <span>KV Cache ({breakdown.cpuKvCacheMB} MB)</span>
            </div>
            <div className="flex items-center gap-1.5 text-slate-500">
              <span>Free System RAM: {Math.max(0, hardware.systemRamUsableMB - (breakdown.totalCpuUsedMB + 4500))} MB</span>
            </div>
          </div>
        </div>
      </div>

      {/* Speed & Throughput Telemetry Card */}
      <div className={`p-5 rounded-xl border ${
        breakdown.isGpuOverflow 
          ? 'bg-rose-950/30 border-rose-800' 
          : 'bg-slate-900 border-slate-800'
      }`}>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 items-center">
          <div>
            <span className="text-xs text-slate-400 block mb-1">Estimated Generation Speed</span>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold font-mono text-emerald-400">
                {perf.tokensPerSecond}
              </span>
              <span className="text-xs font-mono text-slate-400">tok/s</span>
            </div>
            <span className="text-xs text-emerald-500 font-mono mt-0.5 block">
              {perf.speedMultiplierVsBaseline}x baseline
            </span>
          </div>

          <div>
            <span className="text-xs text-slate-400 block mb-1">Time to First Token (TTFT)</span>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold font-mono text-cyan-400">
                {perf.timeToFirstTokenMs}
              </span>
              <span className="text-xs font-mono text-slate-400">ms</span>
            </div>
            <span className="text-xs text-slate-400 mt-0.5 block">Prompt evaluation</span>
          </div>

          <div>
            <span className="text-xs text-slate-400 block mb-1">Layer Distribution</span>
            <div className="text-sm font-mono text-slate-200">
              <span className="text-cyan-400 font-semibold">{breakdown.clampedGpuLayers}</span> GPU /{' '}
              <span className="text-emerald-400 font-semibold">{breakdown.cpuLayers}</span> CPU
            </div>
            <span className="text-xs text-slate-400 mt-0.5 block">
              {Math.round(breakdown.gpuOffloadRatio)}% GPU offload ratio
            </span>
          </div>

          <div className="md:border-l md:border-slate-800 md:pl-6">
            <div className="flex items-start gap-2">
              {breakdown.isGpuOverflow ? (
                <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
              ) : (
                <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
              )}
              <div className="text-xs text-slate-300 leading-relaxed">
                <span className="font-semibold block text-white mb-0.5">Bottleneck Assessment:</span>
                {perf.bottleneckReason}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Interactive Speed Tuning Controls */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-6">
        <div className="flex items-center gap-2 pb-3 border-b border-slate-800">
          <Sliders className="w-4 h-4 text-emerald-400" />
          <h3 className="text-sm font-bold text-white">Hardware & Memory Tuning Parameters</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Slider: num_gpu (GPU Layers) */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label htmlFor="num-gpu-slider" className="text-xs font-semibold text-slate-200">
                GPU Offload Layers (<code>num_gpu</code>)
              </label>
              <span className="font-mono text-xs font-bold text-cyan-400">
                {tuning.numGpuLayers} / {model.totalLayers} layers
              </span>
            </div>
            <input
              id="num-gpu-slider"
              type="range"
              min={0}
              max={model.totalLayers}
              value={tuning.numGpuLayers}
              onChange={(e) => onUpdateTuning({ numGpuLayers: parseInt(e.target.value, 10) })}
              className="w-full accent-cyan-500 cursor-pointer h-2 bg-slate-800 rounded-lg"
            />
            <div className="flex justify-between text-[11px] text-slate-500 font-mono">
              <span>0 (CPU Only)</span>
              <span>16 (RX 580 Sweet Spot)</span>
              <span>{model.totalLayers} (Full GPU)</span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Each layer for this 27B model weighs <strong>{breakdown.layerWeightMB} MB</strong>.
              Setting 16 layers places ~4.2 GB of weights in VRAM, leaving safe room for context KV cache.
            </p>
          </div>

          {/* Slider: num_ctx (Context Window) */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label htmlFor="num-ctx-slider" className="text-xs font-semibold text-slate-200">
                Context Window (<code>num_ctx</code>)
              </label>
              <span className="font-mono text-xs font-bold text-purple-400">
                {tuning.contextWindow} tokens
              </span>
            </div>
            <input
              id="num-ctx-slider"
              type="range"
              min={512}
              max={8192}
              step={512}
              value={tuning.contextWindow}
              onChange={(e) => onUpdateTuning({ contextWindow: parseInt(e.target.value, 10) })}
              className="w-full accent-purple-500 cursor-pointer h-2 bg-slate-800 rounded-lg"
            />
            <div className="flex justify-between text-[11px] text-slate-500 font-mono">
              <span>512</span>
              <span>2048 (Recommended)</span>
              <span>8192 (High VRAM)</span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              KV Cache consumes <strong>{breakdown.gpuKvCacheMB + breakdown.cpuKvCacheMB} MB</strong> at {tuning.contextWindow} tokens.
              Reducing context from 8k to 2k frees up over 2 GB of memory!
            </p>
          </div>

          {/* Slider: num_thread (CPU Threads) */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label htmlFor="num-thread-slider" className="text-xs font-semibold text-slate-200">
                CPU Threads (<code>num_thread</code>)
              </label>
              <span className="font-mono text-xs font-bold text-emerald-400">
                {tuning.cpuThreads} Threads (Ryzen 2400G has 8)
              </span>
            </div>
            <input
              id="num-thread-slider"
              type="range"
              min={1}
              max={hardware.cpuThreads}
              value={tuning.cpuThreads}
              onChange={(e) => onUpdateTuning({ cpuThreads: parseInt(e.target.value, 10) })}
              className="w-full accent-emerald-500 cursor-pointer h-2 bg-slate-800 rounded-lg"
            />
            <div className="flex justify-between text-[11px] text-slate-500 font-mono">
              <span>1 Thread</span>
              <span>4 Threads (Cores)</span>
              <span>6 (Sweet Spot)</span>
              <span>8 Threads</span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Leaving 2 threads free prevents Windows desktop and audio stuttering while inference is running.
            </p>
          </div>

          {/* KV Cache Quantization */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-200 block">
              KV Cache Quantization
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => onUpdateTuning({ quantKv: 'f16' })}
                className={`py-2 px-3 text-xs font-mono rounded-lg border transition-all text-center ${
                  tuning.quantKv === 'f16'
                    ? 'bg-slate-800 text-white border-purple-500 shadow-sm'
                    : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-white'
                }`}
              >
                FP16 (Default)
              </button>
              <button
                type="button"
                onClick={() => onUpdateTuning({ quantKv: 'q8_0' })}
                className={`py-2 px-3 text-xs font-mono rounded-lg border transition-all text-center ${
                  tuning.quantKv === 'q8_0'
                    ? 'bg-slate-800 text-emerald-400 border-emerald-500 shadow-sm font-semibold'
                    : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-white'
                }`}
              >
                Q8_0 (Recommended)
              </button>
              <button
                type="button"
                onClick={() => onUpdateTuning({ quantKv: 'q4_0' })}
                className={`py-2 px-3 text-xs font-mono rounded-lg border transition-all text-center ${
                  tuning.quantKv === 'q4_0'
                    ? 'bg-slate-800 text-white border-purple-500 shadow-sm'
                    : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-white'
                }`}
              >
                Q4_0 (Max Savings)
              </button>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              <code>Q8_0</code> cuts KV memory usage in half with zero loss in response coherence.
            </p>
          </div>
        </div>

        {/* Speculative Decoding Setting */}
        <div className="pt-4 border-t border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-amber-400" />
              <span className="text-xs font-bold text-white">Speculative Decoding (Draft Model Acceleration)</span>
            </div>
            <p className="text-xs text-slate-400 mt-1 max-w-xl">
              Loads a tiny 1.5B model in VRAM (~1.1 GB) alongside the 27B model. The 1.5B model guesses 3–5 tokens per step, and the 27B model verifies them in one forward pass, boosting throughput by <strong>2x to 3x</strong>!
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() =>
                onUpdateTuning({
                  draftModel: tuning.draftModel === 'none' ? 'qwen2.5:1.5b-instruct-q4_K_M' : 'none',
                })
              }
              className={`px-4 py-2 text-xs font-semibold rounded-lg border transition-all whitespace-nowrap ${
                tuning.draftModel !== 'none'
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500'
                  : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-750'
              }`}
            >
              {tuning.draftModel !== 'none' ? 'Active: Qwen 2.5 1.5B Draft' : 'Enable 1.5B Draft Model'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
