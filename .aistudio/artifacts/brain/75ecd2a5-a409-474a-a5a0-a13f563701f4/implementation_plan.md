# Ollama HyperTune Studio: Local LLM Speed Optimizer & Chat Client

An interactive local LLM chat interface, hardware profiler, and speed tuner engineered to maximize inference throughput on local workstations—specifically configured for running large models like Qwen 27B on an AMD Radeon RX 580 (8 GB VRAM) and AMD Ryzen 5 2400G (20 GB RAM).

### User Review & Critical Decisions

> [!IMPORTANT]
> The root cause of slow inference with `Qwen3.8-27B-Uncensored-GGUF:Q4_K_M` is that the 4-bit quant is ~16.8 GB, while your AMD Radeon RX 580 has 8 GB of VRAM (~6.8 GB usable after Windows DWM). Because the model cannot fit in 8 GB VRAM, it either spills into CPU system RAM (DDR4 ~38 GB/s bandwidth vs GPU GDDR5 ~224 GB/s bandwidth, causing a 6x–8x slowdown) or Ollama falls back entirely to CPU AVX2 if Polaris ROCm is unconfigured.

- **Confirmed Hardware Profile**: AMD Ryzen 5 PRO 2400G (4 cores / 8 threads), 20.0 GB RAM, AMD Radeon RX 580 2048SP (8 GB VRAM), Windows 64-bit.
- **Confirmed App Interface**: Interactive chat client featuring real-time speed tuner, token/sec telemetry, and hardware memory profiler.
- **Confirmed Connection Mode**: Direct browser connection to `http://localhost:11434` with built-in CORS configuration helper, health prober, and zero-setup simulation fallback.
- **Recommended Speed Optimizations**:
  1. *Layer Budgeting (`num_gpu`)*: Pinning exactly 14–18 layers into the 8GB GPU VRAM without thrashing PCIe, keeping remaining layers in RAM.
  2. *Context Window Right-Sizing (`num_ctx`)*: Dropping default context from 4096+ to 1536–2048 to reclaim 1.8 GB to 3 GB of VRAM from the KV cache.
  3. *Quantization Downshift (`Q2_K` / `IQ2_M`)*: Downsizing 27B to ~9.5 GB so ~65% fits directly into GPU memory.
  4. *Speculative Decoding Architecture*: Running a fast 1.5B draft model in VRAM alongside the 27B target model to boost generation speeds 2x–3x.
  5. *Polaris ROCm / Vulkan Override*: Providing the exact Windows commands (`HSA_OVERRIDE_GFX_VERSION=8.0.3` and Vulkan runner) so Ollama utilizes the 2048 stream processors rather than idling on CPU.

---

### 1. Overview & Core Concept

**Ollama HyperTune Studio** gives developers and enthusiasts the tools to connect to, benchmark, tune, and chat with local LLMs running via Ollama. It bridges the gap between raw hardware constraints and model requirements, turning slow, sluggish 1 token/sec generation into an optimized, hardware-accelerated experience.

- **Target Persona**: Users running local open-weights LLMs on mid-tier or budget hardware (such as 8GB VRAM AMD/NVIDIA GPUs) who need to squeeze maximum tokens/second out of models like Qwen 27B, 14B, and 7B.
- **Key Value**:
  - Live local streaming chat with real-time latency breakdown (Tokens/sec, Time to First Token, Prompt Eval speed, Memory footprint).
  - Interactive VRAM & System RAM budget calculator dynamically tailored to the user's exact 8GB RX 580 and 20GB system RAM.
  - 1-click Modelfile and CLI command generator to export optimized configurations directly into Ollama.
  - Built-in diagnostic doctor that checks local Ollama health, tests CORS availability, and guides the user through Windows environment flags.

---

### 2. User Experience & Visual Design

#### Key User Flows
1. **Connect & Diagnostics**: User opens the app. The connection status bar immediately tests `http://localhost:11434/api/tags`. If connected, it lists installed models (including `Qwen3.8-27B-Uncensored-GGUF:Q4_K_M`). If CORS or connection is blocked, a clear 1-click troubleshooter explains how to run `set OLLAMA_ORIGINS=*` or launch the integrated test mode.
2. **Interactive Speed Tuning**: User opens the "Speed Optimizer & Hardware Profiler" drawer. They can slide GPU Layers (`num_gpu`), Context Window (`num_ctx`), Thread Count (`num_thread`), and see the visual memory breakdown bar (VRAM allocated vs RAM allocated vs KV cache).
3. **Prompt & Streaming Generation**: User enters a prompt in the chat. As tokens stream in, a live telemetry strip displays real generation speed (e.g. `18.4 tok/s`), prompt evaluation speed (`74.2 tok/s`), and Time to First Token (`380ms`).
4. **Quantization & Model Architecture Advisor**: User clicks "Model Advisor" to view comparative benchmarks for their RX 580 8GB: comparing 27B Q4 vs 27B Q2 vs 14B Q3 vs 7B Q4, with speculative draft model recommendations.
5. **Export & Modelfile Generator**: User clicks "Export Modelfile" to copy a tuned `Modelfile` with pre-configured parameters to run `ollama create qwen27b-fast -f Modelfile`.

#### Visual Identity & Theme
- **Aesthetic Direction**: High-precision developer console and hardware telemetry interface. Clean, utilitarian, and distraction-free.
- **Color Palette**:
  - Neutral canvas: Deep slate `#0B0F19` with structural surfaces `#111827` and hairline borders `#1F2937`.
  - Accent: High-contrast emerald `#10B981` for active speeds, nominal memory, and primary execution, with amber `#F59E0B` for VRAM overflow warnings and cyan `#06B6D4` for GPU telemetry.
- **Typography**:
  - Headings & Navigation: `Plus Jakarta Sans` or `Outfit` with crisp weight hierarchy.
  - Data, Timestamps & Metrics: `JetBrains Mono` with tabular numerals (`tabular-nums`) to ensure figures align without jitter.
- **Top Bar Contract**:
  - Zone 1 (Brand): Single clean wordmark: `HyperTune Studio`.
  - Zone 2 (Nav Links): `Chat & Benchmarks` · `VRAM Profiler` · `Model Advisor` · `Modelfile Generator` · `Connection Doctor`.
  - Zone 3 (Action): Active model selector dropdown + `Test Connection` button.

---

### 3. Key Product Decisions & Trade-Offs

- **Decision 1: Direct Browser-to-Ollama Client with Simulation Fallback**
  - *Chosen Approach*: The web client connects directly to `http://localhost:11434` via `fetch` streaming. If the user hasn't started Ollama or CORS is blocking, the app provides a full interactive simulation mode loaded with realistic Qwen-27B generation data and streaming metrics so every control is 100% testable immediately.
  - *Why*: Privacy and speed. Local LLMs should keep inference data on the user's machine without routing private prompts to external cloud servers unless requested.
  - *Alternatives Considered*: Server proxy bridge only—while it bypasses CORS, direct local connection is lower latency and zero-cloud dependency.

- **Decision 2: Hardware-Specific Calibration (RX 580 8GB + Ryzen 2400G)**
  - *Chosen Approach*: Pre-configure the calculator with exact hardware specs (8192 MB VRAM, 20480 MB System RAM, 4 CPU Cores, 2048 stream processors) while permitting custom overrides.
  - *Why*: Generic VRAM calculators confuse users with abstract math. Grounding it in their specific GPU and CPU gives actionable layer counts (e.g. `num_gpu 16`).

- **Decision 3: Speculative Decoding & Modelfile Generation**
  - *Chosen Approach*: Provide ready-to-use Modelfile snippets and CLI flags tailored to Ollama and llama.cpp/KoboldCpp, including draft model syntax and ROCm/Vulkan environment overrides.
  - *Why*: 27B models on 8GB VRAM cannot run at 30+ tokens/s without either speculative decoding or aggressive quant/layer pruning. Providing the exact code empowers the user immediately.

---

### 4. Technical Architecture & Data Strategy

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           HyperTune Studio Web UI                           │
├──────────────────┬────────────────────────────┬─────────────────────────────┤
│  Top Navigation  │ Active Model: Qwen 27B     │ Status: Connected / Sim     │
├──────────────────┴────────────────────────────┴─────────────────────────────┤
│                                                                             │
│  ┌──────────────────────────────┐  ┌──────────────────────────────────────┐ │
│  │     Interactive Chat View    │  │   Hardware VRAM & Layer Allocator    │ │
│  │                              │  │                                      │ │
│  │ • Message history            │  │ • 8GB VRAM Allocation (Layers 0..16) │ │
│  │ • Live streaming text        │  │ • 20GB RAM Allocation (Layers 17..60)│ │
│  │ • Telemetry Strip:           │  │ • Context Window: 2048 tokens        │ │
│  │   [ 18.2 tok/s | 340ms TTFT] │  │ • KV Cache: 1.2 GB (FP16 / Q8_0)     │ │
│  │ • Stop / Regenerate / Copy   │  │ • Estimated Speed: 4.8x baseline     │ │
│  └──────────────────────────────┘  └──────────────────────────────────────┘ │
│                                                                             │
│  ┌──────────────────────────────┐  ┌──────────────────────────────────────┐ │
│  │  Quantization & Draft Guide  │  │     Modelfile & Command Generator    │ │
│  │                              │  │                                      │ │
│  │ • 27B Q4 vs Q2 vs 14B vs 7B  │  │ • 1-click copyable Modelfile         │ │
│  │ • Speculative 1.5B Draft     │  │ • Windows PowerShell / CMD commands  │ │
│  │ • ROCm / Vulkan GPU Fix      │  │ • OLLAMA_ORIGINS / GFX803 overrides  │ │
│  └──────────────────────────────┘  └──────────────────────────────────────┘ │
│                                                                             │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │ HTTP POST /api/chat (stream: true)
                                       ▼
                     ┌──────────────────────────────────┐
                     │ Local Ollama (http://localhost:  │
                     │ 11434) / llama.cpp / KoboldCpp   │
                     └──────────────────────────────────┘
```

#### State & Component Mapping
- `useOllamaClient`: Manages connection state, ping checks, model listing (`/api/tags`), streaming chat requests (`/api/chat`), and calculates live performance telemetry (`eval_count / (eval_duration / 1e9)`).
- `HardwareBudgetCalculator`: Computes model weight sizes, KV cache footprints, and GPU vs CPU memory distribution based on model parameter count (27B, 14B, 7B, 3B, 1.5B) and quant levels (Q2_K, Q3_K_S, Q4_K_M, Q5_K_M, Q8_0).
- `ChatWorkspace`: Interactive chat interface with system prompt injection, markdown rendering, code block highlighting, streaming response tokens, and real-time latency indicators.
- `SpeedTuningPanel`: Real-time controls for `num_gpu` (GPU layer offload), `num_ctx` (context length), `num_thread` (CPU thread utilization), `temperature`, `repeat_penalty`, and speculative decoding parameters.
- `CommandGenerator`: Generates exact copy-pasteable terminal commands for Windows PowerShell / Command Prompt (e.g. `set HSA_OVERRIDE_GFX_VERSION=8.0.3 && ollama serve`).
- `ConnectionDoctorModal`: Provides step-by-step resolution for Ollama CORS (`OLLAMA_ORIGINS="*"`) and firewall configuration on Windows.

---

### 5. Implementation Sequence
1. Update `metadata.json` and `index.html` to establish app name and styling assets.
2. Build core calculation engine (`src/utils/hardwareMath.ts`) for VRAM, layer splitting, and KV cache sizing.
3. Build the Ollama client service (`src/services/ollamaService.ts`) with streaming SSE/NDJSON parsing and telemetry math.
4. Build the user interface components:
   - Header with connection indicator, model selector, and tab navigation.
   - Live Chat & Telemetry view.
   - Hardware VRAM & Layer Allocator visualizer.
   - Model Comparison & Quantization Advisor.
   - Modelfile & Windows Command Generator.
   - Connection Doctor modal with test probe.
5. Compile and test the application build with `compile_applet`.
