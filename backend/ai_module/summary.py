"""
backend/ai_module/summary.py
-----------------------------
generate_weekly_summary(user_id: int, db: Session) -> str

Fetches real patient data (latest vitals, 7-day trends, alert count,
medication adherence), then calls Groq LLaMA-3 with a detailed 5-section
clinical prompt. Falls back to rule-based summary if Groq is unavailable.
"""

import os
import json as _json
from datetime import datetime, timedelta, timezone

from sqlalchemy.orm import Session

from ai_module.trends import analyze_trends
from ai_module.risk_score import calculate_risk_score
import models

# ── Metric labels ──────────────────────────────────────────────────────────────
_METRIC_LABELS = {
    "heart_rate":   "Heart rate",
    "bp_systolic":  "Blood pressure (systolic)",
    "bp_diastolic": "Blood pressure (diastolic)",
    "spo2":         "Oxygen saturation (SpO₂)",
    "blood_sugar":  "Blood sugar",
    "temperature":  "Body temperature",
}

_TREND_PHRASES = {
    "rising":  "is trending upward — monitor closely",
    "falling": "is trending downward",
    "stable":  "is stable",
}


def _build_rule_based_summary(
    latest, trends: dict, score: float, risk_level: str,
    adherence_pct: int, taken_count: int, missed_count: int, alert_count: int,
) -> str:
    lines = ["📊 Weekly Health Summary\n"]
    lines.append("1. OVERALL ASSESSMENT")
    lines.append(
        f"Health risk score: {score}/100 ({risk_level.capitalize()} risk). "
        f"Alerts this week: {alert_count}."
    )
    lines.append(f"\n2. CRITICAL FINDINGS")
    if latest:
        if latest.bp_systolic and latest.bp_systolic > 130:
            lines.append(f"• Blood pressure {latest.bp_systolic}/{latest.bp_diastolic} mmHg — elevated.")
        if latest.blood_sugar and latest.blood_sugar > 140:
            lines.append(f"• Blood sugar {latest.blood_sugar} mg/dL — above normal range.")
        if latest.heart_rate and latest.heart_rate > 100:
            lines.append(f"• Heart rate {latest.heart_rate} bpm — elevated.")
        if latest.spo2 and latest.spo2 < 95:
            lines.append(f"• SpO₂ {latest.spo2}% — below normal threshold.")
    lines.append(f"\n3. WEEKLY TRENDS")
    for metric, trend in trends.items():
        label  = _METRIC_LABELS.get(metric, metric.replace("_", " ").title())
        phrase = _TREND_PHRASES.get(trend, trend)
        lines.append(f"• {label} {phrase}.")
    lines.append(f"\n4. MEDICATION ADHERENCE")
    lines.append(f"Adherence: {adherence_pct}% ({taken_count} taken, {missed_count} missed).")
    if adherence_pct < 80:
        lines.append("⚠️ Adherence below 80% — this is dangerous for your health outcomes.")
    lines.append(f"\n5. ACTION PLAN")
    if risk_level == "high":
        lines.append("• Consult a physician immediately about your elevated risk readings.")
    elif risk_level == "moderate":
        lines.append("• Schedule a check-up and monitor daily vitals closely.")
    else:
        lines.append("• Keep up your healthy habits and continue logging vitals daily.")
    return "\n".join(lines)


def _try_groq_summary(prompt: str) -> str | None:
    """Attempt to call Groq LLaMA-3 if GROQ_API_KEY is set.
    
    Returns None on failure, timeout, or if response is < 100 characters.
    """
    api_key = os.getenv("GROQ_API_KEY", "")
    if not api_key or api_key.startswith("your-"):
        return None
    try:
        from groq import Groq  # lazy import
        client = Groq(api_key=api_key)
        response = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[
                {"role": "user", "content": prompt},
            ],
            max_tokens=1024,
            temperature=0.1,  # near-deterministic for factual medical output
            timeout=25,        # 25 second timeout — prevents CORS errors from hanging requests
        )
        result = response.choices[0].message.content.strip()
        
        if len(result) < 100:
            print("[summary.py] Groq validation FAILED — response < 100 chars. Falling back to rule-based.")
            return None
        
        return result
    except Exception as e:
        print(f"[summary.py] Groq call failed: {e}")
        return None  # fall back to rule-based summary


def generate_weekly_summary(user_id: int, db: Session) -> str:
    """
    1. Fetch the most recent vitals record for the user (absolute latest).
    2. Fetch last 7 days of vitals for trend analysis.
    3. Calculate medication adherence and alert count.
    4. Try Groq LLaMA-3 with a detailed clinical prompt.
    5. Save a HealthScore record to the DB.
    6. Return the summary string.
    """
    now = datetime.now(timezone.utc)
    seven_days_ago = now - timedelta(days=7)

    # ── 1. Latest vitals (most recent record, regardless of time window) ───────
    latest = (
        db.query(models.Vital)
        .filter(models.Vital.user_id == user_id)
        .order_by(models.Vital.recorded_at.desc())
        .first()
    )

    if not latest:
        return (
            "No vitals data found. Please log your vitals daily to get an "
            "AI health summary."
        )

    # ── 2. Last 7 days of vitals for trend analysis ────────────────────────────
    week_vitals = (
        db.query(models.Vital)
        .filter(
            models.Vital.user_id == user_id,
            models.Vital.recorded_at >= seven_days_ago,
        )
        .order_by(models.Vital.recorded_at.asc())
        .all()
    )

    if len(week_vitals) < 2:
        # Not enough data for meaningful trends — use a minimal trend dict
        trends = {k: "stable" for k in ["heart_rate", "bp_systolic", "spo2", "blood_sugar"]}
        trends_note = "Insufficient data for trend analysis (only 1 reading this week)"
    else:
        trends = analyze_trends(week_vitals)
        trends_note = None

    # ── 3. Risk score from latest vitals ──────────────────────────────────────
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

    # ── 4. Medication Adherence (last 7 days) ─────────────────────────────────
    week_start_str = seven_days_ago.strftime("%Y-%m-%d")
    week_meds = (
        db.query(models.Medication)
        .filter(
            models.Medication.user_id == user_id,
            models.Medication.date >= week_start_str,
        )
        .all()
    )

    taken_count  = 0
    missed_count = 0
    for med in week_meds:
        status_str = med.status or ""
        # Support both JSON array ["taken","missed"] and plain string "taken"
        try:
            statuses = _json.loads(status_str)
            if isinstance(statuses, list):
                taken_count  += statuses.count("taken")
                missed_count += statuses.count("missed")
            elif isinstance(statuses, str):
                if statuses == "taken":  taken_count  += 1
                if statuses == "missed": missed_count += 1
        except Exception:
            # Plain string fallback
            if "taken"  in status_str: taken_count  += 1
            if "missed" in status_str: missed_count += 1

    total         = taken_count + missed_count
    adherence_pct = round((taken_count / total * 100) if total > 0 else 100)

    # ── 5. Alert Count (last 7 days) ──────────────────────────────────────────
    alert_count = (
        db.query(models.Alert)
        .filter(
            models.Alert.user_id == user_id,
            models.Alert.created_at >= seven_days_ago,
        )
        .count()
    )

    user = db.query(models.User).filter(models.User.user_id == user_id).first()

    # ── 7. Build RAW DATA prompt for Groq ─────────────────────────────────────
    prompt = f"""
You are a senior clinical physician reviewing a patient's weekly health data.
Analyze this raw data and write a detailed, honest, medically accurate health report.

PATIENT RAW DATA:
─────────────────────────────────────────
Name: {user.name}, Age: {user.age}, Gender: {user.gender}

Latest Vitals (most recent reading):
• Heart Rate: {latest.heart_rate} bpm
• Blood Pressure: {latest.bp_systolic}/{latest.bp_diastolic} mmHg
• SpO₂: {latest.spo2}%
• Blood Sugar: {latest.blood_sugar} mg/dL
• Temperature: {latest.temperature}°F

7-Day Vitals History (oldest → newest):
{chr(10).join([
    f"  {i+1}. HR:{v.heart_rate} BP:{v.bp_systolic}/{v.bp_diastolic} SpO2:{v.spo2} Sugar:{v.blood_sugar} Temp:{v.temperature}"
    for i, v in enumerate(week_vitals)
])}

Alerts triggered this week: {alert_count}
Medication adherence: {adherence_pct}% ({taken_count} taken, {missed_count} missed)
─────────────────────────────────────────

CLINICAL REFERENCE RANGES:
• Heart Rate: 60–100 bpm (>120 = danger)
• Blood Pressure: 90/60–120/80 mmHg (>140/90 = hypertension, >160/100 = stage 2)
• SpO₂: 95–100% (<92% = emergency)
• Blood Sugar: 70–140 mg/dL (>180 = hyperglycemia risk)
• Temperature: 97–99°F (>101.3°F = fever)

YOUR TASK:
Write a 5-section clinical health report. Be specific, honest, and use the actual numbers.
Do NOT give generic advice. Every recommendation must reference this patient's actual data.
Do NOT be overly positive if the data shows problems.

FORMAT YOUR RESPONSE EXACTLY LIKE THIS:

1. OVERALL ASSESSMENT
[2-3 sentences summarizing the patient's overall health status based on the numbers]

2. CRITICAL FINDINGS
[List every vital that is outside normal range with the exact value and clinical meaning]

3. WEEKLY TRENDS
[Analyze the 7-day history for each vital — is it rising, falling, stable? What does it mean clinically?]

4. MEDICATION ADHERENCE
[Assess the {adherence_pct}% adherence — is it safe? What are the consequences?]

5. ACTION PLAN
[3-5 specific actions this patient must take based on their exact numbers]
"""

    # Debug: log actual data being used (visible in uvicorn console)
    print(f"[summary.py] user_id={user_id} | latest: "
          f"HR={latest.heart_rate}, BP={latest.bp_systolic}/{latest.bp_diastolic}, "
          f"SpO2={latest.spo2}, BS={latest.blood_sugar}, Temp={latest.temperature}")
    print(f"[summary.py] week_vitals={len(week_vitals)}, alerts={alert_count}, "
          f"adherence={adherence_pct}%")

    rule_summary = _build_rule_based_summary(
        latest, trends, score, risk_level, adherence_pct, taken_count, missed_count, alert_count
    )

    summary = _try_groq_summary(prompt) or rule_summary

    # ── 8. Persist ─────────────────────────────────────────────────────────────
    db.add(models.HealthScore(
        user_id=user_id,
        score=score,
        risk_level=risk_level,
        ai_summary=summary,
    ))
    db.commit()

    return {
        "score": round(score, 2),
        "risk_level": risk_level,
        "ai_summary": summary,
        "generated_at": datetime.utcnow().isoformat(),
        "trends": trends,
        "alert_count": alert_count,
        "adherence_pct": adherence_pct,
        "taken_count": taken_count,
        "missed_count": missed_count
    }
