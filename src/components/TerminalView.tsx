import React, { useState } from 'react';
import { ExecutionRun, AppLocale } from '../types';
import { translations } from '../services/i18n';
import {
  Terminal as TerminalIcon,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Cpu,
  Copy,
  Check,
  Trash2,
  Play,
  CornerDownLeft,
} from 'lucide-react';

interface TerminalViewProps {
  lastRun: ExecutionRun | null;
  isRunning: boolean;
  onClearOutput: () => void;
  onRerun: () => void;
  locale: AppLocale;
}

export const TerminalView: React.FC<TerminalViewProps> = ({
  lastRun,
  isRunning,
  onClearOutput,
  onRerun,
  locale,
}) => {
  const t = translations[locale];
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    if (!lastRun) return;
    const fullText = `--- STDOUT ---\n${lastRun.stdout}\n--- STDERR ---\n${lastRun.stderr}`;
    navigator.clipboard.writeText(fullText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-[#07090e] select-text">
      {/* Terminal Header */}
      <div className="h-11 bg-[#0f121a] border-b border-[#1b212e] px-3 sm:px-4 flex items-center justify-between gap-2 shrink-0 select-none">
        <div className="flex items-center gap-2 min-w-0">
          <TerminalIcon className="w-4 h-4 text-sky-400 shrink-0" />
          <h2 className="text-xs sm:text-sm font-bold text-slate-200 truncate">
            {t.terminal.title}
          </h2>

          {lastRun && (
            <div className="flex items-center gap-1.5 ml-1">
              {lastRun.timedOut ? (
                <span className="flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/15 text-amber-400 border border-amber-500/30">
                  <Clock className="w-3 h-3" /> {t.terminal.timedOut}
                </span>
              ) : lastRun.exitCode === 0 ? (
                <span className="flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                  <CheckCircle2 className="w-3 h-3" /> {t.terminal.exitSuccess}
                </span>
              ) : (
                <span className="flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-rose-500/15 text-rose-400 border border-rose-500/30">
                  <AlertTriangle className="w-3 h-3" /> {t.terminal.exitFailure} {lastRun.exitCode}
                </span>
              )}
            </div>
          )}
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-1.5 shrink-0">
          {lastRun && (
            <>
              <button
                onClick={handleCopy}
                className="h-7 px-2.5 rounded bg-[#161b26] hover:bg-[#1e2536] text-slate-300 text-xs font-semibold flex items-center gap-1 transition"
                title="Copy Terminal Output"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span className="hidden sm:inline">{copied ? t.terminal.copied : t.terminal.copyOutput}</span>
              </button>

              <button
                onClick={onClearOutput}
                className="h-7 px-2.5 rounded bg-[#161b26] hover:bg-[#1e2536] text-slate-300 text-xs font-semibold flex items-center gap-1 transition"
                title="Clear Output"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">{t.terminal.clearOutput}</span>
              </button>
            </>
          )}

          <button
            onClick={onRerun}
            disabled={isRunning}
            className="h-7 px-2.5 rounded bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold flex items-center gap-1 shadow-sm transition disabled:opacity-50"
          >
            <Play className="w-3 h-3 fill-current" />
            <span>{isRunning ? t.editor.running : t.editor.run}</span>
          </button>
        </div>
      </div>

      {/* Execution Telemetry Subheader */}
      {lastRun && (
        <div className="bg-[#0b0e15] border-b border-[#171c26] px-3 sm:px-4 py-1.5 flex flex-wrap items-center gap-3 text-[11px] text-slate-400 font-mono select-none">
          <div className="flex items-center gap-1">
            <Clock className="w-3 h-3 text-slate-500" />
            <span>{lastRun.durationMs}ms</span>
          </div>
          <div className="flex items-center gap-1">
            <Cpu className="w-3 h-3 text-slate-500" />
            <span>{lastRun.runner}</span>
          </div>
          <div className="text-slate-500">
            {new Date(lastRun.timestamp).toLocaleTimeString()}
          </div>
        </div>
      )}

      {/* Terminal Output Display */}
      <div className="flex-1 p-3 sm:p-4 overflow-y-auto font-mono text-xs sm:text-sm leading-relaxed space-y-2">
        {isRunning && (
          <div className="flex items-center gap-2 text-sky-400 animate-pulse pb-2 border-b border-[#1b212e]">
            <span className="w-2 h-2 rounded-full bg-sky-400 animate-ping" />
            <span>Executing workspace inside cloud container sandbox...</span>
          </div>
        )}

        {!lastRun && !isRunning ? (
          <div className="h-full flex flex-col items-center justify-center text-center text-slate-600 p-6 select-none">
            <TerminalIcon className="w-12 h-12 mb-3 stroke-1 text-slate-700" />
            <p className="text-xs sm:text-sm max-w-sm">{t.terminal.emptyPrompt}</p>
          </div>
        ) : (
          <>
            {/* Stdout Stream */}
            {lastRun?.stdout && (
              <div className="whitespace-pre-wrap break-words text-slate-200">
                {lastRun.stdout}
              </div>
            )}

            {/* Stderr Stream */}
            {lastRun?.stderr && (
              <div className="whitespace-pre-wrap break-words text-rose-400 bg-rose-500/10 border-l-2 border-rose-500 p-2.5 rounded-r-md mt-2">
                {lastRun.stderr}
              </div>
            )}

            {/* Empty Output Note */}
            {lastRun && !lastRun.stdout && !lastRun.stderr && (
              <div className="text-slate-500 italic">
                (Process completed without generating standard output or standard error)
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};
