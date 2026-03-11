"""
database/fix_temperature.py
-----------------------------
One-time migration: converts all existing temperature values in the vitals
table from Celsius to Fahrenheit using: F = (C * 9/5) + 32

Run from project root:
    cd backend
    python ../database/fix_temperature.py
"""

import sys
import os
import sqlite3

# Locate the database file
BACKEND_DIR = os.path.join(os.path.dirname(__file__), "..", "backend")
DB_PATH = os.path.join(BACKEND_DIR, "healthai.db")

if not os.path.exists(DB_PATH):
    print(f"❌ Database not found at: {DB_PATH}")
    sys.exit(1)

conn = sqlite3.connect(DB_PATH)
cursor = conn.cursor()

# Count rows with temperature data
cursor.execute("SELECT COUNT(*) FROM vitals WHERE temperature IS NOT NULL")
total_rows = cursor.fetchone()[0]
print(f"🔍 Found {total_rows} vitals rows with temperature data")

# Show a sample of current values
cursor.execute("SELECT vital_id, temperature FROM vitals WHERE temperature IS NOT NULL LIMIT 5")
sample = cursor.fetchall()
print("Sample BEFORE conversion:")
for vid, temp in sample:
    print(f"   vital_id={vid}  temperature={temp}°C  →  {round(temp * 9/5 + 32, 1)}°F")

# Only convert values that look like Celsius (< 50 is a safe cutoff:
# normal human body temp in C is 36–37.5, in F is 96.8–99.5)
cursor.execute("""
    UPDATE vitals
    SET temperature = ROUND((temperature * 9.0 / 5.0) + 32, 1)
    WHERE temperature IS NOT NULL
      AND temperature < 50
""")
converted = cursor.rowcount
conn.commit()

# Verify
cursor.execute("SELECT vital_id, temperature FROM vitals WHERE temperature IS NOT NULL LIMIT 5")
sample_after = cursor.fetchall()
print("\nSample AFTER conversion:")
for vid, temp in sample_after:
    print(f"   vital_id={vid}  temperature={temp}°F")

conn.close()
print(f"\n✅ Converted {converted} rows from Celsius to Fahrenheit")
