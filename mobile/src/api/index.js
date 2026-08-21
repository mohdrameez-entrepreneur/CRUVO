import axios from 'axios';
import * as SecureStore from 'expo-secure-store';

const API_BASE = 'https://cruvo.onrender.com/api';

const api = axios.create({
  baseURL: API_BASE,
  headers: { 'Content-Type': 'application/json' },
  timeout: 30000,
});

api.interceptors.request.use(async (config) => {
  const token = await SecureStore.getItemAsync('auth_token');
  if (token) {
    config.headers.Authorization = `Token ${token}`;
  }
  if (config.data instanceof FormData) {
    delete config.headers['Content-Type'];
  }
  return config;
});

export const authAPI = {
  register: (data) => api.post('/auth/register/', data),
  login: (data) => api.post('/auth/login/', data),
  logout: () => api.post('/auth/logout/'),
};

export const profileAPI = {
  get: () => api.get('/profile/'),
  update: (data) => api.patch('/profile/', data),
  changeUsername: (data) => api.post('/profile/change-username/', data),
  changeEmail: (data) => api.post('/profile/change-email/', data),
  uploadAvatar: (formData) => api.patch('/profile/', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }),
};

export const ridesAPI = {
  list: () => api.get('/rides/'),
  create: (data) => api.post('/rides/', data),
  get: (id) => api.get(`/rides/${id}/`),
  update: (id, data) => api.patch(`/rides/${id}/`, data),
  delete: (id) => api.delete(`/rides/${id}/`),
  getParticipants: (id) => api.get(`/rides/${id}/participants/`),
  addParticipant: (id, data) => api.post(`/rides/${id}/participants/`, data),
  getFlagStops: (id) => api.get(`/rides/${id}/flag-stops/`),
  createFlagStop: (id, data) => api.post(`/rides/${id}/flag-stops/`, data),
  getSummary: (id) => api.get(`/rides/${id}/summary/`),
};

export const discoveryAPI = {
  searchRiders: (q, filters = {}) => api.get('/discovery/riders/', { params: { q, ...filters } }),
};

export const invitationsAPI = {
  list: () => api.get('/invitations/'),
  respond: (participantId, action) => api.post(`/invitations/${participantId}/respond/`, { action }),
};

export default api;
