# Quick Deployment Reference

## TL;DR - 5 Minute Setup

### Linux/Mac
```bash
git clone https://github.com/Lunchtime0614/wealthfolio-tax.git
cd wealthfolio-tax
chmod +x deploy.sh
./deploy.sh dev
# Open http://localhost:8088
```

### Windows
```cmd
git clone https://github.com/Lunchtime0614/wealthfolio-tax.git
cd wealthfolio-tax
deploy.bat dev
REM Open http://localhost:8088
```

---

## Manual Setup (If Scripts Don't Work)

```bash
# 1. Generate secret key
openssl rand -base64 32

# 2. Create config
cp .env.docker.example .env.docker

# 3. Edit .env.docker, paste secret key as WF_SECRET_KEY

# 4. Start (development)
docker compose -f compose.yml -f compose.dev.yml --env-file .env.docker up

# 5. Start (production)
docker compose -f compose.yml --env-file .env.docker up -d
```

---

## Essential Commands

```bash
# View logs
docker compose logs -f

# Restart
docker compose restart wealthfolio

# Stop
docker compose down

# Reset (delete all data)
docker compose down -v

# Update
git pull origin main && docker compose up -d --build
```

---

## Key Files

| File | Purpose |
|------|---------|
| `.env.docker.example` | Configuration template |
| `DEPLOYMENT.md` | Full deployment guide |
| `DEPLOYMENT_CHECKLIST.md` | Step-by-step checklist |
| `deploy.sh / deploy.bat` | Automated setup |
| `compose.yml` | Production config |
| `compose.dev.yml` | Development config |

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Port in use | Edit `.env.docker`: `WF_PORT=8089` |
| Database locked | `docker compose down && sleep 10 && docker compose up -d` |
| Secrets error | Make sure `WF_SECRET_KEY` is set in `.env.docker` |
| Container crashes | `docker compose logs wealthfolio` |
| Permission denied | Use `sudo` on Linux |

---

## Test the Feature

1. Settings → Accounts → New Account
2. Notice "Tax Treatment" dropdown (new!)
3. Select: Taxable, Tax-Free, or Tax-Deferred
4. Dashboard → Click grouping menu
5. Select "Group by Tax Treatment"
6. See accounts grouped and summarized by category

---

**New Feature: Tax Treatment Tags** 🎉
- Add tax classification to accounts
- Group and filter by tax category
- View totals broken down by treatment
