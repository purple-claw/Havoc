#!/bin/bash

# HAVOC — Start both backend and frontend servers
# Usage: ./start.sh

set -e

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$PROJECT_ROOT"

# Ensure frontend dependencies are correct for this environment
echo ""
echo "[0/2] Checking frontend dependencies..."
cd "$PROJECT_ROOT/phrolva"

# If node_modules exists but was installed on a different OS, rebuild
if [ -d "node_modules" ]; then
  # Check if Rollup native binding exists for this system
  if [ ! -f "node_modules/@rollup/rollup-linux-x64/rollup.linux-x64.node" ] 2>/dev/null && \
     [ ! -f "node_modules/@rollup/rollup-darwin-x64/rollup.darwin-x64.node" ] 2>/dev/null && \
     [ ! -f "node_modules/@rollup/rollup-win32-x64-msvc/rollup.win32-x64-msvc.node" ] 2>/dev/null; then
    echo "  ⚠ Frontend dependencies are for a different OS, rebuilding..."
    rm -rf node_modules package-lock.json
    npm install --loglevel=error > /dev/null 2>&1 || {
      echo "  ✗ Failed to install frontend dependencies"
      exit 1
    }
    echo "  ✓ Frontend dependencies rebuilt"
  fi
else
  echo "  Installing frontend dependencies..."
  npm install --loglevel=error > /dev/null 2>&1 || {
    echo "  ✗ Failed to install frontend dependencies"
    exit 1
  }
  echo "  ✓ Frontend dependencies installed"
fi

cd "$PROJECT_ROOT"
echo ""
echo "  HAVOC — Starting Backend & Frontend"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Kill any processes using required ports
echo "Checking for processes on ports 8000, 3000, 3002..."
for port in 8000 3000 3002; do
  if command -v lsof &> /dev/null; then
    pid=$(lsof -ti:$port 2>/dev/null || true)
    if [ -n "$pid" ]; then
      kill -9 $pid 2>/dev/null || true
      echo "  ✓ Freed port $port"
    fi
  fi
done
echo ""

# Cleanup function to kill both processes on exit
cleanup() {
  echo ""
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "  Shutting down..."
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  kill $BACKEND_PID 2>/dev/null || true
  kill $FRONTEND_PID 2>/dev/null || true
  wait $BACKEND_PID 2>/dev/null || true
  wait $FRONTEND_PID 2>/dev/null || true
  echo "  ✓ Servers stopped"
}

trap cleanup EXIT INT TERM

# Start backend
echo "[1/2] Starting Backend (FastAPI on http://127.0.0.1:8000)..."
BACKEND_LOG="${TMPDIR:-/tmp}/havoc-backend.log"
python3 -m uvicorn api.main:app --host 127.0.0.1 --port 8000 --reload > "$BACKEND_LOG" 2>&1 &
BACKEND_PID=$!
echo "  ✓ Backend started (PID: $BACKEND_PID)"

# Wait for backend to be ready
echo "  Waiting for backend to respond..."
for i in {1..20}; do
  if curl -s http://127.0.0.1:8000/api/health > /dev/null 2>&1; then
    echo "  ✓ Backend is responding"
    break
  fi
  if [ $i -eq 20 ]; then
    echo "  ✗ Backend health check failed after 10 seconds"
    echo "  📔 Last 20 lines of log:"
    tail -20 "$BACKEND_LOG" 2>/dev/null || echo "  (Could not read log)"
    kill $BACKEND_PID 2>/dev/null || true
    exit 1
  fi
  sleep 0.5
done

# Start frontend
echo ""
echo "[2/2] Starting Frontend (Vite on http://localhost:3002)..."
cd "$PROJECT_ROOT/phrolva"
FRONTEND_LOG="${TMPDIR:-/tmp}/havoc-frontend.log"
npm run dev > "$FRONTEND_LOG" 2>&1 &
FRONTEND_PID=$!
echo "  ✓ Frontend started (PID: $FRONTEND_PID)"

# Give frontend time to start
sleep 3
if ! kill -0 $FRONTEND_PID 2>/dev/null; then
  echo "  ✗ Frontend process exited immediately"
  echo "  📔 Last 20 lines of log:"
  tail -20 "$FRONTEND_LOG" 2>/dev/null || echo "  (Could not read log)"
  kill $BACKEND_PID 2>/dev/null || true
  exit 1
fi
echo "  ✓ Frontend is running"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  ✓ HAVOC is running!"
echo ""
echo "  Backend:  http://127.0.0.1:8000/api/health"
echo "  Frontend: http://localhost:3002"
echo ""
echo "  Press Ctrl+C to stop both servers"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Wait for both processes
wait
