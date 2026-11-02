/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Project,
  ProjectFile,
  ActiveTab,
  AppLocale,
  ConnectionConfig,
  ExecutionRun,
  ServerHealth,
  SupportedLanguage,
  TestSuiteResponse,
} from './types';
import {
  getAllProjects,
  saveProject,
  deleteProject,
  saveRun,
  getRuns,
  clearAllRuns,
  getSetting,
  setSetting,
} from './services/db';
import {
  checkServerHealth,
  executeProjectCode,
  runServerTestSuite,
} from './services/api';
import { isRtl } from './services/i18n';
import { TopBar } from './components/TopBar';
import { BottomTabBar } from './components/BottomTabBar';
import { EditorView } from './components/EditorView';
import { FileExplorerView } from './components/FileExplorerView';
import { TerminalView } from './components/TerminalView';
import { LivePreviewView } from './components/LivePreviewView';
import { ProjectsView } from './components/ProjectsView';
import { SettingsView } from './components/SettingsView';
import { PWAInstallModal } from './components/PWAInstallModal';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

export default function App() {
  // Locale State
  const [locale, setLocale] = useState<AppLocale>('en');

  // Active Tab
  const [activeTab, setActiveTab] = useState<ActiveTab>('editor');

  // Projects State
  const [projects, setProjects] = useState<Project[]>([]);
  const [activeProject, setActiveProject] = useState<Project | null>(null);
  const [activeFile, setActiveFile] = useState<ProjectFile | null>(null);

  // Execution State
  const [isRunning, setIsRunning] = useState(false);
  const [lastRun, setLastRun] = useState<ExecutionRun | null>(null);
  const [runs, setRuns] = useState<ExecutionRun[]>([]);

  // Server Connection
  const [connection, setConnection] = useState<ConnectionConfig>({
    mode: 'embedded',
    remoteUrl: '',
    apiToken: '',
    isConnected: false,
    latencyMs: null,
    lastChecked: null,
  });
  const [serverHealth, setServerHealth] = useState<ServerHealth | null>(null);
  const [isTestingConnection, setIsTestingConnection] = useState(false);

  // PWA & Network State
  const [isOnline, setIsOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true);
  const [isStandalone, setIsStandalone] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showInstallModal, setShowInstallModal] = useState(false);

  // Initialize DB and state
  useEffect(() => {
    // 1. Detect PWA Standalone & iOS
    const standaloneCheck =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true;
    setIsStandalone(standaloneCheck);

    const ua = window.navigator.userAgent.toLowerCase();
    setIsIOS(/iphone|ipad|ipod/.test(ua));

    // 2. Online / Offline listeners
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // 3. BeforeInstallPrompt
    const handleBIP = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };
    window.addEventListener('beforeinstallprompt', handleBIP);

    // 4. Load persisted data
    (async () => {
      const savedLocale = await getSetting<AppLocale>('locale', 'en');
      setLocale(savedLocale);
      document.documentElement.dir = isRtl(savedLocale) ? 'rtl' : 'ltr';
      document.documentElement.lang = savedLocale;

      const savedConn = await getSetting<ConnectionConfig>('connection', {
        mode: 'embedded',
        remoteUrl: '',
        apiToken: '',
        isConnected: false,
        latencyMs: null,
        lastChecked: null,
      });

      const loadedProjects = await getAllProjects();
      setProjects(loadedProjects);

      if (loadedProjects.length > 0) {
        const lastProjId = await getSetting<string>('lastProjectId', loadedProjects[0].id);
        const current = loadedProjects.find((p) => p.id === lastProjId) || loadedProjects[0];
        setActiveProject(current);

        const currentFile = current.files.find((f) => f.path === current.activeFilePath) || current.files[0];
        setActiveFile(currentFile || null);
      }

      const loadedRuns = await getRuns(20);
      setRuns(loadedRuns);
      if (loadedRuns.length > 0) {
        setLastRun(loadedRuns[0]);
      }

      // Check server health on launch
      try {
        const res = await checkServerHealth(savedConn);
        setServerHealth(res.health);
        setConnection({
          ...savedConn,
          isConnected: true,
          latencyMs: res.latencyMs,
          lastChecked: new Date().toISOString(),
        });
      } catch (_) {
        setConnection({
          ...savedConn,
          isConnected: false,
          latencyMs: null,
        });
      }
    })();

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('beforeinstallprompt', handleBIP);
    };
  }, []);

  // Sync direction on locale change
  const handleToggleLocale = async () => {
    const nextLocale: AppLocale = locale === 'en' ? 'fa' : 'en';
    setLocale(nextLocale);
    await setSetting('locale', nextLocale);
    document.documentElement.dir = isRtl(nextLocale) ? 'rtl' : 'ltr';
    document.documentElement.lang = nextLocale;
  };

  // Test Server Connection
  const handleTestConnection = async () => {
    setIsTestingConnection(true);
    try {
      const res = await checkServerHealth(connection);
      setServerHealth(res.health);
      const updatedConn: ConnectionConfig = {
        ...connection,
        isConnected: true,
        latencyMs: res.latencyMs,
        lastChecked: new Date().toISOString(),
      };
      setConnection(updatedConn);
      await setSetting('connection', updatedConn);
    } catch (err: any) {
      const updatedConn: ConnectionConfig = {
        ...connection,
        isConnected: false,
        latencyMs: null,
        lastChecked: new Date().toISOString(),
      };
      setConnection(updatedConn);
      await setSetting('connection', updatedConn);
      alert(`Server check failed: ${err.message}`);
    } finally {
      setIsTestingConnection(false);
    }
  };

  // Switch Active Project
  const handleSelectProject = async (p: Project) => {
    setActiveProject(p);
    await setSetting('lastProjectId', p.id);
    const targetFile = p.files.find((f) => f.path === p.activeFilePath) || p.files[0];
    setActiveFile(targetFile || null);
  };

  // Switch Active File
  const handleSelectFile = async (filePath: string) => {
    if (!activeProject) return;
    const file = activeProject.files.find((f) => f.path === filePath);
    if (file) {
      setActiveFile(file);
      const updated = { ...activeProject, activeFilePath: filePath };
      setActiveProject(updated);
      await saveProject(updated);
    }
  };

  // Update File Content in Memory
  const handleUpdateFileContent = (fileId: string, newContent: string) => {
    if (!activeProject) return;
    const updatedFiles = activeProject.files.map((f) =>
      f.id === fileId ? { ...f, content: newContent, isModified: true } : f
    );
    const updatedProject = { ...activeProject, files: updatedFiles };
    setActiveProject(updatedProject);
    const currentFile = updatedFiles.find((f) => f.id === fileId);
    if (currentFile) setActiveFile(currentFile);
  };

  // Persist File
  const handleSaveFile = async (fileId: string) => {
    if (!activeProject) return;
    const updatedFiles = activeProject.files.map((f) =>
      f.id === fileId ? { ...f, isModified: false } : f
    );
    const updatedProject = { ...activeProject, files: updatedFiles };
    setActiveProject(updatedProject);
    await saveProject(updatedProject);
    const currentFile = updatedFiles.find((f) => f.id === fileId);
    if (currentFile) setActiveFile(currentFile);

    // Update list
    setProjects((prev) => prev.map((p) => (p.id === updatedProject.id ? updatedProject : p)));
  };

  // Create File
  const handleCreateFile = async (filePath: string) => {
    if (!activeProject) return;
    if (activeProject.files.some((f) => f.path === filePath)) {
      alert(`A file with path '${filePath}' already exists.`);
      return;
    }

    let lang = 'text';
    if (filePath.endsWith('.py')) lang = 'python';
    else if (filePath.endsWith('.js')) lang = 'javascript';
    else if (filePath.endsWith('.json')) lang = 'json';
    else if (filePath.endsWith('.html')) lang = 'html';
    else if (filePath.endsWith('.css')) lang = 'css';

    const newFile: ProjectFile = {
      id: `file_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      path: filePath,
      content: '',
      language: lang,
    };

    const updatedFiles = [...activeProject.files, newFile];
    const updatedProj = { ...activeProject, files: updatedFiles, activeFilePath: filePath };
    setActiveProject(updatedProj);
    setActiveFile(newFile);
    await saveProject(updatedProj);
    setProjects((prev) => prev.map((p) => (p.id === updatedProj.id ? updatedProj : p)));
    setActiveTab('editor');
  };

  // Rename File
  const handleRenameFile = async (oldPath: string, newPath: string) => {
    if (!activeProject) return;
    if (activeProject.files.some((f) => f.path === newPath && f.path !== oldPath)) {
      alert(`A file named '${newPath}' already exists.`);
      return;
    }
    const updatedFiles = activeProject.files.map((f) =>
      f.path === oldPath ? { ...f, path: newPath } : f
    );
    const newActivePath = activeProject.activeFilePath === oldPath ? newPath : activeProject.activeFilePath;
    const updatedProj = { ...activeProject, files: updatedFiles, activeFilePath: newActivePath };
    setActiveProject(updatedProj);
    await saveProject(updatedProj);
    const curr = updatedFiles.find((f) => f.path === newActivePath);
    if (curr) setActiveFile(curr);
    setProjects((prev) => prev.map((p) => (p.id === updatedProj.id ? updatedProj : p)));
  };

  // Delete File
  const handleDeleteFile = async (fileId: string) => {
    if (!activeProject || activeProject.files.length <= 1) return;
    const updatedFiles = activeProject.files.filter((f) => f.id !== fileId);
    const nextActive = updatedFiles[0];
    const updatedProj = {
      ...activeProject,
      files: updatedFiles,
      activeFilePath: nextActive.path,
    };
    setActiveProject(updatedProj);
    setActiveFile(nextActive);
    await saveProject(updatedProj);
    setProjects((prev) => prev.map((p) => (p.id === updatedProj.id ? updatedProj : p)));
  };

  // Run Active Code in Cloud Sandbox
  const handleRunCode = async () => {
    if (!activeProject || isRunning) return;

    // Save modified files first
    const cleanFiles = activeProject.files.map((f) => ({ ...f, isModified: false }));
    const savedProj = { ...activeProject, files: cleanFiles };
    setActiveProject(savedProj);
    await saveProject(savedProj);

    setIsRunning(true);
    setActiveTab('terminal');

    try {
      const rawRes = await executeProjectCode({
        project: savedProj,
        config: connection,
        entryPoint: savedProj.activeFilePath,
      });

      const newRun: ExecutionRun = {
        id: rawRes.runId,
        projectId: savedProj.id,
        projectName: savedProj.name,
        timestamp: rawRes.timestamp,
        language: rawRes.language,
        success: rawRes.success,
        exitCode: rawRes.exitCode,
        signal: rawRes.signal,
        stdout: rawRes.stdout,
        stderr: rawRes.stderr,
        durationMs: rawRes.durationMs,
        timedOut: rawRes.timedOut,
        runner: rawRes.runner,
      };

      setLastRun(newRun);
      setRuns((prev) => [newRun, ...prev.slice(0, 29)]);
      await saveRun(newRun);
    } catch (err: any) {
      const errorRun: ExecutionRun = {
        id: crypto.randomUUID(),
        projectId: savedProj.id,
        projectName: savedProj.name,
        timestamp: new Date().toISOString(),
        language: savedProj.language,
        success: false,
        exitCode: -1,
        stdout: '',
        stderr: `Execution Request Failed: ${err.message}`,
        durationMs: 0,
        timedOut: false,
        runner: 'client-error',
      };
      setLastRun(errorRun);
      setRuns((prev) => [errorRun, ...prev.slice(0, 29)]);
      await saveRun(errorRun);
    } finally {
      setIsRunning(false);
    }
  };

  // Stop Run
  const handleStopRun = () => {
    setIsRunning(false);
  };

  // Create Project
  const handleCreateProject = async (
    name: string,
    description: string,
    language: SupportedLanguage,
    template = 'blank'
  ) => {
    let files: ProjectFile[] = [];
    let mainPath = language === 'python' ? 'main.py' : 'index.js';

    if (template === 'python_algo') {
      files = [
        {
          id: `f_${Date.now()}_1`,
          path: 'main.py',
          language: 'python',
          content: `# Python 3 Algorithmic Core
import sys

def binary_search(arr, target):
    low, high = 0, len(arr) - 1
    while low <= high:
        mid = (low + high) // 2
        if arr[mid] == target:
            return mid
        elif arr[mid] < target:
            low = mid + 1
        else:
            high = mid - 1
    return -1

items = [2, 4, 6, 8, 10, 12, 14, 16]
target = 10
idx = binary_search(items, target)
print(f"Target {target} located at index {idx}")
print("Verification 1 + 1 =", 1 + 1)
`,
        },
      ];
    } else if (template === 'node_cloud') {
      files = [
        {
          id: `f_${Date.now()}_1`,
          path: 'index.js',
          language: 'javascript',
          content: `// Node.js Cloud Core
const crypto = require('crypto');
console.log('Node version:', process.version);
const uuid = crypto.randomUUID();
console.log('Generated UUID:', uuid);
console.log('Math check 1 + 1 =', 1 + 1);
`,
        },
      ];
    } else if (template === 'web_app') {
      mainPath = 'index.html';
      files = [
        {
          id: `f_${Date.now()}_1`,
          path: 'index.html',
          language: 'html',
          content: `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>App</title>
  <style>
    body { background: #0b0e14; color: #fff; font-family: sans-serif; padding: 20px; text-align: center; }
    h1 { color: #38bdf8; }
  </style>
</head>
<body>
  <h1>NONONICK Forge</h1>
  <p>Live interactive preview</p>
  <button onclick="alert('Clicked!')">Test Button</button>
</body>
</html>`,
        },
      ];
    } else {
      files = [
        {
          id: `f_${Date.now()}_1`,
          path: mainPath,
          language: language === 'python' ? 'python' : 'javascript',
          content: language === 'python' ? 'print("Hello from NONONICK Forge!")\nprint(1 + 1)\n' : 'console.log("Hello from NONONICK Forge!");\nconsole.log(1 + 1);\n',
        },
      ];
    }

    const newProj: Project = {
      id: `proj_${Date.now()}`,
      name,
      description,
      language,
      files,
      activeFilePath: mainPath,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      env: {},
      timeoutMs: 10000,
    };

    await saveProject(newProj);
    setProjects((prev) => [newProj, ...prev]);
    setActiveProject(newProj);
    setActiveFile(files[0]);
    setActiveTab('editor');
  };

  // Clone Project
  const handleCloneProject = async (p: Project) => {
    const cloned: Project = {
      ...p,
      id: `proj_clone_${Date.now()}`,
      name: `${p.name} (Copy)`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      files: p.files.map((f) => ({
        ...f,
        id: `f_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      })),
    };
    await saveProject(cloned);
    setProjects((prev) => [cloned, ...prev]);
    setActiveProject(cloned);
    setActiveFile(cloned.files[0] || null);
  };

  // Delete Project
  const handleDeleteProject = async (projectId: string) => {
    if (projects.length <= 1) return;
    await deleteProject(projectId);
    const remaining = projects.filter((p) => p.id !== projectId);
    setProjects(remaining);
    if (activeProject?.id === projectId) {
      setActiveProject(remaining[0]);
      setActiveFile(remaining[0].files[0] || null);
    }
  };

  // Import Project
  const handleImportProject = async (imported: Project) => {
    await saveProject(imported);
    setProjects((prev) => [imported, ...prev]);
    setActiveProject(imported);
    setActiveFile(imported.files[0] || null);
    setActiveTab('editor');
  };

  // Native Install Trigger
  const handleTriggerNativeInstall = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setIsStandalone(true);
      setDeferredPrompt(null);
    }
  };

  return (
    <div className="flex flex-col h-screen w-screen bg-[#08090d] text-slate-100 overflow-hidden select-none">
      {/* Top Header Bar */}
      <TopBar
        activeProject={activeProject}
        projects={projects}
        onSelectProject={handleSelectProject}
        connection={connection}
        locale={locale}
        onToggleLocale={handleToggleLocale}
        onOpenInstall={() => setShowInstallModal(true)}
        isInstallable={!!deferredPrompt}
        isIOS={isIOS}
        isStandalone={isStandalone}
        isOnline={isOnline}
      />

      {/* Main View Area */}
      <main className="flex-1 flex flex-col min-h-0 overflow-hidden relative">
        {activeTab === 'editor' && activeProject && (
          <EditorView
            project={activeProject}
            activeFile={activeFile}
            onUpdateFileContent={handleUpdateFileContent}
            onSaveFile={handleSaveFile}
            onRunCode={handleRunCode}
            onStopRun={handleStopRun}
            isRunning={isRunning}
            locale={locale}
            onSelectFile={handleSelectFile}
          />
        )}

        {activeTab === 'files' && activeProject && (
          <FileExplorerView
            project={activeProject}
            activeFile={activeFile}
            onSelectFile={(path) => {
              handleSelectFile(path);
              setActiveTab('editor');
            }}
            onCreateFile={handleCreateFile}
            onRenameFile={handleRenameFile}
            onDeleteFile={handleDeleteFile}
            locale={locale}
          />
        )}

        {activeTab === 'terminal' && (
          <TerminalView
            lastRun={lastRun}
            isRunning={isRunning}
            onClearOutput={() => setLastRun(null)}
            onRerun={handleRunCode}
            locale={locale}
          />
        )}

        {activeTab === 'preview' && activeProject && (
          <LivePreviewView project={activeProject} locale={locale} />
        )}

        {activeTab === 'projects' && (
          <ProjectsView
            projects={projects}
            activeProjectId={activeProject?.id || ''}
            onSelectProject={(p) => {
              handleSelectProject(p);
              setActiveTab('editor');
            }}
            onCreateProject={handleCreateProject}
            onCloneProject={handleCloneProject}
            onDeleteProject={handleDeleteProject}
            onImportProject={handleImportProject}
            locale={locale}
          />
        )}

        {activeTab === 'settings' && (
          <SettingsView
            connection={connection}
            onUpdateConnection={async (c) => {
              setConnection(c);
              await setSetting('connection', c);
            }}
            onTestConnection={handleTestConnection}
            isTestingConnection={isTestingConnection}
            serverHealth={serverHealth}
            activeProject={activeProject}
            onUpdateProjectTimeout={async (timeoutMs) => {
              if (!activeProject) return;
              const updated = { ...activeProject, timeoutMs };
              setActiveProject(updated);
              await saveProject(updated);
            }}
            onUpdateProjectEnv={async (env) => {
              if (!activeProject) return;
              const updated = { ...activeProject, env };
              setActiveProject(updated);
              await saveProject(updated);
            }}
            onRunTestSuite={() => runServerTestSuite(connection)}
            runs={runs}
            onClearHistory={async () => {
              await clearAllRuns();
              setRuns([]);
              setLastRun(null);
            }}
            locale={locale}
          />
        )}
      </main>

      {/* Bottom Thumb Navigation Bar */}
      <BottomTabBar
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        locale={locale}
        hasUnsavedChanges={activeProject?.files.some((f) => f.isModified)}
        hasTerminalOutput={!!lastRun}
      />

      {/* iOS & Chromium PWA Install Guide Modal */}
      <PWAInstallModal
        isOpen={showInstallModal}
        onClose={() => setShowInstallModal(false)}
        isIOS={isIOS}
        onTriggerNativeInstall={handleTriggerNativeInstall}
        locale={locale}
      />
    </div>
  );
}
