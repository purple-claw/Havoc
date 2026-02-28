# HAVOC Startup Script

$ErrorActionPreference = "Continue"
$root = Split-Path -Parent $MyInvocation.MyCommand.Path

Write-Host ""
Write-Host "  H A V O C" -ForegroundColor Green
Write-Host "  Hypnotic Algorithm Visualization Of Code" -ForegroundColor DarkGray
Write-Host ""

# Resolve npm (.cmd on Windows - not a Win32 exe)
$npmCmd = Get-Command "npm.cmd" -ErrorAction SilentlyContinue
if (-not $npmCmd) { $npmCmd = Get-Command "npm" -ErrorAction SilentlyContinue }
if (-not $npmCmd) {
    Write-Host "  [ERROR] npm not found. Install Node.js first." -ForegroundColor Red
    exit 1
}
$npmPath = $npmCmd.Source

# Kill all processes listening on a port (via netstat - more reliable than Get-NetTCPConnection)
function Free-Port($port) {
    $lines = netstat -ano 2>$null | Where-Object { $_ -match "0\.0\.0\.0:$port\s|127\.0\.0\.1:$port\s|:::$port\s" }
    $killed = @()
    foreach ($line in $lines) {
        $parts = ($line.Trim()) -split '\s+'
        $pid = $parts[-1]
        if ($pid -match '^\d+$' -and $pid -ne '0' -and $pid -notin $killed) {
            Stop-Process -Id ([int]$pid) -Force -ErrorAction SilentlyContinue
            $killed += $pid
        }
    }
    if ($killed.Count -gt 0) {
        # Wait until port is actually free (up to 6 s)
        for ($i = 0; $i -lt 30; $i++) {
            Start-Sleep -Milliseconds 200
            $still = netstat -ano 2>$null | Where-Object { $_ -match "0\.0\.0\.0:$port\s|127\.0\.0\.1:$port\s|:::$port\s" }
            if (-not $still) { break }
        }
        Write-Host "  Freed port $port" -ForegroundColor Yellow
    }
}

Free-Port 8000
Free-Port 3000

# Start backend via uvicorn directly (bypasses havoc.py startup overhead)
Write-Host "  [1/2] Starting backend  (http://localhost:8000)..." -ForegroundColor Cyan
$backend = Start-Process -PassThru -NoNewWindow `
    -FilePath "python" `
    -ArgumentList "-m", "uvicorn", "api.main:app", "--host", "0.0.0.0", "--port", "8000" `
    -WorkingDirectory $root

# Poll health endpoint for up to 20 s
$ready = $false
for ($i = 0; $i -lt 40; $i++) {
    Start-Sleep -Milliseconds 500
    try {
        $r = Invoke-WebRequest -Uri "http://localhost:8000/api/health" -UseBasicParsing -TimeoutSec 2
        if ($r.StatusCode -eq 200) { $ready = $true; break }
    } catch { }
}

if ($ready) {
    Write-Host "  [OK] Backend ready" -ForegroundColor Green
} else {
    Write-Host "  [!!] Backend health check timed out - check for errors above" -ForegroundColor Yellow
}

# Start frontend
Write-Host "  [2/2] Starting frontend (http://localhost:3000)..." -ForegroundColor Cyan
$frontend = Start-Process -PassThru -NoNewWindow `
    -FilePath $npmPath `
    -ArgumentList "run", "dev" `
    -WorkingDirectory (Join-Path $root "phrolva")

Start-Sleep -Seconds 3

Write-Host ""
Write-Host "  OK  Backend   http://localhost:8000  (docs: /api/docs)" -ForegroundColor Green
Write-Host "  OK  Frontend  http://localhost:3000" -ForegroundColor Green
Write-Host ""
Write-Host "  Press Ctrl+C to stop both servers." -ForegroundColor DarkGray
Write-Host ""

try {
    while ($true) {
        if (($null -ne $backend) -and $backend.HasExited -and ($null -ne $frontend) -and $frontend.HasExited) {
            Write-Host "  Both servers stopped." -ForegroundColor Yellow
            break
        }
        Start-Sleep -Seconds 1
    }
} finally {
    Write-Host ""
    Write-Host "  Shutting down..." -ForegroundColor Yellow
    if ($null -ne $backend  -and -not $backend.HasExited)  { Stop-Process -Id $backend.Id  -Force -ErrorAction SilentlyContinue }
    if ($null -ne $frontend -and -not $frontend.HasExited) { Stop-Process -Id $frontend.Id -Force -ErrorAction SilentlyContinue }
    Write-Host "  Stopped." -ForegroundColor Green
}
