import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useEffect, useState } from 'react';
import Dashboard from './components/dashboard/Dashboard';
import LoginForm from './components/auth/LoginForm';
import OTPVerification from './components/auth/OTPVerification';
import SessionTimeout from './components/common/SessionTimeout';
import { setSessionTimeoutCallback } from './services/axios';

// Wrapper component to handle session timeout visibility
function SessionTimeoutWrapper({ children }) {
  const [showSessionTimeout, setShowSessionTimeout] = useState(false);
  const location = useLocation();
  
  // List of paths where we don't want to show the session timeout modal
  const excludedPaths = ['/login', '/verify-otp'];
  
  useEffect(() => {
    setSessionTimeoutCallback(() => {
      if (!excludedPaths.includes(location.pathname)) {
        setShowSessionTimeout(true);
      }
    });
  }, [location.pathname]);

  return (
    <>
      <SessionTimeout 
        isOpen={showSessionTimeout} 
        onClose={() => setShowSessionTimeout(false)} 
      />
      {children}
    </>
  );
}

function App() {
  const AdminRedirect = () => {
    useEffect(() => {
      window.location.href = 'http://127.0.0.1:8000/admin/';
    }, []);
    return null;
  };

  return (
    <Router>
      <SessionTimeoutWrapper>
        <Routes>
          <Route path="/login" element={<LoginForm />} />
          <Route path="/verify-otp" element={<OTPVerification />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/admin" element={<AdminRedirect />} />
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </SessionTimeoutWrapper>
    </Router>
  );
}

export default App;