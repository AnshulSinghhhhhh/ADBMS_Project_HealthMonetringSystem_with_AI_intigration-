# 🏥 HealthAI — AI-Powered Health Monitoring Platform

## ⚡ Quick Start

```bash
# Clone & run with Docker
git clone <repo>
cd ADBMS
docker-compose up --build
# Open http://localhost
```

Or run locally:
```bash
# Backend
cd backend && pip install -r requirements.txt
uvicorn main:app --reload

# Frontend (new terminal)
cd frontend && npm install && npm run dev
```

## 📌 Project Overview

HealthAI is a full-stack, AI-powered healthcare monitoring web application that allows general users to track their daily health vitals, receive intelligent risk assessments, and get AI-generated weekly health summaries. The system stores all data in a MySQL database, processes it through a FastAPI backend, and presents it on a clean React-based dashboard with charts and trend visualizations.

This project is being developed using **Google Antigravity** as the primary AI-agent development platform.

---

## 🎯 Project Goals

- Allow users to log daily health vitals (heart rate, blood pressure, SpO₂, blood sugar, temperature)
- Track medication schedules and adherence
- Detect anomalies and trigger health alerts automatically
- Calculate a dynamic health risk score for each user
- Generate AI-powered weekly health summaries and trend insights
- Provide a clean, intuitive dashboard with charts and graphs

---

## 👤 User Roles

### General User (Patient)
- Register and log in securely
- Enter daily health vitals
- View personal health dashboard
- Track medication schedule
- Receive anomaly alerts
- View weekly AI-generated health report
- See historical trends via charts

### Admin (Optional Phase)
- Manage all registered users
- Monitor system health
- View platform-wide analytics

---

## 🛠️ Tech Stack

| Layer        | Technology              |
|--------------|-------------------------|
| Frontend     | React + Tailwind CSS    |
| Charts       | Recharts / Chart.js     |
| Backend      | FastAPI (Python)        |
| Database     | SQLite (via SQLAlchemy) |
| AI Module    | Python (scikit-learn / OpenAI API) |
| Auth         | JWT (JSON Web Tokens)   |
| API Client   | Axios                   |
| Deployment   | Vercel (frontend) + Render/AWS (backend) |

---

## 🗄️ Database Design (SQLite)

### Table: `users`
```sql
user_id       INT PRIMARY KEY AUTO_INCREMENT
name          VARCHAR(100)
email         VARCHAR(100) UNIQUE
password_hash VARCHAR(255)
age           INT
gender        VARCHAR(10)
created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP
```

### Table: `vitals`
```sql
vital_id      INT PRIMARY KEY AUTO_INCREMENT
user_id       INT FOREIGN KEY → users(user_id)
heart_rate    INT
bp_systolic   INT
bp_diastolic  INT
spo2          FLOAT
blood_sugar   FLOAT
temperature   FLOAT
recorded_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP
```

### Table: `medications`
```sql
med_id        INT PRIMARY KEY AUTO_INCREMENT
user_id       INT FOREIGN KEY → users(user_id)
medicine_name VARCHAR(100)
dosage        VARCHAR(50)
schedule_time TIME
status        ENUM('pending', 'taken', 'missed')
date          DATE
```

### Table: `alerts`
```sql
alert_id      INT PRIMARY KEY AUTO_INCREMENT
user_id       INT FOREIGN KEY → users(user_id)
alert_type    VARCHAR(100)
message       TEXT
severity      ENUM('low', 'moderate', 'high', 'critical')
created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP
```

### Table: `health_scores`
```sql
score_id      INT PRIMARY KEY AUTO_INCREMENT
user_id       INT FOREIGN KEY → users(user_id)
score         FLOAT
risk_level    ENUM('low', 'moderate', 'high')
ai_summary    TEXT
generated_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
```

---

## 🔗 API Endpoints (FastAPI)

### Auth
```
POST   /auth/register        → Register new user
POST   /auth/login           → Login, returns JWT token
```

### Vitals
```
POST   /vitals/add           → Log new vitals entry
GET    /vitals/weekly        → Get last 7 days of vitals
GET    /vitals/history       → Get full vitals history
```

### Medications
```
POST   /medications/add      → Add medication schedule
GET    /medications/today    → Get today's medications
PUT    /medications/update   → Update taken/missed status
```

### Alerts
```
GET    /alerts/all           → Get all alerts for user
GET    /alerts/recent        → Get last 5 alerts
```

### Health Score & AI
```
GET    /health/score         → Get current health risk score
GET    /health/weekly-report → Get AI-generated weekly summary
GET    /health/anomalies     → Get detected anomalies
```

---

## 📊 Health Metrics & Thresholds

| Metric         | Normal Range         | Alert Threshold         |
|----------------|----------------------|-------------------------|
| Heart Rate     | 60 – 100 bpm         | < 50 or > 120 bpm       |
| Blood Pressure | 90/60 – 120/80 mmHg  | Systolic > 160 mmHg     |
| SpO₂           | 95% – 100%           | < 90%                   |
| Blood Sugar    | 70 – 140 mg/dL       | > 180 mg/dL             |
| Temperature    | 36.1°C – 37.2°C      | > 38.5°C                |

---

## 🤖 AI Module Features

### 1. Health Risk Score
- Weighted formula using all 5 vitals
- Outputs a score from 0–100
- Labels: Low / Moderate / High risk

### 2. Anomaly Detection
- Rule-based threshold checking on each vital
- Automatically creates alerts in the database

### 3. Trend Analysis
- Detects rising/falling patterns over 7 days
- Example: "Blood pressure has been rising for 4 consecutive days"

### 4. Weekly AI Summary
- Uses an LLM (OpenAI API or local model) to generate a plain-English weekly health report
- Example output:
  > "Your heart rate was stable this week. Blood pressure showed a slight increase. Medication adherence was 85%. Overall risk level: Moderate."

---

## 📱 Frontend Pages (React)

### 1. Login / Register Page
- Email + password authentication
- JWT token stored in memory

### 2. Dashboard (Home)
- Health score card
- Latest vitals summary
- Recent alerts
- Medication reminder widget

### 3. Log Vitals Page
- Form to enter all 5 health metrics
- Submits to `/vitals/add`

### 4. Trends & Charts Page
- Line chart: Heart rate over 7 days
- Line chart: Blood pressure over 7 days
- Bar chart: Medication adherence
- Area chart: Blood sugar trend

### 5. Medications Page
- Today's medication schedule
- Mark as taken / missed

### 6. Weekly Report Page
- AI-generated health summary card
- Risk score visualization
- Trend highlights

### 7. Alerts Page
- List of all health alerts with severity badges

---

## 📁 Project Folder Structure

```
healthai/
│
├── backend/
│   ├── main.py               # FastAPI app entry point
│   ├── database.py           # MySQL connection setup
│   ├── models.py             # SQLAlchemy ORM models
│   ├── schemas.py            # Pydantic request/response schemas
│   ├── auth.py               # JWT authentication logic
│   ├── routers/
│   │   ├── vitals.py         # Vitals API routes
│   │   ├── medications.py    # Medication API routes
│   │   ├── alerts.py         # Alerts API routes
│   │   └── health.py         # Health score & AI routes
│   └── ai_module/
│       ├── risk_score.py     # Health risk score calculator
│       ├── anomaly.py        # Anomaly detection logic
│       ├── trends.py         # Trend analysis
│       └── summary.py        # AI weekly summary generator
│
├── frontend/
│   ├── public/
│   └── src/
│       ├── components/
│       │   ├── Navbar.jsx
│       │   ├── VitalsForm.jsx
│       │   ├── HealthScoreCard.jsx
│       │   ├── AlertBadge.jsx
│       │   └── MedicationCard.jsx
│       ├── pages/
│       │   ├── Login.jsx
│       │   ├── Dashboard.jsx
│       │   ├── LogVitals.jsx
│       │   ├── Trends.jsx
│       │   ├── Medications.jsx
│       │   ├── WeeklyReport.jsx
│       │   └── Alerts.jsx
│       ├── charts/
│       │   ├── HeartRateChart.jsx
│       │   ├── BPChart.jsx
│       │   └── MedicationChart.jsx
│       ├── api/
│       │   └── axios.js      # Axios instance + API calls
│       └── App.jsx
│
├── database/
│   └── schema.sql            # Full MySQL schema
│
├── .env                      # Environment variables
├── docker-compose.yml        # Docker setup (optional)
└── README.md                 # This file
```

---

## 🔒 Security

- Passwords hashed using **bcrypt**
- Authentication via **JWT tokens**
- Protected API routes with token verification middleware
- Input validation on all endpoints using **Pydantic**
- Environment variables for all secrets via `.env`

---

## 🚀 Deployment Plan

| Component  | Platform              |
|------------|-----------------------|
| Frontend   | Vercel                |
| Backend    | Render or AWS EC2     |
| Database   | SQLite file (bundled with backend) |

### Local Development
```
Frontend  → http://localhost:3000
Backend   → http://localhost:8000
MySQL     → http://localhost:3306
```

---

## 📈 Scaling (Future Scope)

- **Redis** → caching frequent health queries
- **Docker** → containerized deployment
- **Nginx** → load balancing for high traffic
- **WebSockets** → real-time vitals monitoring
- **Wearable API integration** → Fitbit, Apple Health

---

## 🧠 Development Platform

This project is built using **Google Antigravity** — an AI-powered IDE that uses autonomous AI agents to plan, write, test, and iterate on code with minimal manual intervention.

---

## ✅ Current Status

- [x] Phase 1 — Project Setup & Folder Structure
- [x] Phase 2 — SQLite Database Schema
- [x] Phase 3 — FastAPI Backend & APIs
- [ ] Phase 4 — AI Health Analytics Module
- [x] Phase 5 — React Frontend & Dashboard
- [x] Phase 6 — Authentication & Security
- [x] Phase 7 — Deployment

---

*Built with ❤️ using Google Antigravity*
#   A D B M S _ P r o j e c t _ H e a l t h M o n e t r i n g S y s t e m _ w i t h _ A I _ i n t i g r a t i o n -  
 