import React, { useState } from "react";
import "./HealthPlan.css";

const BASE_URL = process.env.REACT_APP_AI_API_BASE_URL || "https://nutrihelp-backend-deployment.onrender.com";
const PLAN_ENDPOINT = `${BASE_URL}/ai-model/medical-report/plan/generate`;

const GOALS = [
  { value: "Weight Loss",  label: "Weight Loss",  icon: "⚖️" },
  { value: "Muscle Gain",  label: "Muscle Gain",  icon: "💪" },
  { value: "Endurance",    label: "Endurance",    icon: "🏃" },
];

export default function HealthPlan() {
  const [medicalReport, setMedicalReport] = useState("");
  const [healthGoal, setHealthGoal] = useState("Weight Loss");
  const [loading, setLoading] = useState(false);
  const [plan, setPlan] = useState(null);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!medicalReport.trim()) return;

    setLoading(true);
    setPlan(null);
    setError("");

    try {
      const res = await fetch(PLAN_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          medical_report: medicalReport.trim(),
          health_goal: healthGoal,
        }),
      });

      if (!res.ok) throw new Error(`Server error (${res.status})`);
      const data = await res.json();
      setPlan(data);
    } catch (err) {
      setError(err.message || "Failed to generate plan. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setPlan(null);
    setError("");
  };

  return (
    <div className="hp-page">
      <div className="hp-container">
        <div className="hp-hero">
          <span className="hp-hero-icon">🩺</span>
          <h1 className="hp-title">AI Health Plan Generator</h1>
          <p className="hp-subtitle">
            Paste your medical report summary and we'll generate a personalised
            8-week health plan tailored to your goal.
          </p>
        </div>

        {!plan && (
          <form className="hp-form" onSubmit={handleSubmit}>
            <div className="hp-field">
              <label className="hp-label" htmlFor="medical-report">
                Medical Report / Patient Summary
              </label>
              <textarea
                id="medical-report"
                className="hp-textarea"
                rows={8}
                placeholder="e.g. 45-year-old male, BMI 28, mild hypertension, fasting glucose 5.9 mmol/L, sedentary lifestyle, no known drug allergies..."
                value={medicalReport}
                onChange={(e) => setMedicalReport(e.target.value)}
                disabled={loading}
                required
              />
              <span className="hp-char-count">{medicalReport.length} characters</span>
            </div>

            <div className="hp-field">
              <label className="hp-label">Health Goal</label>
              <div className="hp-goal-group">
                {GOALS.map((g) => (
                  <button
                    key={g.value}
                    type="button"
                    className={`hp-goal-btn ${healthGoal === g.value ? "hp-goal-btn--active" : ""}`}
                    onClick={() => setHealthGoal(g.value)}
                    disabled={loading}
                  >
                    <span className="hp-goal-icon">{g.icon}</span>
                    <span>{g.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {error && <p className="hp-error" role="alert">{error}</p>}

            <div className="hp-cold-note">
              ℹ️ First request after inactivity may take up to 60 seconds while the server wakes up.
            </div>

            <button
              type="submit"
              className="hp-submit-btn"
              disabled={loading || !medicalReport.trim()}
            >
              {loading ? (
                <>
                  <span className="hp-spinner" aria-hidden="true" />
                  Generating your plan…
                </>
              ) : (
                "✨ Generate My Health Plan"
              )}
            </button>
          </form>
        )}

        {loading && (
          <div className="hp-loading-card">
            <div className="hp-spinner-lg" aria-hidden="true" />
            <p className="hp-loading-text">Analysing your report and building your 8-week plan…</p>
            <p className="hp-loading-sub">This can take up to 60 seconds on first run.</p>
          </div>
        )}

        {plan && !loading && (
          <div className="hp-results">
            <div className="hp-results-header">
              <h2 className="hp-results-title">Your Personalised Health Plan</h2>
              <button type="button" className="hp-regenerate-btn" onClick={handleReset}>
                ← Generate New Plan
              </button>
            </div>

            {plan.suggestion && (
              <section className="hp-section hp-section--suggestion">
                <h3 className="hp-section-title">💡 Plan Overview</h3>
                <p className="hp-suggestion-text">{plan.suggestion}</p>
              </section>
            )}

            {Array.isArray(plan.weekly_plan) && plan.weekly_plan.length > 0 && (
              <section className="hp-section">
                <h3 className="hp-section-title">📅 8-Week Schedule</h3>
                <div className="hp-weeks">
                  {plan.weekly_plan.map((week, idx) => (
                    <WeekCard key={idx} week={week} index={idx} />
                  ))}
                </div>
              </section>
            )}

            {plan.progress_analysis && (
              <section className="hp-section hp-section--analysis">
                <h3 className="hp-section-title">📊 Progress Analysis</h3>
                <p className="hp-analysis-text">{plan.progress_analysis}</p>
              </section>
            )}

            <button type="button" className="hp-regenerate-btn hp-regenerate-btn--bottom" onClick={handleReset}>
              ← Generate Another Plan
            </button>
          </div>
        )}

        {error && !loading && !plan && (
          <div className="hp-error-card">
            <p className="hp-error">{error}</p>
            <button type="button" className="hp-submit-btn" onClick={() => setError("")}>
              Try Again
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

const WEEK_ACCENT = [
  "#005BBB", "#2E7D32", "#c05c00", "#7B1FA2",
  "#00838F", "#B71C1C", "#1565C0", "#4A148C",
];

function WeekCard({ week, index }) {
  const [open, setOpen] = useState(false);
  const accent = WEEK_ACCENT[index % WEEK_ACCENT.length];

  return (
    <div className="hp-week-card" style={{ borderLeftColor: accent }}>
      <button
        type="button"
        className="hp-week-header"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
      >
        <div className="hp-week-header-left">
          <span className="hp-week-badge" style={{ background: accent }}>
            Week {week.week ?? index + 1}
          </span>
          <span className="hp-week-focus">{week.focus}</span>
        </div>
        <div className="hp-week-header-right">
          {week.target_calories_per_day && (
            <span className="hp-calorie-badge">
              🔥 {week.target_calories_per_day} kcal/day
            </span>
          )}
          <span className="hp-chevron" style={{ transform: open ? "rotate(180deg)" : "rotate(0deg)" }}>
            ▾
          </span>
        </div>
      </button>

      {open && (
        <div className="hp-week-body">
          {Array.isArray(week.workouts) && week.workouts.length > 0 && (
            <div className="hp-week-section">
              <h4 className="hp-week-section-title">🏋️ Workouts</h4>
              <ul className="hp-list">
                {week.workouts.map((w, i) => (
                  <li key={i}>{w}</li>
                ))}
              </ul>
            </div>
          )}

          {week.meal_notes && (
            <div className="hp-week-section">
              <h4 className="hp-week-section-title">🥗 Meal Notes</h4>
              <p className="hp-week-text">{week.meal_notes}</p>
            </div>
          )}

          {Array.isArray(week.reminders) && week.reminders.length > 0 && (
            <div className="hp-week-section">
              <h4 className="hp-week-section-title">🔔 Reminders</h4>
              <ul className="hp-list hp-list--reminders">
                {week.reminders.map((r, i) => (
                  <li key={i}>{r}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
