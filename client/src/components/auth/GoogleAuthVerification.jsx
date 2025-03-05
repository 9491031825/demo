import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { verifyOTP } from '../../store/slices/authSlice';
import axios from '../../services/axios';
import { authAPI } from '../../services/api';

export default function GoogleAuthVerification() {
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const username = localStorage.getItem('username');
      const password = localStorage.getItem('temp_password');

      // Try Google Authenticator verification
      const response = await authAPI.login({
        username,
        password,
        use_google_auth: true,
        google_auth_code: code
      });
      
      if (response.access_token) {
        localStorage.removeItem('temp_password');
        localStorage.setItem('access_token', response.access_token);
        localStorage.setItem('refresh_token', response.refresh_token);
        
        axios.defaults.headers.common['Authorization'] = `Bearer ${response.access_token}`;
        
        dispatch(verifyOTP({
          token: response.access_token
        }));
        
        if (response.redirect) {
          window.location.href = response.redirect;
        } else {
          window.location.href = '/dashboard';
        }
      }
    } catch (err) {
      console.error('Google Auth Verification Error:', err);
      const errorMessage = err.response?.data?.error || 'Invalid code';
      setError(errorMessage);
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
            Google Authenticator Verification
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Enter the code from admin's Google Authenticator app
          </p>
          {error && (
            <p className="mt-2 text-center text-sm text-red-600">
              {error}
            </p>
          )}
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <input
            type="text"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="Enter Google Authenticator Code"
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

            <button
              type="button"
              onClick={() => navigate('/verify-otp')}
              className="text-sm text-indigo-600 hover:text-indigo-500 focus:outline-none"
            >
              Use OTP verification instead
            </button>
          </div>
        </form>
      </div>
    </div>
  );
} 