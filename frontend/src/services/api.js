import axios from 'axios';
import { Capacitor } from '@capacitor/core';

const api = axios.create({
  baseURL: Capacitor.isNativePlatform() ? 'http://10.0.2.2:8001' : 'http://localhost:8001',
});
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('opcrime_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      localStorage.removeItem('opcrime_token');
      localStorage.removeItem('opcrime_role');
      localStorage.removeItem('opcrime_user');
      window.location.href = '/';
    }
    return Promise.reject(error);
  }
);

export const login = (email, password) =>
  api.post('/api/auth/login', { email, password });

export const register = (name, email, password, role) =>
  api.post('/api/auth/register', { name, email, password, role });

export const getMe = () => api.get('/api/auth/me');

export const getScore = (params) =>
  api.get('/api/predictions/score', { params });

export const getExplanation = () =>
  api.get('/api/predictions/explain');

export const simulate = (features, interventions) =>
  api.post('/api/predictions/simulate', { features, interventions });

export const sendEmergency = (latitude, longitude, message) =>
  api.post('/api/citizen/emergency', { latitude, longitude, message });

export const getDashboardStats = (city = 'Chennai') =>
  api.get(`/api/police/dashboard-stats?city=${city}`);

export const getEmergencyRoute = (alertLat, alertLng, unitLat, unitLng, city) =>
  api.get('/api/emergency/route', {
    params: {
      alert_lat: alertLat,
      alert_lng: alertLng,
      unit_lat: unitLat,
      unit_lng: unitLng,
      city,
    },
  });

export default api;
