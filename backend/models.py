from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from enum import Enum

class LanguageEnum(str, Enum):
    python = "python"
    javascript = "javascript"
    nodejs = "nodejs"

class ProjectFile(BaseModel):
    path: str = Field(..., max_length=255, description="Relative file path inside workspace")
    content: str = Field(..., max_length=1_000_000, description="File source content")

class ExecuteRequest(BaseModel):
    language: LanguageEnum
    code: Optional[str] = Field(None, max_length=1_000_000, description="Direct code string if single-file")
    files: Optional[List[ProjectFile]] = Field(default=[], description="Workspace files")
    entry_point: Optional[str] = Field(None, max_length=255, description="Entry point relative file")
    stdin: Optional[str] = Field(default="", max_length=65_536, description="Standard input string")
    timeout_ms: Optional[int] = Field(default=10_000, ge=1_000, le=30_000, description="Execution timeout in ms")
    env: Optional[Dict[str, str]] = Field(default={}, description="Sanitized environment variables")
    args: Optional[List[str]] = Field(default=[], description="Command line arguments")

class ExecuteResponse(BaseModel):
    run_id: str
    success: bool
    language: str
    exit_code: Optional[int]
    signal: Optional[str] = None
    stdout: str
    stderr: str
    duration_ms: int
    timed_out: bool
    timestamp: str
    runner: str

class HealthResponse(BaseModel):
    status: str
    service: str
    version: str
    uptime_seconds: int
    docker_available: bool
    system: Dict[str, Any]
    limits: Dict[str, Any]
