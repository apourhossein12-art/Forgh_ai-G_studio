export type SupportedLanguage = 'python' | 'javascript' | 'nodejs';

export interface ProjectFile {
  id: string;
  path: string;
  content: string;
  language: string;
  isModified?: boolean;
}

export interface Project {
  id: string;
  name: string;
  description: string;
  language: SupportedLanguage;
  files: ProjectFile[];
  activeFilePath: string;
  createdAt: string;
  updatedAt: string;
  env: Record<string, string>;
  timeoutMs: number;
}

export interface ExecutionRun {
  id: string;
  projectId: string;
  projectName: string;
  timestamp: string;
  language: string;
  success: boolean;
  exitCode: number | null;
  signal?: string | null;
  stdout: string;
  stderr: string;
  durationMs: number;
  timedOut: boolean;
  runner: string;
}

export interface ServerHealth {
  status: string;
  service: string;
  version: string;
  uptimeSeconds: number;
  platform: string;
  arch: string;
  memory?: {
    freeBytes: number;
    totalBytes: number;
    usedPercent: number;
  };
  runtimes?: {
    python: string;
    node: string;
  };
  isolation?: {
    mode: string;
    dockerAvailable: boolean;
    reason?: string;
  };
  limits?: {
    maxExecutionTimeoutMs: number;
    defaultTimeoutMs: number;
    maxOutputBytes: number;
    maxFiles: number;
    maxTotalSourceBytes: number;
  };
}

export interface ConnectionConfig {
  mode: 'embedded' | 'remote';
  remoteUrl: string;
  apiToken: string;
  isConnected: boolean;
  latencyMs: number | null;
  lastChecked: string | null;
}

export interface TestResultItem {
  id: string;
  name: string;
  language: string;
  passed: boolean;
  durationMs: number;
  stdout: string;
  stderr: string;
  exitCode: number | null;
  timedOut: boolean;
  failureReason?: string;
}

export interface TestSuiteResponse {
  timestamp: string;
  total: number;
  passed: number;
  failed: number;
  skipped: number;
  results: TestResultItem[];
}

export type ActiveTab = 'editor' | 'files' | 'terminal' | 'preview' | 'projects' | 'history' | 'settings';
export type AppLocale = 'en' | 'fa';
