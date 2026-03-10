"""
backend/routers/auth.py
-----------------------
POST /auth/register  — create a new user account
POST /auth/login     — authenticate, return JWT (rate-limited: 5/min per IP)
POST /auth/refresh   — exchange a valid token for a fresh one
"""

from fastapi import APIRouter, Depends, HTTPException, Request, status
from slowapi import Limiter
from slowapi.util import get_remote_address
from sqlalchemy.orm import Session

from database import get_db
import models, schemas
from auth import (
    hash_password, verify_password, create_access_token,
    get_current_user,
)

router = APIRouter(prefix="/auth", tags=["Auth"])

# Use the same shared limiter instance from app.state via a thin wrapper
limiter = Limiter(key_func=get_remote_address)


# ── Register ───────────────────────────────────────────────────────────────────
@router.post("/register", response_model=schemas.UserResponse, status_code=201)
def register(payload: schemas.UserRegister, db: Session = Depends(get_db)):
    if db.query(models.User).filter(models.User.email == payload.email).first():
        raise HTTPException(status_code=400, detail="Email already registered")

    user = models.User(
        name=payload.name,
        email=payload.email,
        password_hash=hash_password(payload.password),
        age=payload.age,
        gender=payload.gender,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


# ── Login  (rate-limited 5 requests per minute per IP) ────────────────────────
@router.post("/login", response_model=schemas.TokenResponse)
@limiter.limit("5/minute")
def login(
    request: Request,
    payload: schemas.UserLogin,
    db: Session = Depends(get_db),
):
    user = db.query(models.User).filter(models.User.email == payload.email).first()
    if not user or not verify_password(payload.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )

    token = create_access_token({"sub": str(user.user_id)})
    return schemas.TokenResponse(access_token=token, user=user)


# ── Refresh token ──────────────────────────────────────────────────────────────
@router.post("/refresh", response_model=schemas.TokenResponse)
def refresh_token(
    current_user: models.User = Depends(get_current_user),
):
    """
    Exchange a valid (non-expired) Bearer token for a fresh 24-hour token.
    """
    new_token = create_access_token({"sub": str(current_user.user_id)})
    return schemas.TokenResponse(access_token=new_token, user=current_user)
