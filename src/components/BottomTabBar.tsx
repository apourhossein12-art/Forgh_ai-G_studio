import React from 'react';
import { ActiveTab, AppLocale } from '../types';
import { translations } from '../services/i18n';
import { Code, FolderTree, Terminal, Play, Layers, Settings } from 'lucide-react';

interface BottomTabBarProps {
  activeTab: ActiveTab;
  onSelectTab: (tab: ActiveTab) => void;
  locale: AppLocale;
  hasUnsavedChanges?: boolean;
  hasTerminalOutput?: boolean;
}

export const BottomTabBar: React.FC<BottomTabBarProps> = ({
  activeTab,
  onSelectTab,
  locale,
  hasUnsavedChanges,
  hasTerminalOutput,
}) => {
  const t = translations[locale];

  const tabs: { id: ActiveTab; label: string; icon: React.ReactNode; badge?: boolean }[] = [
    {
      id: 'editor',
      label: t.tabs.editor,
      icon: <Code className="w-5 h-5" />,
      badge: hasUnsavedChanges,
    },
    {
      id: 'files',
      label: t.tabs.files,
      icon: <FolderTree className="w-5 h-5" />,
    },
    {
      id: 'terminal',
      label: t.tabs.terminal,
      icon: <Terminal className="w-5 h-5" />,
      badge: hasTerminalOutput,
    },
    {
      id: 'preview',
      label: t.tabs.preview,
      icon: <Play className="w-5 h-5" />,
    },
    {
      id: 'projects',
      label: t.tabs.projects,
      icon: <Layers className="w-5 h-5" />,
    },
    {
      id: 'settings',
      label: t.tabs.settings,
      icon: <Settings className="w-5 h-5" />,
    },
  ];

  return (
    <nav className="h-16 bg-[#0a0c12]/95 backdrop-blur-md border-t border-[#1a202c] px-1 sm:px-3 flex items-center justify-around shrink-0 z-30 pb-safe select-none">
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            onClick={() => onSelectTab(tab.id)}
            className={`flex-1 min-h-[44px] flex flex-col items-center justify-center relative py-1 rounded-lg transition-colors ${
              isActive
                ? 'text-sky-400 font-bold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <div className="relative">
              {tab.icon}
              {tab.badge && (
                <span className="absolute -top-1 -right-1.5 w-2 h-2 rounded-full bg-sky-500 ring-2 ring-[#0a0c12]" />
              )}
            </div>
            <span className="text-[10px] sm:text-[11px] mt-0.5 tracking-tight truncate max-w-[56px] text-center">
              {tab.label}
            </span>
            {isActive && (
              <span className="absolute bottom-0 w-6 h-0.5 bg-sky-500 rounded-full" />
            )}
          </button>
        );
      })}
    </nav>
  );
};
