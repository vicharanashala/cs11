# Manual Setup Checklist

> Complete these steps before deploying to production or enabling real AI matching.

---

## 1. Embedding Provider Setup (Hugging Face — recommended)

Hugging Face Inference API provides cloud-hosted embeddings with no local setup.

**1. Get an API key:**
- Go to https://huggingface.co/settings/tokens
- Create a free account if you don't have one
- Click **New token** -> name it "crowdfaq" -> role: **read** -> Generate
- Copy the token

**2. Configure backend/.env:**
```
EMBEDDING_PROVIDER=huggingface
HUGGINGFACE_API_KEY=<your token>
HUGGINGFACE_EMBEDDING_MODEL=sentence-transformers/all-MiniLM-L6-v2
```

**3. Restart the backend:**
```bash
cd backend && npm run start:dev
```

**4. Rebuild the FAQ embedding index:**
```bash
curl -X POST http://localhost:3000/api/admin/rebuild-index \
  -H "Authorization: Bearer <admin-jwt-token>"
```
Or via the Admin UI: **Admin > FAQ Manager > Rebuild AI Index**

**Note:** The free tier allows ~1,000 requests/day. For local dev without external dependencies, use `EMBEDDING_PROVIDER=mock` instead.

---

## 2. (Optional) Ollama Setup — Local Embeddings

Ollama runs embedding generation entirely local — no API key, no cloud cost. Use this instead of Hugging Face if you prefer local inference.

**Install:**
```bash
# macOS / Linux
curl -fsSL https://ollama.com/install.sh | sh

# Windows: download from https://ollama.com/download
```

**Start Ollama:**
```bash
ollama serve
```

**Pull the embedding model (one-time):**
```bash
ollama pull nomic-embed-text
```

**Configure backend/.env:**
```
EMBEDDING_PROVIDER=ollama
OLLAMA_URL=http://localhost:11434
OLLAMA_EMBEDDING_MODEL=nomic-embed-text
```

The model is ~274 MB and runs entirely local.

---

## 3. Copy `.env.example` -> `.env`

In `backend/`:

```bash
cp .env.example .env
```

Fill in at minimum:
```
JWT_SECRET=your-long-random-secret
MONGODB_URI=mongodb+srv://<your-atlas-uri>
AI_CONFIDENCE_THRESHOLD=0.75
```

---

## 4. Create MongoDB Indexes

No special indexes needed for the embedding-based approach — the `faq_embeddings` collection uses a plain unique index.

If you want Atlas full-text search as a supplement (not required):
```js
// In mongo shell
db.faqs.createIndex({ title: "text", body: "text" })
```

---

## 5. Rebuild the FAQ Embedding Index

After deploying, trigger a rebuild so the `faq_embeddings` collection is populated:

```bash
curl -X POST http://localhost:3000/api/admin/rebuild-index \
  -H "Authorization: Bearer <admin-jwt-token>"
```

Or via the Admin UI: **Admin > FAQ Manager > Rebuild AI Index**

---

## 6. (Optional) Seed Test Data

```bash
node seed-document-status.js
```

Set `STUDENT_EMAIL` at the top of the script first.

---

## Summary of Steps

| Step | What | Why |
|---|---|---|
| 1 | Set `HUGGINGFACE_API_KEY` in `.env` | Cloud embedding API key |
| 2 | (Optional) Install + run `ollama serve` | Local embedding generation |
| 3 | `cp .env.example .env` | Configure env vars |
| 4 | `POST /admin/rebuild-index` | Populate `faq_embeddings` |
| 5 | Seed test data (optional) | Test intent detection |

**Dev without these steps:** Set `EMBEDDING_PROVIDER=mock` in `.env` — the app runs with simulated embeddings, no external dependencies needed.