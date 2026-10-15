import { ChatMessage, DiagnosticResult, HardwareProfile, InferenceTelemetry, ModelPreset, OllamaModelTag, TuningParameters } from '../types';
import { calculateMemoryBreakdown, estimatePerformance } from '../utils/hardwareMath';

export const DEFAULT_OLLAMA_ENDPOINT = 'http://localhost:11434';

export class OllamaService {
  /**
   * Performs diagnostics on the Ollama endpoint:
   * Checks network connectivity, CORS headers, and model list availability.
   */
  static async runDiagnostics(endpoint: string = DEFAULT_OLLAMA_ENDPOINT): Promise<DiagnosticResult[]> {
    const results: DiagnosticResult[] = [];

    // Step 1: Endpoint reachability
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2500);

      const res = await fetch(`${endpoint}/api/tags`, {
        method: 'GET',
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (res.ok) {
        results.push({
          step: 'port',
          status: 'success',
          message: `Ollama is running on ${endpoint}`,
        });
        results.push({
          step: 'cors',
          status: 'success',
          message: 'CORS origins accepted (OLLAMA_ORIGINS is configured)',
        });

        const data = await res.json();
        const modelsCount = data.models ? data.models.length : 0;

        results.push({
          step: 'model',
          status: modelsCount > 0 ? 'success' : 'warning',
          message: modelsCount > 0 
            ? `Found ${modelsCount} local model${modelsCount > 1 ? 's' : ''}`
            : 'Ollama is online but no models were found in local storage',
          details: modelsCount > 0 
            ? data.models.map((m: { name: string }) => m.name).join(', ')
            : 'Run "ollama pull qwen2.5:7b" or check your installed GGUF path.',
        });
      } else {
        results.push({
          step: 'port',
          status: 'warning',
          message: `Ollama server responded with status HTTP ${res.status}`,
          details: 'Check if another process is using port 11434.',
        });
      }
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      
      // If localhost failed, try 127.0.0.1
      let ipv4Worked = false;
      if (endpoint.includes('localhost')) {
        try {
          const ipv4Res = await fetch('http://127.0.0.1:11434/api/tags', { method: 'GET' });
          if (ipv4Res.ok) {
            ipv4Worked = true;
          }
        } catch {
          // Both failed
        }
      }

      if (ipv4Worked) {
        results.push({
          step: 'port',
          status: 'success',
          message: 'Ollama is reachable via IPv4 (http://127.0.0.1:11434)',
          details: 'Windows localhost resolved to IPv6. Use http://127.0.0.1:11434 instead.',
        });
        return results;
      }

      const isAbort = errorMsg.includes('abort') || errorMsg.includes('timed out');
      const isFailedFetch = errorMsg.includes('Failed to fetch') || errorMsg.includes('NetworkError');

      if (isAbort) {
        results.push({
          step: 'port',
          status: 'error',
          message: `Connection timed out connecting to ${endpoint}`,
          details: 'Ensure Ollama is running in background: run "ollama serve" in terminal.',
        });
      } else if (isFailedFetch) {
        results.push({
          step: 'port',
          status: 'warning',
          message: `Localhost request blocked by browser security or Ollama CORS`,
          details: 'Ollama needs OLLAMA_ORIGINS="*" to permit browser requests. Also in Chrome/Edge, enable "Insecure content" for this site or use Cloudflare Tunnel.',
        });
        results.push({
          step: 'cors',
          status: 'error',
          message: 'Action Needed: Start Ollama with CORS enabled',
          details: 'Open PowerShell and run: $env:OLLAMA_ORIGINS="*"; $env:HSA_OVERRIDE_GFX_VERSION="8.0.3"; ollama serve',
        });
      } else {
        results.push({
          step: 'port',
          status: 'error',
          message: `Could not connect to Ollama: ${errorMsg}`,
          details: 'Verify that Ollama is installed and active on your Windows PC.',
        });
      }
    }

    return results;
  }

  /**
   * Retrieves installed models from Ollama
   */
  static async fetchLocalModels(endpoint: string = DEFAULT_OLLAMA_ENDPOINT): Promise<OllamaModelTag[]> {
    const res = await fetch(`${endpoint}/api/tags`, { method: 'GET' });
    if (!res.ok) {
      throw new Error(`Failed to fetch models: HTTP ${res.status}`);
    }
    const data = await res.json();
    return data.models || [];
  }

  /**
   * Streams a conversation from local Ollama with live telemetry calculation
   */
  static async streamChat({
    endpoint = DEFAULT_OLLAMA_ENDPOINT,
    modelName,
    messages,
    tuning,
    hardware,
    onChunk,
    onDone,
    onError,
    abortSignal,
  }: {
    endpoint?: string;
    modelName: string;
    messages: { role: string; content: string }[];
    tuning: TuningParameters;
    hardware: HardwareProfile;
    onChunk: (token: string, partialText: string) => void;
    onDone: (fullText: string, telemetry: InferenceTelemetry) => void;
    onError: (error: Error) => void;
    abortSignal?: AbortSignal;
  }): Promise<void> {
    const startTime = performance.now();
    let firstTokenTime: number | null = null;
    let fullResponse = '';

    try {
      const payload = {
        model: modelName,
        messages: messages.map(m => ({ role: m.role, content: m.content })),
        stream: true,
        options: {
          num_gpu: tuning.numGpuLayers,
          num_ctx: tuning.contextWindow,
          num_thread: tuning.cpuThreads,
          temperature: tuning.temperature,
          top_p: tuning.topP,
          repeat_penalty: tuning.repeatPenalty,
        },
      };

      let res: Response;
      try {
        res = await fetch(`${endpoint}/api/chat`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
          signal: abortSignal,
        });
      } catch (fetchErr: unknown) {
        const msg = fetchErr instanceof Error ? fetchErr.message : String(fetchErr);
        if (msg.includes('AbortError') || abortSignal?.aborted) {
          return;
        }
        if (msg.includes('Failed to fetch') || msg.includes('NetworkError')) {
          throw new Error(
            `Cannot reach local Ollama at ${endpoint}. Please ensure: 1) Ollama is running ("ollama serve"), 2) CORS is enabled with "$env:OLLAMA_ORIGINS='*'", and 3) Your browser allows local network access.`
          );
        }
        throw new Error(`Connection error: ${msg}`);
      }

      if (!res.ok) {
        if (res.status === 404) {
          throw new Error(
            `Model "${modelName}" not found in your local Ollama library. Check your installed model tags using "ollama list" or switch the model in the top bar.`
          );
        }
        if (res.status === 500) {
          const errorBody = await res.text().catch(() => '');
          throw new Error(
            `Ollama internal server error (HTTP 500): ${errorBody || 'Out of memory or unsupported GPU instruction. Try reducing num_gpu layers in the profiler.'}`
          );
        }
        throw new Error(`Ollama API error: HTTP ${res.status} ${res.statusText}`);
      }

      const reader = res.body?.getReader();
      if (!reader) {
        throw new Error('Streaming not supported by browser response body');
      }

      const decoder = new TextDecoder('utf-8');
      let buffer = '';

      let finalEvalCount = 0;
      let finalEvalDurationNs = 0;
      let finalPromptEvalCount = 0;
      let finalPromptEvalDurationNs = 0;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (!line.trim()) continue;
          try {
            const parsed = JSON.parse(line);

            if (parsed.message?.content) {
              if (firstTokenTime === null) {
                firstTokenTime = performance.now();
              }
              fullResponse += parsed.message.content;
              onChunk(parsed.message.content, fullResponse);
            }

            if (parsed.done) {
              finalEvalCount = parsed.eval_count || 0;
              finalEvalDurationNs = parsed.eval_duration || 0;
              finalPromptEvalCount = parsed.prompt_eval_count || 0;
              finalPromptEvalDurationNs = parsed.prompt_eval_duration || 0;
            }
          } catch {
            // Partial JSON slice, continue
          }
        }
      }

      const endTime = performance.now();
      const totalElapsedMs = endTime - startTime;
      const ttft = firstTokenTime ? firstTokenTime - startTime : totalElapsedMs;

      // Real Ollama metrics if reported in final payload
      let tps = 0;
      if (finalEvalDurationNs > 0 && finalEvalCount > 0) {
        tps = Number((finalEvalCount / (finalEvalDurationNs / 1e9)).toFixed(1));
      } else if (totalElapsedMs > 0 && fullResponse.length > 0) {
        // Fallback approximation: 1 token ~ 4 chars
        const approxTokens = Math.max(1, Math.round(fullResponse.length / 4));
        tps = Number((approxTokens / ((totalElapsedMs - ttft) / 1000 || 1)).toFixed(1));
      }

      let promptEvalTps = 0;
      if (finalPromptEvalDurationNs > 0 && finalPromptEvalCount > 0) {
        promptEvalTps = Number((finalPromptEvalCount / (finalPromptEvalDurationNs / 1e9)).toFixed(1));
      }

      const breakdown = calculateMemoryBreakdown(
        {
          id: 'custom',
          name: modelName,
          displayName: modelName,
          parameterCountB: 27,
          quantization: 'Q4_K_M',
          bitsPerWeight: 4.5,
          fileSizeGB: 16.8,
          totalLayers: 64,
          hiddenDimension: 5120,
          defaultCtx: 2048,
          recommendedGpuLayersRx580: 16,
          estimatedTpsRx580: { pureCpu: 1.2, hybridBalanced: 5.6, pureGpu: 0 },
          notes: '',
        },
        tuning,
        hardware
      );

      const telemetry: InferenceTelemetry = {
        tokensPerSecond: tps,
        totalTokens: finalEvalCount || Math.round(fullResponse.length / 4),
        evalDurationMs: Math.round(finalEvalDurationNs ? finalEvalDurationNs / 1e6 : totalElapsedMs - ttft),
        promptTokens: finalPromptEvalCount || 24,
        promptEvalDurationMs: Math.round(finalPromptEvalDurationNs / 1e6 || 120),
        promptEvalTokensPerSecond: promptEvalTps || 45,
        timeToFirstTokenMs: Math.round(ttft),
        vramUsedMB: breakdown.totalGpuUsedMB,
        ramUsedMB: breakdown.totalCpuUsedMB,
        gpuOffloadRatioPercent: Math.round(breakdown.gpuOffloadRatio),
      };

      onDone(fullResponse, telemetry);
    } catch (err: unknown) {
      if (err instanceof Error && err.name === 'AbortError') {
        // Generation stopped by user
        return;
      }
      onError(err instanceof Error ? err : new Error(String(err)));
    }
  }

  /**
   * Realistic Simulation Mode: Emits tokens with latency that precisely mirrors
   * the user's hardware configuration (RX 580 8GB + Ryzen 2400G layer calculation).
   * Allows testing without needing Ollama active immediately!
   */
  static async simulateChat({
    model,
    prompt,
    tuning,
    hardware,
    onChunk,
    onDone,
    abortSignal,
  }: {
    model: ModelPreset;
    prompt: string;
    tuning: TuningParameters;
    hardware: HardwareProfile;
    onChunk: (token: string, partialText: string) => void;
    onDone: (fullText: string, telemetry: InferenceTelemetry) => void;
    abortSignal?: AbortSignal;
  }): Promise<void> {
    const perf = estimatePerformance(model, tuning, hardware);
    const breakdown = calculateMemoryBreakdown(model, tuning, hardware);

    // Initial time to first token delay
    await new Promise((resolve) => setTimeout(resolve, perf.timeToFirstTokenMs));
    if (abortSignal?.aborted) return;

    // Generate context-aware response based on prompt
    const responseText = generateSimulatedResponse(prompt, model, tuning, perf);
    const tokens = splitIntoRealisticTokens(responseText);

    const tokenIntervalMs = Math.max(16, Math.round(1000 / perf.tokensPerSecond));
    let accumulated = '';
    const startTime = performance.now();

    for (let i = 0; i < tokens.length; i++) {
      if (abortSignal?.aborted) return;
      accumulated += tokens[i];
      onChunk(tokens[i], accumulated);
      await new Promise((resolve) => setTimeout(resolve, tokenIntervalMs));
    }

    const totalElapsedMs = performance.now() - startTime;

    const telemetry: InferenceTelemetry = {
      tokensPerSecond: perf.tokensPerSecond,
      totalTokens: tokens.length,
      evalDurationMs: Math.round(totalElapsedMs),
      promptTokens: Math.round(prompt.length / 4) + 12,
      promptEvalDurationMs: Math.round(perf.timeToFirstTokenMs * 0.6),
      promptEvalTokensPerSecond: Math.round(perf.tokensPerSecond * 4.2),
      timeToFirstTokenMs: perf.timeToFirstTokenMs,
      vramUsedMB: breakdown.totalGpuUsedMB,
      ramUsedMB: breakdown.totalCpuUsedMB,
      gpuOffloadRatioPercent: Math.round(breakdown.gpuOffloadRatio),
    };

    onDone(accumulated, telemetry);
  }
}

/**
 * Splits text into realistic BPE-like token chunks
 */
function splitIntoRealisticTokens(text: string): string[] {
  const words = text.split(/(\s+|[.,!?:;\-()[\]{}"])/);
  const tokens: string[] = [];
  for (const w of words) {
    if (w.length > 6) {
      tokens.push(w.slice(0, 4));
      tokens.push(w.slice(4));
    } else if (w.length > 0) {
      tokens.push(w);
    }
  }
  return tokens;
}

function generateSimulatedResponse(
  prompt: string,
  model: ModelPreset,
  tuning: TuningParameters,
  perf: { tokensPerSecond: number; bottleneckReason: string }
): string {
  const lower = prompt.toLowerCase();

  if (lower.includes('why') && lower.includes('slow')) {
    return `### Hardware Diagnostic: Why ${model.displayName} is slow

1. **VRAM vs Model Size Bottleneck**:
   - Model size on disk: **${model.fileSizeGB} GB** (${model.quantization})
   - Your GPU VRAM: **8.0 GB** (AMD Radeon RX 580 2048SP)
   - Windows Desktop / DWM reservation: **~1.0 GB**
   - Usable GPU memory: **~7.0 GB**

2. **Layer Split & Memory Bandwidth**:
   - Currently offloaded to GPU: **${tuning.numGpuLayers} of ${model.totalLayers} layers**
   - The remaining **${Math.max(0, model.totalLayers - tuning.numGpuLayers)} layers** run on your AMD Ryzen 5 2400G CPU via DDR4 RAM.
   - RX 580 GDDR5 bandwidth is **224 GB/s**, whereas DDR4 dual-channel RAM is only **~38 GB/s**. Every token generated must wait for the slower DDR4 bus.

3. **Current Generation Speed**:
   - Throughput: **${perf.tokensPerSecond} tokens/second**
   - Bottleneck: ${perf.bottleneckReason}

To reach **18–40 tokens/second**, either shift to **Qwen 2.5 14B Q3_K** or enable **Speculative Decoding** with a 1.5B draft model!`;
  }

  if (lower.includes('code') || lower.includes('function') || lower.includes('python')) {
    return `Here is an optimized high-performance Python routine demonstrating async stream buffering and speculative processing:

\`\`\`python
import asyncio
import time
from typing import AsyncGenerator

class ModelStreamBuffer:
    def __init__(self, target_tps: float = ${perf.tokensPerSecond}):
        self.target_interval = 1.0 / target_tps
        self.last_emission = 0.0

    async def emit_tokens(self, stream: AsyncGenerator[str, None]):
        """Emits tokens while keeping latency uniform and preventing micro-stalls."""
        async for token in stream:
            now = time.perf_counter()
            delta = now - self.last_emission
            if delta < self.target_interval:
                await asyncio.sleep(self.target_interval - delta)
            self.last_emission = time.perf_counter()
            yield token

# Speed configuration for AMD Radeon RX 580 8GB
# Current allocation: ${tuning.numGpuLayers} layers on Polaris GPU, ctx: ${tuning.contextWindow}
\`\`\`

This pattern maintains predictable UI cadence even when PCIe layer transfers introduce micro-stalls.`;
  }

  return `I have processed your query with **${model.displayName}**.

### Optimization Status for AMD Radeon RX 580 (8GB)
- **Active Layers on GPU**: ${tuning.numGpuLayers} / ${model.totalLayers}
- **Context Length**: ${tuning.contextWindow} tokens
- **Measured Throughput**: **${perf.tokensPerSecond} tok/s**
- **Architecture Note**: ${perf.bottleneckReason}

${tuning.draftModel !== 'none' ? 'Speculative decoding is active, pre-drafting tokens to bypass CPU memory bandwidth limitations.' : 'You can gain a 2x-3x speedup by activating the 1.5B speculative draft model in the Speed Tuning panel.'}

What would you like to explore next? We can benchmark prompt evaluation speeds or generate a fine-tuned Modelfile for Ollama.`;
}
