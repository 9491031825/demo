import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from '../../services/axios';

export default function GoogleAuthSetup() {
  const [qrCode, setQrCode] = useState('');
  const [secret, setSecret] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [setupComplete, setSetupComplete] = useState(false);
  const navigate = useNavigate();

  // Check authentication on component mount
  useEffect(() => {
    const token = localStorage.getItem('access_token');
    if (!token) {
      navigate('/login');
    } else {
      // Set the authorization header for all requests
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    }
  }, [navigate]);

  const handleSetup = async () => {
    setIsLoading(true);
    setError('');
    try {
      const token = localStorage.getItem('access_token');
      const response = await axios.post('/setup-google-auth/', {}, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      setQrCode(response.data.qr_code);
      setSecret(response.data.secret);
    } catch (err) {
      console.error('Setup Error:', err);
      if (err.response?.status === 401) {
        // Token expired or invalid
        localStorage.removeItem('access_token');
        navigate('/login');
      } else if (err.response?.status === 403) {
        setError('Only admin users can setup Google Authenticator');
      } else {
        setError(err.response?.data?.error || 'Failed to setup Google Authenticator');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerify = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    try {
      const token = localStorage.getItem('access_token');
      const response = await axios.post('/verify-google-auth-setup/', {
        code: verificationCode
      }, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      setSuccess(response.data.message);
      setSetupComplete(true);
      
      // Redirect to dashboard after short delay
      setTimeout(() => {
        navigate('/dashboard');
      }, 2000);
    } catch (err) {
      console.error('Verification Error:', err);
      if (err.response?.status === 401) {
        localStorage.removeItem('access_token');
        navigate('/login');
      } else {
        setError(err.response?.data?.error || 'Failed to verify code');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Google Authenticator Setup
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Follow these steps to enable two-factor authentication
          </p>
        </div>

        {!qrCode && !setupComplete && (
          <div className="flex justify-center">
            <button
              onClick={handleSetup}
              disabled={isLoading}
              className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700"
            >
              {isLoading ? 'Setting up...' : 'Start Setup'}
            </button>
          </div>
        )}

        {qrCode && !setupComplete && (
          <div className="space-y-6">
            <div className="flex flex-col items-center space-y-4">
              <p className="text-sm text-gray-600">1. Install Google Authenticator app on your phone</p>
              <p className="text-sm text-gray-600">2. Scan this QR code with the app:</p>
              <img 
                src={`data:image/png;base64,${qrCode}`} 
                alt="QR Code"
                className="w-48 h-48"
              />
              <p className="text-sm text-gray-600">
                Or manually enter this secret key: <br/>
                <span className="font-mono bg-gray-100 px-2 py-1 rounded">{secret}</span>
              </p>
            </div>

            <form onSubmit={handleVerify} className="space-y-4">
              <div>
                <label htmlFor="code" className="sr-only">Verification Code</label>
                <input
                  id="code"
                  type="text"
                  required
                  className="appearance-none rounded-md relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  placeholder="Enter verification code from the app"
                  value={verificationCode}
                  onChange={(e) => setVerificationCode(e.target.value)}
                />
              </div>
              <button
                type="submit"
                disabled={isLoading}
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                {isLoading ? 'Verifying...' : 'Verify Setup'}
              </button>
            </form>
          </div>
        )}

        {setupComplete && (
          <div className="text-center text-green-600">
            <p className="font-medium">✓ Google Authenticator setup complete!</p>
            <p className="text-sm mt-2">You can now use Google Authenticator for login.</p>
          </div>
        )}

        {error && (
          <div className="text-red-600 text-sm text-center">
            {error}
          </div>
        )}

        {success && (
          <div className="text-green-600 text-sm text-center">
            {success}
          </div>
        )}
      </div>
    </div>
  );
} 