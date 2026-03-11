"""
backend/ai_module/risk_score.py
--------------------------------
calculate_risk_score(vitals: dict) -> dict

Computes a weighted 0–100 health risk score from a vitals snapshot
and maps it to a risk level (low / moderate / high).
"""


# ── Normal ranges ──────────────────────────────────────────────────────────────
RANGES = {
    "heart_rate":  (60,   100),    # bpm
    "bp_systolic": (90,   120),    # mmHg
    "spo2":        (95,   100),    # %
    "blood_sugar": (70,   140),    # mg/dL
    "temperature": (97.0, 99.0),   # °F
}

# ── Weights (must sum to 1.0) ──────────────────────────────────────────────────
WEIGHTS = {
    "heart_rate":  0.20,
    "bp_systolic": 0.25,
    "spo2":        0.25,
    "blood_sugar": 0.20,
    "temperature": 0.10,
}


def _deviation_score(value: float, low: float, high: float) -> float:
    """
    Returns a per-metric penalty between 0 and 100.
    0  = perfectly within range
    100 = severely out of range
    """
    if value is None:
        return 0.0  # missing value → no penalty

    span = high - low  # width of normal band

    if low <= value <= high:
        # Within range: small score based on distance from ideal mid-point
        mid = (low + high) / 2
        return abs(value - mid) / (span / 2) * 20   # max 20 within range

    # Outside range: increasing penalty
    if value < low:
        deviation = (low - value) / span
    else:
        deviation = (value - high) / span

    # Cap at 100
    return min(100.0, 20.0 + deviation * 100)


def calculate_risk_score(vitals: dict) -> dict:
    """
    Args:
        vitals: dict with any/all of:
                heart_rate, bp_systolic, bp_diastolic,
                spo2, blood_sugar, temperature

    Returns:
        {"score": float (0–100), "risk_level": "low" | "moderate" | "high"}
    """
    total_weight = 0.0
    weighted_sum = 0.0

    for metric, weight in WEIGHTS.items():
        value = vitals.get(metric)
        if value is not None:
            low, high = RANGES[metric]
            dev = _deviation_score(float(value), low, high)
            weighted_sum += dev * weight
            total_weight += weight

    # Normalise in case some metrics are missing
    score = (weighted_sum / total_weight * 100 / 100) if total_weight else 0.0
    score = round(min(100.0, max(0.0, score)), 2)

    if score <= 25:
        risk_level = "low"
    elif score <= 55:
        risk_level = "moderate"
    else:
        risk_level = "high"

    return {"score": score, "risk_level": risk_level}
