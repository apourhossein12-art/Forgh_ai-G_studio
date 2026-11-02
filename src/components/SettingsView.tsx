import React, { useState } from 'react';
import { ConnectionConfig, ServerHealth, TestSuiteResponse, Project, AppLocale, ExecutionRun } from '../types';
import { translations } from '../services/i18n';
import {
  Server,
  Cloud,
  ShieldCheck,
  Zap,
  Sliders,
  CheckCircle2,
  XCircle,
  Clock,
  Plus,
  Trash2,
  Activity,
  History,
  Terminal,
} from 'lucide-react';

interface SettingsViewProps {
  connection: ConnectionConfig;
  onUpdateConnection: (config: ConnectionConfig) => void;
  onTestConnection: () => Promise<void>;
  isTestingConnection: boolean;
  serverHealth: ServerHealth | null;
  activeProject: Project | null;
  onUpdateProjectTimeout: (timeoutMs: number) => void;
  onUpdateProjectEnv: (env: Record<string, string>) => void;
  onRunTestSuite: () => Promise<TestSuiteResponse>;
  runs: ExecutionRun[];
  onClearHistory: () => void;
  locale: AppLocale;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  connection,
  onUpdateConnection,
  onTestConnection,
  isTestingConnection,
  serverHealth,
  activeProject,
  onUpdateProjectTimeout,
  onUpdateProjectEnv,
  onRunTestSuite,
  runs,
  onClearHistory,
  locale,
}) => {
  const t = translations[locale];

  const [testSuiteLoading, setTestSuiteLoading] = useState(false);
  const [testSuiteData, setTestSuiteData] = useState<TestSuiteResponse | null>(null);
  const [newEnvKey, setNewEnvKey] = useState('');
  const [newEnvVal, setNewEnvVal] = useState('');
  const [selectedRun, setSelectedRun] = useState<ExecutionRun | null>(null);

  const handleExecuteTests = async () => {
    setTestSuiteLoading(true);
    try {
      const data = await onRunTestSuite();
      setTestSuiteData(data);
    } catch (err: any) {
      alert(`Test suite error: ${err.message}`);
    } finally {
      setTestSuiteLoading(false);
    }
  };

  const handleAddEnv = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeProject || !newEnvKey.trim()) return;
    const cleanKey = newEnvKey.trim().toUpperCase().replace(/[^A-Z0-9_]/g, '_');
    const updated = { ...activeProject.env, [cleanKey]: newEnvVal };
    onUpdateProjectEnv(updated);
    setNewEnvKey('');
    setNewEnvVal('');
  };

  const handleRemoveEnv = (key: string) => {
    if (!activeProject) return;
    const updated = { ...activeProject.env };
    delete updated[key];
    onUpdateProjectEnv(updated);
  };

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-[#0a0c12] p-3 sm:p-5 overflow-y-auto select-none space-y-6">
      {/* 1. Execution Target & Connection Config */}
      <section className="bg-[#121622] border border-[#1e2536] rounded-2xl p-4 sm:p-5 shadow-xl">
        <div className="flex items-center gap-2 mb-4 pb-2 border-b border-[#1c2230]">
          <Server className="w-5 h-5 text-sky-400" />
          <h3 className="text-sm sm:text-base font-bold text-white">{t.settings.serverMode}</h3>
        </div>

        {/* Mode Selector */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
          <button
            type="button"
            onClick={() => onUpdateConnection({ ...connection, mode: 'embedded' })}
            className={`p-3.5 rounded-xl border text-left transition ${
              connection.mode === 'embedded'
                ? 'bg-sky-500/10 border-sky-500/60 shadow-md shadow-sky-500/10'
                : 'bg-[#161b28] border-[#22293a] text-slate-400 hover:text-slate-200'
            }`}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="font-bold text-xs sm:text-sm text-white">Embedded Dev Runner</span>
              <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 font-bold">
                Active
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              Direct host sandbox execution on this container with Python 3 and Node 22. Zero extra setup required.
            </p>
          </button>

          <button
            type="button"
            onClick={() => onUpdateConnection({ ...connection, mode: 'remote' })}
            className={`p-3.5 rounded-xl border text-left transition ${
              connection.mode === 'remote'
                ? 'bg-sky-500/10 border-sky-500/60 shadow-md shadow-sky-500/10'
                : 'bg-[#161b28] border-[#22293a] text-slate-400 hover:text-slate-200'
            }`}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="font-bold text-xs sm:text-sm text-white">External Cloud VPS</span>
              <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-sky-500/20 text-sky-400 font-bold">
                Docker
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              Dedicated Linux VPS with FastAPI & Docker Engine for isolated disposable containers.
            </p>
          </button>
        </div>

        {/* Remote Server Inputs */}
        {connection.mode === 'remote' && (
          <div className="space-y-3 p-3 bg-[#0c0e15] border border-[#202738] rounded-xl mb-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                {t.settings.remoteUrl}
              </label>
              <input
                type="text"
                value={connection.remoteUrl}
                onChange={(e) => onUpdateConnection({ ...connection, remoteUrl: e.target.value })}
                placeholder="https://api.forge.yourdomain.com"
                className="w-full bg-[#141824] border border-[#262f44] rounded-lg px-3 py-1.5 text-xs text-slate-100 font-mono focus:outline-none focus:border-sky-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                {t.settings.apiToken}
              </label>
              <input
                type="password"
                value={connection.apiToken}
                onChange={(e) => onUpdateConnection({ ...connection, apiToken: e.target.value })}
                placeholder="Bearer secret token configured on your VPS"
                className="w-full bg-[#141824] border border-[#262f44] rounded-lg px-3 py-1.5 text-xs text-slate-100 font-mono focus:outline-none focus:border-sky-500"
              />
            </div>
          </div>
        )}

        {/* Connection Action & Status */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-[#1a202c]">
          <div className="flex items-center gap-2">
            <span
              className={`w-2.5 h-2.5 rounded-full ${
                connection.isConnected ? 'bg-emerald-500 ring-2 ring-emerald-500/30' : 'bg-rose-500 ring-2 ring-rose-500/30'
              }`}
            />
            <span className="text-xs font-bold text-slate-200">
              {connection.isConnected ? t.settings.connected : t.settings.disconnected}
            </span>
            {connection.latencyMs !== null && (
              <span className="text-xs font-mono text-slate-400">
                ({connection.latencyMs}ms)
              </span>
            )}
          </div>

          <button
            onClick={onTestConnection}
            disabled={isTestingConnection}
            className="h-8 px-3 rounded-lg bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white text-xs font-bold flex items-center gap-1.5 transition active:scale-95"
          >
            <Activity className="w-3.5 h-3.5" />
            <span>{isTestingConnection ? t.settings.testing : t.settings.testConnection}</span>
          </button>
        </div>

        {/* Health Telemetry Snapshot */}
        {serverHealth && (
          <div className="mt-4 p-3 bg-[#0a0d14] rounded-xl border border-[#1b212f] grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-mono">
            <div>
              <span className="text-slate-500 text-[10px] block">PLATFORM</span>
              <span className="text-slate-200">{serverHealth.platform} ({serverHealth.arch})</span>
            </div>
            <div>
              <span className="text-slate-500 text-[10px] block">NODE.JS</span>
              <span className="text-emerald-400">{serverHealth.runtimes?.node || 'Active'}</span>
            </div>
            <div>
              <span className="text-slate-500 text-[10px] block">PYTHON</span>
              <span className="text-sky-400">{serverHealth.runtimes?.python || 'Active'}</span>
            </div>
            <div>
              <span className="text-slate-500 text-[10px] block">UPTIME</span>
              <span className="text-slate-200">{serverHealth.uptimeSeconds}s</span>
            </div>
          </div>
        )}
      </section>

      {/* 2. Automated Acceptance Test Suite */}
      <section className="bg-[#121622] border border-[#1e2536] rounded-2xl p-4 sm:p-5 shadow-xl">
        <div className="flex items-center justify-between pb-3 border-b border-[#1c2230] mb-4">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-emerald-400" />
            <h3 className="text-sm sm:text-base font-bold text-white">{t.settings.testSuiteTitle}</h3>
          </div>

          <button
            onClick={handleExecuteTests}
            disabled={testSuiteLoading}
            className="h-8 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm shadow-emerald-600/20 transition active:scale-95"
          >
            <Zap className="w-3.5 h-3.5 fill-current" />
            <span>{testSuiteLoading ? t.settings.runningTests : t.settings.runTestSuite}</span>
          </button>
        </div>

        <p className="text-xs text-slate-400 mb-4">
          Directly verifies real Python math, Node.js console log, syntax error capture, runtime exception formatting, execution timeout boundary, and multi-file process exit code.
        </p>

        {testSuiteData && (
          <div className="space-y-2">
            <div className="flex items-center justify-between p-2.5 rounded-xl bg-[#0e121b] border border-[#1d2434] text-xs font-mono mb-3">
              <span className="text-slate-300">
                Summary: {testSuiteData.passed}/{testSuiteData.total} passed
              </span>
              <span
                className={`font-bold ${
                  testSuiteData.failed === 0 ? 'text-emerald-400' : 'text-rose-400'
                }`}
              >
                {testSuiteData.failed === 0 ? t.settings.allPassed : `${testSuiteData.failed} Failed`}
              </span>
            </div>

            {testSuiteData.results.map((r) => (
              <div
                key={r.id}
                className="p-3 rounded-xl bg-[#0d1017] border border-[#1a202c] flex flex-col gap-1 text-xs"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {r.passed ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    ) : (
                      <XCircle className="w-4 h-4 text-rose-400 shrink-0" />
                    )}
                    <span className="font-semibold text-slate-200">{r.name}</span>
                  </div>
                  <div className="flex items-center gap-2 font-mono text-[11px] text-slate-400">
                    <span>{r.durationMs}ms</span>
                    <span
                      className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                        r.passed ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'
                      }`}
                    >
                      {r.passed ? 'PASSED' : 'FAILED'}
                    </span>
                  </div>
                </div>

                {r.failureReason && (
                  <div className="text-[11px] text-rose-400 font-mono mt-1 bg-rose-500/10 p-1.5 rounded">
                    {r.failureReason}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      {/* 3. Project Execution Timeout & Environment Variables */}
      {activeProject && (
        <section className="bg-[#121622] border border-[#1e2536] rounded-2xl p-4 sm:p-5 shadow-xl">
          <div className="flex items-center gap-2 mb-4 pb-2 border-b border-[#1c2230]">
            <Sliders className="w-5 h-5 text-indigo-400" />
            <h3 className="text-sm sm:text-base font-bold text-white">
              {activeProject.name} — Runtime Configuration
            </h3>
          </div>

          {/* Timeout Slider */}
          <div className="mb-5">
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-slate-300">
                {t.settings.timeout}
              </label>
              <span className="text-xs font-mono text-sky-400 font-bold">
                {(activeProject.timeoutMs / 1000).toFixed(0)}s ({activeProject.timeoutMs}ms)
              </span>
            </div>
            <input
              type="range"
              min={1000}
              max={30000}
              step={1000}
              value={activeProject.timeoutMs}
              onChange={(e) => onUpdateProjectTimeout(parseInt(e.target.value, 10))}
              className="w-full accent-sky-500 cursor-pointer"
            />
          </div>

          {/* Environment Variables */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-2">
              {t.settings.envVars}
            </label>

            {/* List existing */}
            <div className="space-y-1.5 mb-3">
              {Object.entries(activeProject.env || {}).map(([k, v]) => (
                <div
                  key={k}
                  className="flex items-center justify-between bg-[#0a0d14] border border-[#1c2232] rounded-lg px-2.5 py-1.5 text-xs font-mono"
                >
                  <span className="text-sky-400 font-bold">{k}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-slate-300 truncate max-w-[150px]">{v}</span>
                    <button
                      onClick={() => handleRemoveEnv(k)}
                      className="text-slate-500 hover:text-rose-400 p-1"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Add new variable */}
            <form onSubmit={handleAddEnv} className="flex items-center gap-2">
              <input
                type="text"
                value={newEnvKey}
                onChange={(e) => setNewEnvKey(e.target.value)}
                placeholder="KEY (e.g. PORT)"
                className="w-1/3 bg-[#090b10] border border-[#262f44] rounded-lg px-2.5 py-1.5 text-xs font-mono text-slate-100 uppercase focus:outline-none focus:border-sky-500"
              />
              <input
                type="text"
                value={newEnvVal}
                onChange={(e) => setNewEnvVal(e.target.value)}
                placeholder="VALUE (e.g. 8080)"
                className="flex-1 bg-[#090b10] border border-[#262f44] rounded-lg px-2.5 py-1.5 text-xs font-mono text-slate-100 focus:outline-none focus:border-sky-500"
              />
              <button
                type="submit"
                className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-lg transition"
              >
                Add
              </button>
            </form>
          </div>
        </section>
      )}

      {/* 4. Execution History Log */}
      <section className="bg-[#121622] border border-[#1e2536] rounded-2xl p-4 sm:p-5 shadow-xl">
        <div className="flex items-center justify-between pb-3 border-b border-[#1c2230] mb-4">
          <div className="flex items-center gap-2">
            <History className="w-5 h-5 text-sky-400" />
            <h3 className="text-sm sm:text-base font-bold text-white">{t.history.title}</h3>
          </div>

          {runs.length > 0 && (
            <button
              onClick={onClearHistory}
              className="text-xs text-slate-400 hover:text-rose-400 flex items-center gap-1 transition"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>{t.history.clearAll}</span>
            </button>
          )}
        </div>

        {runs.length === 0 ? (
          <p className="text-xs text-slate-500 py-4 text-center">{t.history.empty}</p>
        ) : (
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {runs.map((run) => (
              <div
                key={run.id}
                onClick={() => setSelectedRun(run)}
                className="p-2.5 rounded-xl bg-[#0d1017] hover:bg-[#131722] border border-[#1a202c] flex items-center justify-between text-xs cursor-pointer transition"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span
                    className={`w-2 h-2 rounded-full shrink-0 ${
                      run.success ? 'bg-emerald-400' : 'bg-rose-400'
                    }`}
                  />
                  <span className="font-semibold text-slate-200 truncate">{run.projectName}</span>
                  <span className="text-[10px] uppercase font-mono px-1 py-0.2 rounded bg-[#181d2a] text-slate-400">
                    {run.language}
                  </span>
                </div>

                <div className="flex items-center gap-3 font-mono text-[11px] text-slate-400 shrink-0">
                  <span>{run.durationMs}ms</span>
                  <span className="text-slate-500">
                    {new Date(run.timestamp).toLocaleTimeString()}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* History Details Inspector Modal */}
      {selectedRun && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg bg-[#131722] border border-[#232b3d] rounded-2xl p-5 shadow-2xl flex flex-col max-h-[80vh]">
            <div className="flex items-center justify-between pb-3 border-b border-[#1f2638] mb-3">
              <h4 className="text-sm font-bold text-white">Execution Inspector</h4>
              <button onClick={() => setSelectedRun(null)} className="text-slate-400 hover:text-white">
                ✕
              </button>
            </div>

            <div className="flex-1 overflow-y-auto font-mono text-xs space-y-3">
              <div className="grid grid-cols-2 gap-2 text-slate-400 bg-[#090b10] p-2.5 rounded-lg border border-[#1c2232]">
                <div>Run ID: <span className="text-slate-200">{selectedRun.id.substring(0, 8)}</span></div>
                <div>Exit Code: <span className="text-slate-200">{selectedRun.exitCode}</span></div>
                <div>Duration: <span className="text-slate-200">{selectedRun.durationMs}ms</span></div>
                <div>Runner: <span className="text-slate-200">{selectedRun.runner}</span></div>
              </div>

              <div>
                <span className="text-slate-400 text-[11px] block mb-1">STDOUT:</span>
                <pre className="bg-[#090b10] text-slate-200 p-2.5 rounded-lg border border-[#1c2232] overflow-x-auto whitespace-pre-wrap">
                  {selectedRun.stdout || '(None)'}
                </pre>
              </div>

              {selectedRun.stderr && (
                <div>
                  <span className="text-rose-400 text-[11px] block mb-1">STDERR:</span>
                  <pre className="bg-[#090b10] text-rose-400 p-2.5 rounded-lg border border-rose-500/30 overflow-x-auto whitespace-pre-wrap">
                    {selectedRun.stderr}
                  </pre>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
