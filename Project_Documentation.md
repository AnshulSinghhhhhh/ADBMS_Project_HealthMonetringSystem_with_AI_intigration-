# 🏥 HealthAI (ADBMS) — Complete Project Documentation

## 1. Project Overview
**HealthAI** is a full-stack, AI-powered healthcare monitoring web application designed to help users track everyday health vitals (heart rate, blood pressure, SpO₂, blood sugar, temperature). It additionally features medication management, automated anomaly detection, AI-generated weekly health summaries, and comprehensive historical trend visualizations. 

This platform uses a modern technology stack separated into an API-driven backend and a responsive single-page application (SPA) frontend.

---

## 2. Technology Stack
*   **Frontend:** React.js, Vite, React Router DOM, Tailwind CSS (for styling), Recharts / Chart.js (for data visualization), Axios (API client).
*   **Backend:** FastAPI (Python web framework), Uvicorn (ASGI server), SQLAlchemy (ORM), Pydantic (data validation).
*   **Database:** SQLite (relational database).
*   **AI/ML Module:** Python with scikit-learn / OpenAI API (for risk scoring, anomaly detection, and natural language summaries).
*   **Authentication:** JSON Web Tokens (JWT), bcrypt (password hashing).

---

## 3. Architecture & Data Flow

### How the Frontend and Backend Work Together
1.  **Client-Side (Frontend):** The React frontend runs in the user's browser, providing the UI. When a user interacts (e.g., logging in, submitting vitals), Axios sends an asynchronous HTTP request (REST API call) to the backend.
2.  **Server-Side (Backend):** The FastAPI backend receives the request on a specific route (e.g., `/vitals/add`). It validates the incoming JSON payload using Pydantic models.
3.  **Authentication & Security:** For protected routes, the frontend attaches a JWT token to the `Authorization: Bearer <token>` header. The backend validates this token before granting access to user-specific data.
4.  **Database Interaction:** Using SQLAlchemy ORM, the backend queries or mutates the SQLite database (`healthai.db`).
5.  **AI Processing:** When vitals are added or summaries requested, the backend triggers the `ai_module` to calculate risk scores, detect anomalies, and generate textual health reports.
6.  **Response:** The backend returns data (typically as JSON) back to the frontend, which React uses to update the UI state dynamically (e.g., re-rendering a chart).

---

## 4. Backend Structure & Important Files (`/backend`)

The backend is built with FastAPI and follows a modular router-based pattern.

*   `main.py`: **The Entry Point**. Initializes the FastAPI application, sets up CORS middleware, configures global rate limiting (using `slowapi`), creates database tables, and registers all API routers.
*   `database.py`: Establishes the SQLAlchemy engine and `SessionLocal` to interact with the SQLite database. Provides the `get_db()` dependency used across routers.
*   `models.py`: Defines the SQLAlchemy database tables natively mapping Python classes to SQL structures:
    *   `User`: Stores user credentials and profile info.
    *   `Vital`: Stores readings (HR, BP, SpO2, etc.) linked to a User.
    *   `Medication`: Stores medication schedules and tracking status (pending, taken, missed).
    *   `Alert`: Stores system-generated alerts based on abnormal vitals.
    *   `HealthScore`: Stores AI-computed risk levels and summaries.
*   `schemas.py`: Contains Pydantic models (e.g., `UserCreate`, `VitalCreate`, `MedicationUpdate`). These are used to strictly validate HTTP request body data and format response JSON.
*   `auth.py`: Handles JWT generation, password hashing (bcrypt), and dependency injection (`get_current_user`) for securing endpoints.

### 4.1. API Routers (`/backend/routers`)
These files segregate the application endpoints by feature:
*   `auth.py`: Endpoints for `/register` and `/login`.
*   `vitals.py`: Endpoints to add vitals, fetch history, and get weekly readings.
*   `medications.py`: Endpoints for medication CRUD operations.
*   `alerts.py`: Endpoints to retrieve user health alerts.
*   `health.py`: Endpoints interfacing with the AI module to get the user's real-time risk score.
*   `reports.py`: Complex endpoint handling PDF/CSV report generation and export.
*   `profile.py`: Endpoints for fetching and updating user profile data.

### 4.2. AI Module (`/backend/ai_module`)
This subsystem houses the analytical intelligence of the platform.
*   `risk_score.py`: Contains functions to compute a weighted health risk score (0-100) based on vital deviations from normal ranges.
*   `anomaly.py`: Evaluates new vitals entries against safe thresholds (e.g., BP > 160) and triggers automated `Alert` records in the database.
*   `trends.py`: Analyzes historical vitals data to detect rising or falling patterns over time (e.g., "Heart rate increasing over 3 days").
*   `summary.py`: Utilizes LLMs (OpenAI or local alternatives) to digest raw data and output a natural, plain-English summary of the user's weekly health status.

---

## 5. Frontend Structure & Important Files (`/frontend`)

The frontend is a React Single Page Application customized with Tailwind CSS.

*   `src/main.jsx`: The React DOM entry point that injects the app into the `index.html` root element.
*   `src/App.jsx`: **The Core Router & Layout Component**. It defines standard public routes (Login, Register) and `<ProtectedRoute>` wrappers around private pages (Dashboard, LogVitals, etc.). It establishes the global layout with the `Navbar`.
*   `src/index.css` & `src/App.css`: Global styles and Tailwind configuration imports.

### 5.1. Context & API
*   `src/context/AuthContext.jsx`: Provides global state management for user authentication, storing the JWT token in `localStorage` and making it accessible globally via the `useAuth()` hook.
*   `src/api/axios.js`: Configures the base Axios instance to automatically attach the JWT token to outgoing HTTP requests and sets the base URL (`http://localhost:8000`).

### 5.2. UI Components (`/frontend/src/components`)
Reusable React components that make up the UI elements.
*   `Navbar.jsx`: The top navigation bar, altering its links depending on authentication state.
*   *(Other potential components include: `AlertBadge`, `MedicationCard`, `HealthScoreCard`, `VitalsForm`)*

### 5.3. Pages (`/frontend/src/pages`)
These correspond to the main views rendered by `App.jsx` routes:
*   `Login.jsx` & `Register.jsx`: Authorization forms communicating with the `/auth` backend routes.
*   `Dashboard.jsx`: The central hub providing a top-level summary, recent vitals, active alerts, and immediate action buttons.
*   `LogVitals.jsx`: The form allowing users to submit new health readings to the backend.
*   `Trends.jsx`: Implements chart libraries to visualize the database history of heart rate, blood pressure, and blood sugar.
*   `Medications.jsx`: A specialized page to view medication schedules and mark doses as taken.
*   `WeeklyReport.jsx`: Displays the rich text summary generated by the backend's AI module.
*   `Alerts.jsx`: A full-page log of historical anomaly alerts for the user.
*   `ExportReport.jsx`: Interfaces with the `/reports` API to allow users to download their health data.
*   `Profile.jsx`: View and edit basic user parameters (age, weight, height).

---

## 6. Important Programs & Functions

*   `backend/main.py -> app`: The core FastAPI instance handling lifecycle and routing.
*   `backend/auth.py -> get_current_user()`: A critical FastAPI dependency. It intercepts incoming requests, decrypts the JWT token, matches it to a user in the database, and injects the `User` object into the endpoint function. Without this, security fails.
*   `backend/ai_module/risk_score.py -> calculate_risk()`: The algorithm responsible for iterating through the most recent vitals and computing the numeric health penalty that drives the UI's risk indicator.
*   `backend/ai_module/anomaly.py -> check_vital_anomalies()`: A routine run on every `/vitals/add` post to immediately scan for dangerous threshold breaches and register alerts.
*   `frontend/src/App.jsx -> ProtectedRoute`: A React Component that wraps sensitive UI routes, instantly redirecting unauthenticated traffic back to the login page.
*   `frontend/src/context/AuthContext.jsx -> AuthProvider`: Wraps the entire React application to provide seamless, prop-drilling-free access to login state.

## 7. Summary
The ADBMS (HealthAI) project is a robust, well-architected application that rigidly separates concerns. 
- The **backend** guarantees data integrity, security, and complex mathematical/AI processing. 
- The **frontend** strictly handles stateful UI rendering and optimistic updates.
- They communicate securely over REST APIs via JSON and JWT, representing a standard, highly scalable modern web engineering standard.
