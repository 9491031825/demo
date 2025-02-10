import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useEffect } from 'react';
import Dashboard from './components/dashboard/Dashboard';
import LoginForm from './components/auth/LoginForm';
import OTPVerification from './components/auth/OTPVerification';
import SessionTimeout from './components/common/SessionTimeout';

function App() {
  const AdminRedirect = () => {
    useEffect(() => {
      window.location.href = 'http://127.0.0.1:8000/admin/';
    }, []);
    return null;
  };

  return (
    <Router>
      <SessionTimeout />
      <Routes>
        <Route path="/login" element={<LoginForm />} />
        <Route path="/verify-otp" element={<OTPVerification />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/admin" element={<AdminRedirect />} />
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </Router>
  );
}

export default App;