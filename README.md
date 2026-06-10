---
title: LexAI Backend
emoji: ⚖️
colorFrom: blue
colorTo: indigo
sdk: docker
app_port: 7860
pinned: false
---

# LexAI ⚖️

**Where Law Meets Intelligence** — AI-powered Pakistani legal assistant with a marketplace for lawyers and law firms.

> 🤗 This repo doubles as a Hugging Face Space (backend). The frontend is deployed separately on Vercel.

---

## What is LexAI?

LexAI is a three-in-one platform:

1. **🤖 Legal AI Assistant** — Hybrid RAG chatbot over 740K+ chunks of Pakistani legal documents. Bilingual (English + اردو).
2. **🏛️ Lawyer Marketplace** — Find and book verified lawyers by city, specialization, and rating.
3. **🏢 Law Firm Portal** — Multi-lawyer firms get profiles, dashboards, lead capture, team management.

## Tech Stack

**Backend** — FastAPI 0.111, ChromaDB 0.5, SQLAlchemy, `multilingual-e5-large` embeddings, `ms-marco-MiniLM-L6-v2` reranker, `rank_bm25` sparse retrieval, Llama 3.3 70B via Groq, JWT auth.

**Frontend** — React 18 + Vite, inline styles, Server-Sent Events for streaming.

**Deployment** — Backend on Hugging Face Spaces (Docker), Frontend on Vercel, ChromaDB on HF Datasets, Production DB on Supabase Postgres.

## Architecture — Hybrid RAG Pipeline


## Local Setup

### Prerequisites
- Python 3.11+
- Node.js 18+
- Git

### Backend

```bash
cd backend
python -m venv venv
venv\Scripts\Activate.ps1     # Windows
# source venv/bin/activate    # macOS/Linux

pip install -r requirements.txt
```

Create `backend/.env`:

```env
GROQ_API_KEY=gsk_your_key
HF_TOKEN=hf_your_token
HF_CHROMA_REPO=Tahir283417/lexai-chroma-db
CHROMA_DB_PATH=./chroma_db
SECRET_KEY=any-random-32-char-string
DATABASE_URL=sqlite:///./lexai.db
```

Run:
```bash
uvicorn main:app --reload
```

API at http://localhost:8000 · Swagger at http://localhost:8000/docs

### Frontend

```bash
cd frontend
npm install
```

Create `frontend/.env.local`:
```env
VITE_API_URL=http://localhost:8000
```

Run:
```bash
npm run dev
```

Open http://localhost:5173

## API Reference

See `backend/README.md` for full endpoint documentation, or visit `/docs` when the server is running.

**Quick highlights:**
- `POST /api/chat/stream` — Streaming chatbot (SSE)
- `GET /api/firms/` — Search/list firms with filters
- `POST /api/firms/{slug}/inquire` — Public lead capture
- `GET /api/firms/{firm_id}/dashboard` — Firm analytics
- 18 endpoints total for the firm portal

## Production Deployment

### Backend → Hugging Face Spaces

This Space auto-builds from the `main` branch. Required secrets (Settings → Variables and secrets):
- `GROQ_API_KEY`, `HF_TOKEN`, `HF_CHROMA_REPO`
- `SECRET_KEY`, `DATABASE_URL`

First build takes ~25-35 min (downloads models + ChromaDB).

### Frontend → Vercel

1. Import GitHub repo at vercel.com/new
2. Root Directory: `frontend/`
3. Add env var: `VITE_API_URL=https://YOUR-USERNAME-lexai-backend.hf.space`

### Keep backend warm — UptimeRobot

HF Spaces sleep after inactivity. Set a free HTTP monitor on `/health` at 5-min intervals.

## Roles & Permissions

| Role | Capabilities |
|------|--------------|
| **client** | Chat, browse firms, submit inquiries, leave reviews |
| **lawyer** | Above + create/join firms, manage cases |
| **firm owner** | Full firm control, can delete |
| **firm admin** | Manage members + settings |
| **firm partner/associate/intern** | Dashboard access |

## Troubleshooting

- **"No collections found in ChromaDB"** — Check `HF_CHROMA_REPO` and `HF_TOKEN`. Delete `chroma_db/` and restart.
- **HF push rejected — binary files** — Use `git filter-repo --path PATH --invert-paths --force` then `git push --force`.
- **CORS error in frontend** — Add your Vercel URL to `allow_origins` in `main.py`.
- **Page scrolls when sending message** — Make sure root CSS has `html, body, #root { overflow: hidden }` (handled in App.jsx v4.0+).

## License

MIT — use it however you want. Attribution appreciated.

## Acknowledgments

- Pakistani Bar Council legal corpus
- Groq for fast LLM inference
- Hugging Face for model + space hosting
- ChromaDB for vector storage

---

**Built with ⚖️ in Pakistan**