"""
backend/models.py
-----------------
SQLAlchemy ORM models for all 5 tables.
Uses SQLite-compatible column types throughout.
"""

from sqlalchemy import (
    Column, Integer, String, Float, Text, DateTime, ForeignKey, func
)
from sqlalchemy.orm import relationship
from database import Base


# ── 1. Users ──────────────────────────────────────────────────────────────────
class User(Base):
    __tablename__ = "users"

    user_id       = Column(Integer, primary_key=True, index=True, autoincrement=True)
    name          = Column(String(100), nullable=False)
    email         = Column(String(100), nullable=False, unique=True, index=True)
    password_hash = Column(String(255), nullable=False)
    age           = Column(Integer,     nullable=True)
    gender        = Column(String(10),  nullable=True)
    weight        = Column(Float,       nullable=True)   # kg
    height        = Column(Float,       nullable=True)   # cm
    created_at    = Column(DateTime,    nullable=False, server_default=func.now())

    # Relationships (cascade delete to remove child rows when user is deleted)
    vitals        = relationship("Vital",       back_populates="user", cascade="all, delete-orphan")
    medications   = relationship("Medication",  back_populates="user", cascade="all, delete-orphan")
    alerts        = relationship("Alert",       back_populates="user", cascade="all, delete-orphan")
    health_scores = relationship("HealthScore", back_populates="user", cascade="all, delete-orphan")


# ── 2. Vitals ─────────────────────────────────────────────────────────────────
class Vital(Base):
    __tablename__ = "vitals"

    vital_id     = Column(Integer, primary_key=True, index=True, autoincrement=True)
    user_id      = Column(Integer, ForeignKey("users.user_id", ondelete="CASCADE"), nullable=False)
    heart_rate   = Column(Integer, nullable=True)
    bp_systolic  = Column(Integer, nullable=True)
    bp_diastolic = Column(Integer, nullable=True)
    spo2         = Column(Float,   nullable=True)
    blood_sugar  = Column(Float,   nullable=True)
    temperature  = Column(Float,   nullable=True)
    recorded_at  = Column(DateTime, nullable=False, server_default=func.now())

    user = relationship("User", back_populates="vitals")


# ── 3. Medications ────────────────────────────────────────────────────────────
# SQLite has no native ENUM — values are validated at the application layer.
# Allowed status values: 'pending' | 'taken' | 'missed'
class Medication(Base):
    __tablename__ = "medications"

    med_id        = Column(Integer,     primary_key=True, index=True, autoincrement=True)
    user_id       = Column(Integer,     ForeignKey("users.user_id", ondelete="CASCADE"), nullable=False)
    medicine_name = Column(String(100), nullable=False)
    dosage        = Column(String(50),  nullable=True)
    doses_per_day = Column(Integer,     default=1)
    dose_times    = Column(String,      default="[]")   # JSON string: ["08:00", "14:00", "21:00"]
    notes         = Column(String,      nullable=True)  # e.g. "after food", "before sleep"
    status        = Column(String(10),  nullable=False, default="pending")
    date          = Column(String(10),  nullable=False)  # "YYYY-MM-DD"
    end_date      = Column(String(10),  nullable=True)   # "YYYY-MM-DD" or None = ongoing
    created_at    = Column(DateTime,    nullable=False, server_default=func.now())

    user = relationship("User", back_populates="medications")


# ── 4. Alerts ─────────────────────────────────────────────────────────────────
# Allowed severity values: 'low' | 'moderate' | 'high' | 'critical'
class Alert(Base):
    __tablename__ = "alerts"

    alert_id   = Column(Integer,     primary_key=True, index=True, autoincrement=True)
    user_id    = Column(Integer,     ForeignKey("users.user_id", ondelete="CASCADE"), nullable=False)
    alert_type = Column(String(100), nullable=False)
    message    = Column(Text,        nullable=False)
    severity   = Column(String(10),  nullable=False, default="low")
    created_at = Column(DateTime,    nullable=False, server_default=func.now())

    user = relationship("User", back_populates="alerts")


# ── 5. Health Scores ──────────────────────────────────────────────────────────
# Allowed risk_level values: 'low' | 'moderate' | 'high'
class HealthScore(Base):
    __tablename__ = "health_scores"

    score_id     = Column(Integer,    primary_key=True, index=True, autoincrement=True)
    user_id      = Column(Integer,    ForeignKey("users.user_id", ondelete="CASCADE"), nullable=False)
    score        = Column(Float,      nullable=False)
    risk_level   = Column(String(10), nullable=False, default="low")
    ai_summary   = Column(Text,       nullable=True)
    generated_at = Column(DateTime,   nullable=False, server_default=func.now())

    user = relationship("User", back_populates="health_scores")
