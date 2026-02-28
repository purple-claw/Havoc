# HAVOC Startup Guide

## Quick Start

### On Windows (PowerShell)
```powershell
.\start.ps1
```

### On WSL / Linux / macOS
```bash
./start.sh
chmod +x start.sh  # First time only
./start.sh
```

### On Windows (CMD)
```cmd
start.bat
```

## What the Scripts Do

1. **Kill existing processes** on ports 8000, 3000, 3002 (if any)
2. **Start Backend** (FastAPI on `http://127.0.0.1:8000`)
3. **Wait for backend** to respond to health check
4. **Start Frontend** (Vite dev server on `http://localhost:3002`)
5. **Display status** with URLs and instructions

## URLs

- **Backend API**: http://127.0.0.1:8000
- **Backend Docs**: http://127.0.0.1:8000/api/docs
- **Frontend**: http://localhost:3002

## Troubleshooting

### Port Already in Use
The scripts automatically kill processes on the required ports. If you still get port errors:

```bash
# WSL / Linux / macOS
lsof -i :8000
kill -9 <PID>

# Windows PowerShell
Get-NetTCPConnection -LocalPort 8000 | Select OwningProcess
Stop-Process -Id <PID> -Force
```

### Backend won't start
Check the backend logs:
```bash
tail -50 /tmp/havoc-backend.log    # WSL / Linux
# or check the error output from start.ps1
```

### Frontend can't reach backend
The frontend is configured to proxy API calls through Vite's dev server:
- Dev: Vite proxies `/api` → `http://127.0.0.1:8000`  
- Production: Set `VITE_API_URL` environment variable

### Dependencies missing
```bash
# Backend
pip install -r requirements.txt

# Frontend
cd phrolva
npm install
```

## Manual Start (for debugging)

### Backend
```bash
cd Havoc
python3 -m uvicorn api.main:app --host 127.0.0.1 --port 8000 --reload
```

### Frontend
```bash
cd Havoc/phrolva
npm run dev
```

## Features

✓ Automatic port cleanup  
✓ Health checks  
✓ Error reporting  
✓ graceful shutdown (Ctrl+C)  
✓ API proxy for development  
✓ Cross-platform (Windows, WSL, Linux, macOS)
