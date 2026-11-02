# Deployment Guide B: Secure Cloud Execution API & Isolated Container Runtime on Linux VPS

This guide explains how to set up the **NONONICK Forge Remote Cloud Execution Backend** on a dedicated Linux VPS (Ubuntu 22.04 LTS / 24.04 LTS, Debian 12, or AlmaLinux 9).

---

## Hardware & OS Requirements
* **RAM**: Minimum 2 GB (4 GB recommended for concurrent workloads)
* **CPU**: 2+ vCPUs
* **Storage**: 20 GB+ SSD
* **OS**: Ubuntu 22.04 or 24.04 LTS
* **Access**: Root or sudo privileges

---

## Step 1: Install Docker Engine and Compose
Run the following on your VPS:

```bash
# Update package lists
sudo apt-get update && sudo apt-get install -y ca-certificates curl gnupg

# Add Docker GPG key
sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
sudo chmod a+r /etc/apt/keyrings/docker.gpg

# Add Docker repository
echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
  $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | \
  sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

# Install Docker packages
sudo apt-get update
sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

# Pre-pull execution images for zero-delay runs
sudo docker pull python:3.12-slim
sudo docker pull node:22-slim
```

---

## Step 2: Clone or Copy the Forge Backend
```bash
mkdir -p /opt/forge
cd /opt/forge

# Copy the backend folder from the repository:
# /opt/forge/backend/
# /opt/forge/backend/docker-compose.yml
# /opt/forge/backend/Dockerfile
# /opt/forge/backend/requirements.txt
```

---

## Step 3: Configure Environment Variables
Create `/opt/forge/.env`:

```bash
# Generate a cryptographically secure random token:
# openssl rand -hex 32
FORGE_API_SECRET=d89e27a69bc4123f81e05a2cd0f47e30761e38a20cb9536130
ALLOWED_ORIGINS=https://forge.yourdomain.com,https://yourcpaneldomain.com
MAX_TIMEOUT_MS=30000
```

---

## Step 4: Launch the API Container
```bash
cd /opt/forge
sudo docker compose -f backend/docker-compose.yml up -d --build
```

Check health:
```bash
curl http://127.0.0.1:8000/api/v1/health
```

---

## Step 5: Configure Reverse Proxy & SSL (Nginx + Let's Encrypt)
Install Nginx and Certbot:
```bash
sudo apt-get install -y nginx certbot python3-certbot-nginx
```

Copy `backend/nginx.conf` to `/etc/nginx/sites-available/forge-api`:
```bash
sudo cp backend/nginx.conf /etc/nginx/sites-available/forge-api
sudo ln -s /etc/nginx/sites-available/forge-api /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

Issue SSL certificate:
```bash
sudo certbot --nginx -d api.forge.yourdomain.com
```

---

## Step 6: Test Authenticated Execution
From any terminal:
```bash
curl -X POST https://api.forge.yourdomain.com/api/v1/execute \
  -H "Authorization: Bearer d89e27a69bc4123f81e05a2cd0f47e30761e38a20cb9536130" \
  -H "Content-Type: application/json" \
  -d '{
    "language": "python",
    "code": "print(1 + 1)"
  }'
```

Expected output:
```json
{
  "run_id": "...",
  "success": true,
  "language": "python",
  "exit_code": 0,
  "stdout": "2\n",
  "stderr": "",
  "duration_ms": 112,
  "timed_out": false,
  "runner": "docker-isolated"
}
```
