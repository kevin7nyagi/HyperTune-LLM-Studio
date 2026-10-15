import React from 'react';
import { InferenceTelemetry } from '../types';
import { Zap, Clock, Cpu, HardDrive } from 'lucide-react';

interface TelemetryBadgeProps {
  telemetry: InferenceTelemetry;
  compact?: boolean;
}

export const TelemetryBadge: React.FC<TelemetryBadgeProps> = ({ telemetry, compact = false }) => {
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-400 font-mono tabular-nums py-1.5 px-2 bg-slate-900/80 rounded border border-slate-800">
      <div className="flex items-center gap-1.5 text-emerald-400 font-semibold">
        <Zap className="w-3.5 h-3.5" />
        <span>{telemetry.tokensPerSecond} tok/s</span>
      </div>

      <span className="text-slate-600" aria-hidden="true">·</span>

      <div className="flex items-center gap-1">
        <Clock className="w-3 h-3 text-slate-500" />
        <span>TTFT {telemetry.timeToFirstTokenMs}ms</span>
      </div>

      <span className="text-slate-600" aria-hidden="true">·</span>

      <div className="flex items-center gap-1">
        <span>Eval {telemetry.evalDurationMs}ms</span>
        <span className="text-slate-500">({telemetry.totalTokens} tokens)</span>
      </div>

      {!compact && (
        <>
          <span className="text-slate-600" aria-hidden="true">·</span>
          <div className="flex items-center gap-1">
            <Cpu className="w-3 h-3 text-cyan-400" />
            <span>GPU Offload {telemetry.gpuOffloadRatioPercent}%</span>
          </div>

          <span className="text-slate-600" aria-hidden="true">·</span>
          <div className="flex items-center gap-1">
            <HardDrive className="w-3 h-3 text-purple-400" />
            <span>VRAM {(telemetry.vramUsedMB / 1024).toFixed(1)} GB</span>
          </div>
        </>
      )}
    </div>
  );
};
