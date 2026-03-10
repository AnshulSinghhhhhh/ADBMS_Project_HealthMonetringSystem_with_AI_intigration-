"""
backend/ai_module/anomaly.py
-----------------------------
detect_anomalies(vitals: dict, user_id: int, db: Session) -> list

Checks each vital against hard thresholds, builds alert dicts,
persists them to the DB, and returns the list.
"""

from sqlalchemy.orm import Session
import models


# ── Alert threshold rules ─────────────────────────────────────────────────────
# Each rule: (condition_fn, alert_type, message_fn, severity)
_RULES = [
    (
        lambda v: v.get("heart_rate") is not None and v["heart_rate"] < 50,
        "Low Heart Rate",
        lambda v: f"Heart rate is {v['heart_rate']} bpm, below safe threshold of 50 bpm.",
        "high",
    ),
    (
        lambda v: v.get("heart_rate") is not None and v["heart_rate"] > 120,
        "High Heart Rate",
        lambda v: f"Heart rate is {v['heart_rate']} bpm, above safe threshold of 120 bpm.",
        "high",
    ),
    (
        lambda v: v.get("bp_systolic") is not None and v["bp_systolic"] > 160,
        "High Blood Pressure (Systolic)",
        lambda v: f"Systolic BP is {v['bp_systolic']} mmHg, above safe threshold of 160 mmHg.",
        "high",
    ),
    (
        lambda v: v.get("bp_diastolic") is not None and v["bp_diastolic"] > 100,
        "High Blood Pressure (Diastolic)",
        lambda v: f"Diastolic BP is {v['bp_diastolic']} mmHg, above safe threshold of 100 mmHg.",
        "high",
    ),
    (
        lambda v: v.get("spo2") is not None and v["spo2"] < 90,
        "Low SpO2",
        lambda v: f"Oxygen level is {v['spo2']}%, below safe threshold of 90%.",
        "critical",
    ),
    (
        lambda v: v.get("blood_sugar") is not None and v["blood_sugar"] > 180,
        "High Blood Sugar",
        lambda v: f"Blood sugar is {v['blood_sugar']} mg/dL, above safe threshold of 180 mg/dL.",
        "high",
    ),
    (
        lambda v: v.get("temperature") is not None and v["temperature"] > 101.3,
        "High Temperature",
        lambda v: f"Temperature is {v['temperature']}°F, above safe threshold of 101.3°F.",
        "moderate",
    ),
]


def detect_anomalies(vitals: dict, user_id: int, db: Session) -> list:
    """
    Args:
        vitals:   dict of vital readings (heart_rate, bp_systolic, etc.)
        user_id:  ID of the current user
        db:       SQLAlchemy session (used to persist alerts)

    Returns:
        List of alert dicts that were triggered and saved.
    """
    triggered = []

    for condition, alert_type, message_fn, severity in _RULES:
        if condition(vitals):
            alert_dict = {
                "alert_type": alert_type,
                "message":    message_fn(vitals),
                "severity":   severity,
            }
            triggered.append(alert_dict)

            # Persist to DB
            db.add(models.Alert(
                user_id=user_id,
                alert_type=alert_dict["alert_type"],
                message=alert_dict["message"],
                severity=alert_dict["severity"],
            ))

    if triggered:
        db.commit()

    return triggered
