"""
backend/ai_module/trends.py
----------------------------
analyze_trends(vitals_list: list) -> dict

Takes a chronologically ordered list of vitals dicts (oldest → newest).
For each metric, determines whether the trend over the last 3 readings is
rising, falling, or stable.
"""

METRICS = ["heart_rate", "bp_systolic", "bp_diastolic", "spo2", "blood_sugar", "temperature"]


def _trend_for_metric(values: list) -> str:
    """
    Given a list of numeric readings (oldest → newest), return
    'rising', 'falling', or 'stable' based on the last 3 values.
    """
    # Filter out None
    clean = [v for v in values if v is not None]

    if len(clean) < 3:
        return "stable"   # not enough data to determine trend

    last3 = clean[-3:]

    if last3[0] < last3[1] < last3[2]:
        return "rising"
    if last3[0] > last3[1] > last3[2]:
        return "falling"
    return "stable"


def analyze_trends(vitals_list: list) -> dict:
    """
    Args:
        vitals_list: list of dicts (or ORM Vital objects) ordered oldest→newest.
                     Accepts both plain dicts and SQLAlchemy model instances.

    Returns:
        dict mapping each metric to 'rising' | 'falling' | 'stable'.
        Example:
            {
              "heart_rate":   "stable",
              "bp_systolic":  "rising",
              "bp_diastolic": "rising",
              "spo2":         "stable",
              "blood_sugar":  "falling",
              "temperature":  "stable",
            }
    """
    result = {}

    for metric in METRICS:
        # Support both dict access and ORM attribute access
        values = []
        for v in vitals_list:
            if isinstance(v, dict):
                values.append(v.get(metric))
            else:
                values.append(getattr(v, metric, None))

        result[metric] = _trend_for_metric(values)

    return result
