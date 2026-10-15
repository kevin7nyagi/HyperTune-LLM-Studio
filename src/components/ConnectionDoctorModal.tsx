import React, { useState } from 'react';
import { DiagnosticResult } from '../types';
import { OllamaService, DEFAULT_OLLAMA_ENDPOINT } from '../services/ollamaService';
import {
  X,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Copy,
  Check,
  Terminal,
  Activity,
  Layers,
} from 'lucide-react';

interface ConnectionDoctorModalProps {
  isOpen: boolean;
  onClose: () => void;
  endpoint: string;
  setEndpoint: (ep: string) => void;
  isSimulated: boolean;
  setIsSimulated: (sim: boolean) => void;
  onRefreshModels: () => Promise<void>;
}

export const ConnectionDoctorModal: React.FC<ConnectionDoctorModalProps> = ({
  isOpen,
  onClose,
  endpoint,
  setEndpoint,
  isSimulated,
  setIsSimulated,
  onRefreshModels,
}) => {
  const [isRunningDiag, setIsRunningDiag] = useState(false);
  const [diagResults, setDiagResults] = useState<DiagnosticResult[] | null>(null);
  const [copiedCmd, setCopiedCmd] = useState(false);

  if (!isOpen) return null;

  const runDiagnostics = async () => {
    setIsRunningDiag(true);
    try {
      const results = await OllamaService.runDiagnostics(endpoint);
      setDiagResults(results);
      if (results.some((r) => r.status === 'success' && r.step === 'port')) {
        await onRefreshModels();
      }
    } finally {
      setIsRunningDiag(false);
    }
  };

  const copyText = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCmd(true);
    setTimeout(() => setCopiedCmd(false), 2000);
  };

  const windowsPowerShellFix = `$env:OLLAMA_ORIGINS="*"
$env:HSA_OVERRIDE_GFX_VERSION="8.0.3"
ollama serve`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <Activity className="w-5 h-5 text-emerald-400" />
            <h2 className="text-base font-bold text-white">Ollama Connection Doctor & CORS Assistant</h2>
          </div>
          <button
            onClick={onClose}
            aria-label="Close dialog"
            className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6 overflow-y-auto">
          {/* Endpoint Input */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-300 block">
              Local Ollama API Endpoint
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={endpoint}
                onChange={(e) => setEndpoint(e.target.value)}
                placeholder={DEFAULT_OLLAMA_ENDPOINT}
                className="flex-1 bg-slate-950 border border-slate-700 rounded-lg px-3.5 py-2 text-xs font-mono text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
              <button
                onClick={runDiagnostics}
                disabled={isRunningDiag}
                className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-lg text-xs font-semibold transition-colors whitespace-nowrap"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isRunningDiag ? 'animate-spin' : ''}`} />
                <span>Run Diagnostics</span>
              </button>
            </div>
          </div>

          {/* Diagnostic Results */}
          {diagResults && (
            <div className="space-y-2.5">
              <span className="text-xs font-semibold text-slate-300 block">Diagnostic Results</span>
              <div className="space-y-2">
                {diagResults.map((result, idx) => (
                  <div
                    key={idx}
                    className="p-3 bg-slate-950 rounded-lg border border-slate-800 flex items-start gap-3"
                  >
                    {result.status === 'success' && (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    )}
                    {result.status === 'warning' && (
                      <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                    )}
                    {result.status === 'error' && (
                      <XCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                    )}
                    <div className="space-y-1 text-xs">
                      <span className="font-semibold text-white block">{result.message}</span>
                      {result.details && (
                        <p className="text-slate-400 leading-relaxed">{result.details}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Windows Setup Guide for CORS & GFX803 */}
          <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Terminal className="w-4 h-4 text-cyan-400" />
                <span className="text-xs font-bold text-white">How to enable CORS on Windows</span>
              </div>
              <button
                onClick={() => copyText(windowsPowerShellFix)}
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
                    <span>Copy Command</span>
                  </>
                )}
              </button>
            </div>

            <p className="text-xs text-slate-400 leading-relaxed">
              By default, Windows Ollama blocks browser fetch requests (CORS).
              To allow direct connection and enable your RX 580 GPU, open PowerShell and run:
            </p>

            <pre className="p-3 bg-slate-900 rounded-lg border border-slate-800 font-mono text-xs text-cyan-300 select-all overflow-x-auto">
              {windowsPowerShellFix}
            </pre>

            <span className="text-[11px] text-slate-500 block">
              Tip: You can also set <code>OLLAMA_ORIGINS=&quot;*&quot;</code> in Windows System Environment Variables so it starts automatically with Windows!
            </span>
          </div>

          {/* Browser Mixed Content & Tunnel Solutions */}
          <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 space-y-3">
            <div className="flex items-center gap-2">
              <Terminal className="w-4 h-4 text-emerald-400" />
              <span className="text-xs font-bold text-white">Browser Security &amp; HTTPS Tunnel (If blocked)</span>
            </div>

            <p className="text-xs text-slate-400 leading-relaxed">
              Because this web app runs on <strong>HTTPS</strong>, your browser might restrict direct connection to local <code>http://localhost:11434</code>. You have two simple fixes:
            </p>

            <div className="space-y-2 text-xs">
              <div className="p-2.5 bg-slate-900 rounded-lg border border-slate-800 space-y-1">
                <span className="font-semibold text-slate-200">Fix A: Allow Insecure Content in Chrome / Edge</span>
                <p className="text-slate-400 text-[11px]">
                  Click the <strong>Tune/Sliders or Padlock icon</strong> on the left side of your browser address bar &rarr; <strong>Site settings</strong> &rarr; find <strong>Insecure content</strong> &rarr; set to <strong>Allow</strong> &rarr; reload page.
                </p>
              </div>

              <div className="p-2.5 bg-slate-900 rounded-lg border border-slate-800 space-y-1">
                <span className="font-semibold text-slate-200">Fix B: Instant 1-Line HTTPS Tunnel (Zero setup)</span>
                <p className="text-slate-400 text-[11px]">
                  Run this in your terminal to get a free secure HTTPS address (e.g. <code>https://xyz.trycloudflare.com</code>) and paste it into the endpoint box above:
                </p>
                <div className="bg-black/60 p-2 rounded font-mono text-[11px] text-emerald-300 select-all border border-slate-800">
                  cloudflared tunnel --url http://localhost:11434
                </div>
              </div>
            </div>
          </div>

          {/* Simulation Fallback Mode */}
          <div className="flex items-center justify-between p-4 bg-slate-950 rounded-xl border border-slate-800">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-purple-400" />
                <span className="text-xs font-bold text-white">Integrated Hardware Simulation Mode</span>
              </div>
              <p className="text-xs text-slate-400 max-w-md">
                Experience full real-time tokens/sec telemetry, speed profiling, and interactive streaming even before launching Ollama locally.
              </p>
            </div>

            <button
              onClick={() => setIsSimulated(!isSimulated)}
              className={`px-3.5 py-2 text-xs font-semibold rounded-lg border transition-all whitespace-nowrap ${
                isSimulated
                  ? 'bg-purple-600/30 text-purple-300 border-purple-500'
                  : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-750'
              }`}
            >
              {isSimulated ? 'Simulation Active' : 'Switch to Simulation'}
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end px-6 py-4 bg-slate-950 border-t border-slate-800">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-semibold transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
