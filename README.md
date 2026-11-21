# JobOS: AI job-search toolkit

A full-stack web app that helps job seekers get ready and apply: scan a resume against a job description, track applications, practise interviews out loud, and plan referral outreach.

**Live demo:** https://job-os-frontend-puce.vercel.app
**Frontend repo:** https://github.com/prans8/JobOS-frontend
**Backend repo:** https://github.com/prans8/JobOS-backend

> The backend runs on a free hosting tier and sleeps when idle. The first request after a break can take 30-60 seconds, so give it a moment.

## Features

| Module | What it does |
|---|---|
| **Resume Scanner** | Upload a PDF or DOCX resume and paste a job description. Get an ATS-style match score, missing keywords, strengths, and specific improvements. |
| **Job Tracker** | Kanban board (Saved, Applied, Interview, Offer, Rejected) with drag and drop, notes, links and stats. Data is stored in the browser (localStorage). |
| **Mock Interview** | Choose a company, role and round type. An AI interviewer asks 5 questions. Answer by voice (browser Web Speech API) and, on coding questions, in a code board. Each answer is scored, and you get a final report. |
| **Referral Hunter** | Builds LinkedIn search links for alumni, peers, managers and recruiters, then writes connection notes, follow-ups and referral asks from the background you provide. Includes an outreach tracker. |

## Things worth knowing

- Mock interview questions are **AI-generated for the chosen company and role**. They are not scraped from real interview reports.
- Referral Hunter does **not** scrape LinkedIn. It opens LinkedIn searches for you and drafts messages from facts you enter. The AI is instructed not to invent experience, but you should read every message before sending it.
- The match score and interview scores are AI estimates, not a real ATS result or a hiring decision.
- Resumes are processed in memory and not saved by the backend. The extracted text is sent to the Groq API for analysis.
- There are no user accounts or database. Job Tracker and outreach data stay in your own browser.
- Voice input works best in Chrome. Transcription mistakes can affect the AI's feedback.

## Tech stack

- **Frontend:** React, TypeScript, TanStack Start, Vite
- **Backend:** FastAPI (Python), Pydantic, PyMuPDF, python-docx
- **AI:** Groq API (the model name is configurable)
- **Hosting:** Vercel (frontend), Render (backend)

## Architecture

```
Browser (React)  ->  FastAPI backend  ->  Groq API
   localStorage         PDF/DOCX parsing
 (job + outreach data)  prompt building + JSON parsing
```

## Run it locally

**Backend** (in the backend repo)
```bash
python -m venv venv
venv\Scripts\activate            # Windows  (macOS/Linux: source venv/bin/activate)
pip install -r requirements.txt
# create a .env file containing: GROQ_API_KEY=your_key
python -m uvicorn main:app --reload
```

**Frontend** (this repo)
```bash
npm install
npm run dev                      # http://localhost:8080
```

## Configuration

| Where | Variable | Purpose |
|---|---|---|
| Backend | `GROQ_API_KEY` | Required. Your Groq API key. |
| Backend | `GROQ_MODEL` | Optional. Overrides the default model (`openai/gpt-oss-120b`). |
| Backend | `FRONTEND_ORIGINS` | Deployed frontend address(es), comma separated, so the browser is allowed to call the API (CORS). |
| Frontend | `VITE_API_URL` | Backend address. Defaults to `http://127.0.0.1:8000`. Set at build time. |

## Problems I ran into and fixed

- **A retired AI model.** Groq shut down the model the app was using (`llama-3.3-70b-versatile`), so every AI call failed. I traced it from the backend log, switched models, and made the model name an environment variable.
- **Voice answers sent without their question.** A stale React closure meant the speech handler used first-render state, so the backend rejected the request with a 422. Fixed with the "latest ref" pattern.
- **A blocked deployment.** Vercel refused to build with a TanStack Start version affected by a published XSS vulnerability (CVE-2026-102989). I upgraded the packages and lockfile instead of bypassing the check.
- **CORS.** The backend returned 200, but the browser hid the response until the deployed frontend address was added to the backend's allowed origins.

## How it was built

I decided the product and tested every module end to end: voice-first interviews, a code board for coding questions, and referral messages that don't invent experience. I built it with AI tools doing most of the code writing. Claude was my coding assistant for the frontend modules, the FastAPI backend and the prompts. Lovable generated the initial UI scaffold, which I then extended locally. ChatGPT helped me while troubleshooting the Vercel and Render deployment. I debugged errors from logs and browser tools and deployed both parts.

## Author

Pranjal Shandilya 