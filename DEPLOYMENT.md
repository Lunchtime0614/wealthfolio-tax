# Wealthfolio Docker Deployment Guide

This guide explains how to deploy Wealthfolio to a machine running Docker.

## Prerequisites

- Docker and Docker Compose installed
- Git (to clone the repository)
- OpenSSL (to generate secret key)

## Quick Start - Development Environment

### 1. Clone the repository
```bash
git clone https://github.com/Lunchtime0614/wealthfolio-tax.git
cd wealthfolio-tax
```

### 2. Create environment configuration
```bash
# Copy the example configuration
cp .env.docker.example .env.docker

# Generate a secure secret key
openssl rand -base64 32
# Copy the output and set it in .env.docker as WF_SECRET_KEY
```

### 3. Start the application
```bash
# Build and run in development mode
docker compose -f compose.yml -f compose.dev.yml --env-file .env.docker up

# Or run in background
docker compose -f compose.yml -f compose.dev.yml --env-file .env.docker up -d
```

The application will be available at `http://localhost:8088`

## Production Deployment

### 1. Clone repository and configure
```bash
git clone https://github.com/Lunchtime0614/wealthfolio-tax.git
cd wealthfolio-tax
cp .env.docker.example .env.docker
```

### 2. Generate secure credentials
```bash
# Generate secret key
openssl rand -base64 32

# Optional: Generate admin password hash
# htpasswd -B -C 10 -nb admin yourpassword | cut -d: -f2
```

### 3. Update .env.docker
Edit `.env.docker` with your values:
- Set `WF_SECRET_KEY` to the generated key
- Set `WF_PORT` to your desired port
- Set `WF_CORS_ALLOW_ORIGINS` to your domain (e.g., `https://your-domain.com`)
- Optionally set `WF_AUTH_PASSWORD_HASH` for password protection

### 4. Deploy with Docker Compose
```bash
# Run in production mode
docker compose -f compose.yml --env-file .env.docker up -d

# View logs
docker compose logs -f wealthfolio
```

### 5. Configure reverse proxy (recommended)

Use Nginx, Caddy, Traefik, or similar to:
- Handle HTTPS/TLS
- Manage domain routing
- Add security headers

Example Nginx configuration:
```nginx
server {
    listen 443 ssl http2;
    server_name your-domain.com;

    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;

    location / {
        proxy_pass http://localhost:8088;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

## Docker Compose Files

### compose.yml (Production)
Main production configuration with default settings.

### compose.dev.yml (Development)
Development overrides that:
- Build from source instead of pulling image
- Enable hot reload
- Expose more ports for debugging
- Relax security constraints

Usage:
```bash
# Development
docker compose -f compose.yml -f compose.dev.yml --env-file .env.docker up

# Production
docker compose -f compose.yml --env-file .env.docker up -d
```

## Data Persistence

Data is stored in a Docker volume named `wealthfolio-data`. This directory contains:
- SQLite database (`wealthfolio.db`)
- All accounts, transactions, and settings

### Backup the database
```bash
# Create backup
docker run --rm -v wealthfolio-data:/data -v $(pwd):/backup \
  alpine cp /data/wealthfolio.db /backup/wealthfolio.db.backup

# Restore from backup
docker run --rm -v wealthfolio-data:/data -v $(pwd):/backup \
  alpine cp /backup/wealthfolio.db.backup /data/wealthfolio.db
```

## Common Operations

### View logs
```bash
docker compose logs -f wealthfolio
```

### Restart service
```bash
docker compose restart wealthfolio
```

### Stop service
```bash
docker compose down
```

### Stop and remove all data (reset)
```bash
docker compose down -v
```

### Update to latest version
```bash
git pull origin main
docker compose -f compose.yml -f compose.dev.yml --env-file .env.docker up -d --build
```

## Troubleshooting

### Port already in use
If port 8088 is in use, change `WF_PORT` in `.env.docker`:
```bash
WF_PORT=8089
```

### Database locked error
This usually indicates a stale container. Restart:
```bash
docker compose down
# Wait 10 seconds
docker compose -f compose.yml -f compose.dev.yml --env-file .env.docker up -d
```

### Permission denied errors
Ensure Docker daemon is running and you have permission to use Docker:
```bash
sudo docker compose -f compose.yml --env-file .env.docker up -d
```

### Out of memory
Increase resources in compose.yml or host system. Current limit is 512MB.

## Security Considerations

1. **Always set `WF_SECRET_KEY`** — This encrypts session tokens
2. **Use HTTPS** — Deploy behind a reverse proxy with TLS
3. **Restrict CORS** — Set `WF_CORS_ALLOW_ORIGINS` to your domain
4. **Optional: Set password** — Add `WF_AUTH_PASSWORD_HASH` for access control
5. **Backup regularly** — SQLite data is local only; ensure backups
6. **Keep updated** — Regularly pull latest changes and rebuild

## Feature: Tax Treatment Tags

This deployment includes the new tax treatment feature:
- Add tax classification to each account (Taxable, Tax-Free, Tax-Deferred)
- Group accounts by tax treatment on dashboard
- View summary totals broken down by tax category

See accounts settings to configure tax treatment for your accounts.
