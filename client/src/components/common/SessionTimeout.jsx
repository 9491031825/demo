import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import axios, { setSessionTimeoutCallback } from '../../services/axios';
import SessionTimeoutModal from './SessionTimeoutModal';

export default function SessionTimeout({ isOpen, onClose }) {
  const location = useLocation();
  const [countdown, setCountdown] = useState(10);
  const excludedPaths = ['/login', '/verify-otp'];

  // Start countdown when modal opens
  useEffect(() => {
    let timer;
    if (isOpen) {
      setCountdown(10); // Reset countdown
      timer = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [isOpen]);

  // Don't set up inactivity timer on excluded paths
  useEffect(() => {
    if (excludedPaths.includes(location.pathname)) {
      return;
    }

    let inactivityTimer;
    const resetTimer = () => {
      if (inactivityTimer) clearTimeout(inactivityTimer);
      inactivityTimer = setTimeout(() => {
        // Clear credentials and show modal
        localStorage.clear();
        delete axios.defaults.headers.common['Authorization'];
        
        // Set the callback to show the modal
        setSessionTimeoutCallback(() => {
          onClose(); // First close any existing modal
          setTimeout(() => onClose(true), 0); // Then show the timeout modal
        });
      }, 10000); // 300 seconds
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
  }, [location.pathname, onClose]);

  return (
    <SessionTimeoutModal 
      isOpen={isOpen}
      onClose={onClose}
      countdown={countdown}
    />
  );
}