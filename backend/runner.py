import os
import shutil
import tempfile
import time
import uuid
import subprocess
from pathlib import Path
from typing import Dict, Any, Tuple
from .security import sanitize_relative_path

class ExecutionRunner:
    def __init__(self):
        self.docker_available = self._check_docker()

    def _check_docker(self) -> bool:
        try:
            import docker
            client = docker.from_env()
            client.ping()
            return True
        except Exception:
            # Check CLI docker
            try:
                res = subprocess.run(["docker", "info"], capture_output=True, timeout=2)
                return res.returncode == 0
            except Exception:
                return False

    def execute(
        self,
        language: str,
        code: str | None,
        files: list,
        entry_point: str | None,
        stdin: str,
        timeout_ms: int,
        env: Dict[str, str],
        args: list,
    ) -> Dict[str, Any]:
        run_id = str(uuid.uuid4())
        workspace = Path(tempfile.gettempdir()) / f"forge_vps_{run_id}"
        workspace.mkdir(parents=True, exist_ok=True)

        is_python = language.lower() == "python"
        target_main = ""

        try:
            # Write files
            if files:
                for f in files:
                    clean_rel = sanitize_relative_path(f.path)
                    dest = workspace / clean_rel
                    dest.parent.mkdir(parents=True, exist_ok=True)
                    dest.write_text(f.content, encoding="utf-8")
                
                if entry_point:
                    clean_entry = sanitize_relative_path(entry_point)
                    target_main = str(workspace / clean_entry)
                else:
                    default_file = "main.py" if is_python else "index.js"
                    target_main = str(workspace / default_file)
            else:
                default_file = "main.py" if is_python else "index.js"
                dest = workspace / default_file
                dest.write_text(code or "", encoding="utf-8")
                target_main = str(dest)

            if not os.path.exists(target_main):
                return {
                    "run_id": run_id,
                    "success": False,
                    "language": language,
                    "exit_code": 1,
                    "signal": None,
                    "stdout": "",
                    "stderr": f"Entry file '{target_main}' was not found in workspace.",
                    "duration_ms": 0,
                    "timed_out": False,
                    "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
                    "runner": "error",
                }

            if self.docker_available:
                return self._execute_docker(run_id, workspace, target_main, is_python, stdin, timeout_ms, env, args)
            else:
                return self._execute_host_sandbox(run_id, workspace, target_main, is_python, stdin, timeout_ms, env, args)

        finally:
            # Always cleanly remove workspace
            try:
                shutil.rmtree(workspace, ignore_errors=True)
            except Exception:
                pass

    def _execute_docker(
        self,
        run_id: str,
        workspace: Path,
        target_main: str,
        is_python: bool,
        stdin: str,
        timeout_ms: int,
        env: Dict[str, str],
        args: list,
    ) -> Dict[str, Any]:
        import docker
        client = docker.from_env()

        image_name = "python:3.12-slim" if is_python else "node:22-slim"
        entry_rel = os.path.relpath(target_main, workspace)
        cmd = ["python3", "-u", f"/workspace/{entry_rel}"] if is_python else ["node", f"/workspace/{entry_rel}"]
        cmd.extend(args)

        container = None
        start_time = time.time()
        timed_out = False
        timeout_sec = timeout_ms / 1000.0

        try:
            container = client.containers.run(
                image=image_name,
                command=cmd,
                volumes={str(workspace): {"bind": "/workspace", "mode": "rw"}},
                working_dir="/workspace",
                network_mode="none", # strict isolation
                mem_limit="256m",
                nano_cpus=1_000_000_000, # 1.0 CPU
                pids_limit=64,
                cap_drop=["ALL"],
                user="1000:1000",
                detach=True,
                environment=env,
                stdin_open=bool(stdin),
            )

            if stdin:
                # Write to socket if needed
                pass

            # Wait with timeout
            try:
                result = container.wait(timeout=timeout_sec)
                exit_code = result.get("StatusCode", 0)
            except Exception:
                timed_out = True
                try:
                    container.kill()
                except Exception:
                    pass
                exit_code = 124

            logs = container.logs(stdout=True, stderr=True, stream=False)
            duration_ms = int((time.time() - start_time) * 1000)

            stdout_str = logs.decode("utf-8", errors="replace")
            stderr_str = "[TIMEOUT: Process exceeded limit and was killed]" if timed_out else ""

            return {
                "run_id": run_id,
                "success": exit_code == 0 and not timed_out,
                "language": "python" if is_python else "javascript",
                "exit_code": exit_code,
                "signal": "SIGKILL" if timed_out else None,
                "stdout": stdout_str,
                "stderr": stderr_str,
                "duration_ms": duration_ms,
                "timed_out": timed_out,
                "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
                "runner": "docker-isolated",
            }
        finally:
            if container:
                try:
                    container.remove(force=True)
                except Exception:
                    pass

    def _execute_host_sandbox(
        self,
        run_id: str,
        workspace: Path,
        target_main: str,
        is_python: bool,
        stdin: str,
        timeout_ms: int,
        env: Dict[str, str],
        args: list,
    ) -> Dict[str, Any]:
        exec_cmd = ["python3", "-u", target_main] if is_python else ["node", target_main]
        exec_cmd.extend(args)

        clean_env = {
            "PATH": os.getenv("PATH", "/usr/local/bin:/usr/bin:/bin"),
            "LANG": "en_US.UTF-8",
            "PYTHONUNBUFFERED": "1",
            "NODE_ENV": "development",
            **env,
        }

        start_time = time.time()
        timed_out = False
        timeout_sec = timeout_ms / 1000.0

        try:
            proc = subprocess.Popen(
                exec_cmd,
                cwd=str(workspace),
                env=clean_env,
                stdin=subprocess.PIPE,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                text=True,
            )

            stdout, stderr = proc.communicate(input=stdin if stdin else None, timeout=timeout_sec)
            exit_code = proc.returncode
        except subprocess.TimeoutExpired:
            timed_out = True
            proc.kill()
            stdout, stderr = proc.communicate()
            exit_code = 124
            stderr += f"\n[TIMEOUT: Process exceeded {timeout_ms}ms limit]"
        except Exception as e:
            return {
                "run_id": run_id,
                "success": False,
                "language": "python" if is_python else "javascript",
                "exit_code": -1,
                "signal": None,
                "stdout": "",
                "stderr": f"Process execution error: {str(e)}",
                "duration_ms": int((time.time() - start_time) * 1000),
                "timed_out": False,
                "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
                "runner": "host-sandboxed",
            }

        duration_ms = int((time.time() - start_time) * 1000)
        return {
            "run_id": run_id,
            "success": exit_code == 0 and not timed_out,
            "language": "python" if is_python else "javascript",
            "exit_code": exit_code,
            "signal": "SIGTERM" if timed_out else None,
            "stdout": stdout,
            "stderr": stderr,
            "duration_ms": duration_ms,
            "timed_out": timed_out,
            "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
            "runner": "host-sandboxed",
        }
