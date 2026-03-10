import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Navbar from './components/Navbar';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import LogVitals from './pages/LogVitals';
import Trends from './pages/Trends';
import Medications from './pages/Medications';
import WeeklyReport from './pages/WeeklyReport';
import Alerts from './pages/Alerts';
import ExportReport from './pages/ExportReport';
import Profile from './pages/Profile';

function ProtectedRoute({ children }) {
  const { token } = useAuth();
  return token ? children : <Navigate to="/" replace />;
}

function AppLayout({ children }) {
  return (
    <div className="layout">
      <Navbar />
      <main className="main-content">{children}</main>
    </div>
  );
}

function AppRoutes() {
  const { token } = useAuth();
  return (
    <Routes>
      {/* Public */}
      <Route path="/" element={token ? <Navigate to="/dashboard" replace /> : <Login />} />
      <Route path="/register" element={<Register />} />

      {/* Protected */}
      <Route path="/dashboard" element={<ProtectedRoute><AppLayout><Dashboard /></AppLayout></ProtectedRoute>} />
      <Route path="/log" element={<ProtectedRoute><AppLayout><LogVitals /></AppLayout></ProtectedRoute>} />
      <Route path="/trends" element={<ProtectedRoute><AppLayout><Trends /></AppLayout></ProtectedRoute>} />
      <Route path="/meds" element={<ProtectedRoute><AppLayout><Medications /></AppLayout></ProtectedRoute>} />
      <Route path="/report" element={<ProtectedRoute><AppLayout><WeeklyReport /></AppLayout></ProtectedRoute>} />
      <Route path="/alerts" element={<ProtectedRoute><AppLayout><Alerts /></AppLayout></ProtectedRoute>} />
      <Route path="/export" element={<ProtectedRoute><AppLayout><ExportReport /></AppLayout></ProtectedRoute>} />
      <Route path="/profile" element={<ProtectedRoute><AppLayout><Profile /></AppLayout></ProtectedRoute>} />

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </AuthProvider>
  );
}
