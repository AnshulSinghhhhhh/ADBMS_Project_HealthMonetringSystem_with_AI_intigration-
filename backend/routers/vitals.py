"""
backend/routers/vitals.py
--------------------------
POST /vitals/add      — log new vitals, auto-run anomaly detection
GET  /vitals/weekly   — last 7 days of vitals for the authenticated user
GET  /vitals/history  — full vitals history for the authenticated user
"""

from datetime import datetime, timedelta, timezone
from typing import List

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from database import get_db
from auth import get_current_user
from ai_module.anomaly import detect_anomalies
import models, schemas

router = APIRouter(prefix="/vitals", tags=["Vitals"])


@router.post("/add", response_model=schemas.VitalsResponse, status_code=201)
def add_vitals(
    payload: schemas.VitalsCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    # 1. Save vitals entry
    entry = models.Vital(user_id=current_user.user_id, **payload.model_dump())
    db.add(entry)
    db.commit()
    db.refresh(entry)

    # 2. Auto-run anomaly detection and persist any triggered alerts
    vitals_dict = payload.model_dump()
    detect_anomalies(vitals_dict, user_id=current_user.user_id, db=db)

    return entry


@router.get("/weekly", response_model=List[schemas.VitalsResponse])
def get_weekly_vitals(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    seven_days_ago = datetime.now(timezone.utc) - timedelta(days=7)
    return (
        db.query(models.Vital)
        .filter(
            models.Vital.user_id == current_user.user_id,
            models.Vital.recorded_at >= seven_days_ago,
        )
        .order_by(models.Vital.recorded_at.asc())
        .all()
    )


@router.get("/history", response_model=List[schemas.VitalsResponse])
def get_vitals_history(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    return (
        db.query(models.Vital)
        .filter(models.Vital.user_id == current_user.user_id)
        .order_by(models.Vital.recorded_at.desc())
        .all()
    )
