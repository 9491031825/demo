import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from '../../services/axios';

export default function LoginForm() {
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    google_auth_code: '',
    use_google_auth: false
  });
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showAuthOptions, setShowAuthOptions] = useState(false);
  const [selectedAuthMethod, setSelectedAuthMethod] = useState('otp'); // 'otp' or 'google'
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    
    try {
      // First step: Submit credentials
      if (!showAuthOptions) {
        const loginResponse = await axios.post('/user/login/', {
          username: formData.username,
          password: formData.password
        });
        
        // If login is successful, show auth options
        if (loginResponse.data.success) {
          setShowAuthOptions(true);
          setIsLoading(false);
          // Store credentials temporarily
          localStorage.setItem('username', formData.username);
          localStorage.setItem('temp_password', formData.password);
          return;
        }
      }

      // Second step: Submit verification
      const verificationData = {
        username: formData.username,
        password: formData.password,
        use_google_auth: selectedAuthMethod === 'google',
        google_auth_code: formData.google_auth_code
      };

      const verifyResponse = await axios.post('/user/login/', verificationData);
      
      // Handle successful verification (both Google Auth and OTP)
      if (verifyResponse.data.access_token) {
        localStorage.removeItem('temp_password');
        localStorage.setItem('access_token', verifyResponse.data.access_token);
        localStorage.setItem('refresh_token', verifyResponse.data.refresh_token);
        window.location.href = verifyResponse.data.redirect || '/dashboard';
        return;
      }
      
      // Handle OTP verification flow
      if (verifyResponse.data.next === '/verify-otp' && selectedAuthMethod === 'otp') {
        navigate('/verify-otp');
        return;
      }

    } catch (err) {
      console.error('Login Error:', err);
      setError(err.response?.data?.error || 'Invalid credentials');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAuthMethodChange = (method) => {
    setSelectedAuthMethod(method);
    setFormData(prev => ({
      ...prev,
      google_auth_code: '',
      use_google_auth: method === 'google'
    }));
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            {showAuthOptions ? 'Choose Verification Method' : 'Sign in to your account'}
          </h2>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          {!showAuthOptions ? (
            // Step 1: Username and Password
            <div className="rounded-md shadow-sm -space-y-px">
              <div>
                <label htmlFor="username" className="sr-only">Username</label>
                <input
                  id="username"
                  name="username"
                  type="text"
                  required
                  className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-t-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                  placeholder="Username"
                  value={formData.username}
                  onChange={(e) => setFormData({...formData, username: e.target.value})}
                />
              </div>
              <div>
                <label htmlFor="password" className="sr-only">Password</label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  required
                  className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-b-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                  placeholder="Password"
                  value={formData.password}
                  onChange={(e) => setFormData({...formData, password: e.target.value})}
                />
              </div>
            </div>
          ) : (
            // Step 2: Authentication Method Selection
            <div className="space-y-4">
              <div className="flex flex-col space-y-3">
                <button
                  type="button"
                  onClick={() => handleAuthMethodChange('otp')}
                  className={`px-4 py-2 rounded-md ${
                    selectedAuthMethod === 'otp'
                      ? 'bg-indigo-600 text-white'
                      : 'bg-gray-200 text-gray-700'
                  }`}
                >
                  Use OTP
                </button>
                <button
                  type="button"
                  onClick={() => handleAuthMethodChange('google')}
                  className={`px-4 py-2 rounded-md ${
                    selectedAuthMethod === 'google'
                      ? 'bg-indigo-600 text-white'
                      : 'bg-gray-200 text-gray-700'
                  }`}
                >
                  Use Google Authenticator
                </button>
              </div>

              {selectedAuthMethod === 'google' && (
                <div className="mt-4">
                  <label htmlFor="google_auth_code" className="sr-only">
                    Google Authenticator Code
                  </label>
                  <input
                    id="google_auth_code"
                    name="google_auth_code"
                    type="text"
                    required
                    className="appearance-none rounded-md relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                    placeholder="Enter code from admin's Google Authenticator"
                    value={formData.google_auth_code}
                    onChange={(e) => setFormData({
                      ...formData,
                      google_auth_code: e.target.value
                    })}
                  />
                </div>
              )}
            </div>
          )}

          {error && (
            <div className="text-red-500 text-sm text-center">
              {error}
            </div>
          )}

          <div>
            <button
              type="submit"
              disabled={isLoading}
              className={`group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 ${
                isLoading ? 'opacity-50 cursor-not-allowed' : ''
              }`}
            >
              {isLoading 
                ? 'Processing...' 
                : showAuthOptions 
                  ? 'Verify' 
                  : 'Sign in'
              }
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}