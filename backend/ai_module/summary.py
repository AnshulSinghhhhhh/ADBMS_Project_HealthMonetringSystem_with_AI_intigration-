"""
backend/ai_module/summary.py
-----------------------------
generate_weekly_summary(user_id: int, db: Session) -> str

Fetches the last 7 days of vitals, runs trend analysis and risk scoring,
builds a plain-English summary (using Groq LLaMA if GROQ_API_KEY is set),
and persists a HealthScore record.
"""

import os
from datetime import datetime, timedelta, timezone

from sqlalchemy.orm import Session

from ai_module.trends import analyze_trends
from ai_module.risk_score import calculate_risk_score
import models

# ── Trend language helpers ─────────────────────────────────────────────────────
_TREND_PHRASES = {
    "rising":  "showed a rising trend — monitor closely",
    "falling": "is improving (falling trend)",
    "stable":  "was stable",
}

_METRIC_LABELS = {
    "heart_rate":   "Heart rate",
    "bp_systolic":  "Blood pressure (systolic)",
    "bp_diastolic": "Blood pressure (diastolic)",
    "spo2":         "Oxygen saturation (SpO₂)",
    "blood_sugar":  "Blood sugar",
    "temperature":  "Body temperature",
}

_TIPS = {
    "high":     "Consider consulting your physician and reducing stress, sodium, and processed foods.",
    "moderate": "Stay hydrated, maintain regular exercise, and track your vitals daily.",
    "low":      "Great job! Keep up your healthy habits and stay consistent.",
}


def _build_rule_based_summary(trends: dict, score: float, risk_level: str) -> str:
    lines = ["📊 Weekly Health Summary\n"]
    for metric, trend in trends.items():
        label  = _METRIC_LABELS.get(metric, metric.replace("_", " ").title())
        phrase = _TREND_PHRASES.get(trend, trend)
        lines.append(f"• {label} {phrase}.")
    lines.append(f"\nYour overall health risk score is {score}/100 ({risk_level.capitalize()}).")
    lines.append(_TIPS.get(risk_level, ""))
    return "\n".join(lines)


def _try_groq_summary(prompt: str) -> str | None:
    """Attempt to call Groq LLaMA-3 if GROQ_API_KEY is set. Returns None on failure."""
    api_key = os.getenv("GROQ_API_KEY", "")
    if not api_key or api_key.startswith("your-"):
        return None
    try:
        from groq import Groq  # lazy import
        client = Groq(api_key=api_key)
        response = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[
                {
                    "role": "system",
                    "content": "You are a helpful health assistant. Be concise, supportive, and medically accurate.",
                },
                {"role": "user", "content": prompt},
            ],
            max_tokens=300,
            temperature=0.7,
        )
        return response.choices[0].message.content.strip()
    except Exception:
        return None  # fall back to rule-based summary silently


def generate_weekly_summary(user_id: int, db: Session) -> str:
    """
    1. Fetch last 7 days of vitals for the user.
    2. Run trend analysis + risk scoring.
    3. Try Groq LLaMA-3 (falls back to rule-based if key missing/invalid).
    4. Save a HealthScore record to the DB.
    5. Return the summary string.
    """
    seven_days_ago = datetime.now(timezone.utc) - timedelta(days=7)

    vitals_list = (
        db.query(models.Vital)
        .filter(
            models.Vital.user_id == user_id,
            models.Vital.recorded_at >= seven_days_ago,
        )
        .order_by(models.Vital.recorded_at.asc())
        .all()
    )

    if not vitals_list:
        return "No vitals recorded in the last 7 days. Please log your vitals daily for accurate insights."

    # ── Analysis ───────────────────────────────────────────────────────────────
    trends = analyze_trends(vitals_list)

    latest = vitals_list[-1]
    latest_dict = {
        "heart_rate":   latest.heart_rate,
        "bp_systolic":  latest.bp_systolic,
        "bp_diastolic": latest.bp_diastolic,
        "spo2":         latest.spo2,
        "blood_sugar":  latest.blood_sugar,
        "temperature":  latest.temperature,
    }
    risk_result = calculate_risk_score(latest_dict)
    score      = risk_result["score"]
    risk_level = risk_result["risk_level"]

    # ── Summary text ───────────────────────────────────────────────────────────
    rule_summary = _build_rule_based_summary(trends, score, risk_level)

    groq_prompt = (
        f"Here is a patient's weekly health data summary:\n{rule_summary}\n\n"
        "Rewrite this as a friendly, supportive 3–5 sentence health report in plain English. "
        "Include one actionable tip."
    )
    summary = _try_groq_summary(groq_prompt) or rule_summary

    # ── Persist ────────────────────────────────────────────────────────────────
    db.add(models.HealthScore(
        user_id=user_id,
        score=score,
        risk_level=risk_level,
        ai_summary=summary,
    ))
    db.commit()

    return summary
