---
title: LexAI Backend
emoji: ⚖️
colorFrom: blue
colorTo: purple
sdk: docker
pinned: false
---

# LexAI Backend API

AI-powered legal assistant for Pakistani law. Built with FastAPI, ChromaDB, and Llama 3.3 70B.

## Features
- 740,735 legal document chunks from Pakistani law books
- Hybrid retrieval: Vector search + Cross-encoder reranking
- Conversation memory with persistent sessions
- Streaming responses via Server-Sent Events
- Urdu + English language support

## API Endpoints

### Health Check
```
GET /health
```

### Chat (Non-streaming)
```
POST /api/chat
{
  "query": "What are the charges of murder in Pakistan?",
  "session_id": "optional-uuid",
  "province_filter": "Punjab"
}
```

### Chat (Streaming)
```
POST /api/chat/stream
{
  "query": "What is Section 302 PPC?",
  "session_id": "optional-uuid"
}
```

### Sessions
```
GET /api/chat/sessions
GET /api/chat/sessions/{session_id}/messages
DELETE /api/chat/sessions/{session_id}
```

## Environment Variables

Required in HF Spaces Settings → Repository secrets:

- `GROQ_API_KEY` - Get from console.groq.com
- `HF_TOKEN` - Your Hugging Face token (read access)
- `HF_CHROMA_REPO` - Your ChromaDB repo (e.g., username/lexai-chroma-db)
- `DATABASE_URL` - sqlite:///./lexai.db
- `SECRET_KEY` - Any random string for JWT tokens

## Deployment

This Space automatically deploys from the main branch. First deployment takes ~20 minutes to download:
- ChromaDB (3-4 GB) from your private HF dataset
- AI models (2.5 GB total): multilingual-e5-large + cross-encoder

Subsequent deploys are much faster due to Docker layer caching.

## Tech Stack
- **Framework**: FastAPI 0.111.0
- **Vector DB**: ChromaDB 0.5.0
- **Embeddings**: intfloat/multilingual-e5-large
- **Reranker**: cross-encoder/ms-marco-MiniLM-L6-v2
- **LLM**: Llama 3.3 70B via Groq API
- **Memory**: SQLite with SQLAlchemy

## License
MIT
