import axios from 'axios';
import * as SecureStore from 'expo-secure-store';

const API_BASE = process.env.EXPO_PUBLIC_API_URL || 'https://cruvo.onrender.com/api';

const api = axios.create({
  baseURL: API_BASE,
  headers: { 'Content-Type': 'application/json' },
  timeout: 45000,
});

let currentToken = null;

export const setAuthToken = (token) => {
  currentToken = token;
  if (token) {
    api.defaults.headers.common['Authorization'] = `Token ${token}`;
  } else {
    delete api.defaults.headers.common['Authorization'];
  }
};

api.interceptors.request.use(async (config) => {
  if (!currentToken) {
    // Fallback for edge cases (e.g., interceptor running before checkAuth completes)
    const token = await SecureStore.getItemAsync('auth_token');
    if (token) {
      setAuthToken(token);
    }
  }

  // Ensure Authorization is set on the specific config if available
  if (currentToken && !config.headers.Authorization) {
    config.headers.Authorization = `Token ${currentToken}`;
  }

  if (config.data instanceof FormData) {
    delete config.headers['Content-Type'];
  }
  return config;
});

// Automatic retry interceptor for Render cold-starts & temporary network glitches
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const config = error.config;
    if (!config) return Promise.reject(error);

    const isNetworkOrBootError =
      !error.response ||
      [502, 503, 504].includes(error.response.status) ||
      error.code === 'ECONNABORTED';

    config._retryCount = config._retryCount || 0;

    if (isNetworkOrBootError && config._retryCount < 2) {
      config._retryCount += 1;
      console.log(`[API Retry] Server waking up / network glitch. Retrying (${config._retryCount}/2)...`);
      await new Promise((resolve) => setTimeout(resolve, 2000));
      return api(config);
    }

    return Promise.reject(error);
  }
);

export const authAPI = {
  register: (data) => api.post('/auth/register/', data),
  login: (data) => api.post('/auth/login/', data),
  googleAuth: (data) => api.post('/auth/google/', data),
  logout: () => api.post('/auth/logout/'),
  forgotPasswordRequest: (data) => api.post('/auth/forgot-password/', data),
  forgotPasswordVerify: (data) => api.post('/auth/forgot-password/verify/', data),
  forgotPasswordReset: (data) => api.post('/auth/forgot-password/reset/', data),
};

export const profileAPI = {
  get: () => api.get('/profile/'),
  getUserSummary: (userId) => api.get(`/users/${userId}/summary/`),
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
  toggleReady: (id) => api.post(`/rides/${id}/toggle-ready/`),
  startRide: (id) => api.post(`/rides/${id}/start-ride/`),
  getFlagStops: (id) => api.get(`/rides/${id}/flag-stops/`),
  createFlagStop: (id, data) => api.post(`/rides/${id}/flag-stops/`, data),
  clearFlag: (id) => api.post(`/rides/${id}/clear-flag/`),
  getSummary: (id) => api.get(`/rides/${id}/summary/`),
  updatePosition: (id, data) => api.post(`/rides/${id}/update-position/`, data),
  getPositions: (id) => api.get(`/rides/${id}/positions/`),
  fetchRoute: (id) => api.post(`/rides/${id}/fetch-route/`),
  joinPublicRide: (id) => api.post(`/rides/${id}/join/`),
};

export const friendsAPI = {
  sendRequest: (userId) => api.post('/friends/request/', { user_id: userId }),
  respondRequest: (friendshipId, action) => api.post(`/friends/${friendshipId}/respond/`, { action }),
  removeFriend: (id) => api.post('/friends/remove/', { user_id: id, friendship_id: id }),
  getFriends: () => api.get('/friends/'),
  getRequests: () => api.get('/friends/requests/'),
};

export const discoveryAPI = {
  searchRiders: (q, filters = {}) => api.get('/discovery/riders/', { params: { q, ...filters } }),
};

export const invitationsAPI = {
  list: () => api.get('/invitations/'),
  respond: (participantId, action) => api.post(`/invitations/${participantId}/respond/`, { action }),
};

export const versionAPI = {
  getAppVersion: () => api.get('/app-version/'),
  submitBugReport: (data) => api.post('/bug-report/', data),
};

export default api;
