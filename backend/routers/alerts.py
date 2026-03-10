"""
backend/routers/alerts.py
--------------------------
GET /alerts/all     — all alerts for the authenticated user
GET /alerts/recent  — most recent 5 alerts
"""

from typing import List

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from database import get_db
from auth import get_current_user
import models, schemas

router = APIRouter(prefix="/alerts", tags=["Alerts"])


@router.get("/all", response_model=List[schemas.AlertResponse])
def get_all_alerts(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    return (
        db.query(models.Alert)
        .filter(models.Alert.user_id == current_user.user_id)
        .order_by(models.Alert.created_at.desc())
        .all()
    )


@router.get("/recent", response_model=List[schemas.AlertResponse])
def get_recent_alerts(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    return (
        db.query(models.Alert)
        .filter(models.Alert.user_id == current_user.user_id)
        .order_by(models.Alert.created_at.desc())
        .limit(5)
        .all()
    )
