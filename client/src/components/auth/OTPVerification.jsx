import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { verifyOTP } from '../../store/slices/authSlice';
import axios from '../../services/axios';

export default function OTPVerification() {
  const [otp, setOtp] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [resendTimer, setResendTimer] = useState(30); // 30 seconds cooldown
  const [canResend, setCanResend] = useState(false);
  const navigate = useNavigate();
  const dispatch = useDispatch();

  useEffect(() => {
    let interval;
    if (resendTimer > 0 && !canResend) {
      interval = setInterval(() => {
        setResendTimer((prev) => prev - 1);
      }, 1000);
    } else {
      setCanResend(true);
    }
    return () => clearInterval(interval);
  }, [resendTimer, canResend]);

  const handleResendOTP = async () => {
    setResendLoading(true);
    setError('');
    
    try {
      const username = localStorage.getItem('username');
      const password = localStorage.getItem('temp_password'); // Temporarily store password for resend
      
      const response = await axios.post('/user/login/', {
        username,
        password,
        resend: true
      });
      
      if (response.data.next === 'otp') {
        setCanResend(false);
        setResendTimer(30);
        setError('New OTP has been sent!');
        setTimeout(() => setError(''), 3000);
      }
    } catch (err) {
      console.error('Resend OTP Error:', err);
      setError(err.response?.data?.error || 'Failed to resend OTP');
      if (err.response?.status === 401) {
        // If credentials are invalid, redirect to login
        setTimeout(() => {
          navigate('/login');
        }, 2000);
      }
    } finally {
      setResendLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const username = localStorage.getItem('username');
      const response = await axios.post('/user/login/otpverification/', {
        username,
        otp: otp.toString()
      });
      
      if (response.data.access_token) {
        localStorage.removeItem('temp_password'); // Clean up stored password
        localStorage.setItem('access_token', response.data.access_token);
        localStorage.setItem('refresh_token', response.data.refresh_token);
        
        axios.defaults.headers.common['Authorization'] = `Bearer ${response.data.access_token}`;
        
        dispatch(verifyOTP({
          token: response.data.access_token
        }));
        
        if (response.data.redirect) {
          window.location.href = response.data.redirect;
        } else {
          window.location.href = '/dashboard';
        }
      }
    } catch (err) {
      console.error('OTP Verification Error:', err);
      const errorMessage = err.response?.data?.error || 'Invalid OTP';
      setError(errorMessage);
      
      if (errorMessage.includes('expired')) {
        setTimeout(() => {
          navigate('/login');
        }, 2000);
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Add protection to prevent unauthorized access
  useEffect(() => {
    const username = localStorage.getItem('username');
    if (!username) {
      navigate('/login');
    }
  }, [navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Enter OTP
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Please enter the OTP sent to admin
          </p>
          {error && (
            <p className={`mt-2 text-center text-sm ${error.includes('sent') ? 'text-green-600' : 'text-red-600'}`}>
              {error}
            </p>
          )}
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <input
            type="text"
            value={otp}
            onChange={(e) => setOtp(e.target.value)}
            placeholder="Enter OTP"
            className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-t-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
            required
          />
          <div className="flex flex-col space-y-4">
            <button
              type="submit"
              disabled={isLoading}
              className={`group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 ${
                isLoading ? 'opacity-50 cursor-not-allowed' : ''
              }`}
            >
              {isLoading ? 'Verifying...' : 'Verify OTP'}
            </button>
            <button
              type="button"
              onClick={handleResendOTP}
              disabled={!canResend || resendLoading}
              className={`text-sm text-indigo-600 hover:text-indigo-500 focus:outline-none ${
                !canResend || resendLoading ? 'opacity-50 cursor-not-allowed' : ''
              }`}
            >
              {resendLoading 
                ? 'Sending...' 
                : canResend 
                  ? 'Resend OTP' 
                  : `Resend OTP in ${resendTimer}s`
              }
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}