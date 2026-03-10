"""
backend/schemas.py
------------------
Pydantic v2 request / response schemas with input validation for health metrics.
"""

from __future__ import annotations
from datetime import datetime
from typing import Optional
from pydantic import BaseModel, EmailStr, field_validator


# ═══════════════════════════════════════════════════════════════
# AUTH / USERS
# ═══════════════════════════════════════════════════════════════

class UserRegister(BaseModel):
    name: str
    email: EmailStr
    password: str
    age: Optional[int] = None
    gender: Optional[str] = None


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class UserResponse(BaseModel):
    user_id: int
    name: str
    email: str
    age: Optional[int]
    gender: Optional[str]
    created_at: datetime

    model_config = {"from_attributes": True}


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse


# ═══════════════════════════════════════════════════════════════
# PROFILE
# ═══════════════════════════════════════════════════════════════

class UserProfileUpdate(BaseModel):
    name:   Optional[str]   = None
    age:    Optional[int]   = None
    gender: Optional[str]   = None
    weight: Optional[float] = None   # kg
    height: Optional[float] = None   # cm


class UserProfileResponse(BaseModel):
    user_id:    int
    name:       str
    email:      str
    age:        Optional[int]
    gender:     Optional[str]
    weight:     Optional[float]
    height:     Optional[float]
    bmi:        Optional[float]
    created_at: str

    model_config = {"from_attributes": True}


class PasswordChange(BaseModel):
    current_password: str
    new_password:     str


# ═══════════════════════════════════════════════════════════════
# VITALS  —  with range validators
# ═══════════════════════════════════════════════════════════════

class VitalsCreate(BaseModel):
    heart_rate:   Optional[int]   = None
    bp_systolic:  Optional[int]   = None
    bp_diastolic: Optional[int]   = None
    spo2:         Optional[float] = None
    blood_sugar:  Optional[float] = None
    temperature:  Optional[float] = None

    @field_validator("heart_rate")
    @classmethod
    def validate_heart_rate(cls, v):
        if v is not None and not (20 <= v <= 250):
            raise ValueError("heart_rate must be between 20 and 250 bpm")
        return v

    @field_validator("bp_systolic")
    @classmethod
    def validate_bp_systolic(cls, v):
        if v is not None and not (50 <= v <= 250):
            raise ValueError("bp_systolic must be between 50 and 250 mmHg")
        return v

    @field_validator("bp_diastolic")
    @classmethod
    def validate_bp_diastolic(cls, v):
        if v is not None and not (30 <= v <= 150):
            raise ValueError("bp_diastolic must be between 30 and 150 mmHg")
        return v

    @field_validator("spo2")
    @classmethod
    def validate_spo2(cls, v):
        if v is not None and not (50.0 <= v <= 100.0):
            raise ValueError("spo2 must be between 50 and 100 %")
        return v

    @field_validator("blood_sugar")
    @classmethod
    def validate_blood_sugar(cls, v):
        if v is not None and not (20.0 <= v <= 600.0):
            raise ValueError("blood_sugar must be between 20 and 600 mg/dL")
        return v

    @field_validator("temperature")
    @classmethod
    def validate_temperature(cls, v):
        if v is not None and not (86.0 <= v <= 113.0):
            raise ValueError("temperature must be between 86 and 113 °F")
        return v


class VitalsResponse(BaseModel):
    vital_id:     int
    user_id:      int
    heart_rate:   Optional[int]
    bp_systolic:  Optional[int]
    bp_diastolic: Optional[int]
    spo2:         Optional[float]
    blood_sugar:  Optional[float]
    temperature:  Optional[float]
    recorded_at:  datetime

    model_config = {"from_attributes": True}


# ═══════════════════════════════════════════════════════════════
# MEDICATIONS
# ═══════════════════════════════════════════════════════════════

class MedicationCreate(BaseModel):
    medicine_name: str
    dosage:        str
    doses_per_day: int
    dose_times:    list[str]
    notes:         Optional[str] = None
    status:        Optional[str] = "pending"
    date:          str


class MedicationUpdate(BaseModel):
    status: str


class MedicationResponse(BaseModel):
    med_id:        int
    user_id:       int
    medicine_name: str
    dosage:        Optional[str]
    doses_per_day: int
    dose_times:    str  # Will be JSON string
    notes:         Optional[str]
    status:        str
    date:          str
    created_at:    datetime

    model_config = {"from_attributes": True}


# ═══════════════════════════════════════════════════════════════
# ALERTS
# ═══════════════════════════════════════════════════════════════

class AlertResponse(BaseModel):
    alert_id:   int
    user_id:    int
    alert_type: str
    message:    str
    severity:   str
    created_at: datetime

    model_config = {"from_attributes": True}


# ═══════════════════════════════════════════════════════════════
# HEALTH SCORES
# ═══════════════════════════════════════════════════════════════

class HealthScoreResponse(BaseModel):
    score_id:    int
    user_id:     int
    score:       float
    risk_level:  str
    ai_summary:  Optional[str]
    generated_at: datetime

    model_config = {"from_attributes": True}
