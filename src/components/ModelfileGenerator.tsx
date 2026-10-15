import React, { useState } from 'react';
import { ModelPreset, TuningParameters, HardwareProfile } from '../types';
import { Copy, Check, Terminal, FileCode, Download, Play } from 'lucide-react';

interface ModelfileGeneratorProps {
  model: ModelPreset;
  tuning: TuningParameters;
  hardware: HardwareProfile;
}

export const ModelfileGenerator: React.FC<ModelfileGeneratorProps> = ({
  model,
  tuning,
  hardware,
}) => {
  const [copiedModelfile, setCopiedModelfile] = useState(false);
  const [copiedCmd, setCopiedCmd] = useState(false);
  const [activeShell, setActiveShell] = useState<'powershell' | 'cmd'>('powershell');

  const modelfileContent = `# Ollama Modelfile optimized for AMD Radeon RX 580 (8GB) & Ryzen 5 2400G
FROM ${model.name}

# Hardware-Optimized Execution Parameters
PARAMETER num_gpu ${tuning.numGpuLayers}
PARAMETER num_ctx ${tuning.contextWindow}
PARAMETER num_thread ${tuning.cpuThreads}
PARAMETER temperature ${tuning.temperature}
PARAMETER top_p ${tuning.topP}
PARAMETER repeat_penalty ${tuning.repeatPenalty}

# Context & Memory Tuning
# - Offloads ${tuning.numGpuLayers} layers to RX 580 VRAM
# - Context size restricted to ${tuning.contextWindow} to save ~2.1 GB KV cache VRAM
# - Leaves 2 CPU threads free for Windows OS responsiveness

SYSTEM """You are an uncensored, helpful, and concise AI assistant running locally via Ollama with hardware acceleration."""
`;

  const windowsCmd = activeShell === 'powershell'
    ? `# 1. Set environment variables for RX 580 GFX803 support and CORS
$env:HSA_OVERRIDE_GFX_VERSION="8.0.3"
$env:OLLAMA_ORIGINS="*"
$env:OLLAMA_NUM_PARALLEL="1"

# 2. Build the optimized model
ollama create qwen27b-fast -f .\\Modelfile

# 3. Launch and run inference
ollama run qwen27b-fast`
    : `:: 1. Set environment variables for RX 580 GFX803 support and CORS
set HSA_OVERRIDE_GFX_VERSION=8.0.3
set OLLAMA_ORIGINS=*
set OLLAMA_NUM_PARALLEL=1

:: 2. Build the optimized model
ollama create qwen27b-fast -f .\\Modelfile

:: 3. Launch and run inference
ollama run qwen27b-fast`;

  const copyToClipboard = (text: string, setCopied: (v: boolean) => void) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const downloadModelfile = () => {
    const blob = new Blob([modelfileContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'Modelfile';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Intro */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs text-slate-400 mb-1">
              <span>Ollama Configuration Exporter</span>
              <span aria-hidden="true">·</span>
              <span>Tailored for {hardware.gpuName}</span>
            </div>
            <h2 className="text-lg font-bold text-white tracking-tight">
              Export Hardware-Optimized Modelfile & CLI Scripts
            </h2>
          </div>
          <button
            onClick={downloadModelfile}
            className="flex items-center gap-2 px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-semibold border border-slate-700 transition-colors whitespace-nowrap self-start md:self-auto"
          >
            <Download className="w-3.5 h-3.5 text-slate-300" />
            <span>Download Modelfile</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Modelfile Box */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-3 flex flex-col">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm font-semibold text-white">
              <FileCode className="w-4 h-4 text-emerald-400" />
              <span>Generated Modelfile</span>
            </div>
            <button
              onClick={() => copyToClipboard(modelfileContent, setCopiedModelfile)}
              className="flex items-center gap-1.5 px-2.5 py-1 text-xs text-slate-300 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded transition-colors"
            >
              {copiedModelfile ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-emerald-400">Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy File</span>
                </>
              )}
            </button>
          </div>

          <div className="relative flex-1 bg-slate-950 rounded-lg border border-slate-800 p-4 font-mono text-xs text-slate-300 leading-relaxed overflow-x-auto whitespace-pre">
            {modelfileContent}
          </div>

          <p className="text-[11px] text-slate-500">
            Save this file as <code>Modelfile</code> in your working folder and run <code>ollama create qwen27b-fast -f Modelfile</code>.
          </p>
        </div>

        {/* Windows Execution Commands */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-3 flex flex-col">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm font-semibold text-white">
              <Terminal className="w-4 h-4 text-cyan-400" />
              <span>Windows CLI Execution</span>
            </div>

            <div className="flex items-center gap-2">
              <div className="flex items-center bg-slate-950 p-0.5 rounded border border-slate-800 text-xs">
                <button
                  onClick={() => setActiveShell('powershell')}
                  className={`px-2.5 py-1 rounded transition-colors ${
                    activeShell === 'powershell'
                      ? 'bg-slate-800 text-cyan-300 font-semibold'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  PowerShell
                </button>
                <button
                  onClick={() => setActiveShell('cmd')}
                  className={`px-2.5 py-1 rounded transition-colors ${
                    activeShell === 'cmd'
                      ? 'bg-slate-800 text-cyan-300 font-semibold'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  CMD
                </button>
              </div>

              <button
                onClick={() => copyToClipboard(windowsCmd, setCopiedCmd)}
                className="flex items-center gap-1.5 px-2.5 py-1 text-xs text-slate-300 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded transition-colors"
              >
                {copiedCmd ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-emerald-400">Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy Script</span>
                  </>
                )}
              </button>
            </div>
          </div>

          <div className="relative flex-1 bg-slate-950 rounded-lg border border-slate-800 p-4 font-mono text-xs text-slate-300 leading-relaxed overflow-x-auto whitespace-pre">
            {windowsCmd}
          </div>

          <div className="space-y-1.5 text-xs text-slate-400 pt-1">
            <div className="flex items-start gap-1.5">
              <Play className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
              <span>
                <strong>HSA_OVERRIDE_GFX_VERSION=8.0.3</strong> forces ROCm to utilize the AMD RX 580 Polaris GPU cores.
              </span>
            </div>
            <div className="flex items-start gap-1.5">
              <Play className="w-3.5 h-3.5 text-cyan-400 shrink-0 mt-0.5" />
              <span>
                <strong>OLLAMA_ORIGINS=&quot;*&quot;</strong> permits the browser web app to communicate directly with local Ollama.
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
