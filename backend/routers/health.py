"""
backend/routers/health.py
--------------------------
GET /health/score          — calculate risk score from latest vitals
GET /health/weekly-report  — generate + persist weekly AI summary
GET /health/anomalies      — return alerts with severity high or critical
"""

from typing import List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from database import get_db
from auth import get_current_user
from ai_module.risk_score import calculate_risk_score
from ai_module.summary    import generate_weekly_summary
import models, schemas

router = APIRouter(prefix="/health", tags=["Health"])


@router.get("/score")
def get_health_score(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """
    Fetches the latest vitals entry, runs the AI risk scorer,
    and returns the score + risk level.
    """
    latest_vital = (
        db.query(models.Vital)
        .filter(models.Vital.user_id == current_user.user_id)
        .order_by(models.Vital.recorded_at.desc())
        .first()
    )
    if not latest_vital:
        raise HTTPException(
            status_code=404,
            detail="No vitals found. Please log your vitals first.",
        )

    vitals_dict = {
        "heart_rate":   latest_vital.heart_rate,
        "bp_systolic":  latest_vital.bp_systolic,
        "bp_diastolic": latest_vital.bp_diastolic,
        "spo2":         latest_vital.spo2,
        "blood_sugar":  latest_vital.blood_sugar,
        "temperature":  latest_vital.temperature,
    }

    result = calculate_risk_score(vitals_dict)
    return {
        "user_id":    current_user.user_id,
        "score":      result["score"],
        "risk_level": result["risk_level"],
        "vitals_used": vitals_dict,
    }


@router.get("/weekly-report")
def get_weekly_report(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """
    Generates (and persists) a weekly health summary using AI analysis.
    Returns the summary text + the saved HealthScore record.
    """
    summary_text = generate_weekly_summary(user_id=current_user.user_id, db=db)

    # Fetch the record that was just saved by generate_weekly_summary
    latest_score = (
        db.query(models.HealthScore)
        .filter(models.HealthScore.user_id == current_user.user_id)
        .order_by(models.HealthScore.generated_at.desc())
        .first()
    )

    return {
        "summary":    summary_text,
        "score":      latest_score.score      if latest_score else None,
        "risk_level": latest_score.risk_level if latest_score else None,
        "generated_at": str(latest_score.generated_at) if latest_score else None,
    }


@router.get("/anomalies", response_model=List[schemas.AlertResponse])
def get_anomalies(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Returns alerts with severity 'high' or 'critical' — detected anomalies."""
    return (
        db.query(models.Alert)
        .filter(
            models.Alert.user_id == current_user.user_id,
            models.Alert.severity.in_(["high", "critical"]),
        )
        .order_by(models.Alert.created_at.desc())
        .all()
    )
