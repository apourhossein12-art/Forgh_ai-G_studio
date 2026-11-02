# Security Threat Model & Isolation Architecture

NONONICK Forge is designed around the core principle that **all user-submitted code, dependencies, and project files are untrusted**.

---

## 1. Threat Matrix & Countermeasures

| Threat Vector | Potential Impact | Forge Mitigation Architecture |
| :--- | :--- | :--- |
| **Host System Compromise** | Malicious code modifies host files or installs persistent backdoors | Code runs inside unprivileged, disposable containers with dropped Linux capabilities (`--cap-drop ALL`), no host root access, and disposable tmpfs workspaces. |
| **Denial of Service (CPU/Fork Bomb)** | Uncontrolled thread spawning exhausts CPU and freezes VPS | Strict process quota (`--pids-limit 64`) and CPU reservation cap (`nano_cpus=1_000_000_000` / 1.0 core). |
| **Memory Exhaustion (OOM)** | Memory leaks crash host kernel or adjacent containers | Hard memory limit enforced at container cgroup level (`mem_limit="256m"`). |
| **Infinite Loops & Hangs** | Runaway processes consume execution slots indefinitely | Strict double-timeout enforcement: process killed with SIGTERM followed by SIGKILL at max 30,000ms. |
| **Network Probing / SSRF** | Code attempts to probe private VPC, AWS metadata, or LAN services | Network interface is disconnected by default (`network_mode="none"`). Explicit network policies required for external pulls. |
| **Directory Traversal** | Submitting paths like `../../etc/shadow` to read host files | Strict Path Sanitization: all paths normalized, stripped of parent links (`..`), and restricted to `/tmp/forge_workspace_<id>/`. |
| **Output Flooding** | Infinite stdout streams overwhelm browser memory | Truncation buffer enforced at 512 KB max stdout/stderr. |
| **Unauthorized Execution** | Open endpoint abused by third-party miners | HTTP Bearer token validation required for all execution requests. |

---

## 2. Container Sandboxing Invariants

```
+-------------------------------------------------------+
|  Host OS (Linux Kernel with cgroups v2 & seccomp)     |
|                                                       |
|   +-----------------------------------------------+   |
|   |  FastAPI Orchestrator Container (port 8000)   |   |
|   +-----------------------------------------------+   |
|                          |                            |
|                          v spawns                     |
|   +-----------------------------------------------+   |
|   |  Disposable Worker (python:3.12 / node:22)     |   |
|   |  * --network none                             |   |
|   |  * --memory 256m                              |   |
|   |  * --pids-limit 64                            |   |
|   |  * --cap-drop ALL                             |   |
|   |  * user 1000:1000 (Non-root)                  |   |
|   |  * Read-only rootfs + ephemeral workspace     |   |
|   +-----------------------------------------------+   |
|                          |                            |
|                          v destroyed upon exit        |
+-------------------------------------------------------+
```

---

## 3. Data Privacy & Local Persistence
* All source files and project metadata reside on the user's device in **IndexedDB**.
* Code is transmitted to the execution server only when the user explicitly triggers **Run** or **Test**.
* Workspaces on the execution server are destroyed immediately upon process exit, with no persistent retention of source code.
