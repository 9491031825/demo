import axios from 'axios';

const instance = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:8000',
  headers: {
    'Content-Type': 'application/json',
  },
});

let sessionTimeoutCallback = null;

export const setSessionTimeoutCallback = (callback) => {
  sessionTimeoutCallback = callback;
};

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

instance.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    const isAuthRequest = originalRequest.url.includes('/login/') || originalRequest.url.includes('/token/refresh/');

    if (error.response?.status === 401 && !originalRequest._retry && !isAuthRequest) {
      originalRequest._retry = true;
      const refreshToken = localStorage.getItem('refresh_token');

      try {
        const response = await instance.post('/user/token/refresh/', {
          refresh: refreshToken
        });

        if (response.data.access) {
          localStorage.setItem('access_token', response.data.access);
          instance.defaults.headers.common['Authorization'] = `Bearer ${response.data.access}`;
          return instance(originalRequest);
        }
      } catch (refreshError) {
        // Clear tokens on refresh failure
        localStorage.clear();
        delete instance.defaults.headers.common['Authorization'];
        
        // First redirect, then show alert
        window.location.href = '/login';
        setTimeout(() => {
          alert('Your session has expired. Please login again.');
        }, 100);
      }
    }

    return Promise.reject(error);
  }
);

export default instance;