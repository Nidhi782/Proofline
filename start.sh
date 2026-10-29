#!/usr/bin/env bash
# ZKP-DID Framework — Quick Start Script (Bash for Linux/macOS)
set -e

echo "🔐 ZKP-DID Framework — Starting up..."

# Check Docker
if ! command -v docker &> /dev/null; then
    echo "❌ Docker not found. Please install Docker Desktop."
    exit 1
fi

echo "✅ Docker found"

# Start all services
echo ""
echo "🚀 Starting all services with Docker Compose..."
docker-compose up --build -d

echo ""
echo "⏳ Waiting for services to be healthy (30s)..."
sleep 30

echo ""
echo "✅ Services ready!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  🌐 Frontend:      http://localhost:5173"
echo "  ⚙️  Backend API:   http://localhost:8000"
echo "  📖 API Docs:      http://localhost:8000/docs"
echo "  🔐 ZKP Service:   http://localhost:3001"
echo "  ⛓️  Blockchain:    http://localhost:8545"
echo "  🔴 Redis:         localhost:6379"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📋 Logs: docker-compose logs -f [service-name]"
echo "🛑 Stop:  docker-compose down"
