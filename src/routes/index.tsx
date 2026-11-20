import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState, type ChangeEvent, type DragEvent } from "react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "JobOS — AI Resume Scanner & ATS Analyzer" },
      {
        name: "description",
        content:
          "Upload your resume, paste a job description, and get an instant ATS match score with a precise fix list — powered by Groq AI.",
      },
      { property: "og:title", content: "JobOS — AI Resume Scanner" },
      {
        property: "og:description",
        content: "Instant ATS analysis with actionable feedback. Land your next callback.",
      },
    ],
  }),
  component: Page,
});

// Backend address. Locally it stays http://127.0.0.1:8000.
// On Vercel, set the VITE_API_URL environment variable to your deployed backend URL.
// @ts-ignore - Vite injects env variables at build time
const API_URL: string = (import.meta.env.VITE_API_URL || "http://127.0.0.1:8000").replace(/\/+$/, "");

// ── Types ──────────────────────────────────────────────────────────────────

type InterviewSetup = {
  company: string;
  role: string;
  round_type: "HR" | "Technical" | "Behavioural";
};

type QuestionFeedback = {
  score: number;
  verdict: string;
  what_went_well: string;
  what_to_improve: string;
  ideal_answer_hint: string;
  interviewer_response: string;
  is_last: boolean;
};

type QAPair = {
  question: string;
  answer: string;
  code?: string;
  score: number;
  verdict: string;
  feedback: QuestionFeedback;
};

type FinalReport = {
  overall_score: number;
  hiring_recommendation: string;
  overall_summary: string;
  strongest_answer: string;
  weakest_area: string;
  top_3_tips: string[];
  encouragement: string;
  avg_score: number;
};

type Analysis = {
  match_score: number;
  strengths: string[];
  missing_keywords: string[];
  improvements: string[];
  summary: string;
};

type Column = "saved" | "applied" | "interview" | "offer" | "rejected";

type Job = {
  id: string;
  company: string;
  role: string;
  link: string;
  date: string;
  notes: string;
  column: Column;
};

// ── Constants ──────────────────────────────────────────────────────────────

const GRADIENT = "linear-gradient(135deg, #6366f1, #a855f7, #ec4899)";
const GRADIENT_BLUE_CYAN = "linear-gradient(135deg, #3b82f6, #06b6d4)";
const GRADIENT_PURPLE_PINK = "linear-gradient(135deg, #a855f7, #ec4899)";

const COLUMNS: { id: Column; label: string; color: string; light: string; gradient: string }[] = [
  { id: "saved",     label: "Saved",     color: "#6366f1", light: "rgba(99,102,241,0.12)",  gradient: "linear-gradient(90deg,#6366f1,#818cf8)" },
  { id: "applied",   label: "Applied",   color: "#06b6d4", light: "rgba(6,182,212,0.12)",   gradient: "linear-gradient(90deg,#06b6d4,#22d3ee)" },
  { id: "interview", label: "Interview", color: "#f59e0b", light: "rgba(245,158,11,0.12)",  gradient: "linear-gradient(90deg,#f59e0b,#fcd34d)" },
  { id: "offer",     label: "Offer",     color: "#10b981", light: "rgba(16,185,129,0.12)",  gradient: "linear-gradient(90deg,#10b981,#34d399)" },
  { id: "rejected",  label: "Rejected",  color: "#f43f5e", light: "rgba(244,63,94,0.12)",   gradient: "linear-gradient(90deg,#f43f5e,#fb7185)" },
];

const EMPTY_FORM: Omit<Job, "id"> = {
  company: "", role: "", link: "", date: "", notes: "", column: "saved",
};

// ── Styles ─────────────────────────────────────────────────────────────────

const STYLES = `
*, *::before, *::after { box-sizing: border-box; }
html, body { background: #0f0f0f; color: #fff; margin: 0; font-family: 'Inter', system-ui, sans-serif; -webkit-font-smoothing: antialiased; }
::selection { background: rgba(168,85,247,0.35); color: #fff; }
textarea { font-family: inherit; }

.jobos-grad-text {
  background: linear-gradient(135deg, #6366f1, #a855f7, #ec4899);
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
}
.jobos-grad-text-bluecyan {
  background: linear-gradient(135deg, #3b82f6, #06b6d4);
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
}
.jobos-grad-text-purplepink {
  background: linear-gradient(135deg, #a855f7, #ec4899);
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
}

.jobos-pill-shimmer {
  background: linear-gradient(110deg, #6366f1 0%, #a855f7 35%, #ec4899 65%, #a855f7 85%, #6366f1 100%);
  background-size: 250% 100%;
  animation: jobos-shimmer 3s linear infinite;
  box-shadow: 0 8px 30px rgba(168,85,247,0.35);
}
@keyframes jobos-shimmer { 0% { background-position: 0% 50%; } 100% { background-position: 250% 50%; } }

@keyframes jobos-fade-up {
  from { opacity: 0; transform: translateY(24px); }
  to { opacity: 1; transform: translateY(0); }
}
.jobos-fade-up { animation: jobos-fade-up 0.6s cubic-bezier(0.22,1,0.36,1) both; }

@keyframes jobos-results-in {
  from { opacity: 0; transform: translateY(16px); }
  to { opacity: 1; transform: translateY(0); }
}
.jobos-results-in { animation: jobos-results-in 0.45s cubic-bezier(0.22,1,0.36,1) both; }

@keyframes jobos-toast-up {
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
}
.jobos-toast { animation: jobos-toast-up 0.3s ease-out both; }

@keyframes jobos-spin { to { transform: rotate(360deg); } }
.jobos-spin { animation: jobos-spin 0.8s linear infinite; }

@keyframes jobos-pulse-glow {
  0%, 100% { box-shadow: 0 0 20px rgba(99,102,241,0.4); }
  50% { box-shadow: 0 0 50px rgba(168,85,247,0.7), 0 0 80px rgba(236,72,153,0.2); }
}

@keyframes jobos-gradient-shift {
  0% { background-position: 0% 50%; }
  100% { background-position: 200% 50%; }
}
.jobos-loading-btn {
  background: linear-gradient(110deg, #6366f1, #a855f7, #ec4899, #a855f7, #6366f1) !important;
  background-size: 200% 100% !important;
  animation: jobos-gradient-shift 2s linear infinite !important;
}

.jobos-card {
  transition: transform 250ms ease, box-shadow 250ms ease, border-color 250ms ease;
}

.jobos-input-card {
  background: #141414;
  border: 1px solid #2a2a2a;
}
.jobos-input-card:hover {
  border-color: #6366f1;
  box-shadow: 0 0 30px rgba(99,102,241,0.15);
}

.jobos-result-card {
  transition: transform 250ms ease, box-shadow 250ms ease, border-color 250ms ease;
}
.jobos-result-card:hover { transform: translateY(-4px); }
.jobos-result-card.green:hover { box-shadow: 0 0 40px rgba(16,185,129,0.2); border-color: rgba(16,185,129,0.5); }
.jobos-result-card.red:hover { box-shadow: 0 0 40px rgba(244,63,94,0.2); border-color: rgba(244,63,94,0.5); }
.jobos-result-card.blue:hover { box-shadow: 0 0 40px rgba(59,130,246,0.2); border-color: rgba(59,130,246,0.5); }
.jobos-result-card.purple:hover { box-shadow: 0 0 40px rgba(168,85,247,0.2); border-color: rgba(168,85,247,0.5); }

.jobos-upload-zone {
  background-image:
    repeating-linear-gradient(0deg, rgba(59,130,246,0.4) 0 8px, transparent 8px 16px),
    repeating-linear-gradient(90deg, rgba(59,130,246,0.4) 0 8px, transparent 8px 16px),
    repeating-linear-gradient(180deg, rgba(59,130,246,0.4) 0 8px, transparent 8px 16px),
    repeating-linear-gradient(270deg, rgba(59,130,246,0.4) 0 8px, transparent 8px 16px);
  background-size: 1px 100%, 100% 1px, 1px 100%, 100% 1px;
  background-position: 0 0, 0 0, 100% 0, 0 100%;
  background-repeat: no-repeat;
  background-color: rgba(59,130,246,0.05);
  transition: background-color 200ms ease;
}
.jobos-upload-zone:hover, .jobos-upload-zone.is-drag {
  background-color: rgba(59,130,246,0.12);
}

.jobos-analyze {
  background: linear-gradient(135deg, #6366f1, #a855f7, #ec4899);
  animation: jobos-pulse-glow 2s ease infinite;
  transition: transform 200ms ease, filter 200ms ease;
}
.jobos-analyze:hover:not(:disabled) {
  filter: brightness(1.1);
  transform: scale(1.02);
}
.jobos-analyze:disabled { filter: grayscale(1) brightness(0.6); cursor: not-allowed; animation: none; }

.jobos-browse {
  background: linear-gradient(135deg, #3b82f6, #06b6d4);
  box-shadow: 0 4px 20px rgba(59,130,246,0.4);
  transition: transform 200ms ease, opacity 200ms ease, box-shadow 200ms ease;
}
.jobos-browse:hover {
  opacity: 0.95;
  transform: scale(1.03);
  box-shadow: 0 6px 28px rgba(59,130,246,0.55);
}

.jobos-textarea { color: #fff; }
.jobos-textarea::placeholder { color: #3f3f46; }
.jobos-textarea:focus { outline: none; }

.jobos-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
.jobos-grid-3 { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 16px; }
.jobos-score-grid { display: grid; grid-template-columns: auto 1fr auto; gap: 32px; align-items: center; }

@media (max-width: 768px) {
  .jobos-grid, .jobos-grid-3 { grid-template-columns: 1fr; }
  .jobos-score-grid { grid-template-columns: 1fr; text-align: center; gap: 20px; justify-items: center; }
  .jobos-hero-h1 { font-size: 40px !important; }
  .jobos-nav-divider, .jobos-nav-sub { display: none; }
}

/* ── Job Tracker Styles ── */
.jt-col-drop.is-over {
  border-color: rgba(99,102,241,0.5) !important;
  background: rgba(99,102,241,0.04) !important;
}
.jt-job-card:hover { transform: translateY(-2px); }
.jt-menu-btn { background: none; border: none; cursor: pointer; color: #52525b; padding: 3px 6px; border-radius: 6px; font-size: 18px; line-height:1; }
.jt-menu-btn:hover { background: rgba(255,255,255,0.06); color: #a1a1aa; }
.jt-add-col-btn { background: none; border: none; cursor: pointer; color: #52525b; font-size: 20px; line-height:1; padding: 2px 5px; border-radius:6px; }
.jt-add-col-btn:hover { background: rgba(255,255,255,0.06); color:#a1a1aa; }
.jt-input {
  width: 100%;
  background: rgba(255,255,255,0.04);
  border: 1px solid #2a2a2a;
  border-radius: 10px;
  padding: 10px 13px;
  color: #fff;
  font-size: 14px;
  font-family: inherit;
  outline: none;
  box-sizing: border-box;
  transition: border-color 200ms ease;
}
.jt-input:focus { border-color: #6366f1; }
.jt-input::placeholder { color: #3f3f46; }
.jt-textarea { resize: vertical; min-height: 80px; line-height: 1.5; }
.jt-save-btn {
  background: linear-gradient(135deg, #6366f1, #a855f7);
  color: #fff; border: none; border-radius: 10px;
  padding: 11px; font-size: 14px; font-weight: 700;
  cursor: pointer; flex: 2;
  box-shadow: 0 4px 16px rgba(99,102,241,0.3);
  transition: opacity 200ms ease;
}
.jt-save-btn:disabled { background: #27272a; color: #52525b; cursor: not-allowed; box-shadow: none; }
.jt-save-btn:not(:disabled):hover { opacity: 0.9; }
.jt-cancel-btn {
  background: transparent; border: 1px solid #2a2a2a;
  color: #a1a1aa; border-radius: 10px;
  padding: 11px; font-size: 14px; font-weight: 600;
  cursor: pointer; flex: 1;
}
.jt-cancel-btn:hover { border-color: #3f3f46; color: #e2e8f0; }
.jt-stage-pill {
  padding: 6px 14px; border-radius: 999px; font-size: 12px;
  font-weight: 600; cursor: pointer; border: 1px solid #2a2a2a;
  background: transparent; color: #71717a; transition: all 150ms ease;
}
@keyframes jt-toast-up {
  from { opacity:0; transform: translateY(16px); }
  to   { opacity:1; transform: translateY(0); }
}
.jt-toast { animation: jt-toast-up 0.3s ease-out both; }

/* ── Mock Interview Styles ── */
.mi-setup-card {
  background: #141414;
  border: 1px solid #2a2a2a;
  border-radius: 20px;
  padding: 32px;
  max-width: 560px;
  margin: 0 auto;
}
.mi-select {
  width: 100%;
  background: rgba(255,255,255,0.04);
  border: 1px solid #2a2a2a;
  border-radius: 10px;
  padding: 12px 14px;
  color: #fff;
  font-size: 15px;
  font-family: inherit;
  outline: none;
  transition: border-color 200ms;
  appearance: none;
  cursor: pointer;
}
.mi-select:focus { border-color: #6366f1; }
.mi-select option { background: #141414; }
.mi-input {
  width: 100%;
  background: rgba(255,255,255,0.04);
  border: 1px solid #2a2a2a;
  border-radius: 10px;
  padding: 12px 14px;
  color: #fff;
  font-size: 15px;
  font-family: inherit;
  outline: none;
  box-sizing: border-box;
  transition: border-color 200ms;
}
.mi-input:focus { border-color: #6366f1; }
.mi-input::placeholder { color: #3f3f46; }
.mi-chat-bubble-ai {
  background: #1a1a2e;
  border: 1px solid rgba(99,102,241,0.2);
  border-radius: 18px 18px 18px 4px;
  padding: 16px 20px;
  max-width: 80%;
  align-self: flex-start;
}
.mi-chat-bubble-user {
  background: rgba(99,102,241,0.12);
  border: 1px solid rgba(99,102,241,0.25);
  border-radius: 18px 18px 4px 18px;
  padding: 16px 20px;
  max-width: 80%;
  align-self: flex-end;
}
.mi-feedback-card {
  background: #141414;
  border: 1px solid #2a2a2a;
  border-radius: 14px;
  padding: 16px 20px;
  margin-top: 10px;
  max-width: 80%;
  align-self: flex-start;
}
.mi-mic-btn {
  width: 72px; height: 72px;
  border-radius: 50%;
  border: none;
  cursor: pointer;
  display: flex; align-items: center; justify-content: center;
  font-size: 28px;
  transition: transform 200ms ease, box-shadow 200ms ease;
}
.mi-mic-btn:hover { transform: scale(1.07); }
@keyframes mi-pulse {
  0%, 100% { box-shadow: 0 0 0 0 rgba(244,63,94,0.4); }
  50% { box-shadow: 0 0 0 16px rgba(244,63,94,0); }
}
.mi-mic-recording { animation: mi-pulse 1.2s ease infinite; }
@keyframes mi-typing {
  0%, 60%, 100% { opacity: 0.3; transform: translateY(0); }
  30% { opacity: 1; transform: translateY(-4px); }
}
.mi-dot { display: inline-block; width: 6px; height: 6px; border-radius: 50%; background: #a5b4fc; margin: 0 2px; animation: mi-typing 1.2s ease infinite; }
.mi-dot:nth-child(2) { animation-delay: 0.2s; }
.mi-dot:nth-child(3) { animation-delay: 0.4s; }
@keyframes mi-fade-in {
  from { opacity: 0; transform: translateY(10px); }
  to   { opacity: 1; transform: translateY(0); }
}
.mi-fade-in { animation: mi-fade-in 0.4s ease both; }
`;

// ── Helpers ────────────────────────────────────────────────────────────────

function loadJobs(): Job[] {
  try { return JSON.parse(localStorage.getItem("jobos_jobs") || "[]"); } catch { return []; }
}
function saveJobsLS(jobs: Job[]) {
  localStorage.setItem("jobos_jobs", JSON.stringify(jobs));
}
function formatDate(iso: string) {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

// ── Root Page ──────────────────────────────────────────────────────────────

function Page() {
  const [activeTab, setActiveTab] = useState<"scanner" | "tracker" | "interview" | "referral">("scanner");

  return (
    <div style={{ minHeight: "100vh", background: "#0f0f0f", color: "#fff" }}>
      <style>{STYLES}</style>

      {/* Navbar */}
      <header style={{ position: "sticky", top: 0, zIndex: 50, background: "#0f0f0f", borderBottom: "1px solid #1f1f1f" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto", height: 64, padding: "0 24px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: GRADIENT_PURPLE_PINK, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 900, fontSize: 18, color: "#fff", boxShadow: "0 4px 20px rgba(168,85,247,0.35)" }}>J</div>
            <span style={{ fontWeight: 700, fontSize: 18 }}>JobOS</span>
            <span className="jobos-nav-divider" style={{ width: 1, height: 20, background: "#1f1f1f" }} />
            <span className="jobos-nav-sub" style={{ color: "#71717a", fontSize: 14 }}>AI Job Platform</span>
          </div>
          <div style={{ display: "inline-flex", alignItems: "center", padding: "6px 14px", borderRadius: 999, background: "rgba(168,85,247,0.08)", border: "1px solid rgba(168,85,247,0.3)", fontSize: 13, fontWeight: 600 }}>
            <span className="jobos-grad-text-purplepink">Powered by Groq AI ⚡</span>
          </div>
        </div>
      </header>

      {/* Tab Bar */}
      <div style={{ background: "#0f0f0f", borderBottom: "1px solid #1f1f1f", position: "sticky", top: 64, zIndex: 40 }}>
        <div style={{ maxWidth: 1100, margin: "0 auto", padding: "0 24px", display: "flex", gap: 4 }}>
          {[
            { id: "scanner",   label: "📄 Resume Scanner" },
            { id: "tracker",   label: "📬 Job Tracker"    },
            { id: "interview", label: "🎤 Mock Interview"  },
            { id: "referral",  label: "🕵️ Referral Hunter" },
          ].map(t => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id as "scanner" | "tracker" | "interview" | "referral")}
              style={{
                background: "none", border: "none", cursor: "pointer",
                padding: "12px 16px", fontSize: 14, fontWeight: 600,
                color: activeTab === t.id ? "#a5b4fc" : "#71717a",
                borderBottom: activeTab === t.id ? "2px solid #6366f1" : "2px solid transparent",
                transition: "all 150ms ease",
              }}
            >{t.label}</button>
          ))}
        </div>
      </div>

      {/* Pages */}
      {activeTab === "scanner"   && <ResumeScanner />}
      {activeTab === "tracker"   && <JobTracker />}
      {activeTab === "interview" && <MockInterview />}
      {activeTab === "referral"  && <ReferralHunter />}
    </div>
  );
}

// ── Resume Scanner ─────────────────────────────────────────────────────────

function ResumeScanner() {
  const [file, setFile] = useState<File | null>(null);
  const [jd, setJd] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<Analysis | null>(null);
  const [drag, setDrag] = useState(false);
  const [toast, setToast] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const canAnalyze = !!file && jd.trim().length > 0 && !loading;

  const handleFiles = (f: FileList | null) => {
    if (!f || f.length === 0) return;
    const picked = f[0];
    if (picked.size > 10 * 1024 * 1024) { setError("File too large. Max 10MB."); return; }
    setFile(picked);
    setError(null);
  };

  const onDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDrag(false);
    handleFiles(e.dataTransfer.files);
  };

  const analyze = async () => {
    if (!canAnalyze || !file) return;
    setLoading(true); setError(null); setResult(null);
    try {
      const fd = new FormData();
      fd.append("resume", file);
      fd.append("job_description", jd);
      const res = await fetch(`${API_URL}/analyze-resume`, { method: "POST", body: fd });
      if (!res.ok) throw new Error("bad");
      const data = (await res.json()) as Analysis;
      setResult(data);
    } catch {
      setError("Unable to connect to backend. Make sure FastAPI is running on port 8000.");
    } finally {
      setLoading(false);
    }
  };

  const copySummary = async () => {
    if (!result) return;
    try { await navigator.clipboard.writeText(result.summary); setToast(true); setTimeout(() => setToast(false), 2500); } catch {}
  };

  return (
    <>
      <main style={{ maxWidth: 1100, margin: "0 auto", padding: "0 24px 80px" }}>
        {/* Hero */}
        <section style={{ paddingTop: 100, textAlign: "center" }} className="jobos-fade-up">
          <div className="jobos-pill-shimmer" style={{ display: "inline-block", padding: "7px 18px", borderRadius: 999, color: "#fff", fontSize: 13, fontWeight: 600, letterSpacing: 0.2 }}>
            ✦ AI-Powered ATS Analysis
          </div>
          <h1 className="jobos-hero-h1" style={{ fontSize: 68, fontWeight: 900, lineHeight: 1.1, margin: "24px 0 0", letterSpacing: -1.8 }}>
            <span style={{ color: "#ffffff", display: "block" }}>Know why you're not</span>
            <span className="jobos-grad-text" style={{ display: "block", textShadow: "0 0 60px rgba(168,85,247,0.5)" }}>getting callbacks.</span>
          </h1>
          <p style={{ fontSize: 18, color: "#71717a", maxWidth: 500, margin: "20px auto 0", lineHeight: 1.6 }}>
            Upload your resume, paste a JD, and get a precise ATS score + fix list in under 5 seconds.
          </p>
          <div style={{ marginTop: 32, display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
            <StatBadge text="⚡ Under 5 seconds" bg="rgba(59,130,246,0.1)" border="rgba(59,130,246,0.4)" color="#60a5fa" />
            <StatBadge text="🎯 ATS Optimized" bg="rgba(168,85,247,0.1)" border="rgba(168,85,247,0.4)" color="#c084fc" />
            <StatBadge text="🔒 Never stored" bg="rgba(16,185,129,0.1)" border="rgba(16,185,129,0.4)" color="#34d399" />
          </div>
        </section>

        {/* Inputs */}
        <section style={{ maxWidth: 920, margin: "56px auto 0" }}>
          <div className="jobos-grid">
            {/* Resume */}
            <div className="jobos-card jobos-input-card" style={{ borderRadius: 20, padding: 24 }}>
              <div className="jobos-grad-text-bluecyan" style={{ fontSize: 11, letterSpacing: "0.1em", fontWeight: 700, marginBottom: 14 }}>YOUR RESUME</div>
              {!file ? (
                <>
                  <div
                    className={`jobos-upload-zone${drag ? " is-drag" : ""}`}
                    onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
                    onDragLeave={() => setDrag(false)}
                    onDrop={onDrop}
                    onClick={() => fileInputRef.current?.click()}
                    style={{ borderRadius: 14, padding: "44px 20px", textAlign: "center", cursor: "pointer" }}
                  >
                    <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="url(#g1)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ margin: "0 auto 12px", display: "block" }}>
                      <defs><linearGradient id="g1" x1="0" x2="1" y1="0" y2="1"><stop offset="0%" stopColor="#3b82f6" /><stop offset="100%" stopColor="#06b6d4" /></linearGradient></defs>
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" />
                    </svg>
                    <div style={{ color: "#fff", fontSize: 15, fontWeight: 600 }}>Drop your resume here</div>
                    <div style={{ color: "#71717a", fontSize: 13, marginTop: 4 }}>PDF or DOCX · Max 10MB</div>
                    <button type="button" onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }} className="jobos-browse" style={{ marginTop: 16, padding: "10px 24px", borderRadius: 999, color: "#fff", fontWeight: 600, fontSize: 14, border: "none", cursor: "pointer" }}>
                      Browse Files
                    </button>
                  </div>
                  <input ref={fileInputRef} type="file" accept=".pdf,.docx,.doc" hidden onChange={(e: ChangeEvent<HTMLInputElement>) => handleFiles(e.target.files)} />
                </>
              ) : (
                <div style={{ background: "rgba(16,185,129,0.08)", border: "1px solid rgba(16,185,129,0.30)", borderRadius: 12, padding: 16, display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{ width: 36, height: 36, borderRadius: 8, background: "rgba(16,185,129,0.15)", display: "flex", alignItems: "center", justifyContent: "center", color: "#10b981", flexShrink: 0 }}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /></svg>
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ color: "#fff", fontSize: 14, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{file.name}</div>
                    <div style={{ color: "#71717a", fontSize: 12 }}>{(file.size / 1024).toFixed(1)} KB</div>
                  </div>
                  <button onClick={() => setFile(null)} style={{ width: 28, height: 28, borderRadius: 8, background: "transparent", border: "1px solid rgba(255,255,255,0.1)", color: "#71717a", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>×</button>
                </div>
              )}
            </div>

            {/* JD */}
            <div className="jobos-card jobos-input-card" style={{ borderRadius: 20, padding: 24, display: "flex", flexDirection: "column" }}>
              <div className="jobos-grad-text-purplepink" style={{ fontSize: 11, letterSpacing: "0.1em", fontWeight: 700, marginBottom: 14 }}>JOB DESCRIPTION</div>
              <textarea className="jobos-textarea" placeholder="Paste the job description here..." value={jd} onChange={(e) => setJd(e.target.value)} style={{ width: "100%", minHeight: 220, background: "transparent", border: "none", fontSize: 15, lineHeight: 1.6, resize: "none" }} />
              <div style={{ borderTop: "1px solid #1f1f1f", paddingTop: 10, marginTop: 8, textAlign: "right", color: "#52525b", fontSize: 13 }}>{jd.length} chars</div>
            </div>
          </div>

          <button disabled={!canAnalyze} onClick={analyze} className={`jobos-analyze${loading ? " jobos-loading-btn" : ""}`} style={{ marginTop: 16, width: "100%", height: 56, borderRadius: 14, border: "none", color: "#fff", fontSize: 18, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 10 }}>
            {loading ? (
              <><span className="jobos-spin" style={{ width: 18, height: 18, border: "2px solid rgba(255,255,255,0.35)", borderTopColor: "#fff", borderRadius: "50%", display: "inline-block" }} />Analyzing your resume...</>
            ) : <>✨ Analyze Resume →</>}
          </button>

          {error && (
            <div style={{ marginTop: 16, background: "rgba(244,63,94,0.08)", border: "1px solid rgba(244,63,94,0.25)", borderRadius: 12, padding: "14px 18px", color: "#f43f5e", display: "flex", alignItems: "center", gap: 10, fontSize: 14, fontWeight: 500 }}>
              <span>⚠</span>{error}
            </div>
          )}
        </section>

        {result && <Results data={result} onCopy={copySummary} />}
      </main>

      {toast && (
        <div className="jobos-toast" style={{ position: "fixed", bottom: 24, right: 24, background: "#18181b", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 999, padding: "12px 20px", color: "#fff", fontSize: 14, fontWeight: 500, display: "flex", alignItems: "center", gap: 8, zIndex: 100, boxShadow: "0 10px 40px rgba(0,0,0,0.5)" }}>
          <span style={{ color: "#10b981" }}>✓</span> Copied to clipboard
        </div>
      )}
    </>
  );
}

// ── Job Tracker ────────────────────────────────────────────────────────────

function JobTracker() {
  const [jobs, setJobs] = useState<Job[]>(loadJobs);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState<Omit<Job, "id">>(EMPTY_FORM);
  const [editId, setEditId] = useState<string | null>(null);
  const [dragId, setDragId] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState<Column | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState<string | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => { saveJobsLS(jobs); }, [jobs]);

  function showToast(msg: string) {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast(msg);
    toastTimer.current = setTimeout(() => setToast(null), 2500);
  }

  function openAdd(col: Column) {
    setEditId(null);
    setForm({ ...EMPTY_FORM, column: col, date: new Date().toISOString().split("T")[0] });
    setModal(true);
  }

  function openEdit(job: Job) {
    setEditId(job.id);
    setForm({ company: job.company, role: job.role, link: job.link, date: job.date, notes: job.notes, column: job.column });
    setModal(true);
    setMenuOpen(null);
  }

  function saveJob() {
    if (!form.company.trim() || !form.role.trim()) return;
    if (editId) {
      setJobs(prev => prev.map(j => j.id === editId ? { ...j, ...form } : j));
      showToast("Job updated ✓");
    } else {
      setJobs(prev => [...prev, { id: Date.now().toString(), ...form }]);
      showToast("Job added ✓");
    }
    setModal(false);
  }

  function deleteJob(id: string) {
    setJobs(prev => prev.filter(j => j.id !== id));
    setDeleteId(null);
    showToast("Job removed");
  }

  function moveJob(jobId: string, toCol: Column) {
    setJobs(prev => prev.map(j => j.id === jobId ? { ...j, column: toCol } : j));
    const label = COLUMNS.find(c => c.id === toCol)?.label;
    showToast(`Moved to ${label} ✓`);
    setMenuOpen(null);
  }

  function onDrop(col: Column) {
    if (dragId) moveJob(dragId, col);
    setDragId(null);
    setDragOver(null);
  }

  const stats = {
    total: jobs.length,
    applied: jobs.filter(j => j.column === "applied").length,
    interviews: jobs.filter(j => j.column === "interview").length,
    offers: jobs.filter(j => j.column === "offer").length,
  };

  return (
    <div style={{ paddingBottom: 60 }}>
      <div style={{ padding: "40px 24px 0", maxWidth: 1200, margin: "0 auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 16, marginBottom: 28 }}>
          <div>
            <h2 style={{ color: "#fff", fontSize: 24, fontWeight: 800, margin: "0 0 4px", display: "flex", alignItems: "center", gap: 10 }}>
              📬 Job Tracker
              <span style={{ background: "rgba(99,102,241,0.15)", border: "1px solid rgba(99,102,241,0.3)", color: "#a5b4fc", fontSize: 13, padding: "2px 10px", borderRadius: 999, fontWeight: 600 }}>{jobs.length}</span>
            </h2>
            <p style={{ color: "#71717a", margin: 0, fontSize: 14 }}>Track every application from saved to offer</p>
          </div>
          <button onClick={() => openAdd("saved")} style={{ background: "linear-gradient(135deg, #6366f1, #a855f7)", color: "#fff", border: "none", padding: "10px 20px", borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: 8, boxShadow: "0 4px 20px rgba(99,102,241,0.35)" }}>
            + Add Job
          </button>
        </div>

        {/* Stats */}
        <div style={{ display: "flex", gap: 12, marginBottom: 32, flexWrap: "wrap" }}>
          {[
            { label: "Total Tracked", value: stats.total,       color: "#a5b4fc", bg: "rgba(99,102,241,0.1)",  border: "rgba(99,102,241,0.2)"  },
            { label: "Applied",       value: stats.applied,     color: "#67e8f9", bg: "rgba(6,182,212,0.1)",   border: "rgba(6,182,212,0.2)"   },
            { label: "Interviews",    value: stats.interviews,  color: "#fcd34d", bg: "rgba(245,158,11,0.1)",  border: "rgba(245,158,11,0.2)"  },
            { label: "Offers",        value: stats.offers,      color: "#6ee7b7", bg: "rgba(16,185,129,0.1)",  border: "rgba(16,185,129,0.2)"  },
          ].map(s => (
            <div key={s.label} style={{ background: s.bg, border: `1px solid ${s.border}`, borderRadius: 12, padding: "10px 18px", display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ color: s.color, fontSize: 22, fontWeight: 900 }}>{s.value}</span>
              <span style={{ color: "#71717a", fontSize: 13 }}>{s.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Kanban */}
      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 16px", display: "flex", gap: 12, overflowX: "auto", alignItems: "flex-start" }}>
        {COLUMNS.map(col => {
          const colJobs = jobs.filter(j => j.column === col.id);
          const isOver = dragOver === col.id;
          return (
            <div key={col.id} className={`jt-col-drop${isOver ? " is-over" : ""}`}
              onDragOver={e => { e.preventDefault(); setDragOver(col.id); }}
              onDragLeave={() => setDragOver(null)}
              onDrop={() => onDrop(col.id)}
              style={{ flex: "0 0 220px", minWidth: 220, minHeight: 200, background: "#141414", border: "1px solid #2a2a2a", borderRadius: 16, padding: "14px 12px", transition: "border-color 200ms, background 200ms" }}
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                  <span style={{ width: 8, height: 8, borderRadius: "50%", background: col.color, display: "inline-block", boxShadow: `0 0 6px ${col.color}` }} />
                  <span style={{ color: "#e2e8f0", fontSize: 13, fontWeight: 700 }}>{col.label}</span>
                  <span style={{ background: col.light, color: col.color, fontSize: 11, fontWeight: 700, padding: "1px 7px", borderRadius: 999 }}>{colJobs.length}</span>
                </div>
                <button className="jt-add-col-btn" onClick={() => openAdd(col.id)}>+</button>
              </div>
              <div style={{ height: 2, background: col.gradient, borderRadius: 2, marginBottom: 10 }} />
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {colJobs.length === 0 && (
                  <div style={{ border: "1px dashed #27272a", borderRadius: 10, padding: "20px 0", textAlign: "center", color: "#3f3f46", fontSize: 13 }}>Drop here</div>
                )}
                {colJobs.map(job => (
                  <JobCard key={job.id} job={job} col={col}
                    menuOpen={menuOpen === job.id}
                    onMenuToggle={() => setMenuOpen(menuOpen === job.id ? null : job.id)}
                    onMenuClose={() => setMenuOpen(null)}
                    onEdit={() => openEdit(job)}
                    onDelete={() => { setDeleteId(job.id); setMenuOpen(null); }}
                    onMove={(toCol) => moveJob(job.id, toCol)}
                    onDragStart={() => setDragId(job.id)}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal */}
      {modal && (
        <div onClick={e => { if (e.target === e.currentTarget) setModal(false); }}
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 200, padding: 16 }}>
          <div style={{ background: "#141414", border: "1px solid #2a2a2a", borderRadius: 20, padding: 28, width: "100%", maxWidth: 440, boxShadow: "0 24px 80px rgba(0,0,0,0.6)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 22 }}>
              <h3 style={{ color: "#fff", fontWeight: 800, fontSize: 18, margin: 0 }}>{editId ? "Edit Job" : "Add Job"}</h3>
              <button onClick={() => setModal(false)} style={{ background: "none", border: "none", color: "#71717a", cursor: "pointer", fontSize: 22 }}>×</button>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {[
                { key: "company", label: "Company *",  placeholder: "e.g. Google"            },
                { key: "role",    label: "Role *",     placeholder: "e.g. Software Engineer"  },
                { key: "link",    label: "Job Link",   placeholder: "https://..."             },
              ].map(f => (
                <div key={f.key}>
                  <div style={{ color: "#71717a", fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6 }}>{f.label}</div>
                  <input className="jt-input" value={(form as any)[f.key]} onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))} placeholder={f.placeholder} />
                </div>
              ))}
              <div>
                <div style={{ color: "#71717a", fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6 }}>Date Applied</div>
                <input type="date" className="jt-input" value={form.date} onChange={e => setForm(p => ({ ...p, date: e.target.value }))} style={{ colorScheme: "dark" }} />
              </div>
              <div>
                <div style={{ color: "#71717a", fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>Stage</div>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  {COLUMNS.map(c => (
                    <button key={c.id} className="jt-stage-pill" onClick={() => setForm(p => ({ ...p, column: c.id }))}
                      style={form.column === c.id ? { background: c.light, border: `1px solid ${c.color}`, color: c.color } : {}}
                    >{c.label}</button>
                  ))}
                </div>
              </div>
              <div>
                <div style={{ color: "#71717a", fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6 }}>Notes</div>
                <textarea className="jt-input jt-textarea" value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} placeholder="Recruiter name, salary, next steps..." />
              </div>
            </div>
            <div style={{ display: "flex", gap: 10, marginTop: 22 }}>
              <button className="jt-cancel-btn" onClick={() => setModal(false)}>Cancel</button>
              <button className="jt-save-btn" onClick={saveJob} disabled={!form.company.trim() || !form.role.trim()}>{editId ? "Save Changes" : "Add Job"}</button>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirm */}
      {deleteId && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 200 }}>
          <div style={{ background: "#141414", border: "1px solid rgba(244,63,94,0.3)", borderRadius: 16, padding: 28, maxWidth: 320, width: "90%", textAlign: "center" }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>🗑️</div>
            <div style={{ color: "#fff", fontWeight: 700, fontSize: 16, marginBottom: 8 }}>Remove this job?</div>
            <div style={{ color: "#71717a", fontSize: 14, marginBottom: 22 }}>This can't be undone.</div>
            <div style={{ display: "flex", gap: 10 }}>
              <button className="jt-cancel-btn" style={{ flex: 1 }} onClick={() => setDeleteId(null)}>Cancel</button>
              <button onClick={() => deleteJob(deleteId)} style={{ flex: 1, padding: "10px", borderRadius: 10, border: "none", background: "#f43f5e", color: "#fff", cursor: "pointer", fontWeight: 700, fontSize: 14 }}>Remove</button>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div className="jt-toast" style={{ position: "fixed", bottom: 28, right: 28, zIndex: 300, background: "#18181b", border: "1px solid rgba(255,255,255,0.1)", color: "#fff", padding: "12px 20px", borderRadius: 999, fontSize: 14, fontWeight: 600, display: "flex", alignItems: "center", gap: 8, boxShadow: "0 8px 32px rgba(0,0,0,0.5)" }}>
          <span style={{ color: "#10b981" }}>✓</span> {toast}
        </div>
      )}
    </div>
  );
}

// ── Referral Hunter ────────────────────────────────────────────────────────

type ContactTypeId = "recruiter" | "hiring_manager" | "alumni" | "peer";
type OutreachStatus = "to_message" | "messaged" | "replied" | "referred" | "no_reply";

type ReferralProfile = {
  company: string;
  role: string;
  yourName: string;
  college: string;
  background: string;
  jobLink: string;
};

type ReferralMessages = {
  connection_note: string;
  follow_up_message: string;
  referral_ask: string;
  tip: string;
};

type OutreachContact = {
  id: string;
  name: string;
  title: string;
  type: ContactTypeId;
  company: string;
  status: OutreachStatus;
  date: string;
};

const EMPTY_PROFILE: ReferralProfile = { company: "", role: "", yourName: "", college: "", background: "", jobLink: "" };

function linkedinPeopleSearch(keywords: string) {
  return "https://www.linkedin.com/search/results/people/?keywords=" + encodeURIComponent(keywords) + "&origin=GLOBAL_SEARCH_HEADER";
}

const CONTACT_TYPES: {
  id: ContactTypeId; label: string; icon: string; color: string; why: string;
  query: (p: ReferralProfile) => string | null;
}[] = [
  { id: "alumni", label: "Alumni from your college", icon: "🎓", color: "#a855f7",
    why: "Usually the best reply rate. A shared college is an instant reason to respond.",
    query: p => (p.college.trim() ? `${p.college.trim()} ${p.company.trim()}` : null) },
  { id: "peer", label: "People in the same role", icon: "👥", color: "#3b82f6",
    why: "They know the team and how hiring really works. Ask for advice first, referral later.",
    query: p => `${p.company.trim()} ${p.role.trim()}` },
  { id: "hiring_manager", label: "Hiring / engineering managers", icon: "🧭", color: "#f59e0b",
    why: "They decide who gets interviewed. Keep the message short and specific.",
    query: p => `${p.company.trim()} ${p.role.trim()} manager` },
  { id: "recruiter", label: "Recruiters / talent acquisition", icon: "📣", color: "#10b981",
    why: "They can tell you if the role is still open and how to get your resume seen.",
    query: p => `${p.company.trim()} recruiter talent acquisition` },
];

const OUTREACH_STATUSES: { id: OutreachStatus; label: string; color: string }[] = [
  { id: "to_message", label: "To message", color: "#a1a1aa" },
  { id: "messaged",   label: "Messaged",   color: "#06b6d4" },
  { id: "replied",    label: "Replied",    color: "#f59e0b" },
  { id: "referred",   label: "Referred 🎉", color: "#10b981" },
  { id: "no_reply",   label: "No reply",   color: "#f43f5e" },
];

function ReferralHunter() {
  const [profile, setProfile] = useState<ReferralProfile>(EMPTY_PROFILE);
  const [started, setStarted] = useState(false);
  const [activeType, setActiveType] = useState<ContactTypeId | null>(null);
  const [contactName, setContactName] = useState("");
  const [contactTitle, setContactTitle] = useState("");
  const [messages, setMessages] = useState<ReferralMessages | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [contacts, setContacts] = useState<OutreachContact[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("jobos_referrals");
      if (raw) setContacts(JSON.parse(raw));
    } catch {}
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (!loaded) return;
    try { localStorage.setItem("jobos_referrals", JSON.stringify(contacts)); } catch {}
  }, [contacts, loaded]);

  function showToast(msg: string) {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast(msg);
    toastTimer.current = setTimeout(() => setToast(null), 2200);
  }

  async function copyText(text: string, label: string) {
    try { await navigator.clipboard.writeText(text); showToast(`${label} copied`); }
    catch { showToast("Couldn't copy. Select the text and copy it manually."); }
  }

  const canStart = profile.company.trim() && profile.role.trim();
  const activeMeta = CONTACT_TYPES.find(c => c.id === activeType) || null;

  function openWriter(id: ContactTypeId) {
    setActiveType(id);
    setMessages(null);
    setError(null);
    setContactName("");
    setContactTitle("");
    setTimeout(() => document.getElementById("rh-writer")?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
  }

  async function generate() {
    if (!activeType) return;
    setLoading(true);
    setError(null);
    setMessages(null);
    try {
      let res: Response;
      try {
        res = await fetch(`${API_URL}/referral/messages`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            company: profile.company.trim(),
            role: profile.role.trim(),
            contact_type: activeType,
            contact_name: contactName.trim(),
            contact_title: contactTitle.trim(),
            your_name: profile.yourName.trim(),
            your_college: profile.college.trim(),
            your_background: profile.background.trim(),
            job_link: profile.jobLink.trim(),
          }),
        });
      } catch {
        throw new Error("unreachable");
      }
      if (!res.ok) throw new Error("status:" + res.status);
      setMessages(await res.json());
    } catch (e) {
      const msg = e instanceof Error ? e.message : "";
      if (msg === "unreachable") setError("Can't reach the backend. Make sure FastAPI is running on port 8000.");
      else if (msg.startsWith("status:")) setError(`The backend returned an error (${msg.slice(7)}). Check the backend terminal for details.`);
      else setError("Something went wrong reading the reply. Try again.");
    } finally {
      setLoading(false);
    }
  }

  function saveContact() {
    if (!activeType || !contactName.trim()) return;
    setContacts(prev => [{
      id: Date.now().toString(),
      name: contactName.trim(),
      title: contactTitle.trim(),
      type: activeType,
      company: profile.company.trim(),
      status: "to_message",
      date: new Date().toISOString().split("T")[0],
    }, ...prev]);
    showToast("Added to outreach tracker");
  }

  const stats = {
    total: contacts.length,
    messaged: contacts.filter(c => c.status === "messaged").length,
    replied: contacts.filter(c => c.status === "replied").length,
    referred: contacts.filter(c => c.status === "referred").length,
  };

  const label = (t: string) => (
    <div style={{ color: "#71717a", fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6 }}>{t}</div>
  );

  return (
    <main style={{ maxWidth: 1000, margin: "0 auto", padding: "0 24px 90px" }}>
      {/* Hero */}
      <section style={{ paddingTop: 70, textAlign: "center" }} className="jobos-fade-up">
        <div className="jobos-pill-shimmer" style={{ display: "inline-block", padding: "7px 18px", borderRadius: 999, color: "#fff", fontSize: 13, fontWeight: 600 }}>
          🕵️ Referral Hunter
        </div>
        <h1 style={{ fontSize: 46, fontWeight: 900, lineHeight: 1.15, margin: "22px 0 0", letterSpacing: -1.2 }}>
          <span style={{ color: "#fff", display: "block" }}>Skip the portal.</span>
          <span className="jobos-grad-text" style={{ display: "block" }}>Get referred.</span>
        </h1>
        <p style={{ fontSize: 16, color: "#71717a", maxWidth: 520, margin: "16px auto 0", lineHeight: 1.6 }}>
          Find the right people at your target company, send messages that sound human, and track every reply.
        </p>
        <div style={{ marginTop: 22, display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
          {["1  Tell us the role", "2  Find people on LinkedIn", "3  Send the right message", "4  Track replies"].map(t => (
            <span key={t} style={{ background: "rgba(255,255,255,0.04)", border: "1px solid #2a2a2a", color: "#a1a1aa", fontSize: 12.5, padding: "6px 14px", borderRadius: 999 }}>{t}</span>
          ))}
        </div>
      </section>

      {/* Step 1: profile form */}
      <section className="jobos-card jobos-input-card" style={{ borderRadius: 20, padding: 26, marginTop: 40 }}>
        <div className="jobos-grad-text-purplepink" style={{ fontSize: 11, letterSpacing: "0.1em", fontWeight: 700, marginBottom: 16 }}>STEP 1 · THE ROLE AND YOU</div>
        <div className="jobos-grid" style={{ gap: 14 }}>
          <div>{label("Target company *")}<input className="jt-input" placeholder="e.g. Capgemini" value={profile.company} onChange={e => setProfile(p => ({ ...p, company: e.target.value }))} /></div>
          <div>{label("Role you want *")}<input className="jt-input" placeholder="e.g. Software Engineer" value={profile.role} onChange={e => setProfile(p => ({ ...p, role: e.target.value }))} /></div>
          <div>{label("Your name")}<input className="jt-input" placeholder="Used to sign your messages" value={profile.yourName} onChange={e => setProfile(p => ({ ...p, yourName: e.target.value }))} /></div>
          <div>{label("Your college (for alumni search)")}<input className="jt-input" placeholder="e.g. Graphic Era University" value={profile.college} onChange={e => setProfile(p => ({ ...p, college: e.target.value }))} /></div>
        </div>
        <div style={{ marginTop: 14 }}>
          {label("Your background (2-3 lines: skills, projects, internships)")}
          <textarea className="jt-input jt-textarea" placeholder="e.g. Final-year CSE student. Built JobOS, a full-stack AI job platform with FastAPI and React. Python, SQL, REST APIs." value={profile.background} onChange={e => setProfile(p => ({ ...p, background: e.target.value }))} />
          <div style={{ color: "#52525b", fontSize: 12, marginTop: 6 }}>The AI only uses what you write here. It won't invent experience for you.</div>
        </div>
        <div style={{ marginTop: 14 }}>
          {label("Job link (optional)")}
          <input className="jt-input" placeholder="https://..." value={profile.jobLink} onChange={e => setProfile(p => ({ ...p, jobLink: e.target.value }))} />
        </div>
        <button
          disabled={!canStart}
          onClick={() => setStarted(true)}
          className="jobos-analyze"
          style={{ marginTop: 20, width: "100%", height: 50, borderRadius: 12, border: "none", color: "#fff", fontSize: 16, fontWeight: 700, cursor: canStart ? "pointer" : "not-allowed" }}
        >
          🕵️ Find people to contact
        </button>
      </section>

      {/* Step 2: people to contact */}
      {started && canStart && (
        <section style={{ marginTop: 36 }} className="jobos-results-in">
          <div className="jobos-grad-text-bluecyan" style={{ fontSize: 11, letterSpacing: "0.1em", fontWeight: 700, marginBottom: 6 }}>STEP 2 · WHO TO REACH OUT TO AT {profile.company.trim().toUpperCase()}</div>
          <p style={{ color: "#71717a", fontSize: 13.5, margin: "0 0 16px", lineHeight: 1.6 }}>
            These buttons open LinkedIn searches in a new tab (you need to be logged in). JobOS never reads LinkedIn. Pick a person, then come back and write their message.
          </p>
          <div className="jobos-grid">
            {CONTACT_TYPES.map(ct => {
              const q = ct.query(profile);
              const isActive = activeType === ct.id;
              return (
                <div key={ct.id} className="jobos-card" style={{ background: "#141414", border: `1px solid ${isActive ? ct.color : "#2a2a2a"}`, borderTop: `3px solid ${ct.color}`, borderRadius: 16, padding: 20, boxShadow: isActive ? `0 0 30px ${ct.color}22` : "none" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                    <span style={{ fontSize: 22 }}>{ct.icon}</span>
                    <span style={{ color: "#fff", fontWeight: 700, fontSize: 15 }}>{ct.label}</span>
                  </div>
                  <div style={{ color: "#a1a1aa", fontSize: 13, lineHeight: 1.55, minHeight: 40 }}>{ct.why}</div>
                  <div style={{ display: "flex", gap: 8, marginTop: 14, flexWrap: "wrap" }}>
                    {q ? (
                      <a href={linkedinPeopleSearch(q)} target="_blank" rel="noreferrer" style={{ textDecoration: "none", background: "rgba(255,255,255,0.05)", border: "1px solid #2a2a2a", color: "#e2e8f0", borderRadius: 999, padding: "8px 14px", fontSize: 12.5, fontWeight: 600 }}>
                        Search on LinkedIn ↗
                      </a>
                    ) : (
                      <span style={{ color: "#52525b", fontSize: 12.5, padding: "8px 0" }}>Add your college in Step 1 to search</span>
                    )}
                    <button onClick={() => openWriter(ct.id)} style={{ background: `${ct.color}22`, border: `1px solid ${ct.color}66`, color: ct.color, borderRadius: 999, padding: "8px 14px", fontSize: 12.5, fontWeight: 700, cursor: "pointer" }}>
                      ✍ Write message
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Step 3: message writer */}
      {started && canStart && activeMeta && (
        <section id="rh-writer" style={{ marginTop: 36 }} className="jobos-results-in">
          <div className="jobos-grad-text-purplepink" style={{ fontSize: 11, letterSpacing: "0.1em", fontWeight: 700, marginBottom: 12 }}>STEP 3 · WRITE TO: {activeMeta.label.toUpperCase()}</div>
          <div className="jobos-input-card" style={{ borderRadius: 20, padding: 24 }}>
            <p style={{ color: "#71717a", fontSize: 13.5, margin: "0 0 14px", lineHeight: 1.6 }}>
              Found someone on LinkedIn? Add their name and title so the message feels personal. You can also leave both blank and fill in the [Name] placeholder yourself.
            </p>
            <div className="jobos-grid" style={{ gap: 14 }}>
              <div>{label("Their name")}<input className="jt-input" placeholder="e.g. Priya Sharma" value={contactName} onChange={e => setContactName(e.target.value)} /></div>
              <div>{label("Their title")}<input className="jt-input" placeholder="e.g. Senior Engineer" value={contactTitle} onChange={e => setContactTitle(e.target.value)} /></div>
            </div>
            <div style={{ display: "flex", gap: 10, marginTop: 16, flexWrap: "wrap" }}>
              <button onClick={generate} disabled={loading} className={`jobos-analyze${loading ? " jobos-loading-btn" : ""}`} style={{ flex: 2, minWidth: 200, height: 46, borderRadius: 12, border: "none", color: "#fff", fontSize: 15, fontWeight: 700, cursor: loading ? "not-allowed" : "pointer" }}>
                {loading ? "Writing your messages..." : "✨ Generate messages"}
              </button>
              <button onClick={saveContact} disabled={!contactName.trim()} style={{ flex: 1, minWidth: 150, height: 46, borderRadius: 12, background: "transparent", border: "1px solid #2a2a2a", color: contactName.trim() ? "#e2e8f0" : "#52525b", fontSize: 14, fontWeight: 600, cursor: contactName.trim() ? "pointer" : "not-allowed" }}>
                + Save to tracker
              </button>
            </div>

            {error && (
              <div style={{ marginTop: 14, background: "rgba(244,63,94,0.08)", border: "1px solid rgba(244,63,94,0.25)", borderRadius: 12, padding: "12px 16px", color: "#f43f5e", fontSize: 13.5 }}>⚠ {error}</div>
            )}

            {messages && (
              <div style={{ marginTop: 20, display: "flex", flexDirection: "column", gap: 14 }}>
                {[
                  { key: "connection_note", title: "1 · Connection request note", hint: "Send with the connection request", text: messages.connection_note, limit: 200 },
                  { key: "follow_up_message", title: "2 · After they accept", hint: "Ask one easy question. No referral yet.", text: messages.follow_up_message, limit: 0 },
                  { key: "referral_ask", title: "3 · The referral ask", hint: "Send after they've replied", text: messages.referral_ask, limit: 0 },
                ].map(m => (
                  <div key={m.key} style={{ background: "#0f0f0f", border: "1px solid #2a2a2a", borderRadius: 14, padding: 16 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, marginBottom: 8 }}>
                      <div>
                        <div style={{ color: "#fff", fontWeight: 700, fontSize: 14 }}>{m.title}</div>
                        <div style={{ color: "#52525b", fontSize: 12 }}>{m.hint}</div>
                      </div>
                      <button onClick={() => copyText(m.text, "Message")} style={{ background: "rgba(168,85,247,0.1)", border: "1px solid rgba(168,85,247,0.3)", color: "#c084fc", borderRadius: 8, padding: "6px 12px", fontSize: 12, fontWeight: 600, cursor: "pointer", flexShrink: 0 }}>Copy</button>
                    </div>
                    <div style={{ color: "#e2e8f0", fontSize: 14, lineHeight: 1.7, whiteSpace: "pre-wrap" }}>{m.text}</div>
                    {m.limit > 0 && (
                      <div style={{ marginTop: 8, fontSize: 12, color: m.text.length > m.limit ? "#f43f5e" : "#52525b" }}>
                        {m.text.length} characters{m.text.length > m.limit ? ` (over ${m.limit}. LinkedIn's note limit depends on your account, so trim it if it gets cut off)` : ` (limit varies by account, ${m.limit} is the safe length)`}
                      </div>
                    )}
                  </div>
                ))}
                {messages.tip && (
                  <div style={{ background: "rgba(245,158,11,0.07)", border: "1px solid rgba(245,158,11,0.25)", borderRadius: 12, padding: "12px 16px", color: "#fbbf24", fontSize: 13.5, lineHeight: 1.6 }}>💡 {messages.tip}</div>
                )}
                <div style={{ color: "#52525b", fontSize: 12 }}>Read each message before sending. Edit anything that doesn't sound like you.</div>
              </div>
            )}
          </div>
        </section>
      )}

      {/* Step 4: outreach tracker */}
      <section style={{ marginTop: 44 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12, marginBottom: 14 }}>
          <div className="jobos-grad-text-bluecyan" style={{ fontSize: 11, letterSpacing: "0.1em", fontWeight: 700 }}>STEP 4 · OUTREACH TRACKER</div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {[
              { l: "Saved", v: stats.total, c: "#a5b4fc" },
              { l: "Messaged", v: stats.messaged, c: "#67e8f9" },
              { l: "Replied", v: stats.replied, c: "#fcd34d" },
              { l: "Referred", v: stats.referred, c: "#6ee7b7" },
            ].map(s => (
              <span key={s.l} style={{ background: "#141414", border: "1px solid #2a2a2a", borderRadius: 999, padding: "5px 12px", fontSize: 12.5, color: "#a1a1aa" }}>
                <b style={{ color: s.c }}>{s.v}</b> {s.l}
              </span>
            ))}
          </div>
        </div>

        {contacts.length === 0 ? (
          <div style={{ border: "1px dashed #27272a", borderRadius: 14, padding: "28px 16px", textAlign: "center", color: "#52525b", fontSize: 14 }}>
            No contacts yet. Generate a message above and click “Save to tracker”.
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {contacts.map(c => {
              const meta = CONTACT_TYPES.find(t => t.id === c.type);
              const st = OUTREACH_STATUSES.find(s => s.id === c.status);
              return (
                <div key={c.id} style={{ background: "#141414", border: "1px solid #2a2a2a", borderLeft: `3px solid ${st?.color ?? "#2a2a2a"}`, borderRadius: 12, padding: "12px 16px", display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
                  <div style={{ flex: 1, minWidth: 180 }}>
                    <div style={{ color: "#fff", fontWeight: 700, fontSize: 14.5 }}>{c.name}</div>
                    <div style={{ color: "#71717a", fontSize: 12.5, marginTop: 2 }}>
                      {[c.title, c.company].filter(Boolean).join(" · ")} · {meta?.icon} {meta?.label} · {c.date}
                    </div>
                  </div>
                  <select
                    value={c.status}
                    onChange={e => setContacts(prev => prev.map(x => x.id === c.id ? { ...x, status: e.target.value as OutreachStatus } : x))}
                    style={{ background: "#0f0f0f", border: `1px solid ${st?.color ?? "#2a2a2a"}66`, color: st?.color ?? "#e2e8f0", borderRadius: 8, padding: "6px 10px", fontSize: 12.5, fontWeight: 600, outline: "none", cursor: "pointer" }}
                  >
                    {OUTREACH_STATUSES.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
                  </select>
                  <button onClick={() => setContacts(prev => prev.filter(x => x.id !== c.id))} aria-label="Remove contact" style={{ background: "none", border: "none", color: "#52525b", cursor: "pointer", fontSize: 18 }}>×</button>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {toast && (
        <div className="jobos-toast" style={{ position: "fixed", bottom: 24, right: 24, background: "#18181b", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 999, padding: "12px 20px", color: "#fff", fontSize: 14, fontWeight: 500, display: "flex", alignItems: "center", gap: 8, zIndex: 100, boxShadow: "0 10px 40px rgba(0,0,0,0.5)" }}>
          <span style={{ color: "#10b981" }}>✓</span> {toast}
        </div>
      )}
    </main>
  );
}

// ── Mock Interview Coach ───────────────────────────────────────────────────

const ROUND_TYPES: { id: InterviewSetup["round_type"]; label: string }[] = [
  { id: "HR", label: "HR Round" },
  { id: "Technical", label: "Technical Round" },
  { id: "Behavioural", label: "Behavioural Round" },
];

const CODE_LANGUAGES = ["Python", "JavaScript", "Java", "C++", "SQL", "Other"];
const CODING_HINTS = /\b(write|implement|code|coding|function|algorithm|program|query|sql|script|class|array|string|linked list|tree|graph|complexity|debug|refactor|endpoint)\b/i;

type ConversationTurn =
  | { type: "ai"; text: string }
  | { type: "user"; text: string; code?: string; language?: string }
  | { type: "feedback"; data: QuestionFeedback };

function MockInterview() {
  const [stage, setStage] = useState<"setup" | "live" | "report">("setup");
  const [setup, setSetup] = useState<InterviewSetup>({ company: "", role: "", round_type: "Technical" });
  const [questions, setQuestions] = useState<string[]>([]);
  const [qIndex, setQIndex] = useState(0);
  const [turns, setTurns] = useState<ConversationTurn[]>([]);
  const [qaPairs, setQaPairs] = useState<QAPair[]>([]);
  const [loadingStart, setLoadingStart] = useState(false);
  const [loadingEval, setLoadingEval] = useState(false);
  const [recording, setRecording] = useState(false);
  const [liveTranscript, setLiveTranscript] = useState("");
  const [report, setReport] = useState<FinalReport | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [micSupported, setMicSupported] = useState(true);
  const [showEditor, setShowEditor] = useState(false);
  const [code, setCode] = useState("");
  const [language, setLanguage] = useState("Python");

  const submitRef = useRef<(a: string) => void>(() => {});
  const recognitionRef = useRef<any>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const transcriptRef = useRef("");
  const submittedRef = useRef(false);

  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) { setMicSupported(false); return; }
    const rec = new SpeechRecognition();
    rec.continuous = true;
    rec.interimResults = true;
    rec.lang = "en-US";
    rec.onresult = (event: any) => {
      let final = "";
      let interim = "";
      for (let i = 0; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) final += transcript + " ";
        else interim += transcript;
      }
      const combined = (final + interim).trim();
      transcriptRef.current = combined;
      setLiveTranscript(combined);
    };
    rec.onerror = () => setRecording(false);
    rec.onend = () => {
      setRecording(false);
      if (!submittedRef.current) {
        submittedRef.current = true;
        submitRef.current(transcriptRef.current);
      }
    };
    recognitionRef.current = rec;
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [turns, loadingEval]);

  useEffect(() => {
    const q = questions[qIndex];
    if (!q) return;
    setCode("");
    setShowEditor(setup.round_type === "Technical" && CODING_HINTS.test(q));
  }, [qIndex, questions, setup.round_type]);

  const canStart = setup.company.trim() && setup.role.trim();

  async function startInterview() {
    if (!canStart) return;
    setLoadingStart(true);
    setError(null);
    try {
      const res = await fetch(`${API_URL}/interview/start`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(setup),
      });
      if (!res.ok) throw new Error("bad");
      const data = await res.json();
      setQuestions(data.questions);
      setTurns([{ type: "ai", text: data.interviewer_intro }, { type: "ai", text: data.questions[0] }]);
      setQIndex(0);
      setStage("live");
    } catch {
      setError("Unable to connect to backend. Make sure FastAPI is running on port 8000.");
    } finally {
      setLoadingStart(false);
    }
  }

  function toggleRecording() {
    if (!micSupported) return;
    if (recording) {
      recognitionRef.current?.stop();
      // submission now handled by rec.onend to avoid stale-state race condition
    } else {
      transcriptRef.current = "";
      submittedRef.current = false;
      setLiveTranscript("");
      recognitionRef.current?.start();
      setRecording(true);
    }
  }

  async function submitAnswer(answer: string) {
    const trimmed = answer.trim();
    const codeToSend = code.trim();
    if (!trimmed && !codeToSend) {
      setError("No speech or code detected. Speak into your mic or type code in the editor, then submit.");
      return;
    }
    setError(null);
    const currentQ = questions[qIndex];
    setTurns(prev => [...prev, { type: "user", text: trimmed || "(code only, no spoken explanation)", code: codeToSend || undefined, language: codeToSend ? language : undefined }]);
    setCode("");
    setLiveTranscript("");
    setLoadingEval(true);

    try {
      const res = await fetch(`${API_URL}/interview/evaluate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          company: setup.company,
          role: setup.role,
          round_type: setup.round_type,
          question: currentQ,
          answer: trimmed,
          code: codeToSend,
          language: codeToSend ? language : "",
          question_number: qIndex + 1,
          total_questions: questions.length,
        }),
      });
      if (!res.ok) throw new Error("bad");
      const fb: QuestionFeedback = await res.json();

      const newPair: QAPair = { question: currentQ, answer: trimmed, code: codeToSend || undefined, score: fb.score, verdict: fb.verdict, feedback: fb };
      const updatedPairs = [...qaPairs, newPair];
      setQaPairs(updatedPairs);

      setTurns(prev => [...prev, { type: "feedback", data: fb }]);

      if (fb.is_last) {
        setTurns(prev => [...prev, { type: "ai", text: fb.interviewer_response }]);
        await generateReport(updatedPairs);
      } else {
        const nextIndex = qIndex + 1;
        setTurns(prev => [...prev, { type: "ai", text: fb.interviewer_response }, { type: "ai", text: questions[nextIndex] }]);
        setQIndex(nextIndex);
      }
    } catch {
      setError("Unable to connect to backend. Make sure FastAPI is running on port 8000.");
    } finally {
      setLoadingEval(false);
    }
  }

  submitRef.current = submitAnswer;

  function submitWithoutVoice() {
    if (recording) { recognitionRef.current?.stop(); return; }
    submittedRef.current = true;
    submitAnswer(transcriptRef.current);
  }

  function handleEditorKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key !== "Tab") return;
    e.preventDefault();
    const ta = e.currentTarget;
    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    setCode(code.slice(0, start) + "  " + code.slice(end));
    requestAnimationFrame(() => { ta.selectionStart = ta.selectionEnd = start + 2; });
  }

  async function generateReport(pairs: QAPair[]) {
    try {
      const res = await fetch(`${API_URL}/interview/final-report`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          company: setup.company,
          role: setup.role,
          round_type: setup.round_type,
          qa_pairs: pairs.map(p => ({ question: p.question, answer: p.answer, code: p.code ?? "", score: p.score, verdict: p.verdict })),
        }),
      });
      if (!res.ok) throw new Error("bad");
      const data: FinalReport = await res.json();
      setReport(data);
      setTimeout(() => setStage("report"), 800);
    } catch {
      setError("Could not generate final report. Backend may be unreachable.");
    }
  }

  function resetAll() {
    setStage("setup");
    setSetup({ company: "", role: "", round_type: "Technical" });
    setQuestions([]);
    setQIndex(0);
    setTurns([]);
    setQaPairs([]);
    setReport(null);
    setError(null);
    setLiveTranscript("");
    setCode("");
    setShowEditor(false);
  }

  // ── Setup screen ──
  if (stage === "setup") {
    return (
      <main style={{ maxWidth: 1100, margin: "0 auto", padding: "0 24px 80px" }}>
        <section style={{ paddingTop: 80, textAlign: "center" }} className="jobos-fade-up">
          <div className="jobos-pill-shimmer" style={{ display: "inline-block", padding: "7px 18px", borderRadius: 999, color: "#fff", fontSize: 13, fontWeight: 600 }}>
            🎤 AI Mock Interview
          </div>
          <h1 style={{ fontSize: 48, fontWeight: 900, lineHeight: 1.15, margin: "24px 0 0", letterSpacing: -1.2 }}>
            <span style={{ color: "#fff", display: "block" }}>Practice the questions</span>
            <span className="jobos-grad-text" style={{ display: "block", textShadow: "0 0 60px rgba(168,85,247,0.5)" }}>they'll actually ask.</span>
          </h1>
          <p style={{ fontSize: 17, color: "#71717a", maxWidth: 460, margin: "18px auto 0", lineHeight: 1.6 }}>
            Speak your answers out loud. Get real-time AI feedback, just like a real interview.
          </p>
        </section>

        <div className="mi-setup-card" style={{ marginTop: 48 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
            <div>
              <div style={{ color: "#71717a", fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 7 }}>Company</div>
              <input className="mi-input" placeholder="e.g. Google, Amazon, Stripe" value={setup.company} onChange={e => setSetup(p => ({ ...p, company: e.target.value }))} />
            </div>
            <div>
              <div style={{ color: "#71717a", fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 7 }}>Role</div>
              <input className="mi-input" placeholder="e.g. Software Engineer" value={setup.role} onChange={e => setSetup(p => ({ ...p, role: e.target.value }))} />
            </div>
            <div>
              <div style={{ color: "#71717a", fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 9 }}>Round Type</div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {ROUND_TYPES.map(rt => (
                  <button
                    key={rt.id}
                    onClick={() => setSetup(p => ({ ...p, round_type: rt.id }))}
                    style={{
                      padding: "9px 16px", borderRadius: 999, fontSize: 13, fontWeight: 600, cursor: "pointer",
                      border: setup.round_type === rt.id ? "1px solid #6366f1" : "1px solid #2a2a2a",
                      background: setup.round_type === rt.id ? "rgba(99,102,241,0.15)" : "transparent",
                      color: setup.round_type === rt.id ? "#a5b4fc" : "#71717a",
                      transition: "all 150ms ease",
                    }}
                  >{rt.label}</button>
                ))}
              </div>
            </div>

            {!micSupported && (
              <div style={{ background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.25)", borderRadius: 12, padding: "12px 16px", color: "#fbbf24", fontSize: 13 }}>
                ⚠ Voice input isn't supported in this browser. Try Chrome for the full experience.
              </div>
            )}

            {error && (
              <div style={{ background: "rgba(244,63,94,0.08)", border: "1px solid rgba(244,63,94,0.25)", borderRadius: 12, padding: "12px 16px", color: "#f43f5e", fontSize: 13 }}>
                ⚠ {error}
              </div>
            )}

            <button
              disabled={!canStart || loadingStart}
              onClick={startInterview}
              className={`jobos-analyze${loadingStart ? " jobos-loading-btn" : ""}`}
              style={{ marginTop: 8, width: "100%", height: 52, borderRadius: 12, border: "none", color: "#fff", fontSize: 16, fontWeight: 700, cursor: canStart ? "pointer" : "not-allowed", display: "flex", alignItems: "center", justifyContent: "center", gap: 10, opacity: canStart ? 1 : 0.5 }}
            >
              {loadingStart ? (
                <><span className="jobos-spin" style={{ width: 16, height: 16, border: "2px solid rgba(255,255,255,0.35)", borderTopColor: "#fff", borderRadius: "50%", display: "inline-block" }} />Preparing your interviewer...</>
              ) : <>🎤 Start Mock Interview</>}
            </button>
          </div>
        </div>
      </main>
    );
  }

  // ── Report screen ──
  if (stage === "report" && report) {
    const color = report.overall_score >= 7.5 ? "#10b981" : report.overall_score >= 5 ? "#f59e0b" : "#f43f5e";
    return (
      <main style={{ maxWidth: 760, margin: "0 auto", padding: "60px 24px 80px" }} className="mi-fade-in">
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: "#71717a", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 8 }}>Interview Complete</div>
          <h2 style={{ fontSize: 32, fontWeight: 900, color: "#fff", margin: 0 }}>{setup.role} at {setup.company}</h2>
          <div style={{ color: "#71717a", fontSize: 14, marginTop: 4 }}>{setup.round_type} Round</div>
        </div>

        <div style={{ background: `linear-gradient(135deg, ${color}1a, ${color}06)`, border: `1px solid ${color}40`, borderRadius: 20, padding: 32, textAlign: "center", marginBottom: 20 }}>
          <div style={{ fontSize: 72, fontWeight: 900, color, lineHeight: 1, textShadow: `0 0 40px ${color}` }}>{report.overall_score}<span style={{ fontSize: 28, color: "#71717a" }}>/10</span></div>
          <div style={{ marginTop: 12, display: "inline-block", padding: "6px 18px", borderRadius: 999, background: `${color}22`, border: `1px solid ${color}50`, color, fontWeight: 700, fontSize: 15 }}>
            {report.hiring_recommendation}
          </div>
          <p style={{ color: "#a1a1aa", fontSize: 15, lineHeight: 1.7, marginTop: 18, maxWidth: 520, marginLeft: "auto", marginRight: "auto" }}>{report.overall_summary}</p>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 14 }} className="jobos-grid">
          <div className="jobos-card jobos-input-card" style={{ borderRadius: 16, padding: 20, borderTop: "3px solid #10b981" }}>
            <div style={{ color: "#34d399", fontWeight: 700, fontSize: 12, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>✓ Strongest Moment</div>
            <div style={{ color: "#e2e8f0", fontSize: 14, lineHeight: 1.6 }}>{report.strongest_answer}</div>
          </div>
          <div className="jobos-card jobos-input-card" style={{ borderRadius: 16, padding: 20, borderTop: "3px solid #f59e0b" }}>
            <div style={{ color: "#fbbf24", fontWeight: 700, fontSize: 12, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>⚡ Focus Area</div>
            <div style={{ color: "#e2e8f0", fontSize: 14, lineHeight: 1.6 }}>{report.weakest_area}</div>
          </div>
        </div>

        <div className="jobos-card jobos-input-card" style={{ borderRadius: 16, padding: 22, marginBottom: 14, borderTop: "3px solid #6366f1" }}>
          <div className="jobos-grad-text-purplepink" style={{ fontWeight: 700, fontSize: 13, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 14 }}>Top 3 Tips For Next Time</div>
          {report.top_3_tips.map((tip, i) => (
            <div key={i} style={{ display: "flex", gap: 10, color: "#c7d2fe", fontSize: 14, marginBottom: 10, lineHeight: 1.6 }}>
              <span style={{ background: "linear-gradient(135deg,#6366f1,#a855f7)", color: "#fff", fontWeight: 700, fontSize: 11, minWidth: 20, height: 20, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{i + 1}</span>
              {tip}
            </div>
          ))}
        </div>

        <div style={{ textAlign: "center", color: "#a1a1aa", fontSize: 15, fontStyle: "italic", margin: "24px 0 32px" }}>"{report.encouragement}"</div>

        <button onClick={resetAll} className="jobos-analyze" style={{ width: "100%", height: 52, borderRadius: 12, border: "none", color: "#fff", fontSize: 15, fontWeight: 700, cursor: "pointer" }}>
          🎤 Practice Another Interview
        </button>
      </main>
    );
  }

  // ── Live conversation screen ──
  return (
    <main style={{ maxWidth: 760, margin: "0 auto", padding: "32px 24px 24px", display: "flex", flexDirection: "column", minHeight: "calc(100vh - 129px)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, flexShrink: 0 }}>
        <div>
          <div style={{ color: "#fff", fontWeight: 700, fontSize: 15 }}>{setup.role} @ {setup.company}</div>
          <div style={{ color: "#71717a", fontSize: 12 }}>{setup.round_type} Round · Question {Math.min(qIndex + 1, questions.length)} of {questions.length}</div>
        </div>
        <div style={{ display: "flex", gap: 4 }}>
          {questions.map((_, i) => (
            <div key={i} style={{ width: 24, height: 4, borderRadius: 2, background: i < qaPairs.length ? "#10b981" : i === qIndex ? "#6366f1" : "#2a2a2a" }} />
          ))}
        </div>
      </div>

      <div ref={scrollRef} style={{ flex: 1, minHeight: 260, maxHeight: "55vh", overflowY: "auto", display: "flex", flexDirection: "column", gap: 14, paddingRight: 4 }}>
        {turns.map((turn, i) => {
          if (turn.type === "ai") {
            return <div key={i} className="mi-chat-bubble-ai mi-fade-in" style={{ color: "#e2e8f0", fontSize: 14, lineHeight: 1.6 }}>{turn.text}</div>;
          }
          if (turn.type === "user") {
            return (
              <div key={i} className="mi-chat-bubble-user mi-fade-in" style={{ color: "#fff", fontSize: 14, lineHeight: 1.6 }}>
                <div>{turn.text}</div>
                {turn.code && (
                  <pre style={{ margin: "10px 0 0", padding: 12, background: "#0a0a0a", border: "1px solid #2a2a2a", borderRadius: 10, fontSize: 12.5, lineHeight: 1.55, overflowX: "auto", color: "#c7d2fe", fontFamily: "'JetBrains Mono', Consolas, monospace" }}>
                    <div style={{ color: "#52525b", fontSize: 10, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6 }}>{turn.language}</div>
                    {turn.code}
                  </pre>
                )}
              </div>
            );
          }
          const fb = turn.data;
          const fbColor = fb.score >= 7.5 ? "#10b981" : fb.score >= 5 ? "#f59e0b" : "#f43f5e";
          return (
            <div key={i} className="mi-feedback-card mi-fade-in">
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                <span style={{ color: fbColor, fontWeight: 900, fontSize: 18 }}>{fb.score}/10</span>
                <span style={{ background: `${fbColor}22`, color: fbColor, fontSize: 11, fontWeight: 700, padding: "2px 9px", borderRadius: 999 }}>{fb.verdict}</span>
              </div>
              <div style={{ fontSize: 13, color: "#a1a1aa", lineHeight: 1.6, marginBottom: 6 }}><span style={{ color: "#34d399", fontWeight: 600 }}>✓ </span>{fb.what_went_well}</div>
              <div style={{ fontSize: 13, color: "#a1a1aa", lineHeight: 1.6 }}><span style={{ color: "#fbbf24", fontWeight: 600 }}>⚡ </span>{fb.what_to_improve}</div>
            </div>
          );
        })}
        {loadingEval && (
          <div className="mi-chat-bubble-ai" style={{ display: "flex", alignItems: "center", gap: 4, padding: "16px 20px" }}>
            <span className="mi-dot" /><span className="mi-dot" /><span className="mi-dot" />
          </div>
        )}
      </div>

      {error && (
        <div style={{ marginTop: 12, background: "rgba(244,63,94,0.08)", border: "1px solid rgba(244,63,94,0.25)", borderRadius: 12, padding: "10px 14px", color: "#f43f5e", fontSize: 13, flexShrink: 0 }}>⚠ {error}</div>
      )}

      {showEditor && (
        <div style={{ flexShrink: 0, marginTop: 14, background: "#0a0a0a", border: "1px solid #2a2a2a", borderRadius: 14, overflow: "hidden" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 12px", borderBottom: "1px solid #1f1f1f", background: "#111" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ color: "#a5b4fc", fontSize: 12, fontWeight: 700 }}>⌨ Code Board</span>
              <select value={language} onChange={e => setLanguage(e.target.value)} style={{ background: "#141414", border: "1px solid #2a2a2a", color: "#e2e8f0", borderRadius: 8, padding: "3px 8px", fontSize: 12, outline: "none" }}>
                {CODE_LANGUAGES.map(l => <option key={l} value={l}>{l}</option>)}
              </select>
            </div>
            <button onClick={() => setShowEditor(false)} style={{ background: "none", border: "none", color: "#71717a", cursor: "pointer", fontSize: 12 }}>Hide ✕</button>
          </div>
          <textarea
            value={code}
            onChange={e => setCode(e.target.value)}
            onKeyDown={handleEditorKeyDown}
            spellCheck={false}
            placeholder={"Write your code here, then tap the mic to explain it out loud.\nTab inserts 2 spaces."}
            style={{ width: "100%", height: 150, boxSizing: "border-box", background: "transparent", border: "none", outline: "none", resize: "vertical", color: "#e2e8f0", padding: 14, fontSize: 13.5, lineHeight: 1.6, fontFamily: "'JetBrains Mono', Consolas, 'Courier New', monospace" }}
          />
        </div>
      )}

      <div style={{ flexShrink: 0, marginTop: 20, display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
        {recording && liveTranscript && (
          <div style={{ color: "#a1a1aa", fontSize: 13, fontStyle: "italic", textAlign: "center", maxWidth: 460, lineHeight: 1.5 }}>"{liveTranscript}"</div>
        )}
        <button
          onClick={toggleRecording}
          disabled={loadingEval || !micSupported}
          className={`mi-mic-btn${recording ? " mi-mic-recording" : ""}`}
          style={{
            background: recording ? "linear-gradient(135deg, #f43f5e, #ec4899)" : "linear-gradient(135deg, #6366f1, #a855f7)",
            opacity: loadingEval ? 0.4 : 1,
          }}
        >
          {recording ? "⏹" : "🎤"}
        </button>
        <div style={{ color: "#52525b", fontSize: 12 }}>{recording ? "Tap to stop & submit" : "Tap to speak your answer"}</div>
        <div style={{ display: "flex", gap: 8 }}>
          {!showEditor && (
            <button onClick={() => setShowEditor(true)} disabled={loadingEval} style={{ background: "rgba(99,102,241,0.1)", border: "1px solid rgba(99,102,241,0.3)", color: "#a5b4fc", borderRadius: 999, padding: "6px 14px", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>⌨ Open code board</button>
          )}
          {showEditor && code.trim() && !recording && (
            <button onClick={submitWithoutVoice} disabled={loadingEval} style={{ background: "linear-gradient(135deg,#6366f1,#a855f7)", border: "none", color: "#fff", borderRadius: 999, padding: "6px 16px", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>Submit code without voice</button>
          )}
        </div>
      </div>
    </main>
  );
}



function JobCard({ job, col, menuOpen, onMenuToggle, onMenuClose, onEdit, onDelete, onMove, onDragStart }: {
  job: Job; col: typeof COLUMNS[0]; menuOpen: boolean;
  onMenuToggle: () => void; onMenuClose: () => void;
  onEdit: () => void; onDelete: () => void;
  onMove: (col: Column) => void; onDragStart: () => void;
}) {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) onMenuClose();
    }
    if (menuOpen) document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [menuOpen, onMenuClose]);

  return (
    <div draggable onDragStart={onDragStart} className="jt-job-card"
      style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 12, padding: "12px 13px", cursor: "grab", position: "relative", transition: "transform 150ms ease, box-shadow 150ms ease" }}
      onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.boxShadow = `0 4px 20px ${col.color}22`; }}
      onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.boxShadow = ""; }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 6 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ color: "#fff", fontWeight: 700, fontSize: 14, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{job.company}</div>
          <div style={{ color: "#94a3b8", fontSize: 12, marginTop: 2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{job.role}</div>
        </div>
        <div ref={menuRef} style={{ position: "relative", flexShrink: 0 }}>
          <button className="jt-menu-btn" onClick={onMenuToggle}>⋯</button>
          {menuOpen && (
            <div style={{ position: "absolute", right: 0, top: "100%", marginTop: 4, background: "#1e1e2e", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 10, padding: "6px 0", zIndex: 50, minWidth: 150, boxShadow: "0 8px 32px rgba(0,0,0,0.6)" }}>
              <button onClick={onEdit} style={menuItemStyle}>✏️ Edit</button>
              <div style={{ height: 1, background: "rgba(255,255,255,0.06)", margin: "4px 0" }} />
              <div style={{ padding: "4px 12px 2px", color: "#52525b", fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em" }}>Move to</div>
              {COLUMNS.filter(c => c.id !== job.column).map(c => (
                <button key={c.id} onClick={() => onMove(c.id)} style={{ ...menuItemStyle, color: c.color }}>→ {c.label}</button>
              ))}
              <div style={{ height: 1, background: "rgba(255,255,255,0.06)", margin: "4px 0" }} />
              <button onClick={onDelete} style={{ ...menuItemStyle, color: "#f43f5e" }}>🗑️ Remove</button>
            </div>
          )}
        </div>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 8, flexWrap: "wrap" }}>
        {job.date && <span style={{ color: "#52525b", fontSize: 11 }}>📅 {formatDate(job.date)}</span>}
        {job.link && <a href={job.link} target="_blank" rel="noreferrer" style={{ color: col.color, fontSize: 11, textDecoration: "none" }}>🔗 Link</a>}
      </div>
      {job.notes && (
        <div style={{ marginTop: 8, color: "#71717a", fontSize: 12, lineHeight: 1.5, borderTop: "1px solid rgba(255,255,255,0.05)", paddingTop: 8, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
          {job.notes}
        </div>
      )}
    </div>
  );
}

const menuItemStyle: React.CSSProperties = {
  display: "block", width: "100%", textAlign: "left", background: "none",
  border: "none", color: "#e2e8f0", padding: "7px 14px", cursor: "pointer", fontSize: 13, fontWeight: 500,
};

// ── Shared Components ──────────────────────────────────────────────────────

function StatBadge({ text, bg, border, color }: { text: string; bg: string; border: string; color: string }) {
  return (
    <span style={{ background: bg, border: `1px solid ${border}`, borderRadius: 999, padding: "8px 18px", color, fontSize: 14, fontWeight: 600 }}>{text}</span>
  );
}

function scoreColor(score: number) {
  if (score >= 75) return "#10b981";
  if (score >= 50) return "#f59e0b";
  return "#f43f5e";
}

function scoreBg(score: number) {
  if (score >= 75) return { bg: "linear-gradient(135deg, rgba(16,185,129,0.12), rgba(16,185,129,0.03))", border: "1px solid rgba(16,185,129,0.25)" };
  if (score >= 50) return { bg: "linear-gradient(135deg, rgba(245,158,11,0.12), rgba(245,158,11,0.03))", border: "1px solid rgba(245,158,11,0.25)" };
  return { bg: "linear-gradient(135deg, rgba(244,63,94,0.12), rgba(244,63,94,0.03))", border: "1px solid rgba(244,63,94,0.25)" };
}

function scoreLabel(score: number) {
  if (score >= 75) return "Strong Match 🎯";
  if (score >= 50) return "Decent Match ⚡";
  return "Needs Work 🔧";
}

function Results({ data, onCopy }: { data: Analysis; onCopy: () => void }) {
  const target = Math.max(0, Math.min(100, Math.round(data.match_score)));
  const color = scoreColor(target);
  const { bg, border } = scoreBg(target);
  const [count, setCount] = useState(0);
  const [ringProgress, setRingProgress] = useState(0);

  useEffect(() => {
    setCount(0); setRingProgress(0);
    const start = performance.now();
    const dur = 900;
    let raf = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / dur);
      const eased = 1 - Math.pow(1 - t, 3);
      setCount(Math.round(target * eased));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    const r = setTimeout(() => setRingProgress(target), 80);
    return () => { cancelAnimationFrame(raf); clearTimeout(r); };
  }, [target]);

  const firstSentence = (data.summary || "").split(/(?<=[.!?])\s/)[0] || data.summary;
  const ringSize = 120; const stroke = 12;
  const radius = (ringSize - stroke) / 2;
  const circ = 2 * Math.PI * radius;
  const offset = circ - (ringProgress / 100) * circ;

  return (
    <section style={{ marginTop: 56, maxWidth: 920, margin: "56px auto 0" }} className="jobos-results-in">
      <div style={{ height: 1, background: "linear-gradient(90deg, transparent, rgba(168,85,247,0.5), transparent)", marginBottom: 24 }} />
      <div style={{ background: bg, border, borderRadius: 20, padding: 32 }}>
        <div className="jobos-score-grid">
          <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
            <span style={{ fontSize: 96, fontWeight: 900, color, lineHeight: 1, letterSpacing: -3, textShadow: `0 0 40px ${color}` }}>{count}</span>
            <span style={{ color: "#71717a", fontSize: 22, fontWeight: 600 }}>/100</span>
          </div>
          <div>
            <div style={{ color, fontSize: 24, fontWeight: 700, marginBottom: 6, textShadow: `0 0 30px ${color}80` }}>{scoreLabel(target)}</div>
            <div style={{ color: "#a1a1aa", fontSize: 15, lineHeight: 1.5 }}>{firstSentence}</div>
          </div>
          <div style={{ position: "relative", width: ringSize, height: ringSize, filter: `drop-shadow(0 0 12px ${color}99)` }}>
            <svg width={ringSize} height={ringSize} style={{ transform: "rotate(-90deg)" }}>
              <circle cx={ringSize/2} cy={ringSize/2} r={radius} stroke="rgba(255,255,255,0.08)" strokeWidth={stroke} fill="none" />
              <circle cx={ringSize/2} cy={ringSize/2} r={radius} stroke={color} strokeWidth={stroke} fill="none" strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round" style={{ transition: "stroke-dashoffset 800ms ease" }} />
            </svg>
            <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, fontWeight: 800, color }}>{count}%</div>
          </div>
        </div>
      </div>

      <div className="jobos-grid-3" style={{ marginTop: 16 }}>
        <DetailCard variant="green" topColor="#10b981" shadow="0 0 30px rgba(16,185,129,0.12)" dot="#10b981" title="Strengths" count={data.strengths.length} pillBg="rgba(16,185,129,0.15)" pillColor="#34d399">
          <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 10 }}>
            {data.strengths.map((s, i) => (<li key={i} style={{ display: "flex", gap: 10, alignItems: "flex-start", color: "#fff", fontSize: 14, lineHeight: 1.6 }}><span style={{ color: "#34d399", fontWeight: 700, flexShrink: 0 }}>✓</span><span>{s}</span></li>))}
          </ul>
        </DetailCard>
        <DetailCard variant="red" topColor="#f43f5e" shadow="0 0 30px rgba(244,63,94,0.12)" dot="#f43f5e" title="Gaps to Fill" count={data.missing_keywords.length} pillBg="rgba(244,63,94,0.15)" pillColor="#fb7185">
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {data.missing_keywords.map((k, i) => (<span key={i} style={{ background: "rgba(244,63,94,0.1)", border: "1px solid rgba(244,63,94,0.4)", color: "#fb7185", borderRadius: 999, padding: "4px 12px", fontSize: 13, fontWeight: 500 }}>{k}</span>))}
          </div>
        </DetailCard>
        <DetailCard variant="blue" topColor="#3b82f6" shadow="0 0 30px rgba(59,130,246,0.12)" dot="#3b82f6" title="How to Fix It" count={data.improvements.length} pillBg="rgba(59,130,246,0.15)" pillColor="#93c5fd">
          <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 12 }}>
            {data.improvements.map((s, i) => (<li key={i} style={{ display: "flex", gap: 10, alignItems: "flex-start", color: "#93c5fd", fontSize: 14, lineHeight: 1.6 }}><span style={{ width: 22, height: 22, borderRadius: 999, background: "linear-gradient(135deg, #3b82f6, #2563eb)", color: "#fff", fontSize: 12, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 1, boxShadow: "0 2px 10px rgba(59,130,246,0.5)" }}>{i+1}</span><span>{s}</span></li>))}
          </ul>
        </DetailCard>
      </div>

      <div className="jobos-result-card purple" style={{ marginTop: 16, background: "#141414", border: "1px solid #2a2a2a", borderRadius: 20, overflow: "hidden", boxShadow: "0 0 30px rgba(168,85,247,0.12)" }}>
        <div style={{ height: 3, background: "#a855f7" }} />
        <div style={{ padding: 24 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
            <div className="jobos-grad-text-purplepink" style={{ fontWeight: 700, fontSize: 15 }}>AI Analysis Summary</div>
            <button onClick={onCopy} style={{ width: 32, height: 32, borderRadius: 8, background: "rgba(168,85,247,0.08)", border: "1px solid rgba(168,85,247,0.3)", color: "#c084fc", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" /></svg>
            </button>
          </div>
          <p style={{ margin: 0, color: "#a1a1aa", fontSize: 15, lineHeight: 1.75 }}>{data.summary}</p>
        </div>
      </div>
    </section>
  );
}

function DetailCard({ variant, topColor, shadow, dot, title, count, pillBg, pillColor, children }: {
  variant: "green" | "red" | "blue" | "purple"; topColor: string; shadow: string; dot: string;
  title: string; count: number; pillBg: string; pillColor: string; children: React.ReactNode;
}) {
  return (
    <div className={`jobos-result-card ${variant}`} style={{ background: "#141414", border: "1px solid #2a2a2a", borderRadius: 20, overflow: "hidden", boxShadow: shadow }}>
      <div style={{ height: 3, background: topColor }} />
      <div style={{ padding: 20 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
          <span style={{ width: 8, height: 8, borderRadius: 999, background: dot, boxShadow: `0 0 10px ${dot}` }} />
          <span style={{ color: "#fff", fontWeight: 600, fontSize: 14 }}>{title}</span>
          <span style={{ marginLeft: "auto", background: pillBg, color: pillColor, fontSize: 12, fontWeight: 700, padding: "2px 10px", borderRadius: 999 }}>{count}</span>
        </div>
        {children}
      </div>
    </div>
  );
}