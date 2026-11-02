import os
import re
from fastapi import HTTPException, Security, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pathlib import Path

security = HTTPBearer(auto_error=False)
API_SECRET = os.getenv("FORGE_API_SECRET", "")

def verify_api_key(credentials: HTTPAuthorizationCredentials = Security(security)) -> bool:
    """
    If FORGE_API_SECRET is configured, enforce Bearer token.
    If not configured (open dev/local), permit authenticated requests.
    """
    if not API_SECRET:
        return True
    
    if not credentials or credentials.credentials != API_SECRET:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or missing Authorization Bearer token.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return True

def sanitize_relative_path(path_str: str) -> str:
    """
    Sanitize file path against directory traversal attacks (e.g. ../../etc/passwd)
    """
    # Remove null bytes
    clean = path_str.replace("\0", "").strip()
    
    # Strip leading slashes
    clean = clean.lstrip("/\\")
    
    # Resolve Path and ensure no parent navigation
    p = Path(clean)
    parts = p.parts
    if ".." in parts or "." in parts:
        filtered = [part for part in parts if part not in ("..", ".")]
        clean = str(Path(*filtered))
    
    if not clean:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid or empty target path '{path_str}'"
        )
        
    return clean

def redact_secrets(text: str) -> str:
    """
    Redact potential secrets (API tokens, private keys) from execution logs
    """
    patterns = [
        (r'(Bearer\s+)[A-Za-z0-9_\-\.]{16,}', r'\1[REDACTED_TOKEN]'),
        (r'([A-Za-z0-9_\-]{20,})', r'[REDACTED]'),
        (r'(ghp_[A-Za-z0-9]{36})', r'[REDACTED_GITHUB_TOKEN]'),
        (r'(BEGIN (?:RSA|OPENSSH|EC) PRIVATE KEY[\s\S]+?END (?:RSA|OPENSSH|EC) PRIVATE KEY)', r'[REDACTED_PRIVATE_KEY]'),
    ]
    redacted = text
    for pattern, replacement in patterns:
        redacted = re.sub(pattern, replacement, redacted)
    return redacted
