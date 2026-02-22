#!/bin/bash
# Wealthfolio Docker Deployment Setup Script
# Usage: ./deploy.sh [dev|prod]

set -e

ENVIRONMENT=${1:-dev}

echo "================================================"
echo "Wealthfolio Docker Deployment Setup"
echo "Environment: $ENVIRONMENT"
echo "================================================"
echo ""

# Check if .env.docker exists
if [ ! -f ".env.docker" ]; then
    echo "📋 Creating .env.docker from template..."
    cp .env.docker.example .env.docker
    echo "✓ Created .env.docker"
    echo ""
    echo "⚠️  IMPORTANT: Update .env.docker with your values before proceeding:"
    echo "   - Set WF_SECRET_KEY to a random value: openssl rand -base64 32"
    echo "   - Set WF_PORT if needed"
    echo "   - Set WF_CORS_ALLOW_ORIGINS for your domain"
    echo ""
    read -p "Press enter once you've updated .env.docker..."
else
    echo "✓ .env.docker already exists"
fi

# Validate WF_SECRET_KEY
if grep -q "WF_SECRET_KEY=your-secret-key-here" .env.docker; then
    echo "❌ Error: WF_SECRET_KEY is not configured in .env.docker"
    exit 1
fi

echo ""
echo "🔨 Building Docker image..."
echo ""

if [ "$ENVIRONMENT" = "dev" ]; then
    docker compose -f compose.yml -f compose.dev.yml --env-file .env.docker build
    echo ""
    echo "✓ Build complete!"
    echo ""
    echo "🚀 Starting application in development mode..."
    docker compose -f compose.yml -f compose.dev.yml --env-file .env.docker up -d

elif [ "$ENVIRONMENT" = "prod" ]; then
    docker compose -f compose.yml --env-file .env.docker build
    echo ""
    echo "✓ Build complete!"
    echo ""
    echo "🚀 Starting application in production mode..."
    docker compose -f compose.yml --env-file .env.docker up -d
else
    echo "❌ Invalid environment: $ENVIRONMENT"
    echo "Usage: ./deploy.sh [dev|prod]"
    exit 1
fi

echo ""
echo "================================================"
echo "✓ Deployment successful!"
echo "================================================"
echo ""

# Get port from .env.docker
PORT=$(grep "^WF_PORT=" .env.docker | cut -d'=' -f2)
if [ -z "$PORT" ]; then
    PORT="8088"
fi

echo "📍 Application URL: http://localhost:$PORT"
echo ""
echo "📋 Useful commands:"
echo "   View logs:      docker compose logs -f wealthfolio"
echo "   Stop service:   docker compose down"
echo "   Restart service: docker compose restart wealthfolio"
echo ""
