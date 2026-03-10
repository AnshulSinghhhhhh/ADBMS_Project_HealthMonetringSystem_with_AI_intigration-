# HealthAI — Deployment Guide

## Prerequisites
- Docker & Docker Compose installed, OR
- A GitHub account + Vercel + Render accounts (for free-tier cloud deployment)

---

## ⚡ Quick Start (Docker — Recommended)

```bash
git clone <your-repo-url>
cd ADBMS

# 1. Configure environment
cp .env.example .env
# Edit .env — set SECRET_KEY to a long random string

# 2. Build & run
docker-compose up --build

# 3. Open the app
# Frontend  → http://localhost
# API Docs  → http://localhost:8000/docs
```

---

## Option A — Free Cloud Deployment

### Backend → Render

1. Push project to GitHub
2. Go to [render.com](https://render.com) → New → Web Service
3. Connect your GitHub repo
4. Configure:
   - **Root Directory:** `backend`
   - **Build Command:** `pip install -r requirements.txt`
   - **Start Command:** `uvicorn main:app --host 0.0.0.0 --port 8000`
5. Under **Environment**, add all variables from `.env`:
   ```
   SECRET_KEY=<random-32-char-string>
   ALGORITHM=HS256
   ACCESS_TOKEN_EXPIRE_MINUTES=1440
   DATABASE_URL=sqlite:///./healthai.db
   FRONTEND_URL=https://your-vercel-app.vercel.app
   ```
6. Under **Disks**, add a persistent disk mounted at `/app` to preserve `healthai.db`
7. Deploy — note your Render URL (e.g. `https://healthai-api.onrender.com`)

### Frontend → Vercel

1. Go to [vercel.com](https://vercel.com) → New Project
2. Import your GitHub repo
3. Configure:
   - **Root Directory:** `frontend`
   - **Framework:** Vite
4. Under **Environment Variables**, add:
   ```
   VITE_API_URL=https://healthai-api.onrender.com
   ```
5. Deploy → your app is live at `https://your-app.vercel.app`

---

## Option B — Docker Self-Hosted

```bash
docker-compose up --build -d
```

| Service  | URL                        |
|----------|----------------------------|
| Frontend | http://localhost           |
| Backend  | http://localhost:8000      |
| API Docs | http://localhost:8000/docs |

### Stop / restart
```bash
docker-compose down      # stop
docker-compose up -d     # start in background
docker-compose logs -f   # tail logs
```

### SQLite persistence
The `healthai.db` file is stored in a named Docker volume (`healthai_db`).
It persists across `docker-compose down` / `up` cycles.

To back it up:
```bash
docker cp $(docker-compose ps -q backend):/app/healthai.db ./backup.db
```

---

## Environment Variables Reference

| Variable | Description | Default |
|----------|-------------|---------|
| `SECRET_KEY` | JWT signing key — **change in production** | `changeme...` |
| `ALGORITHM` | JWT algorithm | `HS256` |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | Token lifetime | `1440` (24h) |
| `DATABASE_URL` | SQLAlchemy DB URL | `sqlite:///./healthai.db` |
| `FRONTEND_URL` | Allowed CORS origin | `http://localhost:5173` |
| `OPENAI_API_KEY` | Optional — enables GPT summaries | — |
| `VITE_API_URL` | Frontend env — backend base URL | `http://localhost:8000` |

---

## Security Checklist Before Production

- [ ] Change `SECRET_KEY` to a cryptographically random 32+ char string
- [ ] Set `FRONTEND_URL` to your exact Vercel domain
- [ ] Remove `*` from CORS if running in production
- [ ] Enable HTTPS (automatic on Vercel + Render)
- [ ] Rate limiting is active on `/auth/login` (5 req/min per IP)
- [ ] Input validation is active on all vitals endpoints (422 on out-of-range)
