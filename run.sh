#!/bin/bash
echo "=== Starting Corporate Ghost MVP ==="

# 1. Setup Python backend
if [ -d ".venv" ]; then
    echo "[x] Virtual environment (.venv) detected."
else
    echo "[-] Virtual environment (.venv) not found. Initializing..."
    python3 -m venv .venv
    .venv/bin/pip install --upgrade pip
    .venv/bin/pip install -r requirements.txt
fi

# 2. Run initial Ingestion
echo "Ingesting Slack, GitHub and Jira seed data..."
.venv/bin/python ingestion/ingest.py

# 3. Start Backend API in background
echo "Launching FastAPI API server at http://localhost:8000..."
.venv/bin/python api/main.py &
API_PID=$!

# 4. Bootstrap Frontend
echo "Bootstrapping Frontend at http://localhost:5173..."
cd frontend
if [ ! -d "node_modules" ]; then
    echo "Installing frontend node packages..."
    npm install
fi

echo "Starting React/Vite development server..."
npm run dev

# Cleanup background process on exit
trap "kill $API_PID" EXIT
