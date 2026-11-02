import { Project, ExecutionRun, ConnectionConfig, AppLocale } from '../types';

const DB_NAME = 'nononick_forge_db';
const DB_VERSION = 1;

let dbPromise: Promise<IDBDatabase> | null = null;

function getDb(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;

  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains('projects')) {
        const projectStore = db.createObjectStore('projects', { keyPath: 'id' });
        projectStore.createIndex('updatedAt', 'updatedAt', { unique: false });
      }
      if (!db.objectStoreNames.contains('runs')) {
        const runStore = db.createObjectStore('runs', { keyPath: 'id' });
        runStore.createIndex('timestamp', 'timestamp', { unique: false });
        runStore.createIndex('projectId', 'projectId', { unique: false });
      }
      if (!db.objectStoreNames.contains('settings')) {
        db.createObjectStore('settings', { keyPath: 'key' });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });

  return dbPromise;
}

// Starter projects
const SEED_PROJECTS: Project[] = [
  {
    id: 'proj_python_core',
    name: 'Python 3 Algorithmic Core',
    description: 'Benchmarking quicksort, prime sieve, and mathematical sequences in isolated Python 3.',
    language: 'python',
    activeFilePath: 'main.py',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    env: { DEBUG: '1', WORKSPACE_ENV: 'forge-cloud' },
    timeoutMs: 10000,
    files: [
      {
        id: 'file_py_main',
        path: 'main.py',
        language: 'python',
        content: `# NONONICK Forge — Python 3 Cloud Execution
import time
import sys

def sieve_of_eratosthenes(limit: int):
    primes = []
    is_prime = [True] * (limit + 1)
    for p in range(2, limit + 1):
        if is_prime[p]:
            primes.append(p)
            for i in range(p * p, limit + 1, p):
                is_prime[i] = False
    return primes

def quicksort(arr):
    if len(arr) <= 1:
        return arr
    pivot = arr[len(arr) // 2]
    left = [x for x in arr if x < pivot]
    middle = [x for x in arr if x == pivot]
    right = [x for x in arr if x > pivot]
    return quicksort(left) + middle + quicksort(right)

print(f"=== NONONICK Forge Python Runtime ===")
print(f"Python: {sys.version.split()[0]} on {sys.platform}")

start = time.perf_counter()
primes = sieve_of_eratosthenes(100)
elapsed = (time.perf_counter() - start) * 1000

print(f"Found {len(primes)} primes up to 100 in {elapsed:.2f}ms")
print(f"Sample primes: {primes[:10]}")

test_array = [64, 34, 25, 12, 22, 11, 90, 5, 88, 42]
sorted_arr = quicksort(test_array)
print(f"Original: {test_array}")
print(f"Sorted:   {sorted_arr}")

# Basic mathematical proof
print(f"Math check 1 + 1 = {1 + 1}")
`,
      },
      {
        id: 'file_py_utils',
        path: 'utils.py',
        language: 'python',
        content: `def format_bytes(bytes_count: int) -> str:
    for unit in ['B', 'KB', 'MB', 'GB']:
        if bytes_count < 1024:
            return f"{bytes_count:.1f} {unit}"
        bytes_count /= 1024
    return f"{bytes_count:.1f} TB"
`,
      },
    ],
  },
  {
    id: 'proj_nodejs_cloud',
    name: 'Node.js Cloud Engine',
    description: 'Cryptographic hashing, JSON transformations, and event-loop timings in Node.js 22.',
    language: 'javascript',
    activeFilePath: 'index.js',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    env: { NODE_ENV: 'production' },
    timeoutMs: 10000,
    files: [
      {
        id: 'file_node_index',
        path: 'index.js',
        language: 'javascript',
        content: `// NONONICK Forge — Node.js Execution Engine
const crypto = require('crypto');

console.log('=== NONONICK Forge Node Runtime ===');
console.log('Node.js version:', process.version);
console.log('Platform:', process.platform, process.arch);

// SHA-256 Benchmark
const payload = 'NONONICK-FORGE-SECURE-WORKSPACE-' + Date.now();
const hash = crypto.createHash('sha256').update(payload).digest('hex');

console.log('\\nGenerated SHA-256 token:');
console.log(hash);

// Math verification test
console.log('\\nMath check 1 + 1 =', 1 + 1);

// JSON processing
const dataset = [
  { id: 1, name: 'Task Alpha', priority: 'high', status: 'ready' },
  { id: 2, name: 'Task Beta', priority: 'low', status: 'pending' },
  { id: 3, name: 'Task Gamma', priority: 'medium', status: 'active' }
];

const highPriority = dataset.filter(d => d.priority === 'high');
console.log('\\nFiltered high priority count:', highPriority.length);
console.log('Process uptime (s):', process.uptime().toFixed(3));
`,
      },
      {
        id: 'file_node_pkg',
        path: 'package.json',
        language: 'json',
        content: `{
  "name": "forge-node-cloud",
  "version": "1.0.0",
  "main": "index.js",
  "scripts": {
    "start": "node index.js"
  }
}
`,
      },
    ],
  },
  {
    id: 'proj_web_pwa',
    name: 'Web Application Playground',
    description: 'HTML5, CSS3, and JavaScript interactive canvas playground with live preview.',
    language: 'javascript',
    activeFilePath: 'index.html',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    env: {},
    timeoutMs: 10000,
    files: [
      {
        id: 'file_web_html',
        path: 'index.html',
        language: 'html',
        content: `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Forge Web Preview</title>
  <link rel="stylesheet" href="style.css">
</head>
<body>
  <div class="card">
    <div class="badge">LIVE PREVIEW</div>
    <h1>NONONICK Forge</h1>
    <p>Mobile-first development environment live rendering.</p>
    <div class="counter-box">
      <button id="decBtn">-</button>
      <span id="counter">0</span>
      <button id="incBtn">+</button>
    </div>
    <div id="log">Status: Interactive container active</div>
  </div>
  <script src="app.js"></script>
</body>
</html>
`,
      },
      {
        id: 'file_web_css',
        path: 'style.css',
        language: 'css',
        content: `body {
  margin: 0;
  padding: 24px;
  background: #0a0c10;
  color: #f1f5f9;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  box-sizing: border-box;
}
.card {
  background: #131722;
  border: 1px solid #222736;
  border-radius: 16px;
  padding: 28px;
  max-width: 360px;
  width: 100%;
  text-align: center;
  box-shadow: 0 10px 30px rgba(0,0,0,0.5);
}
.badge {
  display: inline-block;
  font-size: 11px;
  font-weight: 700;
  color: #38bdf8;
  letter-spacing: 0.05em;
  margin-bottom: 12px;
}
h1 {
  margin: 0 0 8px 0;
  font-size: 22px;
  color: #ffffff;
}
p {
  color: #94a3b8;
  font-size: 13px;
  margin-bottom: 24px;
}
.counter-box {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 16px;
  margin-bottom: 20px;
}
button {
  background: #1e2538;
  border: 1px solid #323b54;
  color: #ffffff;
  width: 44px;
  height: 44px;
  border-radius: 10px;
  font-size: 20px;
  cursor: pointer;
  transition: all 0.15s ease;
}
button:active {
  transform: scale(0.95);
  background: #3b82f6;
}
#counter {
  font-size: 32px;
  font-weight: 700;
  min-width: 48px;
  font-family: monospace;
}
#log {
  font-size: 12px;
  color: #06b6d4;
  margin-top: 12px;
}
`,
      },
      {
        id: 'file_web_js',
        path: 'app.js',
        language: 'javascript',
        content: `let count = 0;
const counterEl = document.getElementById('counter');
const logEl = document.getElementById('log');

document.getElementById('incBtn').addEventListener('click', () => {
  count++;
  counterEl.textContent = count;
  logEl.textContent = 'Incremented: count is ' + count;
});

document.getElementById('decBtn').addEventListener('click', () => {
  count--;
  counterEl.textContent = count;
  logEl.textContent = 'Decremented: count is ' + count;
});
`,
      },
    ],
  },
];

export async function getAllProjects(): Promise<Project[]> {
  const db = await getDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('projects', 'readonly');
    const store = tx.objectStore('projects');
    const request = store.getAll();

    request.onsuccess = async () => {
      let list = request.result as Project[];
      if (!list || list.length === 0) {
        // Seed default projects
        for (const proj of SEED_PROJECTS) {
          await saveProject(proj);
        }
        list = SEED_PROJECTS;
      }
      // Sort by updatedAt descending
      list.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
      resolve(list);
    };
    request.onerror = () => reject(request.error);
  });
}

export async function getProjectById(id: string): Promise<Project | null> {
  const db = await getDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('projects', 'readonly');
    const store = tx.objectStore('projects');
    const request = store.get(id);

    request.onsuccess = () => resolve(request.result || null);
    request.onerror = () => reject(request.error);
  });
}

export async function saveProject(project: Project): Promise<void> {
  const db = await getDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('projects', 'readwrite');
    const store = tx.objectStore('projects');
    const updated = {
      ...project,
      updatedAt: new Date().toISOString(),
    };
    const request = store.put(updated);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

export async function deleteProject(id: string): Promise<void> {
  const db = await getDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('projects', 'readwrite');
    const store = tx.objectStore('projects');
    const request = store.delete(id);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

export async function saveRun(run: ExecutionRun): Promise<void> {
  const db = await getDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('runs', 'readwrite');
    const store = tx.objectStore('runs');
    const request = store.put(run);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

export async function getRuns(limit = 30): Promise<ExecutionRun[]> {
  const db = await getDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('runs', 'readonly');
    const store = tx.objectStore('runs');
    const request = store.getAll();

    request.onsuccess = () => {
      const list = (request.result as ExecutionRun[]) || [];
      list.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      resolve(list.slice(0, limit));
    };
    request.onerror = () => reject(request.error);
  });
}

export async function clearAllRuns(): Promise<void> {
  const db = await getDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('runs', 'readwrite');
    const store = tx.objectStore('runs');
    const request = store.clear();
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

export async function getSetting<T>(key: string, defaultValue: T): Promise<T> {
  const db = await getDb();
  return new Promise((resolve) => {
    const tx = db.transaction('settings', 'readonly');
    const store = tx.objectStore('settings');
    const request = store.get(key);
    request.onsuccess = () => {
      if (request.result && request.result.value !== undefined) {
        resolve(request.result.value as T);
      } else {
        resolve(defaultValue);
      }
    };
    request.onerror = () => resolve(defaultValue);
  });
}

export async function setSetting<T>(key: string, value: T): Promise<void> {
  const db = await getDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('settings', 'readwrite');
    const store = tx.objectStore('settings');
    const request = store.put({ key, value });
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}
