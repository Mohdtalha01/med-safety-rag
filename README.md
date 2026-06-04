# MedSafe — Medication Safety Alert System
## Dual-Source RAG + Groq LLM (100% Free to Run)

An AI-powered clinical decision support tool that checks whether a drug is safe for a specific patient by retrieving from **two sources simultaneously** — a drug knowledge base and the patient's medical record — then analysing them with a free LLM via Groq.

---

## What it does

- Clinician enters a drug name and selects a patient
- System retrieves drug safety data from ChromaDB (Source 1)
- System retrieves patient record from ChromaDB (Source 2)
- Groq LLM (LLaMA 3.1 8B, free) analyses both and returns:
  - Safety verdict: SAFE / CAUTION / WARNING / DANGER / CONTRAINDICATED
  - Safety score 0–100
  - Structured alerts with severity (info / low / moderate / high / critical)
  - Monitoring plan
  - Alternative drug suggestions

---

## Tech stack — everything free

| Component    | Technology                                      |
|--------------|-------------------------------------------------|
| LLM          | LLaMA 3.1 8B via **Groq API** (free tier)       |
| Embeddings   | TF-IDF via scikit-learn (offline, no download)  |
| Vector DB    | **ChromaDB** (local persistent)                 |
| Backend      | **FastAPI** + Python 3.11                       |
| Frontend     | **React 18** + Vite                             |
| Deployment   | **Docker + Docker Compose**                     |

---

## Prerequisites

- Python 3.11 or higher
- Node.js 18 or higher
- A free Groq API key — sign up at https://console.groq.com (no credit card)

---

## Local setup — Option A: one command

```bash
# 1. Set your key
echo "GROQ_API_KEY=gsk_xxxxxxxxxxxx" > backend/.env

# 2. Run (sets up venv + npm automatically)
bash start.sh
```

Frontend → http://localhost:3000  
Backend  → http://localhost:8000  
API docs → http://localhost:8000/docs

---

## Local setup — Option B: manual

### Backend

```bash
cd backend

# Create virtual environment
python3 -m venv venv
source venv/bin/activate          # Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Set API key
echo "GROQ_API_KEY=gsk_xxxxxxxxxxxx" > .env

# Start server
python main.py
# Running at http://localhost:8000
```

### Frontend

```bash
cd frontend

# Install dependencies
npm install

# Start dev server
npm run dev
# Running at http://localhost:3000
```

---

## Docker (production)

```bash
# Create .env in project root
echo "GROQ_API_KEY=gsk_xxxxxxxxxxxx" > .env

# Build and start both containers
docker-compose up --build

# Frontend → http://localhost:3000
# Backend  → http://localhost:8000
```

---

## Cloud deployment

### Backend on Render (free tier)
1. New Web Service → connect GitHub repo
2. Root directory: `backend`
3. Build command: `pip install -r requirements.txt`
4. Start command: `uvicorn main:app --host 0.0.0.0 --port $PORT`
5. Environment variable: `GROQ_API_KEY = gsk_xxxxxxxxxxxx`

### Frontend on Vercel or Netlify (free)
1. Root directory: `frontend`
2. Build command: `npm run build`
3. Output directory: `dist`
4. Environment variable: `VITE_API_URL = https://your-backend.onrender.com`

### Full stack on Railway
```bash
railway login
railway init
railway up
railway variables set GROQ_API_KEY=gsk_xxxxxxxxxxxx
```

---

## Quick test cases

Open the Safety Checker page and click any quick-test button, or use these manually:

| Patient                  | Drug        | Expected result                            |
|--------------------------|-------------|---------------------------------------------|
| Rajesh Kumar (eGFR 38)   | Metformin   | WARNING — borderline CKD, dose-reduce       |
| Rajesh Kumar             | Amoxicillin | CONTRAINDICATED — penicillin allergy        |
| Priya Sharma (Warfarin)  | Aspirin     | DANGER — major bleeding risk                |
| Arjun Mehta (Sertraline) | Tramadol    | DANGER — serotonin syndrome risk            |
| Priya Sharma             | Omeprazole  | CAUTION — mild INR interaction              |
| Rajesh Kumar             | Atorvastatin| SAFE — appropriate, monitor liver enzymes   |

---

## API endpoints

```
POST   /api/safety/check                              Run safety check
GET    /api/patients/                                 List all patients
GET    /api/patients/{id}                             Get patient record
POST   /api/patients/                                 Add patient
PUT    /api/patients/{id}                             Update patient
DELETE /api/patients/{id}                             Delete patient
POST   /api/patients/{id}/medications                 Add medication
DELETE /api/patients/{id}/medications/{name}          Remove medication
GET    /api/drugs/?search=term                        List / search drugs
GET    /api/drugs/check-pair?drug1=X&drug2=Y          Check interaction
GET    /api/drugs/{id}                                Full drug details
GET    /api/history/                                  Check history log
DELETE /api/history/                                  Clear history
GET    /health                                        Health check
```

Full interactive docs at http://localhost:8000/docs

---

## Project structure

```
med-safety-rag/
├── start.sh                          one-command start script
├── docker-compose.yml
├── .env.example
├── README.md
│
├── backend/
│   ├── main.py                       FastAPI app entry point
│   ├── requirements.txt
│   ├── Dockerfile
│   ├── .env.example
│   │
│   ├── data/
│   │   ├── drug_knowledge.json       10 drugs with full safety profiles
│   │   ├── patient_records.json      3 sample patients
│   │   └── check_history.json        persisted check log
│   │
│   ├── models/
│   │   └── schemas.py                Pydantic request/response models
│   │
│   ├── routers/
│   │   ├── safety.py                 POST /api/safety/check
│   │   ├── patients.py               CRUD + medication management
│   │   ├── drugs.py                  drug list, search, pair-checker
│   │   └── history.py                check history log
│   │
│   └── services/
│       ├── rag_service.py            ChromaDB dual-source RAG
│       ├── llm_service.py            Groq LLM with model fallbacks
│       └── safety_checker.py         pipeline orchestrator
│
└── frontend/
    ├── index.html
    ├── vite.config.js
    ├── package.json
    ├── Dockerfile
    ├── nginx.conf
    ├── .env.example
    │
    └── src/
        ├── main.jsx
        ├── App.jsx
        ├── api.js                    Axios API client
        ├── index.css                 design tokens + global styles
        │
        ├── components/
        │   └── Sidebar.jsx
        │
        └── pages/
            ├── Dashboard.jsx         stats, recent checks, architecture
            ├── SafetyChecker.jsx     main check UI + 6 quick-test buttons
            ├── Patients.jsx          CRUD + medication editor + labs/vitals
            ├── DrugKnowledge.jsx     drug browser + drug-pair checker
            └── History.jsx           filterable check log + stats
```

---

## How the dual-source RAG works

1. Query comes in: drug name + patient ID
2. Source 1: ChromaDB semantic search over drug_knowledge.json — returns the most relevant drug safety chunk (contraindications, interactions, dosing rules)
3. Source 2: ChromaDB direct lookup or semantic search over patient_records.json — returns the patient's labs, allergies, diagnoses, current meds
4. Both chunks are fused into a single prompt
5. Groq LLM (LLaMA 3.1 8B) generates a structured clinical analysis
6. Second LLM call extracts JSON: safety score, alerts with severity levels, monitoring plan
7. Response returned to frontend and saved to check_history.json

---

## Adding more drugs or patients

**Add a drug:** Edit `backend/data/drug_knowledge.json` following the same schema. Restart the backend — ChromaDB re-indexes automatically.

**Add a patient:** Use the Patients page in the UI, or POST to `/api/patients/`.

**Change the LLM:** Edit `GROQ_MODELS` list in `backend/services/llm_service.py`. All models listed are free on Groq.

---

## Disclaimer

This system is a clinical decision support tool intended for use by trained healthcare professionals. It is not a replacement for clinical judgment, pharmacist review, or authoritative prescribing guidelines. Always verify AI-generated alerts against current clinical references.
