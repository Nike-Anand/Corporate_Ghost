Write-Host "=== Starting Corporate Ghost MVP ===" -ForegroundColor Cyan

# 1. Setup Python backend
if (Test-Path ".venv") {
    Write-Host "[x] Virtual environment (.venv) detected." -ForegroundColor Green
} else {
    Write-Host "[-] Virtual environment (.venv) not found. Initializing..." -ForegroundColor Yellow
    python -m venv .venv
    & .venv\Scripts\python.exe -m pip install --upgrade pip
    & .venv\Scripts\pip.exe install -r requirements.txt
}

# 2. Run initial Ingestion to populate mock/health state
Write-Host "Ingesting Slack, GitHub and Jira seed data..." -ForegroundColor Green
& .venv\Scripts\python.exe ingestion\ingest.py

# 3. Start Backend API in a separate process
Write-Host "Launching FastAPI API server at http://localhost:8000..." -ForegroundColor Green
$apiProcess = Start-Process -FilePath ".venv\Scripts\python.exe" -ArgumentList "api\main.py" -NoNewWindow -PassThru

# 4. Bootstrap Frontend
Write-Host "Bootstrapping Frontend at http://localhost:5173..." -ForegroundColor Green
cd frontend

if (-not (Test-Path "node_modules")) {
    Write-Host "Installing frontend node packages..." -ForegroundColor Yellow
    npm install
}

Write-Host "Starting React/Vite development server..." -ForegroundColor Green
npm run dev

# Cleanup process on exit
Stop-Process -Id $apiProcess.Id -Force -ErrorAction SilentlyContinue
