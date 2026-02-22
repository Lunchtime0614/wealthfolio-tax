# Wealthfolio Docker Deployment Checklist

Use this checklist when deploying to a new machine with Docker.

## Pre-Deployment (On Your Development Machine)

- [ ] All changes committed to Git
- [ ] Tax treatment feature implemented and tested
- [ ] Code pushed to your Git repository (GitHub, GitLab, etc.)

## Deployment Steps (On Target Machine)

### 1. Prerequisites
- [ ] Docker installed and running
- [ ] Docker Compose installed (usually comes with Docker Desktop)
- [ ] Git installed
- [ ] OpenSSL available (for generating secret key)

### 2. Clone Repository
```bash
git clone https://github.com/Lunchtime0614/wealthfolio-tax.git
cd wealthfolio-tax
```

### 3. Generate Configuration
```bash
# Generate secure secret key
openssl rand -base64 32

# Copy the output - you'll need it in the next step
```

### 4. Create Environment File
**Option A: Linux/Mac (using deploy script)**
```bash
chmod +x deploy.sh
./deploy.sh dev    # for development
./deploy.sh prod   # for production
```

**Option B: Windows (using deploy script)**
```cmd
deploy.bat dev    # for development
deploy.bat prod   # for production
```

**Option C: Manual Setup**
```bash
# Copy example configuration
cp .env.docker.example .env.docker
# or on Windows:
# copy .env.docker.example .env.docker

# Edit .env.docker with your values:
# - WF_SECRET_KEY: paste the generated key
# - WF_PORT: desired port (default 8088)
# - WF_CORS_ALLOW_ORIGINS: your domain
```

### 5. Start Application

**Development Mode (with live rebuild):**
```bash
docker compose -f compose.yml -f compose.dev.yml --env-file .env.docker up
```

**Production Mode (optimized):**
```bash
docker compose -f compose.yml --env-file .env.docker up -d
```

### 6. Verify Deployment
- [ ] Check application is running: `docker compose ps`
- [ ] Access web UI: Open browser to `http://localhost:8088` (or your WF_PORT)
- [ ] View logs: `docker compose logs -f wealthfolio`
- [ ] Check database is created: `docker compose exec wealthfolio ls -la /data/`

## Testing Features

### Test Tax Treatment Feature
1. Navigate to Settings → Accounts
2. Create new account
3. Verify "Tax Treatment" dropdown appears with options:
   - Taxable
   - Tax-Free
   - Tax-Deferred
4. Create 3-4 test accounts with different tax treatments
5. Go to Dashboard
6. Click grouping menu (folder/tag icon)
7. Select "Group by Tax Treatment"
8. Verify accounts are grouped by tax category
9. Verify summary section shows totals by treatment

### Test Other Features
- Create/edit activities
- Import data
- View portfolio performance
- Check all settings

## Backup & Data

### Backup Database
```bash
docker run --rm -v wealthfolio-data:/data -v $(pwd):/backup \
  alpine cp /data/wealthfolio.db /backup/wealthfolio.db.backup
```

### Restore Database
```bash
docker run --rm -v wealthfolio-data:/data -v $(pwd):/backup \
  alpine cp /backup/wealthfolio.db.backup /data/wealthfolio.db
docker compose restart wealthfolio
```

## Troubleshooting

### Port Already in Use
```bash
# Edit .env.docker
WF_PORT=8089  # or another available port
docker compose restart wealthfolio
```

### Database Locked
```bash
# Full restart
docker compose down
sleep 10
docker compose up -d
```

### Container Crashes
```bash
# View detailed logs
docker compose logs wealthfolio

# Restart from scratch
docker compose down -v
docker compose up -d --build
```

### Permission Issues
```bash
# On Linux, you may need sudo
sudo docker compose -f compose.yml --env-file .env.docker up -d
```

## Maintenance

### View Logs
```bash
docker compose logs -f wealthfolio
# Press Ctrl+C to exit
```

### Restart Service
```bash
docker compose restart wealthfolio
```

### Stop Service
```bash
docker compose down
```

### Update to Latest Code
```bash
git pull origin main
docker compose down
docker compose -f compose.yml -f compose.dev.yml --env-file .env.docker up -d --build
```

### Remove All Data (Reset)
```bash
docker compose down -v
```

## Connecting to Reverse Proxy

### Using Nginx
```nginx
upstream wealthfolio {
    server localhost:8088;
}

server {
    listen 443 ssl http2;
    server_name your-domain.com;

    location / {
        proxy_pass http://wealthfolio;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

### Using Caddy
```caddy
your-domain.com {
    reverse_proxy localhost:8088
}
```

## File Structure After Deployment

```
wealthfolio-tax/
├── .env.docker              # Configuration (created, not tracked)
├── docker/                  # Docker-related files
├── compose.yml              # Production compose
├── compose.dev.yml          # Development overrides
├── Dockerfile               # Build instructions
├── DEPLOYMENT.md            # Deployment guide
├── deploy.sh / deploy.bat   # Deployment scripts
└── .env.docker.example      # Configuration template (tracked)
```

## Environment Variables Reference

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| WF_SECRET_KEY | Yes | - | Encryption key (openssl rand -base64 32) |
| WF_PORT | No | 8088 | Server port |
| WF_SECRET_KEY | No | - | Password hash for auth (Argon2id) |
| WF_CORS_ALLOW_ORIGINS | No | * | Allowed origins (comma-separated) |
| WF_AUTH_TOKEN_TTL_MINUTES | No | 60 | Auth token lifetime |
| WF_REQUEST_TIMEOUT_MS | No | 30000 | Request timeout |

## Success Indicators

- [ ] Container is running: `docker compose ps` shows "running"
- [ ] Web UI is accessible
- [ ] Database file exists: `/data/wealthfolio.db`
- [ ] No error logs: `docker compose logs` shows no errors
- [ ] Tax treatment feature works as described above
- [ ] Data persists after restart

## Getting Help

- Check logs: `docker compose logs wealthfolio`
- Review DEPLOYMENT.md for detailed guide
- Check GitHub issues: https://github.com/Lunchtime0614/wealthfolio-tax/issues

---

**Feature: Tax Treatment Tags** ✨
This deployment includes the new tax treatment feature:
- Filter accounts by tax classification
- Group by Taxable, Tax-Free, or Tax-Deferred
- View aggregated totals by category
