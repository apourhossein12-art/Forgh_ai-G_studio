import os
import sys
import time
import platform
from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from .models import ExecuteRequest, ExecuteResponse, HealthResponse
from .security import verify_api_key
from .runner import ExecutionRunner

app = FastAPI(
    title="NONONICK Forge Cloud Execution API",
    description="Isolated remote execution runtime for Python and Node.js with strict sandboxing and resource limits",
    version="1.0.0",
)

# CORS configuration
ALLOWED_ORIGINS = os.getenv("ALLOWED_ORIGINS", "*").split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

runner = ExecutionRunner()
START_TIME = time.time()

@app.get("/health", response_model=HealthResponse)
@app.get("/api/v1/health", response_model=HealthResponse)
def health_check():
    return {
        "status": "online",
        "service": "NONONICK Forge Cloud VPS Runner",
        "version": "1.0.0",
        "uptime_seconds": int(time.time() - START_TIME),
        "docker_available": runner.docker_available,
        "system": {
            "platform": platform.platform(),
            "python_version": sys.version.split()[0],
            "architecture": platform.machine(),
        },
        "limits": {
            "max_timeout_ms": 30000,
            "default_timeout_ms": 10000,
            "memory_limit": "256m",
            "cpu_limit": "1.0",
            "pids_limit": 64,
            "network_isolation": True,
        },
    }

@app.post(
    "/api/v1/execute",
    response_model=ExecuteResponse,
    dependencies=[Depends(verify_api_key)],
)
def execute_code(req: ExecuteRequest):
    result = runner.execute(
        language=req.language.value,
        code=req.code,
        files=req.files or [],
        entry_point=req.entry_point,
        stdin=req.stdin or "",
        timeout_ms=req.timeout_ms or 10000,
        env=req.env or {},
        args=req.args or [],
    )
    return result

@app.post("/api/v1/test", dependencies=[Depends(verify_api_key)])
def run_tests():
    """Run server-side acceptance tests"""
    tests = [
        {"name": "Python print(1+1)", "lang": "python", "code": "print(1 + 1)", "expected": "2\n"},
        {"name": "Node console.log(1+1)", "lang": "javascript", "code": "console.log(1 + 1);", "expected": "2\n"},
    ]
    results = []
    for t in tests:
        res = runner.execute(
            language=t["lang"],
            code=t["code"],
            files=[],
            entry_point=None,
            stdin="",
            timeout_ms=5000,
            env={},
            args=[],
        )
        passed = (res["stdout"] == t["expected"] and res["exit_code"] == 0)
        results.append({
            "name": t["name"],
            "passed": passed,
            "stdout": res["stdout"],
            "exit_code": res["exit_code"],
            "duration_ms": res["duration_ms"],
        })
    return {"status": "complete", "results": results}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("backend.main:app", host="0.0.0.0", port=8000, reload=False)
