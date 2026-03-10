"""
backend/routers/profile.py
--------------------------
GET  /profile/me              — return full profile with calculated BMI
PUT  /profile/update          — update name, age, gender, weight, height
PUT  /profile/change-password — verify current password and save new one
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from database import get_db
from auth import get_current_user, hash_password, verify_password
import models, schemas

router = APIRouter(prefix="/profile", tags=["Profile"])


def _calc_bmi(weight: float | None, height: float | None) -> float | None:
    """BMI = kg / (m²).  height is stored in cm."""
    if weight and height and height > 0:
        return round(weight / (height / 100) ** 2, 1)
    return None


# ── GET /profile/me ────────────────────────────────────────────────────────────
@router.get("/me", response_model=schemas.UserProfileResponse)
def get_profile(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    return schemas.UserProfileResponse(
        user_id    = current_user.user_id,
        name       = current_user.name,
        email      = current_user.email,
        age        = current_user.age,
        gender     = current_user.gender,
        weight     = current_user.weight,
        height     = current_user.height,
        bmi        = _calc_bmi(current_user.weight, current_user.height),
        created_at = current_user.created_at.strftime("%d %b %Y") if current_user.created_at else "N/A",
    )


# ── PUT /profile/update ────────────────────────────────────────────────────────
@router.put("/update", response_model=schemas.UserProfileResponse)
def update_profile(
    payload: schemas.UserProfileUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    if payload.name   is not None: current_user.name   = payload.name
    if payload.age    is not None: current_user.age    = payload.age
    if payload.gender is not None: current_user.gender = payload.gender
    if payload.weight is not None: current_user.weight = payload.weight
    if payload.height is not None: current_user.height = payload.height

    db.commit()
    db.refresh(current_user)

    return schemas.UserProfileResponse(
        user_id    = current_user.user_id,
        name       = current_user.name,
        email      = current_user.email,
        age        = current_user.age,
        gender     = current_user.gender,
        weight     = current_user.weight,
        height     = current_user.height,
        bmi        = _calc_bmi(current_user.weight, current_user.height),
        created_at = current_user.created_at.strftime("%d %b %Y") if current_user.created_at else "N/A",
    )


# ── PUT /profile/change-password ───────────────────────────────────────────────
@router.put("/change-password")
def change_password(
    payload: schemas.PasswordChange,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    if not verify_password(payload.current_password, current_user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Current password is incorrect",
        )
    if len(payload.new_password) < 6:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="New password must be at least 6 characters",
        )

    current_user.password_hash = hash_password(payload.new_password)
    db.commit()
    return {"message": "Password updated successfully"}
