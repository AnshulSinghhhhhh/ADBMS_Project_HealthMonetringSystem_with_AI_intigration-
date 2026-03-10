"""
backend/ai_module/__init__.py
------------------------------
Clean exports for the AI module.
"""

from ai_module.risk_score import calculate_risk_score
from ai_module.anomaly   import detect_anomalies
from ai_module.trends    import analyze_trends
from ai_module.summary   import generate_weekly_summary

__all__ = [
    "calculate_risk_score",
    "detect_anomalies",
    "analyze_trends",
    "generate_weekly_summary",
]
