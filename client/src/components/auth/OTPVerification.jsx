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
  const [resendTimer, setResendTimer] = useState(30);
  const [canResend, setCanResend] = useState(false);
  const [isGoogleAuth, setIsGoogleAuth] = useState(false);
  const navigate = useNavigate();
  const dispatch = useDispatch();

  useEffect(() => {
    const interval = setInterval(() => {
      setResendTimer((prevTimer) => {
        if (prevTimer <= 1) {
          clearInterval(interval);
          setCanResend(true);
          return 0;
        }
        return prevTimer - 1;
      });
    }, 1000);

    // Cleanup interval
    return () => clearInterval(interval);
  }, [resendTimer]);

  const handleResendOTP = async () => {
    if (!canResend) return;
    
    setResendLoading(true);
    setError('');
    
    try {
      const username = localStorage.getItem('username');
      const password = localStorage.getItem('temp_password');
      
      const response = await axios.post('/user/login/', {
        username,
        password,
        resend: true
      });
      
      // Reset timer and canResend after successful resend
      setResendTimer(30);
      setCanResend(false);
      setError('OTP has been resent successfully');
      
    } catch (err) {
      console.error('Resend OTP Error:', err);
      setError('Failed to resend OTP');
      setTimeout(() => {
        navigate('/login');
      }, 2000);
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
      const password = localStorage.getItem('temp_password');

      let response;
      
      if (isGoogleAuth) {
        // Try Google Authenticator verification
        response = await axios.post('/user/login/', {
          username,
          password,
          use_google_auth: true,
          google_auth_code: otp
        });
      } else {
        // Try regular OTP verification
        response = await axios.post('/user/login/otpverification/', {
          username,
          otp: otp.toString()
        });
      }
      
      if (response.data.access_token) {
        localStorage.removeItem('temp_password');
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
      console.error('Verification Error:', err);
      const errorMessage = err.response?.data?.error || 'Invalid code';
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
            Verification Required
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            {isGoogleAuth ? 
              'Enter your Google Authenticator code' : 
              'Please enter the OTP sent to admin'
            }
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
            placeholder={isGoogleAuth ? "Enter Google Authenticator Code" : "Enter OTP"}
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
              {isLoading ? 'Verifying...' : 'Verify Code'}
            </button>

            {/* Toggle between OTP and Google Auth */}
            <button
              type="button"
              onClick={() => setIsGoogleAuth(!isGoogleAuth)}
              className="text-sm text-indigo-600 hover:text-indigo-500 focus:outline-none"
            >
              {isGoogleAuth ? 
                'Switch to OTP verification' : 
                'Use Google Authenticator instead'
              }
            </button>

            {/* Only show resend option for OTP */}
            {!isGoogleAuth && (
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
                  : resendTimer > 0 
                    ? `Resend OTP in ${resendTimer}s`
                    : 'Resend OTP'
                }
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}