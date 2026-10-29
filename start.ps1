#!/usr/bin/env pwsh
# ZKP-DID Framework — Quick Start Script (PowerShell for Windows)
# Run: .\start.ps1

Write-Host "🔐 ZKP-DID Framework — Starting up..." -ForegroundColor Cyan

# Check Docker
if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
    Write-Host "❌ Docker not found. Please install Docker Desktop." -ForegroundColor Red
    exit 1
}

Write-Host "✅ Docker found" -ForegroundColor Green

# Check if containers are already running
$running = docker ps --format "{{.Names}}" 2>$null
if ($running -match "hardhat-node") {
    Write-Host "ℹ️  Services already running. Use 'docker-compose down' to stop." -ForegroundColor Yellow
    exit 0
}

# Start all services
Write-Host "`n🚀 Starting all services with Docker Compose..." -ForegroundColor Cyan
docker-compose up --build -d

Write-Host "`n⏳ Waiting for services to be healthy..." -ForegroundColor Yellow
Start-Sleep -Seconds 30

# Print service URLs
Write-Host "`n✅ Services ready!" -ForegroundColor Green
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host "  🌐 Frontend:      http://localhost:5173" -ForegroundColor White
Write-Host "  ⚙️  Backend API:   http://localhost:8000" -ForegroundColor White
Write-Host "  📖 API Docs:      http://localhost:8000/docs" -ForegroundColor White
Write-Host "  🔐 ZKP Service:   http://localhost:3001" -ForegroundColor White
Write-Host "  ⛓️  Blockchain:    http://localhost:8545" -ForegroundColor White
Write-Host "  🔴 Redis:         localhost:6379" -ForegroundColor White
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host "`n📋 Logs: docker-compose logs -f [service-name]" -ForegroundColor Gray
Write-Host "🛑 Stop:  docker-compose down" -ForegroundColor Gray
