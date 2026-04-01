# HealthAI — Comprehensive Project Documentation

Welcome to the comprehensive internal documentation for **HealthAI**. This document explains the architecture, core data flows, and module responsibilities for the entire project.

---

## 1. System Architecture Overview

HealthAI is designed as a modern decoupled web application:
- **Frontend (Client)**: A Single Page Application (SPA) built with React and Vite. It serves as the user interface, rendering dashboards and forms.
- **Backend (API Layer)**: Built with FastAPI (Python), it handles business logic, security, database transactions, and integrations with external AI models (Groq LLaMA-3).
- **Database**: SQLite (via SQLAlchemy ORM). It stores users, health records, alerts, medications, and system-generated reports.

### High-Level Data Flow
1. **User Input:** A user enters their vitals (Heart Rate, Blood Pressure, etc.) via the React frontend.
2. **API Request:** The frontend sends an authenticated HTTP HTTP POST request using Axios to the FastAPI backend.
3. **Processing & Storage:** The backend validates the data using Pydantic schemas, saves it to the SQLite database via SQLAlchemy, and immediately triggers the `ai_module/anomaly.py` system to check for dangerous thresholds.
4. **Alerts Generation:** If an anomaly is detected (e.g., extremely high blood pressure), an alert is pushed to the database.
5. **UI Update:** The frontend pulls updated data from the backend to refresh charts, risk scores, and the alert bell notification.

---

## 2. Frontend Deep-Dive (React + Vite)

Located in the `frontend/` directory, the React app focuses on visualizations and easy-to-use forms.

### Directory Structure & Responsibilities
- **`src/api/axios.js`**: Contains the Axios instance configured with the `VITE_API_URL`. It automatically attaches the user's JWT token (stored in `localStorage`) to all outgoing requests.
- **`src/pages/`**: The core application views.
  - `Login.jsx` / `Register.jsx`: Handles user authentication and token storage.
  - `Dashboard.jsx`: The central hub fetching summaries of vitals, alerts, and pending medications on load.
  - `LogVitals.jsx`: The form where users input their daily metrics.
  - `Trends.jsx`: Uses Recharts to visualize historical health data over time (line charts for BP/HR).
  - `Medications.jsx`: A complex page that tracks "Ongoing" vs "Completed" medications. Uses date logic to calculate how many days are left in a prescription.
  - `WeeklyReport.jsx`: Fetches the AI-generated health synopsis. It maps the structured LLM response into a 4-card UI (Overall Assessment, Critical Findings, Trends, Adherence).
- **`src/components/`**: Reusable UI elements (Navbars, Cards, Badges).
- **`src/charts/`**: Encapsulated Recharts logic for displaying health trends.

---

## 3. Backend Deep-Dive (FastAPI)

Located in the `backend/` directory, the FastAPI application defines the exact shape of data entering and leaving the system.

### Core Foundation
- **`main.py`**: The entry point. It wires together CORS (Cross-Origin Resource Sharing) policies and includes all API routers.
- **`database.py`**: Configures the SQLAlchemy engine and session makers to connect to `healthai.db`.
- **`models.py`**: Defines the database schema (SQLAlchemy). Tables include `users`, `vitals`, `medications`, `alerts`, and `health_scores`.
- **`schemas.py`**: Defines input/output validation models using Pydantic. This ensures that a request like logging vitals mathematically contains valid numbers before hitting the database.
- **`auth.py`**: Handles password hashing (bcrypt) and JWT generation/validation. Protects routes using `Depends(get_current_user)`.

### The API Routers (`backend/routers/`)
The backend routes are modularized by entity:
- **`auth.py`**: `/auth/login`, `/auth/register`.
- **`vitals.py`**: Endpoints to add vitals and fetch the past 7 days of history for charts.
- **`medications.py`**: Logic for adding prescriptions, calculating End Dates based on duration, and marking daily doses as Taken/Missed.
- **`alerts.py`**: Fetches system-generated anomalies for the user.
- **`health.py`**: Houses the endpoints for retrieving the computed Health Risk Score and the Weekly AI Report.

---

## 4. The AI & Analytics Module

Located in `backend/ai_module/`, this folder contains the intelligent core of HealthAI. It does not handle API requests directly; rather, it provides helper functions queried by the routers.

### `anomaly.py`
**Purpose:** Real-time danger detection.
Every time a user logs new vitals, this script evaluates the data against clinical thresholds. If a metric crosses a danger zone (e.g., Blood Sugar > 180, SpO2 < 90%), it instantly generates a formal `Alert` record in the database tagged as `Moderate`, `High`, or `Critical`.

### `risk_score.py`
**Purpose:** Generates a unified metric of health (0 to 100).
It takes the 5 core vitals and applies a weighted mathematical formula based on clinical deviation. 
- Higher deviation from baseline normal = Higher penalty.
- The system sums the penalties to assign a risk score, categorizing the user into **Low**, **Moderate**, or **High Risk**.

### `trends.py`
**Purpose:** Analyzing the velocity of health data.
It evaluates the past 7 days of vitals to determine if metrics are `rising`, `falling`, or `stable`. Crucial for detecting gradual decline before it becomes an emergency.

### `summary.py` (The LLaMA-3 Integration)
**Purpose:** Creating human-readable clinical narratives using Generative AI.
This module is the most complex. When the user requests a Weekly Report:
1. It aggregates 7 days of raw data (all vital logs, medication adherence %, and alert counts).
2. It mathematically calculates the current risk score and adherence percentages.
3. It constructs a highly rigid **"Raw Data Prompt"** injected with the patient's exact numbers and clinical guidelines.
4. It calls the **Groq API** (using the LLaMA-3 70B model).
5. The LLM reads the raw data, identifies clinical issues, and writes a detailed, honest 5-section narrative reflecting their exact numbers.
6. The resulting AI text is cached in the `health_scores` table for 24 hours to save API costs and reduce loading times.

---

## 5. Security Protocol

1. **Passwords:** Never stored in plaintext. Hashed by `passlib` using bcrypt.
2. **Route Protection:** All endpoints except `/login` and `/register` require a generated JWT Token passed in the `Authorization: Bearer <token>` header.
3. **Data Isolation:** The `get_current_user` dependency forcefully extracts the `user_id` from the JWT token. All database queries append `.filter(model.user_id == current_user.user_id)`. This guarantees users cannot manipulate or view data belonging to other accounts.

---

## Conclusion
HealthAI serves as a lightweight but highly scalable health tracking system. By separating data persistence (SQLAlchemy), logic validation (Pydantic), and natural language reasoning (Groq LLM) into discrete components, the system is highly extensible for future integrations such as wearable APIs or clinician portals.
