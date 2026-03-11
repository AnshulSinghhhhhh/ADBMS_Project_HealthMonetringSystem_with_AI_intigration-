"""
backend/routers/medications.py
-------------------------------
POST /medications/add              — add a medication schedule entry
GET  /medications/today            — today's medications for the current user
PUT  /medications/update/{med_id}  — update taken / missed status
"""

import json
from datetime import date
from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import or_
from sqlalchemy.orm import Session

from database import get_db
from auth import get_current_user
import models, schemas

router = APIRouter(prefix="/medications", tags=["Medications"])

@router.post("/add", response_model=schemas.MedicationResponse, status_code=201)
def add_medication(
    payload: schemas.MedicationCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    med_data = payload.model_dump()
    
    # Store arrays as JSON strings
    med_data["dose_times"] = json.dumps(med_data["dose_times"])
    
    # Init status array if it's "pending"
    if med_data["status"] == "pending":
        med_data["status"] = json.dumps(["pending"] * med_data["doses_per_day"])

    med = models.Medication(user_id=current_user.user_id, **med_data)
    db.add(med)
    db.commit()
    db.refresh(med)
    return med

@router.get("/today", response_model=List[schemas.MedicationResponse])
def get_today_medications(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    today = date.today().isoformat()   # "YYYY-MM-DD"
    return (
        db.query(models.Medication)
        .filter(
            models.Medication.user_id == current_user.user_id,
            models.Medication.date <= today,           # started on or before today
            or_(
                models.Medication.end_date == None,    # ongoing (no end date)
                models.Medication.end_date >= today,   # not yet expired
            ),
        )
        .order_by(models.Medication.med_id.asc())
        .all()
    )


@router.put("/update/{med_id}", response_model=schemas.MedicationResponse)
def update_medication_status(
    med_id: int,
    payload: schemas.MedicationUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    med = (
        db.query(models.Medication)
        .filter(
            models.Medication.med_id == med_id,
            models.Medication.user_id == current_user.user_id,
        )
        .first()
    )
    if not med:
        raise HTTPException(status_code=404, detail="Medication not found")

    med.status = payload.status
    db.commit()
    db.refresh(med)
    return med
