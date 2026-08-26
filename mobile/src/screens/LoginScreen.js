import React, { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as WebBrowser from 'expo-web-browser';
import * as Google from 'expo-auth-session/providers/google';

import { colors, spacing, typography, borderRadius, scale, moderateScale } from '../theme';
import { useAuth } from '../context/AuthContext';
import { GOOGLE_WEB_CLIENT_ID } from '../config';
import AlertCard from '../components/AlertCard';

WebBrowser.maybeCompleteAuthSession();

export default function LoginScreen({ navigation }) {
  const { login, googleLogin } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const scrollRef = useRef(null);
  const usernameRef = useRef(null);
  const passwordRef = useRef(null);

  // Google OAuth Hook
  const [request, response, promptAsync] = Google.useAuthRequest({
    webClientId: GOOGLE_WEB_CLIENT_ID,
    androidClientId: GOOGLE_WEB_CLIENT_ID,
    iosClientId: GOOGLE_WEB_CLIENT_ID,
    scopes: ['profile', 'email', 'openid'],
  });

  useEffect(() => {
    if (response?.type === 'success') {
      const { authentication, params } = response;
      const id_token = authentication?.idToken || params?.id_token;
      const access_token = authentication?.accessToken || params?.access_token;
      if (id_token || access_token) {
        handleGoogleAuth({ id_token, access_token });
      }
    } else if (response?.type === 'error') {
      setErrors({ general: 'Google sign in was cancelled or failed' });
    }
  }, [response]);

  const handleGoogleAuth = async (tokens) => {
    setGoogleLoading(true);
    setErrors({});
    try {
      await googleLogin(tokens);
    } catch (err) {
      const msg = err.response?.data?.error || err.message || 'Google sign in failed. Please try again.';
      setErrors({ general: msg });
    } finally {
      setGoogleLoading(false);
    }
  };

  const fieldRefs = { username: usernameRef, password: passwordRef };

  const scrollToField = (key) => {
    const ref = fieldRefs[key];
    if (ref?.current && scrollRef.current) {
      ref.current.measureLayout(scrollRef.current, (x, y) => {
        scrollRef.current.scrollTo({ y: Math.max(0, y - 100), animated: true });
      }, () => {});
    }
  };

  const handleLogin = async () => {
    setErrors({});
    if (!username || !password) {
      const e = {};
      if (!username) e.username = 'Username is required';
      if (!password) e.password = 'Password is required';
      setErrors(e);
      scrollToField(Object.keys(e)[0]);
      return;
    }
    setLoading(true);
    try {
      await login(username, password);
    } catch (err) {
      const msg = err.response?.data;
      const e = {};
      if (msg && typeof msg === 'object') {
        if (msg.non_field_errors) {
          e.general = Array.isArray(msg.non_field_errors) ? msg.non_field_errors[0] : msg.non_field_errors;
        } else if (msg.error) {
          e.general = msg.error;
        } else {
          Object.entries(msg).forEach(([key, val]) => {
            if (key !== 'non_field_errors') {
              e[key] = Array.isArray(val) ? val[0] : val;
            }
          });
        }
      } else {
        e.general = err.message || 'Could not reach server';
      }
      setErrors(e);
      const firstField = Object.keys(e).find(k => k !== 'general');
      if (firstField) scrollToField(firstField);
    } finally {
      setLoading(false);
    }
  };

  const clearError = (key) => {
    if (errors[key]) setErrors(prev => ({ ...prev, [key]: null }));
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.onSurface} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>CRUVO</Text>
        <View style={styles.backButton} />
      </View>

      <ScrollView ref={scrollRef} style={styles.content} contentContainerStyle={styles.contentContainer}>
        <Text style={styles.title}>Welcome Back</Text>
        <Text style={styles.subtitle}>Sign in to continue riding</Text>

        {errors.general && (
          <AlertCard
            type="error"
            title="Sign In Failed"
            message={errors.general}
            onDismiss={() => setErrors(prev => ({ ...prev, general: null }))}
            style={{ marginBottom: spacing.stackMd }}
          />
        )}

        <View ref={usernameRef} style={styles.inputGroup}>
          <Text style={[styles.label, errors.username && styles.labelError]}>USERNAME OR EMAIL</Text>
          <View style={[styles.inputContainer, errors.username && styles.inputError]}>
            <Ionicons name="person-outline" size={20} color={errors.username ? '#e53935' : colors.onSurfaceVariant} style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Enter your username or email"
              placeholderTextColor={colors.outline}
              value={username}
              onChangeText={(v) => { setUsername(v); clearError('username'); }}
              autoCapitalize="none"
            />
          </View>
          {errors.username ? <Text style={styles.errorText}>{errors.username}</Text> : null}
        </View>

        <View ref={passwordRef} style={styles.inputGroup}>
          <Text style={[styles.label, errors.password && styles.labelError]}>PASSWORD</Text>
          <View style={[styles.inputContainer, errors.password && styles.inputError]}>
            <Ionicons name="lock-closed-outline" size={20} color={errors.password ? '#e53935' : colors.onSurfaceVariant} style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Enter password"
              placeholderTextColor={colors.outline}
              value={password}
              onChangeText={(v) => { setPassword(v); clearError('password'); }}
              secureTextEntry={!showPassword}
            />
            <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeButton}>
              <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={20} color={colors.onSurfaceVariant} />
            </TouchableOpacity>
          </View>
          {errors.password ? <Text style={styles.errorText}>{errors.password}</Text> : null}
        </View>

        <TouchableOpacity style={styles.forgotPassword}>
          <Text style={styles.forgotPasswordText}>Forgot password?</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.primaryButton, loading && styles.primaryButtonDisabled]}
          onPress={handleLogin}
          disabled={loading || googleLoading}
          activeOpacity={0.8}
        >
          <Text style={styles.primaryButtonText}>{loading ? 'Signing In...' : 'Sign In'}</Text>
        </TouchableOpacity>

        <View style={styles.divider}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>or</Text>
          <View style={styles.dividerLine} />
        </View>

        {/* GOOGLE SIGN IN BUTTON */}
        <TouchableOpacity
          style={[styles.googleButton, googleLoading && { opacity: 0.7 }]}
          activeOpacity={0.85}
          onPress={() => promptAsync()}
          disabled={!request || googleLoading || loading}
        >
          {googleLoading ? (
            <ActivityIndicator size="small" color={colors.onSurface} style={{ marginRight: 8 }} />
          ) : (
            <Ionicons name="logo-google" size={20} color={colors.onSurface} />
          )}
          <Text style={styles.googleButtonText}>
            {googleLoading ? 'Connecting to Google...' : 'Continue with Google'}
          </Text>
        </TouchableOpacity>
      </ScrollView>

      <View style={styles.footer}>
        <Text style={styles.footerText}>
          DON'T HAVE AN ACCOUNT?{' '}
          <Text style={styles.footerLink} onPress={() => navigation.navigate('Signup')}>SIGN UP</Text>
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: spacing.marginMobile, paddingTop: spacing.stackLg, paddingBottom: spacing.stackMd,
  },
  backButton: { width: scale(48), height: scale(48), justifyContent: 'center', alignItems: 'center' },
  headerTitle: { ...typography.displayLg, color: colors.primaryContainer, fontSize: moderateScale(24), textTransform: 'uppercase', letterSpacing: -0.8 },
  content: { flex: 1 },
  contentContainer: { paddingHorizontal: spacing.marginMobile, paddingBottom: spacing.stackLg },
  title: { ...typography.headlineLgMobile, color: colors.onSurface, marginBottom: spacing.stackSm },
  subtitle: { ...typography.bodyMd, color: colors.onSurfaceVariant, marginBottom: spacing.stackLg },
  inputGroup: { marginBottom: spacing.stackMd },
  label: { ...typography.labelTechnical, color: colors.onSurfaceVariant, marginBottom: spacing.stackSm },
  labelError: { color: '#e53935' },
  inputContainer: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surfaceContainerLowest,
    borderWidth: 1, borderColor: colors.outlineVariant, borderRadius: borderRadius.lg,
    height: spacing.touchTargetMin, paddingHorizontal: spacing.stackMd,
  },
  inputError: { borderColor: '#e53935', backgroundColor: 'rgba(229,57,53,0.05)' },
  inputIcon: { marginRight: spacing.stackSm },
  input: { flex: 1, ...typography.bodyMd, color: colors.onSurface },
  eyeButton: { padding: spacing.stackSm },
  errorText: { ...typography.labelSm, color: '#e53935', marginTop: moderateScale(6), marginLeft: moderateScale(4) },
  forgotPassword: { alignSelf: 'flex-end', marginBottom: spacing.stackLg },
  forgotPasswordText: { ...typography.labelSm, color: colors.primaryContainer },
  primaryButton: {
    backgroundColor: colors.primaryContainer, height: spacing.touchTargetMin,
    borderRadius: borderRadius.lg, justifyContent: 'center', alignItems: 'center',
    marginBottom: spacing.stackMd, shadowColor: colors.black, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5, shadowRadius: 0, elevation: 4,
  },
  primaryButtonDisabled: { opacity: 0.6 },
  primaryButtonText: { ...typography.titleMd, color: colors.onPrimaryContainer, textTransform: 'uppercase' },
  divider: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.stackMd },
  dividerLine: { flex: 1, height: 1, backgroundColor: colors.outlineVariant },
  dividerText: { ...typography.labelSm, color: colors.onSurfaceVariant, marginHorizontal: spacing.stackMd },
  googleButton: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    height: spacing.touchTargetMin, borderWidth: 1, borderColor: colors.outlineVariant,
    borderRadius: borderRadius.lg, marginBottom: spacing.stackMd, gap: spacing.stackSm,
    backgroundColor: colors.surfaceContainerLow,
  },
  googleButtonText: { ...typography.titleMd, color: colors.onSurface, fontSize: 14 },
  footer: { padding: spacing.marginMobile, paddingBottom: spacing.stackLg, alignItems: 'center' },
  footerText: { ...typography.labelTechnical, color: colors.onSurfaceVariant },
  footerLink: { color: colors.primaryContainer },
});
