import { ConnectionConfig, Project, ServerHealth, TestSuiteResponse } from '../types';

export interface ExecuteParams {
  project: Project;
  stdin?: string;
  config: ConnectionConfig;
  entryPoint?: string;
}

export interface RawExecuteResponse {
  runId: string;
  success: boolean;
  language: string;
  exitCode: number | null;
  signal?: string | null;
  stdout: string;
  stderr: string;
  durationMs: number;
  timedOut: boolean;
  timestamp: string;
  runner: string;
}

function resolveApiBase(config: ConnectionConfig): { baseUrl: string; headers: Record<string, string> } {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (config.mode === 'remote') {
    let cleanUrl = config.remoteUrl.trim().replace(/\/+$/, '');
    if (config.apiToken.trim()) {
      headers['Authorization'] = `Bearer ${config.apiToken.trim()}`;
    }
    return { baseUrl: cleanUrl, headers };
  }

  // Embedded dev server or same-origin host
  return { baseUrl: '', headers };
}

export async function checkServerHealth(config: ConnectionConfig): Promise<{
  health: ServerHealth;
  latencyMs: number;
}> {
  const { baseUrl, headers } = resolveApiBase(config);
  const healthPath = config.mode === 'remote' ? '/api/v1/health' : '/api/health';
  const url = `${baseUrl}${healthPath}`;

  const start = performance.now();
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 8000);

  try {
    const res = await fetch(url, {
      method: 'GET',
      headers,
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    const latencyMs = Math.round(performance.now() - start);

    if (!res.ok) {
      throw new Error(`Server returned HTTP ${res.status}: ${res.statusText}`);
    }

    const data = await res.json();
    return {
      health: data,
      latencyMs,
    };
  } catch (err: any) {
    clearTimeout(timeoutId);
    if (err.name === 'AbortError') {
      throw new Error('Connection timed out after 8000ms. Verify server address and network connectivity.');
    }
    throw new Error(err.message || 'Failed to reach cloud execution server');
  }
}

export async function executeProjectCode(params: ExecuteParams): Promise<RawExecuteResponse> {
  const { project, stdin = '', config, entryPoint } = params;
  const { baseUrl, headers } = resolveApiBase(config);

  const execPath = config.mode === 'remote' ? '/api/v1/execute' : '/api/execute';
  const url = `${baseUrl}${execPath}`;

  const filesPayload = project.files.map((f) => ({
    path: f.path,
    content: f.content,
  }));

  const payload = {
    language: project.language === 'python' ? 'python' : 'javascript',
    files: filesPayload,
    entryPoint: entryPoint || project.activeFilePath,
    stdin,
    timeoutMs: project.timeoutMs || 10000,
    env: project.env || {},
    args: [],
  };

  const controller = new AbortController();
  // Allow slightly more than client timeout to receive server termination signal
  const clientTimeout = (project.timeoutMs || 10000) + 4000;
  const timeoutId = setTimeout(() => controller.abort(), clientTimeout);

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (!res.ok) {
      const errText = await res.text();
      let parsed = errText;
      try {
        const json = JSON.parse(errText);
        parsed = json.error || json.detail || errText;
      } catch (_) {}
      throw new Error(`Execution failed (${res.status}): ${parsed}`);
    }

    const data = await res.json();
    // Normalize FastAPI response snake_case to camelCase if needed
    return {
      runId: data.runId || data.run_id || crypto.randomUUID(),
      success: !!data.success,
      language: data.language || project.language,
      exitCode: data.exitCode !== undefined ? data.exitCode : (data.exit_code !== undefined ? data.exit_code : null),
      signal: data.signal,
      stdout: data.stdout || '',
      stderr: data.stderr || '',
      durationMs: data.durationMs || data.duration_ms || 0,
      timedOut: !!(data.timedOut || data.timed_out),
      timestamp: data.timestamp || new Date().toISOString(),
      runner: data.runner || (config.mode === 'remote' ? 'remote-vps' : 'host-sandboxed'),
    };
  } catch (err: any) {
    clearTimeout(timeoutId);
    if (err.name === 'AbortError') {
      return {
        runId: crypto.randomUUID(),
        success: false,
        language: project.language,
        exitCode: 124,
        signal: 'SIGKILL',
        stdout: '',
        stderr: `[CLIENT TIMEOUT: Execution request aborted after ${clientTimeout}ms without server response]`,
        durationMs: clientTimeout,
        timedOut: true,
        timestamp: new Date().toISOString(),
        runner: 'client-timeout',
      };
    }
    throw err;
  }
}

export async function runServerTestSuite(config: ConnectionConfig): Promise<TestSuiteResponse> {
  const { baseUrl, headers } = resolveApiBase(config);
  const testPath = config.mode === 'remote' ? '/api/v1/test' : '/api/test-suite';
  const url = `${baseUrl}${testPath}`;

  const res = await fetch(url, {
    method: 'POST',
    headers,
  });

  if (!res.ok) {
    throw new Error(`Test suite request failed with status HTTP ${res.status}`);
  }

  return await res.json();
}
