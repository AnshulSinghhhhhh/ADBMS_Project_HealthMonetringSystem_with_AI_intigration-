import sqlite3
import json

conn = sqlite3.connect('./healthai.db')
cur = conn.cursor()

cur.execute('PRAGMA table_info(medications)')
cols = [row[1] for row in cur.fetchall()]

if 'doses_per_day' not in cols:
    cur.execute('ALTER TABLE medications ADD COLUMN doses_per_day INTEGER DEFAULT 1')
if 'dose_times' not in cols:
    cur.execute("ALTER TABLE medications ADD COLUMN dose_times TEXT DEFAULT '[]'")
if 'notes' not in cols:
    cur.execute('ALTER TABLE medications ADD COLUMN notes TEXT')

if 'schedule_time' in cols:
    cur.execute("SELECT med_id, schedule_time FROM medications WHERE doses_per_day = 1 AND dose_times = '[]'")
    rows = cur.fetchall()
    for med_id, sch_time in rows:
        if sch_time:
            times = json.dumps([sch_time[:5]])
            cur.execute('UPDATE medications SET dose_times = ? WHERE med_id = ?', (times, med_id))

conn.commit()
conn.close()
print('Migration complete')
