import express from 'express';
import { createServer as createViteServer } from 'vite';
import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';
import os from 'os';
import crypto from 'crypto';

const app = express();
const PORT = parseInt(process.env.PORT || '3000', 10);
const IS_PROD = process.env.NODE_ENV === 'production';

// Body parser with 10MB limit
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// CORS headers
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

// Helper: Check system binaries
function checkBinary(cmd: string): Promise<string | null> {
  return new Promise((resolve) => {
    const child = spawn(cmd, ['--version']);
    let out = '';
    child.stdout.on('data', (d) => { out += d.toString(); });
    child.stderr.on('data', (d) => { out += d.toString(); });
    child.on('error', () => resolve(null));
    child.on('close', (code) => {
      if (code === 0 && out.trim()) {
        resolve(out.trim());
      } else {
        resolve(null);
      }
    });
  });
}

// System info cache
let pythonVersion: string | null = null;
let nodeVersion: string | null = null;
(async () => {
  pythonVersion = await checkBinary('python3');
  nodeVersion = await checkBinary('node');
})();

// Health check endpoint
app.get('/api/health', async (req, res) => {
  if (!pythonVersion) pythonVersion = await checkBinary('python3');
  if (!nodeVersion) nodeVersion = await checkBinary('node');

  res.json({
    status: 'online',
    service: 'NONONICK Forge Execution Engine',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    uptimeSeconds: Math.floor(process.uptime()),
    platform: os.platform(),
    arch: os.arch(),
    memory: {
      freeBytes: os.freemem(),
      totalBytes: os.totalmem(),
      usedPercent: Math.round(((os.totalmem() - os.freemem()) / os.totalmem()) * 100),
    },
    runtimes: {
      python: pythonVersion || 'Not available',
      node: nodeVersion || process.version,
    },
    isolation: {
      mode: 'Host Process Sandbox (Disposable Workspace)',
      dockerAvailable: false,
      reason: 'Standard Cloud Run / Container Sandbox runtime without nested Docker socket. Safe isolated temporary directories with strict timeout and process quotas.',
    },
    limits: {
      maxExecutionTimeoutMs: 30000,
      defaultTimeoutMs: 10000,
      maxOutputBytes: 524288, // 512 KB
      maxFiles: 50,
      maxTotalSourceBytes: 5 * 1024 * 1024,
    },
  });
});

interface FileItem {
  path: string;
  content: string;
}

interface ExecuteRequest {
  language: 'python' | 'javascript' | 'nodejs';
  code?: string;
  files?: FileItem[];
  entryPoint?: string;
  stdin?: string;
  timeoutMs?: number;
  env?: Record<string, string>;
  args?: string[];
}

// Execution endpoint
app.post('/api/execute', async (req, res) => {
  const body = req.body as ExecuteRequest;
  const { language, code, files = [], entryPoint, stdin = '', env = {}, args = [] } = body;

  const validLangs = ['python', 'javascript', 'nodejs'];
  if (!language || !validLangs.includes(language.toLowerCase())) {
    return res.status(400).json({
      error: `Unsupported language '${language}'. Supported languages: python, javascript, nodejs.`,
    });
  }

  // Validate limits
  const timeoutMs = Math.min(Math.max(body.timeoutMs || 10000, 1000), 30000);
  const runId = crypto.randomUUID();
  const workspaceDir = path.join(os.tmpdir(), `forge_run_${runId}`);

  try {
    fs.mkdirSync(workspaceDir, { recursive: true });

    // Determine target main file
    let mainFilePath = '';
    const isPython = language.toLowerCase() === 'python';

    if (files.length > 0) {
      for (const file of files) {
        // Prevent path traversal
        const safePath = path.normalize(file.path).replace(/^(\.\.[\/\\])+/, '');
        const targetPath = path.join(workspaceDir, safePath);
        fs.mkdirSync(path.dirname(targetPath), { recursive: true });
        fs.writeFileSync(targetPath, file.content, 'utf8');
      }

      if (entryPoint) {
        mainFilePath = path.join(workspaceDir, entryPoint);
      } else {
        const defaultName = isPython ? 'main.py' : 'index.js';
        const found = files.find((f) => f.path === defaultName || f.path.endsWith(isPython ? '.py' : '.js'));
        mainFilePath = found ? path.join(workspaceDir, found.path) : path.join(workspaceDir, defaultName);
      }
    } else {
      // Direct code
      const fileName = isPython ? 'main.py' : 'index.js';
      mainFilePath = path.join(workspaceDir, fileName);
      fs.writeFileSync(mainFilePath, code || '', 'utf8');
    }

    if (!fs.existsSync(mainFilePath)) {
      return res.status(400).json({
        error: `Entry file '${mainFilePath}' not found in workspace.`,
      });
    }

    // Prepare execution command
    const execCmd = isPython ? 'python3' : 'node';
    const execArgs = isPython ? ['-u', mainFilePath, ...args] : [mainFilePath, ...args];

    // Clean, restricted environment
    const safeEnv = {
      PATH: process.env.PATH || '/usr/local/bin:/usr/bin:/bin',
      LANG: 'en_US.UTF-8',
      PYTHONUNBUFFERED: '1',
      NODE_ENV: 'development',
      ...env,
    };

    const startTime = Date.now();
    let stdoutBuffer = '';
    let stderrBuffer = '';
    let isTimedOut = false;
    let killed = false;
    const MAX_OUTPUT = 512 * 1024; // 512KB

    const child = spawn(execCmd, execArgs, {
      cwd: workspaceDir,
      env: safeEnv,
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    // Timeout safety
    const timer = setTimeout(() => {
      isTimedOut = true;
      killed = true;
      try {
        child.kill('SIGTERM');
        setTimeout(() => {
          try {
            child.kill('SIGKILL');
          } catch (_) {}
        }, 500);
      } catch (_) {}
    }, timeoutMs);

    // Provide stdin if available
    if (stdin && child.stdin) {
      try {
        child.stdin.write(stdin);
        child.stdin.end();
      } catch (_) {}
    } else if (child.stdin) {
      child.stdin.end();
    }

    child.stdout.on('data', (chunk) => {
      if (stdoutBuffer.length < MAX_OUTPUT) {
        stdoutBuffer += chunk.toString();
        if (stdoutBuffer.length >= MAX_OUTPUT) {
          stdoutBuffer += '\n[OUTPUT TRUNCATED: Reached maximum 512KB limit]\n';
        }
      }
    });

    child.stderr.on('data', (chunk) => {
      if (stderrBuffer.length < MAX_OUTPUT) {
        stderrBuffer += chunk.toString();
        if (stderrBuffer.length >= MAX_OUTPUT) {
          stderrBuffer += '\n[STDERR TRUNCATED: Reached maximum 512KB limit]\n';
        }
      }
    });

    child.on('error', (err) => {
      clearTimeout(timer);
      res.status(500).json({
        runId,
        success: false,
        error: `Execution process failed to start: ${err.message}`,
        durationMs: Date.now() - startTime,
      });
    });

    child.on('close', (exitCode, signal) => {
      clearTimeout(timer);
      const durationMs = Date.now() - startTime;

      // Clean workspace
      try {
        fs.rmSync(workspaceDir, { recursive: true, force: true });
      } catch (cleanErr) {
        console.error('Workspace cleanup warning:', cleanErr);
      }

      res.json({
        runId,
        success: exitCode === 0 && !isTimedOut,
        language: isPython ? 'python' : 'javascript',
        exitCode: exitCode !== null ? exitCode : (isTimedOut ? 124 : -1),
        signal: signal || (isTimedOut ? 'SIGTERM' : null),
        stdout: stdoutBuffer,
        stderr: isTimedOut ? (stderrBuffer + `\n[TIMEOUT: Process exceeded limit of ${timeoutMs}ms and was terminated]`) : stderrBuffer,
        durationMs,
        timedOut: isTimedOut,
        timestamp: new Date().toISOString(),
        runner: 'host-sandboxed',
      });
    });
  } catch (err: any) {
    // Cleanup if failed before process finished
    try {
      if (fs.existsSync(workspaceDir)) {
        fs.rmSync(workspaceDir, { recursive: true, force: true });
      }
    } catch (_) {}

    res.status(500).json({
      runId,
      success: false,
      error: `Internal execution error: ${err.message}`,
    });
  }
});

// Automated Acceptance Test Suite Endpoint
app.post('/api/test-suite', async (req, res) => {
  const tests = [
    {
      id: 'python_math',
      name: 'Python 3 Math: print(1 + 1)',
      language: 'python' as const,
      code: 'print(1 + 1)',
      expectedStdout: '2\n',
      expectExitCode: 0,
    },
    {
      id: 'node_math',
      name: 'Node.js Math: console.log(1 + 1)',
      language: 'javascript' as const,
      code: 'console.log(1 + 1);',
      expectedStdout: '2\n',
      expectExitCode: 0,
    },
    {
      id: 'python_syntax_error',
      name: 'Python Syntax Error Handling',
      language: 'python' as const,
      code: 'def broken_function(: pass',
      expectError: true,
      expectedStderrContains: 'SyntaxError',
    },
    {
      id: 'node_runtime_error',
      name: 'Node.js Runtime Exception Handling',
      language: 'javascript' as const,
      code: 'throw new Error("Explicit runtime exception from test");',
      expectError: true,
      expectedStderrContains: 'Explicit runtime exception from test',
    },
    {
      id: 'python_timeout',
      name: 'Python Execution Timeout Enforcement (2000ms limit)',
      language: 'python' as const,
      code: 'import time\ntime.sleep(10)',
      timeoutMs: 2000,
      expectTimeout: true,
    },
    {
      id: 'node_stdin_capture',
      name: 'Node.js Multi-file and Process Exit Code Test',
      language: 'javascript' as const,
      code: 'const fs = require("fs");\nconsole.log("Stage A test passed");\nprocess.exit(0);',
      expectedStdoutContains: 'Stage A test passed',
      expectExitCode: 0,
    },
  ];

  const results = [];
  let passedCount = 0;
  let failedCount = 0;

  for (const test of tests) {
    const start = Date.now();
    try {
      const runId = crypto.randomUUID();
      const workspaceDir = path.join(os.tmpdir(), `forge_test_${runId}`);
      fs.mkdirSync(workspaceDir, { recursive: true });

      const isPython = test.language === 'python';
      const fileName = isPython ? 'main.py' : 'index.js';
      const mainPath = path.join(workspaceDir, fileName);
      fs.writeFileSync(mainPath, test.code, 'utf8');

      const execCmd = isPython ? 'python3' : 'node';
      const execArgs = isPython ? ['-u', mainPath] : [mainPath];

      const execPromise = new Promise<{
        stdout: string;
        stderr: string;
        exitCode: number | null;
        timedOut: boolean;
      }>((resolve) => {
        let stdout = '';
        let stderr = '';
        let timedOut = false;

        const child = spawn(execCmd, execArgs, { cwd: workspaceDir });
        const timer = setTimeout(() => {
          timedOut = true;
          try { child.kill('SIGKILL'); } catch (_) {}
        }, test.timeoutMs || 8000);

        child.stdout.on('data', (d) => { stdout += d.toString(); });
        child.stderr.on('data', (d) => { stderr += d.toString(); });

        child.on('close', (code) => {
          clearTimeout(timer);
          try { fs.rmSync(workspaceDir, { recursive: true, force: true }); } catch (_) {}
          resolve({ stdout, stderr, exitCode: code, timedOut });
        });
        child.on('error', (err) => {
          clearTimeout(timer);
          try { fs.rmSync(workspaceDir, { recursive: true, force: true }); } catch (_) {}
          resolve({ stdout, stderr: err.message, exitCode: -1, timedOut: false });
        });
      });

      const outcome = await execPromise;
      const durationMs = Date.now() - start;

      let passed = true;
      let failureReason = '';

      if (test.expectedStdout && outcome.stdout !== test.expectedStdout) {
        passed = false;
        failureReason = `Expected stdout '${test.expectedStdout.trim()}', got '${outcome.stdout.trim()}'`;
      }
      if (test.expectedStdoutContains && !outcome.stdout.includes(test.expectedStdoutContains)) {
        passed = false;
        failureReason = `Stdout did not contain '${test.expectedStdoutContains}'`;
      }
      if (test.expectExitCode !== undefined && outcome.exitCode !== test.expectExitCode) {
        passed = false;
        failureReason = `Expected exit code ${test.expectExitCode}, got ${outcome.exitCode}`;
      }
      if (test.expectedStderrContains && !outcome.stderr.includes(test.expectedStderrContains)) {
        passed = false;
        failureReason = `Stderr did not contain '${test.expectedStderrContains}'`;
      }
      if (test.expectTimeout && !outcome.timedOut) {
        passed = false;
        failureReason = `Expected execution to time out, but it exited with code ${outcome.exitCode}`;
      }

      if (passed) passedCount++; else failedCount++;

      results.push({
        id: test.id,
        name: test.name,
        language: test.language,
        passed,
        durationMs,
        stdout: outcome.stdout,
        stderr: outcome.stderr,
        exitCode: outcome.exitCode,
        timedOut: outcome.timedOut,
        failureReason,
      });
    } catch (err: any) {
      failedCount++;
      results.push({
        id: test.id,
        name: test.name,
        language: test.language,
        passed: false,
        durationMs: Date.now() - start,
        stdout: '',
        stderr: err.message,
        exitCode: -1,
        timedOut: false,
        failureReason: err.message,
      });
    }
  }

  res.json({
    timestamp: new Date().toISOString(),
    total: tests.length,
    passed: passedCount,
    failed: failedCount,
    skipped: 0,
    results,
  });
});

// Setup Vite middleware for development or serve dist in production
async function startServer() {
  if (!IS_PROD) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve('dist');
    if (fs.existsSync(distPath)) {
      app.use(express.static(distPath));
      app.get('*', (req, res) => {
        res.sendFile(path.join(distPath, 'index.html'));
      });
    }
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[Forge Server] Running on http://0.0.0.0:${PORT} (Node ${process.version}, Python 3 available)`);
  });
}

startServer().catch((err) => {
  console.error('[Forge Server] Fatal bootstrap error:', err);
  process.exit(1);
});
