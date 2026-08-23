import React, { createContext, useState, useEffect, useContext } from 'react';
import * as SecureStore from 'expo-secure-store';
import { authAPI, profileAPI } from '../api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const token = await SecureStore.getItemAsync('auth_token');
      if (token) {
        // Try to load cached profile first for instant offline/cold-start load
        const cached = await SecureStore.getItemAsync('cached_profile');
        if (cached) {
          try {
            const parsed = JSON.parse(cached);
            setProfile(parsed);
            setUser({ token, id: parsed.user_id, username: parsed.username, email: parsed.email });
          } catch {}
        }
        
        // Fetch fresh profile from backend
        const res = await profileAPI.get();
        setProfile(res.data);
        setUser({ token, id: res.data.user_id, username: res.data.username, email: res.data.email });
        await SecureStore.setItemAsync('cached_profile', JSON.stringify(res.data));
      }
    } catch (err) {
      // ONLY log out if backend explicitly rejected auth (401 / 403)
      if (err.response && (err.response.status === 401 || err.response.status === 403)) {
        await SecureStore.deleteItemAsync('auth_token');
        await SecureStore.deleteItemAsync('cached_profile');
        setUser(null);
        setProfile(null);
      }
      // If it's a network error or Render cold-start, do NOT delete token! User stays logged in.
    } finally {
      setLoading(false);
    }
  };

  const login = async (username, password) => {
    const res = await authAPI.login({ username, password });
    await SecureStore.setItemAsync('auth_token', res.data.token);
    await SecureStore.setItemAsync('cached_profile', JSON.stringify(res.data.user.profile));
    setProfile(res.data.user.profile);
    setUser({ token: res.data.token, id: res.data.user.id, username: res.data.user.username, email: res.data.user.email });
    return res.data;
  };

  const register = async (data) => {
    const res = await authAPI.register(data);
    await SecureStore.setItemAsync('auth_token', res.data.token);
    await SecureStore.setItemAsync('cached_profile', JSON.stringify(res.data.user.profile));
    setProfile(res.data.user.profile);
    setUser({ token: res.data.token, id: res.data.user.id, username: res.data.user.username, email: res.data.user.email });
    return res.data;
  };

  const logout = async () => {
    try {
      await authAPI.logout();
    } catch {}
    await SecureStore.deleteItemAsync('auth_token');
    await SecureStore.deleteItemAsync('cached_profile');
    setUser(null);
    setProfile(null);
  };

  const refreshProfile = async () => {
    const res = await profileAPI.get();
    setProfile(res.data);
    setUser(prev => prev ? { ...prev, username: res.data.username, email: res.data.email } : prev);
    // Persist updated profile so cache stays in sync (privacy flags, etc.)
    await SecureStore.setItemAsync('cached_profile', JSON.stringify(res.data));
  };

  return (
    <AuthContext.Provider value={{ user, profile, loading, login, register, logout, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
