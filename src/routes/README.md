# JobOS: AI job-search toolkit

A full-stack web app that helps job seekers get ready and apply: scan a resume against a job description, track applications, practise interviews out loud, and plan referral outreach.

**Live demo:** _add your Vercel URL here_
**Backend repo:** _add your jobos-backend GitHub URL here_

> The backend runs on a free hosting tier and sleeps when idle. The first request after a break can take 30-60 seconds.

## Features

| Module | What it does |
|---|---|
| **Resume Scanner** | Upload a PDF or DOCX resume and paste a job description. Get an ATS-style match score, missing keywords, strengths, and specific improvements. |
| **Job Tracker** | Kanban board (Saved, Applied, Interview, Offer, Rejected) with drag and drop, notes, links and stats. Data is stored in the browser (localStorage). |
| **Mock Interview** | Choose a company, role and round type. An AI interviewer asks 5 questions. Answer by voice (browser Web Speech API) and, on coding questions, in a code board. Each answer is scored, and you get a final report. |
| **Referral Hunter** | Builds LinkedIn search links for alumni, peers, managers and recruiters, then writes connection notes, follow-ups and referral asks from the background you provide. Includes an outreach tracker. |

## Things worth knowing

- Mock interview questions are **AI-generated for the chosen company and role**. They are not scraped from real interview reports.
- Referral Hunter does **not** scrape LinkedIn. It opens LinkedIn searches for you and drafts messages from facts you enter. The AI is instructed not to invent experience.
- Resumes are processed in memory and not saved by the backend. The extracted text is sent to the Groq API for analysis.
- Voice input works best in Chrome. Transcription mistakes can affect the AI's feedback.

## Tech stack

- **Frontend:** React, TypeScript, TanStack Start, Vite
- **Backend:** FastAPI (Python), PyMuPDF, python-docx
- **AI:** Groq API (the model name is configurable)
- **Hosting:** Vercel (frontend), Render (backend)

## Architecture

```
Browser (React)  ->  FastAPI backend  ->  Groq API
   localStorage         PDF/DOCX parsing
 (job + outreach data)  prompt building + JSON validation
```

## Run it locally

**Backend** (in the backend repo)
```bash
python -m venv venv
venv\Scripts\activate            # Windows
pip install -r requirements.txt
# create a .env file containing: GROQ_API_KEY=your_key
python -m uvicorn main:app --reload
```

**Frontend** (this repo)
```bash
npm install
npm run dev                      # http://localhost:8080
```

Optional: set `VITE_API_URL` to point the frontend at a deployed backend. It defaults to `http://127.0.0.1:8000`.

## How it was built

_Edit this section so it is exactly true for you._ Example: "The initial UI scaffold came from Lovable. I extended it locally with the Job Tracker, Mock Interview and Referral Hunter modules, wrote the FastAPI backend and prompts, and deployed both parts. I used Claude as a coding assistant throughout."

## Author

_Your name_ · _LinkedIn link_