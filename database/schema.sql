-- ============================================================
--  HealthAI — SQLite Database Schema
--  Run: sqlite3 healthai.db < database/schema.sql
-- ============================================================

PRAGMA foreign_keys = ON;

-- ============================================================
-- TABLE 1: users
-- ============================================================
CREATE TABLE IF NOT EXISTS users (
    user_id       INTEGER  PRIMARY KEY AUTOINCREMENT,
    name          TEXT     NOT NULL,
    email         TEXT     NOT NULL UNIQUE,
    password_hash TEXT     NOT NULL,
    age           INTEGER,
    gender        TEXT,
    created_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- TABLE 2: vitals
-- ============================================================
CREATE TABLE IF NOT EXISTS vitals (
    vital_id     INTEGER  PRIMARY KEY AUTOINCREMENT,
    user_id      INTEGER  NOT NULL,
    heart_rate   INTEGER,
    bp_systolic  INTEGER,
    bp_diastolic INTEGER,
    spo2         REAL,
    blood_sugar  REAL,
    temperature  REAL,
    recorded_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (user_id) REFERENCES users (user_id) ON DELETE CASCADE
);

-- ============================================================
-- TABLE 3: medications
-- ============================================================
CREATE TABLE IF NOT EXISTS medications (
    med_id        INTEGER  PRIMARY KEY AUTOINCREMENT,
    user_id       INTEGER  NOT NULL,
    medicine_name TEXT     NOT NULL,
    dosage        TEXT,
    schedule_time TEXT,                       -- "HH:MM:SS"
    status        TEXT     NOT NULL DEFAULT 'pending'
                           CHECK (status IN ('pending', 'taken', 'missed')),
    date          TEXT     NOT NULL,          -- "YYYY-MM-DD"
    created_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (user_id) REFERENCES users (user_id) ON DELETE CASCADE
);

-- ============================================================
-- TABLE 4: alerts
-- ============================================================
CREATE TABLE IF NOT EXISTS alerts (
    alert_id   INTEGER  PRIMARY KEY AUTOINCREMENT,
    user_id    INTEGER  NOT NULL,
    alert_type TEXT     NOT NULL,
    message    TEXT     NOT NULL,
    severity   TEXT     NOT NULL DEFAULT 'low'
                        CHECK (severity IN ('low', 'moderate', 'high', 'critical')),
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (user_id) REFERENCES users (user_id) ON DELETE CASCADE
);

-- ============================================================
-- TABLE 5: health_scores
-- ============================================================
CREATE TABLE IF NOT EXISTS health_scores (
    score_id     INTEGER  PRIMARY KEY AUTOINCREMENT,
    user_id      INTEGER  NOT NULL,
    score        REAL     NOT NULL,
    risk_level   TEXT     NOT NULL DEFAULT 'low'
                          CHECK (risk_level IN ('low', 'moderate', 'high')),
    ai_summary   TEXT,
    generated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (user_id) REFERENCES users (user_id) ON DELETE CASCADE
);


-- ============================================================
-- SEED DATA
-- ============================================================

-- 2 sample users  (passwords are bcrypt hashes of "password123")
INSERT INTO users (name, email, password_hash, age, gender) VALUES
(
    'Anshuman Sharma',
    'anshuman@example.com',
    '$2b$12$KIX8c8LBcj/CWIQyNIAFt.aBhECVmGXx6LkjHYVOUkN4UzMh7tIf6',
    27,
    'Male'
),
(
    'Priya Verma',
    'priya@example.com',
    '$2b$12$KIX8c8LBcj/CWIQyNIAFt.aBhECVmGXx6LkjHYVOUkN4UzMh7tIf6',
    24,
    'Female'
);

-- ----------------------------------------------------------------
-- 7 days of vitals for user 1 (Anshuman)
-- ----------------------------------------------------------------
INSERT INTO vitals (user_id, heart_rate, bp_systolic, bp_diastolic, spo2, blood_sugar, temperature, recorded_at) VALUES
(1, 72, 118, 76, 98.2,  95.0, 36.6, datetime('now', '-6 days')),
(1, 75, 122, 78, 97.8, 100.5, 36.7, datetime('now', '-5 days')),
(1, 80, 125, 80, 97.5, 108.0, 36.8, datetime('now', '-4 days')),
(1, 78, 128, 82, 97.0, 112.5, 36.9, datetime('now', '-3 days')),
(1, 85, 132, 85, 96.5, 120.0, 37.0, datetime('now', '-2 days')),
(1, 88, 138, 88, 96.0, 130.0, 37.1, datetime('now', '-1 day')),
(1, 90, 142, 90, 95.5, 138.0, 37.2, datetime('now'));

-- 7 days of vitals for user 2 (Priya)
INSERT INTO vitals (user_id, heart_rate, bp_systolic, bp_diastolic, spo2, blood_sugar, temperature, recorded_at) VALUES
(2, 68, 110, 70, 99.0,  88.0, 36.4, datetime('now', '-6 days')),
(2, 70, 112, 72, 98.8,  90.5, 36.5, datetime('now', '-5 days')),
(2, 72, 115, 74, 98.5,  92.0, 36.5, datetime('now', '-4 days')),
(2, 71, 113, 73, 98.7,  91.5, 36.6, datetime('now', '-3 days')),
(2, 69, 111, 71, 98.9,  89.0, 36.4, datetime('now', '-2 days')),
(2, 73, 116, 75, 98.4,  93.5, 36.6, datetime('now', '-1 day')),
(2, 74, 117, 76, 98.2,  94.0, 36.7, datetime('now'));

-- ----------------------------------------------------------------
-- 3 medication entries per user
-- ----------------------------------------------------------------
INSERT INTO medications (user_id, medicine_name, dosage, schedule_time, status, date) VALUES
(1, 'Metformin',    '500mg',   '08:00:00', 'taken',   date('now')),
(1, 'Amlodipine',   '5mg',     '13:00:00', 'pending', date('now')),
(1, 'Atorvastatin', '20mg',    '21:00:00', 'missed',  date('now')),

(2, 'Paracetamol',  '500mg',   '08:00:00', 'taken',   date('now')),
(2, 'Vitamin D3',   '60000IU', '12:00:00', 'pending', date('now')),
(2, 'Iron Tablet',  '150mg',   '20:00:00', 'taken',   date('now'));

-- ----------------------------------------------------------------
-- 2 alerts per user
-- ----------------------------------------------------------------
INSERT INTO alerts (user_id, alert_type, message, severity) VALUES
(1, 'Blood Pressure High',
    'Systolic blood pressure reached 142 mmHg — above safe threshold of 140 mmHg.',
    'high'),
(1, 'Blood Sugar Rising',
    'Blood sugar trend has increased over 3 consecutive days. Current: 138 mg/dL.',
    'moderate'),

(2, 'Low Heart Rate',
    'Resting heart rate recorded at 68 bpm — within normal range but close to lower boundary.',
    'low'),
(2, 'Medication Adherence',
    'You have maintained 100% medication adherence this week. Great job!',
    'low');

-- ----------------------------------------------------------------
-- 1 health score per user
-- ----------------------------------------------------------------
INSERT INTO health_scores (user_id, score, risk_level, ai_summary) VALUES
(1, 62.5, 'moderate',
    'Heart rate climbing steadily. Blood pressure approaching hypertensive levels. Blood sugar on an upward trend. Medication adherence 67%. Overall risk: Moderate. Consult a physician if BP trend continues.'),

(2, 88.0, 'low',
    'All vitals within normal ranges. Heart rate stable 68-74 bpm. BP healthy at 110-117/70-76 mmHg. SpO2 consistently above 98%. Medication adherence 100%. Overall risk: Low. Keep it up!');
