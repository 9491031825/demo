import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import axios from '../../services/axios';

export default function SessionTimeout() {
  const location = useLocation();
  const navigate = useNavigate();
  const excludedPaths = ['/login', '/verify-otp'];

  // Don't set up inactivity timer on excluded paths
  useEffect(() => {
    if (excludedPaths.includes(location.pathname)) {
      return;
    }

    let inactivityTimer;
    const resetTimer = () => {
      if (inactivityTimer) clearTimeout(inactivityTimer);
      inactivityTimer = setTimeout(() => {
        // Clear credentials and redirect
        localStorage.clear();
        delete axios.defaults.headers.common['Authorization'];
        navigate('/login', { replace: true });
        setTimeout(() => {
          alert('Your session has expired due to inactivity. Please login again.');
        }, 300);
      }, 3000000); // 300 seconds
    };

    const events = ['mousedown', 'keydown', 'scroll', 'mousemove', 'touchstart'];
    events.forEach(event => {
      document.addEventListener(event, resetTimer);
    });

    resetTimer();

    return () => {
      if (inactivityTimer) clearTimeout(inactivityTimer);
      events.forEach(event => {
        document.removeEventListener(event, resetTimer);
      });
    };
  }, [location.pathname, navigate]);

  return null;
}