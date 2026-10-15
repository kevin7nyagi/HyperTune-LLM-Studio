import React from 'react';
import { HardwareProfile, ModelPreset } from '../types';
import { MODEL_PRESETS } from '../utils/hardwareMath';
import {
  Cpu,
  Layers,
  Zap,
  CheckCircle2,
  Terminal,
  ArrowRight,
  Sparkles,
} from 'lucide-react';

interface ModelAdvisorProps {
  hardware: HardwareProfile;
  selectedModel: ModelPreset;
  onSelectModel: (model: ModelPreset) => void;
  onSwitchTab: (tab: 'chat' | 'profiler' | 'advisor' | 'modelfile') => void;
}

export const ModelAdvisor: React.FC<ModelAdvisorProps> = ({
  hardware,
  selectedModel,
  onSelectModel,
  onSwitchTab,
}) => {
  return (
    <div className="space-y-8">
      {/* Executive Hardware Diagnostic Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-900 to-slate-850 border border-slate-800 rounded-xl p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <span>Hardware Optimization Analysis</span>
              <span aria-hidden="true">·</span>
              <span>AMD Radeon RX 580 (8 GB)</span>
              <span aria-hidden="true">·</span>
              <span>20 GB RAM</span>
            </div>
            <h2 className="text-xl font-bold text-white tracking-tight">
              Why your 27B Model is slow — and how to fix it
            </h2>
          </div>
          <button
            onClick={() => onSwitchTab('profiler')}
            className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-semibold border border-slate-700 transition-colors whitespace-nowrap self-start md:self-auto"
          >
            <span>Open VRAM Allocator</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6 pt-6 border-t border-slate-800/80 text-xs">
          <div className="space-y-1.5">
            <span className="font-semibold text-rose-400 block">The Core Problem:</span>
            <p className="text-slate-300 leading-relaxed">
              Your <strong>Q4_K_M 27B model is 16.8 GB</strong> on disk and needs ~18 GB runtime memory. Your RX 580 only has <strong>8 GB VRAM</strong>.
              It physically cannot fit in GPU memory.
            </p>
          </div>
          <div className="space-y-1.5">
            <span className="font-semibold text-amber-400 block">The PCIe & Bandwidth Penalty:</span>
            <p className="text-slate-300 leading-relaxed">
              When memory spills from GPU to DDR4 RAM, bandwidth plummets from <strong>224 GB/s down to 38 GB/s</strong>.
              Plus, swapping hidden states across the PCIe bus per token adds severe micro-latency.
            </p>
          </div>
          <div className="space-y-1.5">
            <span className="font-semibold text-emerald-400 block">The Hardware Solution:</span>
            <p className="text-slate-300 leading-relaxed">
              Either <strong>budget exactly 16 GPU layers</strong> with reduced context and a 1.5B speculative draft model, or downshift to <strong>Qwen 14B / 7B</strong> for 30+ tokens/sec!
            </p>
          </div>
        </div>
      </div>

      {/* Model Comparison Matrix */}
      <div className="space-y-4">
        <div>
          <h3 className="text-base font-bold text-white">Recommended Model Configurations for RX 580 (8GB)</h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Compare throughput, VRAM fit, and response quality across different quantization and parameter options.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4">
          {MODEL_PRESETS.map((preset) => {
            const isSelected = selectedModel.id === preset.id;
            const fitsInVram = preset.fileSizeGB <= hardware.gpuVramUsableMB / 1024;

            return (
              <div
                key={preset.id}
                className={`p-5 rounded-xl border transition-all ${
                  isSelected
                    ? 'bg-slate-900 border-emerald-500 shadow-lg shadow-emerald-500/5'
                    : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  <div className="space-y-1.5 max-w-2xl">
                    <div className="flex flex-wrap items-center gap-2 text-xs">
                      {preset.isInstalledByUser && (
                        <span className="text-cyan-400 font-semibold">Your Installed Model</span>
                      )}
                      {fitsInVram && (
                        <span className="text-emerald-400 font-semibold">100% Fits in 8GB VRAM</span>
                      )}
                      <span className="text-slate-500" aria-hidden="true">·</span>
                      <span className="text-slate-400 font-mono">{preset.parameterCountB}B Parameters</span>
                      <span className="text-slate-500" aria-hidden="true">·</span>
                      <span className="text-slate-400 font-mono">{preset.quantization}</span>
                      <span className="text-slate-500" aria-hidden="true">·</span>
                      <span className="text-slate-400 font-mono">{preset.fileSizeGB} GB File</span>
                    </div>

                    <h4 className="text-base font-bold text-white">{preset.displayName}</h4>
                    <p className="text-xs text-slate-300 leading-relaxed">{preset.notes}</p>
                  </div>

                  {/* Metrics and Action */}
                  <div className="flex items-center justify-between lg:justify-end gap-6 pt-3 lg:pt-0 border-t lg:border-t-0 border-slate-800">
                    <div className="text-right">
                      <span className="text-xs text-slate-400 block">Est. Speed on RX 580</span>
                      <div className="flex items-baseline gap-1 font-mono">
                        <span className="text-xl font-bold text-emerald-400">
                          {preset.estimatedTpsRx580.pureGpu > 0
                            ? preset.estimatedTpsRx580.pureGpu
                            : preset.estimatedTpsRx580.hybridBalanced}
                        </span>
                        <span className="text-xs text-slate-400">tok/s</span>
                      </div>
                      <span className="text-[11px] text-slate-500">
                        {preset.estimatedTpsRx580.pureGpu > 0
                          ? 'Pure GPU offload'
                          : `${preset.recommendedGpuLayersRx580}/${preset.totalLayers} layers GPU`}
                      </span>
                    </div>

                    <button
                      onClick={() => onSelectModel(preset)}
                      className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
                        isSelected
                          ? 'bg-emerald-600 text-white'
                          : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700'
                      }`}
                    >
                      {isSelected ? 'Currently Selected' : 'Tune This Model'}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* AMD Radeon RX 580 (Polaris GFX803) GPU Acceleration Guide */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-5">
        <div className="flex items-center gap-2">
          <Terminal className="w-5 h-5 text-cyan-400" />
          <h3 className="text-base font-bold text-white">
            Unlocking Full GPU Acceleration on AMD Radeon RX 580 (Windows)
          </h3>
        </div>

        <p className="text-xs text-slate-300 leading-relaxed">
          The AMD Radeon RX 580 2048SP uses the <strong>Polaris 20 / GCN 4.0 (GFX803)</strong> micro-architecture.
          Official ROCm on Windows sometimes disables support for GCN 4.0 by default, causing Ollama to quietly fall back to CPU execution.
          Here is how to force Ollama and llama.cpp to harness your 2,048 stream processors:
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          {/* Method 1 */}
          <div className="p-4 bg-slate-950 rounded-lg border border-slate-800 space-y-2.5">
            <div className="flex items-center gap-2 font-semibold text-cyan-400">
              <CheckCircle2 className="w-4 h-4" />
              <span>Method 1: ROCm GFX Override (Recommended for Ollama)</span>
            </div>
            <p className="text-slate-400 leading-relaxed">
              Tells Ollama&apos;s bundled ROCm runtime to recognize Polaris 20 as GFX803:
            </p>
            <div className="bg-slate-900 p-2.5 rounded border border-slate-800 font-mono text-[11px] text-slate-200 select-all overflow-x-auto">
              set HSA_OVERRIDE_GFX_VERSION=8.0.3<br />
              set OLLAMA_ORIGINS=*<br />
              ollama serve
            </div>
            <span className="text-[11px] text-slate-500 block">
              Run this in PowerShell or Command Prompt before starting Ollama.
            </span>
          </div>

          {/* Method 2 */}
          <div className="p-4 bg-slate-950 rounded-lg border border-slate-800 space-y-2.5">
            <div className="flex items-center gap-2 font-semibold text-emerald-400">
              <CheckCircle2 className="w-4 h-4" />
              <span>Method 2: Vulkan / DirectML Backend (Highest Stability)</span>
            </div>
            <p className="text-slate-400 leading-relaxed">
              Vulkan has native 100% support for the RX 580 on all Windows AMD drivers.
              Using llama.cpp with Vulkan or KoboldCpp with <code>--usevulkan</code> guarantees full GPU compute:
            </p>
            <div className="bg-slate-900 p-2.5 rounded border border-slate-800 font-mono text-[11px] text-slate-200 select-all overflow-x-auto">
              llama-cli -m model.gguf -ngl 16 -c 2048 -t 6 --vulkan
            </div>
            <span className="text-[11px] text-slate-500 block">
              KoboldCpp also exposes an OpenAI/Ollama compatible endpoint on port 5001.
            </span>
          </div>
        </div>
      </div>

      {/* Speculative Decoding Deep Dive */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-4">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-amber-400" />
          <h3 className="text-base font-bold text-white">
            &quot;Loading Only What Is Needed&quot;: Speculative Decoding Explained
          </h3>
        </div>

        <p className="text-xs text-slate-300 leading-relaxed">
          You asked about only loading what is needed to reduce resources and latency. In modern LLM systems,
          this is accomplished through <strong>Speculative Decoding</strong> and <strong>Draft-Model Verification</strong>:
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2 text-xs">
          <div className="p-4 bg-slate-950 rounded-lg border border-slate-800 space-y-1.5">
            <span className="font-semibold text-white block">1. The Fast Draft Model</span>
            <p className="text-slate-400 leading-relaxed">
              A compact 1.5B model (<code>Qwen2.5-1.5B</code>) runs 100% inside your RX 580 VRAM, generating 4–5 candidate words in milliseconds.
            </p>
          </div>
          <div className="p-4 bg-slate-950 rounded-lg border border-slate-800 space-y-1.5">
            <span className="font-semibold text-white block">2. Single-Pass Verification</span>
            <p className="text-slate-400 leading-relaxed">
              Your 27B model verifies all 4–5 words in a <strong>single parallel forward pass</strong>, bypassing memory latency.
            </p>
          </div>
          <div className="p-4 bg-slate-950 rounded-lg border border-slate-800 space-y-1.5">
            <span className="font-semibold text-white block">3. Mathematical Quality Guarantee</span>
            <p className="text-slate-400 leading-relaxed">
              The output distribution is mathematically identical to running the 27B model directly, but achieves <strong>2x to 3x higher speed</strong>!
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
