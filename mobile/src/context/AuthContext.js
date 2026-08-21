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
        const res = await profileAPI.get();
        setProfile(res.data);
        setUser({ token });
      }
    } catch {
      await SecureStore.deleteItemAsync('auth_token');
    } finally {
      setLoading(false);
    }
  };

  const login = async (email, password) => {
    const res = await authAPI.login({ email, password });
    await SecureStore.setItemAsync('auth_token', res.data.token);
    setProfile(res.data.user.profile);
    setUser({ token: res.data.token });
    return res.data;
  };

  const register = async (data) => {
    const res = await authAPI.register(data);
    await SecureStore.setItemAsync('auth_token', res.data.token);
    setProfile(res.data.user.profile);
    setUser({ token: res.data.token });
    return res.data;
  };

  const logout = async () => {
    try {
      await authAPI.logout();
    } catch {}
    await SecureStore.deleteItemAsync('auth_token');
    setUser(null);
    setProfile(null);
  };

  const refreshProfile = async () => {
    const res = await profileAPI.get();
    setProfile(res.data);
  };

  return (
    <AuthContext.Provider value={{ user, profile, loading, login, register, logout, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
