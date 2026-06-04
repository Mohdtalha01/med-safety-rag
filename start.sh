#!/usr/bin/env bash
# ============================================================
# MedSafe RAG — One-command local start script
# Usage: bash start.sh
# ============================================================
set -e

ROOT="$(cd "$(dirname "$0")" && pwd)"
BACKEND="$ROOT/backend"
FRONTEND="$ROOT/frontend"

# ── Colours ─────────────────────────────────────────────────
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'
BLUE='\033[0;34m'; CYAN='\033[0;36m'; NC='\033[0m'
info()    { echo -e "${BLUE}[INFO]${NC}  $*"; }
success() { echo -e "${GREEN}[OK]${NC}    $*"; }
warn()    { echo -e "${YELLOW}[WARN]${NC}  $*"; }
error()   { echo -e "${RED}[ERROR]${NC} $*"; exit 1; }

echo -e "${CYAN}"
echo "  ███╗   ███╗███████╗██████╗ ███████╗ █████╗ ███████╗███████╗"
echo "  ████╗ ████║██╔════╝██╔══██╗██╔════╝██╔══██╗██╔════╝██╔════╝"
echo "  ██╔████╔██║█████╗  ██║  ██║███████╗███████║█████╗  █████╗  "
echo "  ██║╚██╔╝██║██╔══╝  ██║  ██║╚════██║██╔══██║██╔══╝  ██╔══╝  "
echo "  ██║ ╚═╝ ██║███████╗██████╔╝███████║██║  ██║██║     ███████╗"
echo "  ╚═╝     ╚═╝╚══════╝╚═════╝ ╚══════╝╚═╝  ╚═╝╚═╝     ╚══════╝"
echo -e "${NC}"
echo -e "  ${CYAN}Medication Safety Alert System — Dual-Source RAG${NC}"
echo ""

# ── 1. Check GROQ_API_KEY ───────────────────────────────────
if [ -f "$ROOT/.env" ]; then
  export $(grep -v '^#' "$ROOT/.env" | xargs) 2>/dev/null || true
fi
if [ -f "$BACKEND/.env" ]; then
  export $(grep -v '^#' "$BACKEND/.env" | xargs) 2>/dev/null || true
fi

if [ -z "$GROQ_API_KEY" ] || [ "$GROQ_API_KEY" = "your_groq_api_key_here" ]; then
  warn "GROQ_API_KEY is not set."
  echo ""
  echo "  Get a FREE key at: https://console.groq.com"
  echo "  Then run one of:"
  echo "    export GROQ_API_KEY=gsk_..."
  echo "    echo 'GROQ_API_KEY=gsk_...' > backend/.env"
  echo ""
  error "Set GROQ_API_KEY and re-run."
fi
success "GROQ_API_KEY found"

# ── 2. Check Python ─────────────────────────────────────────
command -v python3 >/dev/null 2>&1 || error "python3 not found. Install Python 3.11+"
PY_VER=$(python3 -c "import sys; print(f'{sys.version_info.major}.{sys.version_info.minor}')")
info "Python $PY_VER"

# ── 3. Backend setup ────────────────────────────────────────
info "Setting up backend..."
cd "$BACKEND"

if [ ! -d "venv" ]; then
  info "Creating virtual environment..."
  python3 -m venv venv
fi

source venv/bin/activate
info "Installing backend dependencies..."
pip install -q -r requirements.txt

# Ensure history file exists
[ -f data/check_history.json ] || echo "[]" > data/check_history.json

# ── 4. Frontend setup ───────────────────────────────────────
info "Setting up frontend..."
cd "$FRONTEND"
command -v node >/dev/null 2>&1 || error "node not found. Install Node.js 18+"
if [ ! -d "node_modules" ]; then
  info "Installing frontend dependencies..."
  npm install --silent
fi

# ── 5. Start both servers ───────────────────────────────────
echo ""
success "Starting backend on  http://localhost:8000"
success "Starting frontend on http://localhost:3000"
echo ""
echo -e "  ${YELLOW}API Docs:${NC} http://localhost:8000/docs"
echo -e "  ${YELLOW}Press Ctrl+C to stop both servers${NC}"
echo ""

cd "$BACKEND"
source venv/bin/activate
uvicorn main:app --host 0.0.0.0 --port 8000 --reload &
BACKEND_PID=$!

cd "$FRONTEND"
npm run dev -- --port 3000 &
FRONTEND_PID=$!

# ── Cleanup on exit ─────────────────────────────────────────
trap "echo ''; info 'Stopping servers...'; kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; exit 0" INT TERM

wait $BACKEND_PID $FRONTEND_PID
