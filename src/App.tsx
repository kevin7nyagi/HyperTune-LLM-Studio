/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  ChatMessage,
  HardwareProfile,
  ModelPreset,
  TuningParameters,
} from './types';
import {
  USER_HARDWARE_PROFILE,
  MODEL_PRESETS,
} from './utils/hardwareMath';
import { Header } from './components/Header';
import { ChatWorkspace } from './components/ChatWorkspace';
import { HardwareProfiler } from './components/HardwareProfiler';
import { ModelAdvisor } from './components/ModelAdvisor';
import { ModelfileGenerator } from './components/ModelfileGenerator';
import { ConnectionDoctorModal } from './components/ConnectionDoctorModal';
import { OllamaService, DEFAULT_OLLAMA_ENDPOINT } from './services/ollamaService';

export default function App() {
  const [activeTab, setActiveTab] = useState<'chat' | 'profiler' | 'advisor' | 'modelfile'>('chat');
  const [hardware, setHardware] = useState<HardwareProfile>(USER_HARDWARE_PROFILE);
  const [models, setModels] = useState<ModelPreset[]>(MODEL_PRESETS);
  const [selectedModel, setSelectedModel] = useState<ModelPreset>(MODEL_PRESETS[0]);

  const [tuning, setTuning] = useState<TuningParameters>({
    numGpuLayers: MODEL_PRESETS[0].recommendedGpuLayersRx580, // 16 layers for 27B on RX 580
    contextWindow: 2048,
    cpuThreads: 6,
    temperature: 0.7,
    topP: 0.9,
    repeatPenalty: 1.1,
    quantKv: 'q8_0',
    flashAttention: true,
    draftModel: 'none',
  });

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [streamingContent, setStreamingContent] = useState('');
  const abortControllerRef = useRef<AbortController | null>(null);

  const [endpoint, setEndpoint] = useState(DEFAULT_OLLAMA_ENDPOINT);
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isSimulated, setIsSimulated] = useState(false); // Default to Real Local Model!
  const [isDoctorOpen, setIsDoctorOpen] = useState(false);

  // Check connection to local Ollama on initial load
  useEffect(() => {
    handleTestConnection();
  }, [endpoint]);

  const handleTestConnection = async () => {
    setIsConnecting(true);
    try {
      const results = await OllamaService.runDiagnostics(endpoint);
      const isPortOk = results.some((r) => r.step === 'port' && r.status === 'success');
      const isCorsOk = results.some((r) => r.step === 'cors' && r.status === 'success');

      if (isPortOk && isCorsOk) {
        setIsConnected(true);
        await refreshModels();
      } else {
        setIsConnected(false);
      }
    } catch {
      setIsConnected(false);
    } finally {
      setIsConnecting(false);
    }
  };

  const refreshModels = async () => {
    try {
      const tags = await OllamaService.fetchLocalModels(endpoint);
      if (tags.length > 0) {
        // Merge installed models with presets
        const userModels: ModelPreset[] = tags.map((t) => ({
          id: `local-${t.name}`,
          name: t.name,
          displayName: t.name,
          parameterCountB: t.name.includes('27b') ? 27 : t.name.includes('14b') ? 14 : 7,
          quantization: t.details?.quantization_level || 'GGUF',
          bitsPerWeight: 4.5,
          fileSizeGB: Number((t.size / (1024 * 1024 * 1024)).toFixed(1)),
          totalLayers: t.name.includes('27b') ? 64 : 32,
          hiddenDimension: 4096,
          defaultCtx: 2048,
          recommendedGpuLayersRx580: t.name.includes('27b') ? 16 : 32,
          estimatedTpsRx580: {
            pureCpu: 1.5,
            hybridBalanced: 12.0,
            pureGpu: 35.0,
          },
          notes: `Detected on your local machine (${(t.size / (1024 * 1024 * 1024)).toFixed(1)} GB).`,
          isInstalledByUser: true,
        }));

        setModels((prev) => {
          const combined = [...userModels];
          for (const p of prev) {
            if (!combined.some((m) => m.name === p.name)) {
              combined.push(p);
            }
          }
          return combined;
        });

        // If currently selected model is in the installed list, keep it; otherwise if user has an installed 27B model, select it!
        const matchingInstalled = userModels.find(
          (m) =>
            m.name === selectedModel.name ||
            m.name.includes('Qwen') ||
            m.name.includes('qwen')
        );
        if (matchingInstalled) {
          setSelectedModel(matchingInstalled);
        }
      }
    } catch {
      // Keep presets
    }
  };

  const handleCustomModelChange = (customName: string) => {
    setSelectedModel((prev) => ({
      ...prev,
      name: customName,
      displayName: customName,
    }));
  };

  const handleUpdateTuning = (newTuning: Partial<TuningParameters>) => {
    setTuning((prev) => ({ ...prev, ...newTuning }));
  };

  const handleSelectModel = (model: ModelPreset) => {
    setSelectedModel(model);
    setTuning((prev) => ({
      ...prev,
      numGpuLayers: model.recommendedGpuLayersRx580,
    }));
  };

  const handleSendMessage = async (text: string) => {
    if (isGenerating) return;

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: text,
      timestamp: Date.now(),
    };

    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setIsGenerating(true);
    setStreamingContent('');

    const controller = new AbortController();
    abortControllerRef.current = controller;

    const onChunk = (_chunk: string, partialText: string) => {
      setStreamingContent(partialText);
    };

    const onDone = (fullText: string, telemetry: ChatMessage['telemetry']) => {
      setIsConnected(true); // Mark connection successful!
      const assistantMessage: ChatMessage = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: fullText,
        timestamp: Date.now(),
        telemetry,
      };
      setMessages([...newMessages, assistantMessage]);
      setStreamingContent('');
      setIsGenerating(false);
      abortControllerRef.current = null;
    };

    const onError = (error: Error) => {
      console.error('Chat error:', error);
      setIsConnected(false);
      const errorMessage: ChatMessage = {
        id: `err-${Date.now()}`,
        role: 'assistant',
        content: `Error loading from local model "${selectedModel.name}": ${error.message}`,
        timestamp: Date.now(),
      };
      setMessages([...newMessages, errorMessage]);
      setStreamingContent('');
      setIsGenerating(false);
      abortControllerRef.current = null;
    };

    // If user explicitly chose Simulation, run simulator; otherwise ALWAYS send to REAL LOCAL OLLAMA!
    if (isSimulated) {
      await OllamaService.simulateChat({
        model: selectedModel,
        prompt: text,
        tuning,
        hardware,
        onChunk,
        onDone,
        abortSignal: controller.signal,
      });
    } else {
      await OllamaService.streamChat({
        endpoint,
        modelName: selectedModel.name,
        messages: newMessages,
        tuning,
        hardware,
        onChunk,
        onDone,
        onError,
        abortSignal: controller.signal,
      });
    }
  };

  const handleStopGeneration = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      setIsGenerating(false);
      if (streamingContent) {
        const assistantMessage: ChatMessage = {
          id: `assistant-stopped-${Date.now()}`,
          role: 'assistant',
          content: streamingContent + ' [Generation stopped by user]',
          timestamp: Date.now(),
        };
        setMessages((prev) => [...prev, assistantMessage]);
        setStreamingContent('');
      }
      abortControllerRef.current = null;
    }
  };

  const handleClearChat = () => {
    setMessages([]);
    setStreamingContent('');
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* Top Bar Header */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        isConnected={isConnected}
        isSimulated={isSimulated}
        models={models}
        selectedModel={selectedModel}
        onSelectModel={handleSelectModel}
        onOpenDoctor={() => setIsDoctorOpen(true)}
      />

      {/* Main View Area */}
      <main className="flex-1 overflow-y-auto">
        {activeTab === 'chat' && (
          <ChatWorkspace
            messages={messages}
            isGenerating={isGenerating}
            streamingContent={streamingContent}
            onSendMessage={handleSendMessage}
            onStopGeneration={handleStopGeneration}
            onClearChat={handleClearChat}
            selectedModel={selectedModel}
            tuning={tuning}
            onUpdateTuning={handleUpdateTuning}
            hardware={hardware}
            isSimulated={isSimulated}
            setIsSimulated={setIsSimulated}
            isConnected={isConnected}
            isConnecting={isConnecting}
            endpoint={endpoint}
            onUpdateEndpoint={setEndpoint}
            onTestConnection={handleTestConnection}
            onCustomModelChange={handleCustomModelChange}
          />
        )}

        {activeTab === 'profiler' && (
          <div className="max-w-6xl mx-auto p-6">
            <HardwareProfiler
              hardware={hardware}
              model={selectedModel}
              tuning={tuning}
              onUpdateTuning={handleUpdateTuning}
            />
          </div>
        )}

        {activeTab === 'advisor' && (
          <div className="max-w-6xl mx-auto p-6">
            <ModelAdvisor
              hardware={hardware}
              selectedModel={selectedModel}
              onSelectModel={handleSelectModel}
              onSwitchTab={setActiveTab}
            />
          </div>
        )}

        {activeTab === 'modelfile' && (
          <div className="max-w-6xl mx-auto p-6">
            <ModelfileGenerator
              model={selectedModel}
              tuning={tuning}
              hardware={hardware}
            />
          </div>
        )}
      </main>

      {/* Connection & CORS Doctor Modal */}
      <ConnectionDoctorModal
        isOpen={isDoctorOpen}
        onClose={() => setIsDoctorOpen(false)}
        endpoint={endpoint}
        setEndpoint={setEndpoint}
        isSimulated={isSimulated}
        setIsSimulated={setIsSimulated}
        onRefreshModels={refreshModels}
      />
    </div>
  );
}
