import axios from 'axios';

const instance = axios.create({
  baseURL: 'http://localhost:8000',  // your Django backend URL
  timeout: 5000,
  headers: {
    'Content-Type': 'application/json',
  }
});

let sessionTimeoutCallback = null;

export const setSessionTimeoutCallback = (callback) => {
  sessionTimeoutCallback = callback;
};

// Add a request interceptor
instance.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('access_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Add a response interceptor
instance.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // If the error is 401 and we have a refresh token
    if (error.response.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      const refreshToken = localStorage.getItem('refresh_token');

      if (refreshToken) {
        try {
          // Try to get a new access token
          const response = await instance.post('/api/token/refresh/', {
            refresh: refreshToken
          });

          if (response.data.access) {
            localStorage.setItem('access_token', response.data.access);
            instance.defaults.headers.common['Authorization'] = `Bearer ${response.data.access}`;
            return instance(originalRequest);
          }
        } catch (refreshError) {
          // If refresh token is invalid, logout user
          localStorage.removeItem('access_token');
          localStorage.removeItem('refresh_token');
          window.location.href = '/login';
        }
      }
    }

    return Promise.reject(error);
  }
);

export default instance;