import React from 'react';
import { Project, ConnectionConfig, AppLocale } from '../types';
import { translations, isRtl } from '../services/i18n';
import { Server, Wifi, WifiOff, Globe, Download, Sparkles, FolderGit2 } from 'lucide-react';

interface TopBarProps {
  activeProject: Project | null;
  projects: Project[];
  onSelectProject: (p: Project) => void;
  connection: ConnectionConfig;
  locale: AppLocale;
  onToggleLocale: () => void;
  onOpenInstall: () => void;
  isInstallable: boolean;
  isIOS: boolean;
  isStandalone: boolean;
  isOnline: boolean;
}

export const TopBar: React.FC<TopBarProps> = ({
  activeProject,
  projects,
  onSelectProject,
  connection,
  locale,
  onToggleLocale,
  onOpenInstall,
  isInstallable,
  isIOS,
  isStandalone,
  isOnline,
}) => {
  const t = translations[locale];
  const rtl = isRtl(locale);

  return (
    <header className="h-14 bg-[#0d0f15] border-b border-[#1c2230] px-3 sm:px-4 flex items-center justify-between gap-2 shrink-0 z-30 select-none">
      {/* Brand & Project Selector */}
      <div className="flex items-center gap-2 sm:gap-3 min-w-0">
        <div className="flex items-center gap-2 shrink-0">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-sky-500 via-blue-600 to-indigo-600 flex items-center justify-center p-1 shadow-md shadow-blue-500/20">
            <svg viewBox="0 0 24 24" className="w-5 h-5 text-white stroke-current fill-none stroke-2 stroke-linecap-round stroke-linejoin-round">
              <path d="M4 17l6-6-6-6" />
              <path d="M12 19h8" />
            </svg>
          </div>
          <span className="font-extrabold text-sm sm:text-base tracking-wider text-slate-100 whitespace-nowrap">
            {t.brand}
          </span>
        </div>

        {/* Project Switcher Dropdown */}
        {activeProject && (
          <div className="relative flex items-center min-w-0">
            <span className="text-slate-600 mx-1 hidden xs:inline">/</span>
            <select
              value={activeProject.id}
              onChange={(e) => {
                const found = projects.find((p) => p.id === e.target.value);
                if (found) onSelectProject(found);
              }}
              className="bg-[#141824] hover:bg-[#1a2030] text-sky-400 text-xs sm:text-sm font-semibold rounded-md px-2 py-1 border border-[#232b3d] focus:outline-none focus:ring-1 focus:ring-sky-500 truncate max-w-[130px] sm:max-w-[180px] cursor-pointer"
            >
              {projects.map((p) => (
                <option key={p.id} value={p.id} className="bg-[#141824] text-slate-200">
                  {p.name}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
        {/* Offline Warning */}
        {!isOnline && (
          <div className="flex items-center gap-1 bg-amber-500/10 border border-amber-500/30 text-amber-400 text-[10px] font-bold px-2 py-0.5 rounded">
            <WifiOff className="w-3 h-3" />
            <span className="hidden sm:inline">Offline</span>
          </div>
        )}

        {/* Server Connection Status */}
        <div
          title={connection.isConnected ? `Connected (${connection.latencyMs ?? 0}ms)` : 'Server offline'}
          className={`flex items-center gap-1.5 text-[11px] px-2 py-1 rounded-md border ${
            connection.isConnected
              ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
              : 'bg-rose-500/10 border-rose-500/20 text-rose-400'
          }`}
        >
          <span
            className={`w-2 h-2 rounded-full ${
              connection.isConnected ? 'bg-emerald-500' : 'bg-rose-500'
            }`}
          />
          <span className="hidden md:inline font-mono">
            {connection.isConnected ? `${connection.latencyMs ?? 0}ms` : 'Offline'}
          </span>
        </div>

        {/* Language Switch */}
        <button
          onClick={onToggleLocale}
          className="h-8 px-2 rounded-md bg-[#141824] hover:bg-[#1c2234] border border-[#232b3d] text-slate-300 text-xs font-semibold flex items-center gap-1 transition"
          title="Switch Language / تغییر زبان"
        >
          <Globe className="w-3.5 h-3.5 text-sky-400" />
          <span>{locale === 'en' ? 'FA' : 'EN'}</span>
        </button>

        {/* Install PWA Prompt (Chromium or iOS) */}
        {!isStandalone && (isInstallable || isIOS) && (
          <button
            onClick={onOpenInstall}
            className="h-8 px-2.5 rounded-md bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-white text-xs font-semibold flex items-center gap-1.5 shadow-sm shadow-blue-500/20 transition active:scale-95"
          >
            <Download className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{t.pwa.installApp}</span>
          </button>
        )}
      </div>
    </header>
  );
};
