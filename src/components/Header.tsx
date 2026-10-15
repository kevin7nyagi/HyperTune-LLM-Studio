import React from 'react';
import { ModelPreset } from '../types';
import { Wrench, ChevronDown } from 'lucide-react';

interface HeaderProps {
  activeTab: 'chat' | 'profiler' | 'advisor' | 'modelfile';
  setActiveTab: (tab: 'chat' | 'profiler' | 'advisor' | 'modelfile') => void;
  isConnected: boolean;
  isSimulated: boolean;
  models: ModelPreset[];
  selectedModel: ModelPreset;
  onSelectModel: (model: ModelPreset) => void;
  onOpenDoctor: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  isConnected,
  isSimulated,
  models,
  selectedModel,
  onSelectModel,
  onOpenDoctor,
}) => {
  return (
    <header className="flex items-center justify-between gap-8 px-6 py-3.5 bg-slate-900/90 backdrop-blur border-b border-slate-800 shrink-0 z-30">
      {/* Zone 1: Single text element wordmark */}
      <div className="flex items-center gap-3 shrink-0">
        <a
          href="/"
          onClick={(e) => {
            e.preventDefault();
            setActiveTab('chat');
          }}
          className="text-lg font-bold tracking-tight text-white hover:text-emerald-400 transition-colors whitespace-nowrap shrink-0"
        >
          HyperTune Studio
        </a>
      </div>

      {/* Zone 2: 4 single-line nav links */}
      <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-300">
        <button
          onClick={() => setActiveTab('chat')}
          className={`hover:text-white transition-colors whitespace-nowrap shrink-0 py-1 ${
            activeTab === 'chat' ? 'text-emerald-400 border-b-2 border-emerald-400 font-semibold' : ''
          }`}
        >
          Chat & Telemetry
        </button>
        <button
          onClick={() => setActiveTab('profiler')}
          className={`hover:text-white transition-colors whitespace-nowrap shrink-0 py-1 ${
            activeTab === 'profiler' ? 'text-emerald-400 border-b-2 border-emerald-400 font-semibold' : ''
          }`}
        >
          VRAM & Layer Profiler
        </button>
        <button
          onClick={() => setActiveTab('advisor')}
          className={`hover:text-white transition-colors whitespace-nowrap shrink-0 py-1 ${
            activeTab === 'advisor' ? 'text-emerald-400 border-b-2 border-emerald-400 font-semibold' : ''
          }`}
        >
          Quantization Advisor
        </button>
        <button
          onClick={() => setActiveTab('modelfile')}
          className={`hover:text-white transition-colors whitespace-nowrap shrink-0 py-1 ${
            activeTab === 'modelfile' ? 'text-emerald-400 border-b-2 border-emerald-400 font-semibold' : ''
          }`}
        >
          Modelfile & Commands
        </button>
      </nav>

      {/* Zone 3: 1 primary action area */}
      <div className="flex items-center gap-3 shrink-0">
        {/* Model dropdown */}
        <div className="relative">
          <select
            value={selectedModel.id}
            onChange={(e) => {
              const found = models.find((m) => m.id === e.target.value);
              if (found) onSelectModel(found);
            }}
            aria-label="Select Model"
            className="appearance-none bg-slate-800 text-xs text-slate-200 border border-slate-700 rounded-lg pl-3 pr-8 py-2 font-mono hover:border-slate-600 focus:outline-none focus:ring-1 focus:ring-emerald-500 cursor-pointer whitespace-nowrap"
          >
            {models.map((m) => (
              <option key={m.id} value={m.id}>
                {m.displayName} ({m.fileSizeGB} GB)
              </option>
            ))}
          </select>
          <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
        </div>

        {/* Connection status / Doctor button */}
        <button
          onClick={onOpenDoctor}
          className={`flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors whitespace-nowrap shrink-0 ${
            isConnected
              ? 'bg-emerald-950/60 text-emerald-300 border-emerald-700/80 hover:bg-emerald-900/60'
              : !isSimulated
              ? 'bg-rose-950/60 text-rose-300 border-rose-700/80 hover:bg-rose-900/60'
              : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
          }`}
          title="Open Ollama Connection Doctor & Setup"
        >
          <span
            className={`w-2 h-2 rounded-full ${
              isConnected ? 'bg-emerald-400 animate-pulse' : !isSimulated ? 'bg-rose-400' : 'bg-purple-400'
            }`}
          />
          <span>{isConnected ? 'Local Ollama: Live' : !isSimulated ? 'Local Ollama: Offline' : 'Simulation Mode'}</span>
          <Wrench className="w-3.5 h-3.5 text-slate-400" />
        </button>
      </div>
    </header>
  );
};
