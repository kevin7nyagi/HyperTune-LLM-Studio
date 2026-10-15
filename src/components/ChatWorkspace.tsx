import React, { useState, useRef, useEffect } from 'react';
import { ChatMessage, HardwareProfile, ModelPreset, TuningParameters } from '../types';
import { TelemetryBadge } from './TelemetryBadge';
import {
  Send,
  Square,
  Trash2,
  Copy,
  Check,
  Bot,
  User,
  Sliders,
  ChevronDown,
  Sparkles,
  RefreshCw,
  Terminal,
  Activity,
  AlertCircle,
  CheckCircle2,
  Edit2,
} from 'lucide-react';

interface ChatWorkspaceProps {
  messages: ChatMessage[];
  isGenerating: boolean;
  streamingContent: string;
  onSendMessage: (text: string) => void;
  onStopGeneration: () => void;
  onClearChat: () => void;
  selectedModel: ModelPreset;
  tuning: TuningParameters;
  onUpdateTuning: (newTuning: Partial<TuningParameters>) => void;
  hardware: HardwareProfile;
  isSimulated: boolean;
  setIsSimulated: (sim: boolean) => void;
  isConnected: boolean;
  isConnecting: boolean;
  endpoint: string;
  onUpdateEndpoint: (ep: string) => void;
  onTestConnection: () => Promise<void>;
  onCustomModelChange?: (name: string) => void;
}

export const ChatWorkspace: React.FC<ChatWorkspaceProps> = ({
  messages,
  isGenerating,
  streamingContent,
  onSendMessage,
  onStopGeneration,
  onClearChat,
  selectedModel,
  tuning,
  onUpdateTuning,
  hardware,
  isSimulated,
  setIsSimulated,
  isConnected,
  isConnecting,
  endpoint,
  onUpdateEndpoint,
  onTestConnection,
  onCustomModelChange,
}) => {
  const [inputText, setInputText] = useState('');
  const [showSpeedBar, setShowSpeedBar] = useState(false);
  const [copiedMsgId, setCopiedMsgId] = useState<string | null>(null);
  const [copiedCmd, setCopiedCmd] = useState(false);
  const [isEditingModel, setIsEditingModel] = useState(false);
  const [customModelInput, setCustomModelInput] = useState(selectedModel.name);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setCustomModelInput(selectedModel.name);
  }, [selectedModel.name]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, streamingContent]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || isGenerating) return;
    const text = inputText;
    setInputText('');
    onSendMessage(text);
  };

  const copyMessage = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedMsgId(id);
    setTimeout(() => setCopiedMsgId(null), 2000);
  };

  const copyCommand = (cmd: string) => {
    navigator.clipboard.writeText(cmd);
    setCopiedCmd(true);
    setTimeout(() => setCopiedCmd(false), 2000);
  };

  const handleApplyCustomModel = () => {
    if (customModelInput.trim() && onCustomModelChange) {
      onCustomModelChange(customModelInput.trim());
    }
    setIsEditingModel(false);
  };

  const quickPrompts = [
    'Why is Qwen 27B slow on my RX 580 and how can I speed it up?',
    'Write a high-performance Python script with async queues',
    'Explain how Speculative Decoding works with a 1.5B draft model',
    'Compare 27B Q2_K vs 14B Q3_K memory footprint and speed',
  ];

  const windowsLaunchCmd = `$env:OLLAMA_ORIGINS="*" ; $env:HSA_OVERRIDE_GFX_VERSION="8.0.3" ; ollama serve`;

  return (
    <div className="flex flex-col h-[calc(100vh-57px)] bg-slate-950">
      {/* Local Model Status & Mode Bar */}
      <div className="border-b border-slate-800 bg-slate-900/90 px-4 md:px-6 py-2.5 flex flex-wrap items-center justify-between gap-3 text-xs">
        {/* Left: Mode Switcher & Target Model */}
        <div className="flex flex-wrap items-center gap-2 md:gap-3">
          {/* Explicit Mode Selector */}
          <div className="flex items-center bg-slate-950 p-0.5 rounded-lg border border-slate-800">
            <button
              onClick={() => setIsSimulated(false)}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-md transition-colors ${
                !isSimulated
                  ? 'bg-emerald-600 text-white font-semibold shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-white' : 'bg-rose-400'}`} />
              <span>Real Local Ollama</span>
            </button>
            <button
              onClick={() => setIsSimulated(true)}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-md transition-colors ${
                isSimulated
                  ? 'bg-purple-600 text-white font-semibold shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Sparkles className="w-3 h-3" />
              <span>Hardware Simulation</span>
            </button>
          </div>

          <span className="text-slate-700 hidden sm:inline" aria-hidden="true">|</span>

          {/* Target Model Name & Quick Edit */}
          <div className="flex items-center gap-1.5 bg-slate-950 px-2.5 py-1 rounded-lg border border-slate-800">
            <span className="text-slate-500 text-[11px]">Model:</span>
            {isEditingModel ? (
              <div className="flex items-center gap-1">
                <input
                  type="text"
                  value={customModelInput}
                  onChange={(e) => setCustomModelInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleApplyCustomModel()}
                  className="bg-slate-900 border border-slate-700 px-1.5 py-0.5 rounded text-white text-[11px] font-mono focus:outline-none focus:ring-1 focus:ring-emerald-500 w-44"
                  autoFocus
                />
                <button
                  onClick={handleApplyCustomModel}
                  className="px-1.5 py-0.5 bg-emerald-600 text-white rounded text-[11px]"
                >
                  OK
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-1.5">
                <span className="font-mono text-slate-200 text-[11px] truncate max-w-[200px]" title={selectedModel.name}>
                  {selectedModel.name}
                </span>
                <button
                  onClick={() => setIsEditingModel(true)}
                  className="text-slate-400 hover:text-white p-0.5"
                  title="Edit model tag"
                >
                  <Edit2 className="w-3 h-3" />
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Right: Endpoint & Connect Action */}
        <div className="flex items-center gap-2">
          {/* Quick Endpoint Switcher */}
          <div className="hidden lg:flex items-center gap-1.5 text-slate-400 font-mono text-[11px]">
            <span>Endpoint:</span>
            <button
              onClick={() => onUpdateEndpoint(endpoint.includes('127.0.0.1') ? 'http://localhost:11434' : 'http://127.0.0.1:11434')}
              className="text-cyan-400 hover:underline"
              title="Click to toggle localhost / 127.0.0.1"
            >
              {endpoint}
            </button>
          </div>

          <button
            onClick={onTestConnection}
            disabled={isConnecting}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-semibold transition-all ${
              isConnected
                ? 'bg-emerald-950/60 text-emerald-300 border-emerald-700 hover:bg-emerald-900/60'
                : 'bg-slate-800 text-slate-200 border-slate-700 hover:bg-slate-750'
            }`}
          >
            <RefreshCw className={`w-3 h-3 ${isConnecting ? 'animate-spin' : ''}`} />
            <span>{isConnecting ? 'Connecting...' : isConnected ? 'Connected' : 'Test Connect'}</span>
          </button>

          <button
            onClick={() => setShowSpeedBar(!showSpeedBar)}
            className="flex items-center gap-1 px-2.5 py-1 bg-slate-800 hover:bg-slate-750 text-slate-300 rounded-lg border border-slate-700 text-xs"
            title="Toggle Speed Tuning Drawer"
          >
            <Sliders className="w-3 h-3 text-emerald-400" />
            <span className="hidden sm:inline">Tuning</span>
          </button>

          {messages.length > 0 && (
            <button
              onClick={onClearChat}
              className="p-1.5 text-slate-400 hover:text-rose-400 transition-colors rounded hover:bg-slate-800"
              title="Clear conversation"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Expanded Quick Speed Bar */}
      {showSpeedBar && (
        <div className="p-4 bg-slate-900 border-b border-slate-800 grid grid-cols-1 md:grid-cols-3 gap-4 text-xs animate-in fade-in duration-150">
          <div>
            <div className="flex justify-between mb-1">
              <label htmlFor="quick-gpu-layers" className="text-slate-300 font-medium">GPU Offload Layers</label>
              <span className="font-mono text-cyan-400 font-bold">{tuning.numGpuLayers} / {selectedModel.totalLayers}</span>
            </div>
            <input
              id="quick-gpu-layers"
              type="range"
              min={0}
              max={selectedModel.totalLayers}
              value={tuning.numGpuLayers}
              onChange={(e) => onUpdateTuning({ numGpuLayers: parseInt(e.target.value, 10) })}
              className="w-full accent-cyan-500 cursor-pointer h-1.5 bg-slate-800 rounded-lg"
            />
          </div>

          <div>
            <div className="flex justify-between mb-1">
              <label htmlFor="quick-ctx-window" className="text-slate-300 font-medium">Context Window (num_ctx)</label>
              <span className="font-mono text-purple-400 font-bold">{tuning.contextWindow} tokens</span>
            </div>
            <input
              id="quick-ctx-window"
              type="range"
              min={512}
              max={4096}
              step={512}
              value={tuning.contextWindow}
              onChange={(e) => onUpdateTuning({ contextWindow: parseInt(e.target.value, 10) })}
              className="w-full accent-purple-500 cursor-pointer h-1.5 bg-slate-800 rounded-lg"
            />
          </div>

          <div>
            <div className="flex justify-between mb-1">
              <label htmlFor="quick-cpu-threads" className="text-slate-300 font-medium">CPU Threads (num_thread)</label>
              <span className="font-mono text-emerald-400 font-bold">{tuning.cpuThreads} Threads</span>
            </div>
            <input
              id="quick-cpu-threads"
              type="range"
              min={1}
              max={hardware.cpuThreads}
              value={tuning.cpuThreads}
              onChange={(e) => onUpdateTuning({ cpuThreads: parseInt(e.target.value, 10) })}
              className="w-full accent-emerald-500 cursor-pointer h-1.5 bg-slate-800 rounded-lg"
            />
          </div>
        </div>
      )}

      {/* Disconnection Assistant Banner (shows only when Real Local Ollama is active but disconnected) */}
      {!isSimulated && !isConnected && (
        <div className="bg-amber-950/40 border-b border-amber-800/60 p-4 px-6 text-xs text-amber-200 flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-start gap-2.5 max-w-2xl">
            <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <span className="font-bold text-amber-300 block">
                Local Ollama is offline or requests are blocked by CORS
              </span>
              <p className="text-amber-200/90 leading-relaxed">
                To load <strong>{selectedModel.name}</strong> from your machine, run Ollama with CORS origins enabled in PowerShell:
              </p>
              <div className="flex items-center gap-2 pt-1">
                <code className="bg-black/60 px-2 py-1 rounded font-mono text-[11px] text-amber-300 select-all border border-amber-800/50">
                  {windowsLaunchCmd}
                </code>
                <button
                  onClick={() => copyCommand(windowsLaunchCmd)}
                  className="px-2 py-1 bg-amber-900/60 hover:bg-amber-800/80 text-amber-200 rounded text-[11px] font-semibold transition-colors flex items-center gap-1"
                >
                  {copiedCmd ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  <span>{copiedCmd ? 'Copied' : 'Copy'}</span>
                </button>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start md:self-auto shrink-0">
            <button
              onClick={onTestConnection}
              disabled={isConnecting}
              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold transition-colors flex items-center gap-1"
            >
              <RefreshCw className={`w-3 h-3 ${isConnecting ? 'animate-spin' : ''}`} />
              <span>Retry Connect</span>
            </button>
            <button
              onClick={() => setIsSimulated(true)}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-medium border border-slate-700 transition-colors"
            >
              Use Simulation
            </button>
          </div>
        </div>
      )}

      {/* Message List */}
      <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6">
        {messages.length === 0 && !streamingContent && (
          <div className="max-w-2xl mx-auto my-auto pt-8 text-center space-y-6">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto">
              <Sparkles className="w-6 h-6" />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-center gap-2 text-xs">
                <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-emerald-400' : isSimulated ? 'bg-purple-400' : 'bg-rose-400'}`} />
                <span className="font-semibold text-white">
                  {isConnected ? 'Connected to Local Ollama' : isSimulated ? 'Simulation Mode Active' : 'Targeting Local Ollama'}
                </span>
                <span className="text-slate-500" aria-hidden="true">·</span>
                <span className="font-mono text-slate-400">{selectedModel.name}</span>
              </div>

              <h3 className="text-lg font-bold text-white tracking-tight">
                Ready to chat with {selectedModel.displayName}
              </h3>
              <p className="text-xs text-slate-400 max-w-md mx-auto leading-relaxed">
                {!isSimulated && isConnected
                  ? `Prompts are sent directly to your local Ollama on ${endpoint} using ${tuning.numGpuLayers} layers on your RX 580.`
                  : 'Test real generation latency on your AMD RX 580 (8GB) and Ryzen 2400G. Send any prompt below or pick a benchmark test.'}
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-w-lg mx-auto text-left">
              {quickPrompts.map((prompt, i) => (
                <button
                  key={i}
                  onClick={() => onSendMessage(prompt)}
                  className="p-3 bg-slate-900/80 hover:bg-slate-800/90 border border-slate-800 hover:border-slate-700 rounded-xl text-xs text-slate-300 hover:text-white transition-all leading-snug"
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex gap-3 max-w-3xl ${
              msg.role === 'user' ? 'ml-auto flex-row-reverse' : 'mr-auto'
            }`}
          >
            {/* Avatar */}
            <div
              className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 text-xs font-semibold ${
                msg.role === 'user'
                  ? 'bg-emerald-600 text-white'
                  : 'bg-slate-800 text-cyan-400 border border-slate-700'
              }`}
            >
              {msg.role === 'user' ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
            </div>

            {/* Bubble */}
            <div
              className={`space-y-2 max-w-[85%] rounded-2xl p-4 text-xs leading-relaxed ${
                msg.role === 'user'
                  ? 'bg-emerald-600/90 text-white shadow-sm'
                  : 'bg-slate-900 border border-slate-800 text-slate-200 shadow-sm'
              }`}
            >
              <div className="whitespace-pre-wrap font-sans break-words selection:bg-slate-800">
                {msg.content}
              </div>

              {/* Telemetry Strip for Assistant */}
              {msg.role === 'assistant' && msg.telemetry && (
                <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between gap-2">
                  <TelemetryBadge telemetry={msg.telemetry} />
                  <button
                    onClick={() => copyMessage(msg.id, msg.content)}
                    className="p-1 text-slate-400 hover:text-white rounded hover:bg-slate-800 transition-colors shrink-0"
                    title="Copy message"
                  >
                    {copiedMsgId === msg.id ? (
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}

        {/* Live Streaming Response Bubble */}
        {isGenerating && streamingContent && (
          <div className="flex gap-3 max-w-3xl mr-auto">
            <div className="w-7 h-7 rounded-lg bg-slate-800 text-cyan-400 border border-slate-700 flex items-center justify-center shrink-0">
              <Bot className="w-4 h-4" />
            </div>

            <div className="space-y-2 max-w-[85%] bg-slate-900 border border-slate-800 rounded-2xl p-4 text-xs leading-relaxed text-slate-200">
              <div className="whitespace-pre-wrap font-sans break-words">
                {streamingContent}
                <span className="inline-block w-1.5 h-3.5 bg-emerald-400 ml-1 animate-pulse align-middle" />
              </div>
              <div className="text-[11px] font-mono text-slate-500 pt-1">
                Streaming from {selectedModel.name}...
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Form */}
      <div className="p-4 bg-slate-900 border-t border-slate-800">
        <form onSubmit={handleSubmit} className="max-w-3xl mx-auto flex gap-2">
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder={
              !isSimulated && !isConnected
                ? `Ollama disconnected - send prompt or click 'Retry Connect' above...`
                : `Prompt ${selectedModel.name} on ${isSimulated ? 'Simulation' : 'Local Ollama'}...`
            }
            disabled={isGenerating}
            className="flex-1 bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 disabled:opacity-50"
          />

          {isGenerating ? (
            <button
              type="button"
              onClick={onStopGeneration}
              className="flex items-center gap-1.5 px-4 py-2.5 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-semibold transition-colors shrink-0"
            >
              <Square className="w-3.5 h-3.5 fill-current" />
              <span>Stop</span>
            </button>
          ) : (
            <button
              type="submit"
              disabled={!inputText.trim()}
              className="flex items-center gap-1.5 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white rounded-xl text-xs font-semibold transition-colors shrink-0"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Send</span>
            </button>
          )}
        </form>
      </div>
    </div>
  );
};
