"""
database/seed_month.py
-----------------------
Populates HealthAI SQLite database with 30 days of realistic dummy health data.

Run from the project root:
    cd backend
    python ../database/seed_month.py
"""

import sys
import os
import random
from datetime import datetime, timedelta, timezone

# ── Make sure backend modules are importable ───────────────────────────────────
BACKEND_DIR = os.path.join(os.path.dirname(__file__), "..", "backend")
sys.path.insert(0, os.path.abspath(BACKEND_DIR))

import bcrypt
from sqlalchemy.orm import Session
from database import engine, Base, SessionLocal
import models
from ai_module.risk_score import calculate_risk_score

random.seed(42)   # reproducible results

# ────────────────────────────────────────────────────────────────────────────────
# HELPERS
# ────────────────────────────────────────────────────────────────────────────────

def _hash(password: str) -> str:
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()


def _rand(lo: float, hi: float, decimals: int = 1) -> float:
    return round(random.uniform(lo, hi), decimals)


def _day(offset: int) -> datetime:
    """Return UTC datetime for `offset` days ago at a random morning time."""
    base = datetime.now(timezone.utc) - timedelta(days=offset)
    return base.replace(hour=random.randint(7, 9), minute=random.randint(0, 59),
                        second=0, microsecond=0)


# ────────────────────────────────────────────────────────────────────────────────
# ALERT THRESHOLDS  (same as anomaly.py)
# ────────────────────────────────────────────────────────────────────────────────

THRESHOLDS = [
    ("heart_rate",   "High Heart Rate",       "heart_rate > 120 bpm",           lambda v: v.heart_rate   is not None and v.heart_rate   > 120, "high"),
    ("heart_rate",   "Low Heart Rate",        "heart_rate < 50 bpm",            lambda v: v.heart_rate   is not None and v.heart_rate   < 50,  "moderate"),
    ("bp_systolic",  "High Blood Pressure",   "bp_systolic > 160 mmHg",         lambda v: v.bp_systolic  is not None and v.bp_systolic  > 160, "high"),
    ("bp_systolic",  "Elevated BP",           "bp_systolic 140–160 mmHg",       lambda v: v.bp_systolic  is not None and 140 <= v.bp_systolic <= 160, "moderate"),
    ("bp_diastolic", "High Diastolic BP",     "bp_diastolic > 100 mmHg",        lambda v: v.bp_diastolic is not None and v.bp_diastolic > 100, "high"),
    ("spo2",         "Low Oxygen Saturation", "spo2 < 90 %",                    lambda v: v.spo2         is not None and v.spo2         < 90,  "critical"),
    ("spo2",         "Below Normal SpO₂",     "spo2 90–94 %",                   lambda v: v.spo2         is not None and 90 <= v.spo2   < 95,  "moderate"),
    ("blood_sugar",  "High Blood Sugar",      "blood_sugar > 180 mg/dL",        lambda v: v.blood_sugar  is not None and v.blood_sugar  > 180, "high"),
    ("blood_sugar",  "Elevated Blood Sugar",  "blood_sugar 140–180 mg/dL",      lambda v: v.blood_sugar  is not None and 140 <= v.blood_sugar <= 180, "moderate"),
]


def _scan_alerts(vital: models.Vital, user_id: int) -> list[models.Alert]:
    alerts = []
    for _field, alert_type, message, check_fn, severity in THRESHOLDS:
        if check_fn(vital):
            alerts.append(models.Alert(
                user_id    = user_id,
                alert_type = alert_type,
                message    = f"{message} — recorded {vital.recorded_at.strftime('%d %b %Y')}",
                severity   = severity,
                created_at = vital.recorded_at,
            ))
    return alerts


# ────────────────────────────────────────────────────────────────────────────────
# VITALS GENERATORS
# ────────────────────────────────────────────────────────────────────────────────

def _john_vitals(day_offset: int) -> dict:
    """John Doe — slightly unhealthy, worsening over weeks 3–4."""
    week = (30 - day_offset) // 7   # 0 = oldest week, 3 = latest

    # BP and heart rate gradually rise in weeks 3–4
    bp_systolic_base  = 125 + week * 7          # 125 → 146
    bp_diastolic_base = 82  + week * 3          # 82  → 94
    hr_base           = 72  + week * 4          # 72  → 88

    # Blood sugar spikes on weekends
    date_offset = datetime.now(timezone.utc) - timedelta(days=day_offset)
    is_weekend  = date_offset.weekday() >= 5
    bs_lo = 130 if is_weekend else 110
    bs_hi = 175 if is_weekend else 148

    return {
        "heart_rate":   int(_rand(hr_base, hr_base + 12)),
        "bp_systolic":  int(_rand(bp_systolic_base, bp_systolic_base + 15)),
        "bp_diastolic": int(_rand(bp_diastolic_base, bp_diastolic_base + 8)),
        "spo2":         _rand(94, 98),
        "blood_sugar":  _rand(bs_lo, bs_hi),
        "temperature":  _rand(36.4, 37.1),
    }


def _sarah_vitals(_day_offset: int) -> dict:
    """Sarah Smith — mostly healthy, stable."""
    return {
        "heart_rate":   int(_rand(62, 78)),
        "bp_systolic":  int(_rand(108, 122)),
        "bp_diastolic": int(_rand(70, 80)),
        "spo2":         _rand(97, 99),
        "blood_sugar":  _rand(80, 115),
        "temperature":  _rand(36.2, 36.9),
    }


# ────────────────────────────────────────────────────────────────────────────────
# AI SUMMARIES (placeholder — Groq not called here for speed)
# ────────────────────────────────────────────────────────────────────────────────

JOHN_SUMMARIES = [
    "Week 1: Your vitals are slightly above optimal. Blood pressure is moderately elevated. Consider reducing sodium intake and monitoring daily.",
    "Week 2: Blood pressure has risen slightly compared to last week. Heart rate trends suggest increased cardiovascular stress. Recommend consulting your physician.",
    "Week 3: Multiple elevated BP readings detected. Blood sugar spikes observed on weekends. Risk level is escalating — medical review advised.",
    "Week 4: High-risk week with persistent hypertension and elevated blood sugar. Immediate lifestyle changes and medical consultation are strongly recommended.",
]

SARAH_SUMMARIES = [
    "Week 1: Excellent health metrics this week. All vitals within optimal ranges. Keep up your current healthy habits!",
    "Week 2: Vitals remain stable and healthy. Oxygen saturation and blood pressure are ideal. No concerns noted.",
    "Week 3: Another great week! Your consistent healthy lifestyle is clearly reflected in your vitals. Minimal variation, all normal.",
    "Week 4: Health metrics continue to be excellent. Low risk profile maintained. Great job staying on top of your wellness routine!",
]


# ────────────────────────────────────────────────────────────────────────────────
# MAIN SEED FUNCTION
# ────────────────────────────────────────────────────────────────────────────────

def seed_all():
    Base.metadata.create_all(bind=engine)
    db: Session = SessionLocal()

    try:
        # ── 0. Clean up existing seed users ───────────────────────────────────
        for email in ("john@healthai.com", "sarah@healthai.com"):
            existing = db.query(models.User).filter(models.User.email == email).first()
            if existing:
                db.delete(existing)
        db.commit()

        # ── 1. Create users ───────────────────────────────────────────────────
        pw_hash = _hash("Test1234!")   # same hash for both (for speed)

        john = models.User(
            name="John Doe", email="john@healthai.com",
            password_hash=pw_hash,
            age=45, gender="Male",
            weight=82.0, height=175.0,
        )
        sarah = models.User(
            name="Sarah Smith", email="sarah@healthai.com",
            password_hash=pw_hash,
            age=32, gender="Female",
            weight=65.0, height=162.0,
        )
        db.add_all([john, sarah])
        db.commit()
        db.refresh(john); db.refresh(sarah)
        print(f"✅ Users created: John (id={john.user_id}), Sarah (id={sarah.user_id})")

        # ── 2. Vitals + alerts (30 days, newest first = offset 0 → 29) ───────
        john_vitals_list  = []
        sarah_vitals_list = []

        for offset in range(29, -1, -1):   # day 29 (oldest) → day 0 (today)
            rec_at = _day(offset)

            # John
            jv_data = _john_vitals(offset)
            jv = models.Vital(user_id=john.user_id, recorded_at=rec_at, **jv_data)
            db.add(jv)
            john_vitals_list.append(jv)

            # Sarah
            sv_data = _sarah_vitals(offset)
            sv = models.Vital(user_id=sarah.user_id, recorded_at=rec_at, **sv_data)
            db.add(sv)
            sarah_vitals_list.append(sv)

        db.flush()   # get vital IDs without committing

        # Scan and emit alerts
        john_alert_count = sarah_alert_count = 0
        for v in john_vitals_list:
            for a in _scan_alerts(v, john.user_id):
                db.add(a); john_alert_count += 1
        for v in sarah_vitals_list:
            for a in _scan_alerts(v, sarah.user_id):
                db.add(a); sarah_alert_count += 1

        db.commit()
        print(f"✅ Vitals:  John={len(john_vitals_list)} days, Sarah={len(sarah_vitals_list)} days")
        print(f"✅ Alerts:  John={john_alert_count}, Sarah={sarah_alert_count}")

        # ── 3. Medications ────────────────────────────────────────────────────
        john_meds  = [
            ("Amlodipine 5mg",  "5mg",   "08:00:00"),
            ("Metformin 500mg", "500mg",  "13:00:00"),
            ("Aspirin 75mg",    "75mg",   "21:00:00"),
        ]
        sarah_meds = [
            ("Vitamin D 1000IU", "1000IU", "09:00:00"),
            ("Omega-3 500mg",    "500mg",   "20:00:00"),
        ]

        med_count = 0
        for offset in range(29, -1, -1):
            date_str = (datetime.now(timezone.utc) - timedelta(days=offset)).strftime("%Y-%m-%d")
            day_num  = 30 - offset            # 1 = oldest, 30 = today
            adherence_rate = 0.85 if day_num <= 20 else 0.70

            for name, dose, sched in john_meds:
                status = "taken" if random.random() < adherence_rate else "missed"
                db.add(models.Medication(
                    user_id=john.user_id, medicine_name=name, dosage=dose,
                    doses_per_day=1, dose_times=f'["{sched}"]', notes='After food', status=f'["{status}"]', date=date_str,
                    created_at=_day(offset),
                ))
                med_count += 1

            for name, dose, sched in sarah_meds:
                status = "taken" if random.random() < adherence_rate else "missed"
                db.add(models.Medication(
                    user_id=sarah.user_id, medicine_name=name, dosage=dose,
                    doses_per_day=1, dose_times=f'["{sched}"]', notes='With water', status=f'["{status}"]', date=date_str,
                    created_at=_day(offset),
                ))
                med_count += 1

        db.commit()
        print(f"✅ Medications: {med_count} records total")

        # ── 4. Weekly health scores (4 weeks × 2 users) ───────────────────────
        # Averages to sample vitals per week
        john_target_scores  = [55, 62, 71, 78]   # worsening
        sarah_target_scores = [25, 22, 28, 24]   # stable healthy

        for week_idx in range(4):
            week_offset = (3 - week_idx) * 7 + 3   # representative day mid-week
            gen_time = _day(week_offset)

            # John
            jv_data = _john_vitals(week_offset)
            jr = calculate_risk_score(jv_data)
            # Blend calculated with target for realistic but directed scores
            j_score = round((jr["score"] + john_target_scores[week_idx]) / 2, 1)
            j_risk = "high" if j_score > 70 else ("moderate" if j_score > 40 else "low")
            db.add(models.HealthScore(
                user_id=john.user_id,
                score=j_score,
                risk_level=j_risk,
                ai_summary=JOHN_SUMMARIES[week_idx],
                generated_at=gen_time,
            ))

            # Sarah
            sv_data = _sarah_vitals(week_offset)
            sr = calculate_risk_score(sv_data)
            s_score = round((sr["score"] + sarah_target_scores[week_idx]) / 2, 1)
            s_risk = "high" if s_score > 70 else ("moderate" if s_score > 40 else "low")
            db.add(models.HealthScore(
                user_id=sarah.user_id,
                score=s_score,
                risk_level=s_risk,
                ai_summary=SARAH_SUMMARIES[week_idx],
                generated_at=gen_time,
            ))

        db.commit()
        print("✅ Health scores: 4 weeks × 2 users = 8 records")

    finally:
        db.close()


# ────────────────────────────────────────────────────────────────────────────────
if __name__ == "__main__":
    print("🌱 Seeding HealthAI database with 30 days of dummy data…\n")
    seed_all()
    print("\n✅ 30 days of dummy data seeded successfully!")
    print("─" * 50)
    print("John Doe    → email: john@healthai.com  | password: Test1234!")
    print("Sarah Smith → email: sarah@healthai.com | password: Test1234!")
    print("─" * 50)
    print("Open http://localhost:5173 and log in to explore the data.")
