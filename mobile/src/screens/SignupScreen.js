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

const RIDING_STYLES = ['ADVENTURE', 'SPORT', 'TOURING', 'CRUISE', 'COMMUTE'];
const EXPERIENCE_LEVELS = ['BEGINNER', 'INTERMEDIATE', 'VETERAN', 'EXPERT'];

const FIELDS = [
  { key: 'username', label: 'USERNAME', icon: 'at-outline', placeholder: 'Choose a unique username' },
  { key: 'display_name', label: 'DISPLAY NAME', icon: 'person-outline', placeholder: 'Your name' },
  { key: 'email', label: 'EMAIL ADDRESS', icon: 'mail-outline', placeholder: 'rider@cruvo.app', keyboardType: 'email-address' },
  { key: 'password', label: 'PASSWORD', icon: 'lock-closed-outline', placeholder: 'Create password (min 8 chars)', secure: true },
  { key: 'password2', label: 'CONFIRM PASSWORD', icon: 'lock-closed-outline', placeholder: 'Re-enter password', secure: true },
  { key: 'bike_make', label: 'BIKE BRAND / MANUFACTURER (OPTIONAL)', icon: 'speedometer-outline', placeholder: 'e.g. Royal Enfield, Yamaha, KTM, Honda' },
  { key: 'bike_model', label: 'BIKE MODEL (OPTIONAL)', icon: 'bicycle-outline', placeholder: 'e.g. Himalayan 450, MT-15, Duke 390' },
];

export default function SignupScreen({ navigation }) {
  const { register, googleLogin } = useAuth();
  const [form, setForm] = useState({
    username: '', display_name: '', email: '', password: '', password2: '',
    bike_make: '', bike_model: '', riding_style: '', experience_level: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const scrollRef = useRef(null);
  const fieldRefs = useRef({});

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
      setErrors({ general: 'Google sign up was cancelled or failed' });
    }
  }, [response]);

  const handleGoogleAuth = async (tokens) => {
    setGoogleLoading(true);
    setErrors({});
    try {
      await googleLogin(tokens);
    } catch (err) {
      const msg = err.response?.data?.error || err.message || 'Google sign up failed. Please try again.';
      setErrors({ general: msg });
    } finally {
      setGoogleLoading(false);
    }
  };

  const scrollToField = (key) => {
    const ref = fieldRefs.current[key];
    if (ref?.current && scrollRef.current) {
      ref.current.measureLayout(scrollRef.current, (x, y) => {
        scrollRef.current.scrollTo({ y: Math.max(0, y - 100), animated: true });
      }, () => {});
    }
  };

  const update = (key, value) => {
    setForm(prev => ({ ...prev, [key]: value }));
    if (errors[key]) setErrors(prev => ({ ...prev, [key]: null }));
  };

  const handleSignup = async () => {
    setErrors({});
    const required = ['username', 'display_name', 'email', 'password', 'password2'];
    const e = {};
    required.forEach(key => { if (!form[key]) e[key] = 'This field is required'; });
    if (form.password && form.password.length < 8) e.password = 'Password must be at least 8 characters';
    if (form.password && form.password2 && form.password !== form.password2) e.password2 = 'Passwords do not match';
    if (form.email && !form.email.includes('@')) e.email = 'Enter a valid email';

    if (Object.keys(e).length > 0) {
      setErrors(e);
      scrollToField(Object.keys(e)[0]);
      return;
    }

    setLoading(true);
    try {
      await register(form);
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

  const renderInput = (field) => (
    <View key={field.key} ref={el => { fieldRefs.current[field.key] = { current: el }; }} style={styles.inputGroup}>
      <Text style={[styles.label, errors[field.key] && styles.labelError]}>
        {field.label || field.key.replace(/_/g, ' ').toUpperCase()}
      </Text>
      <View style={[styles.inputContainer, errors[field.key] && styles.inputError]}>
        <Ionicons name={field.icon} size={20} color={errors[field.key] ? '#e53935' : colors.onSurfaceVariant} style={styles.inputIcon} />
        <TextInput
          style={styles.input}
          placeholder={field.placeholder}
          placeholderTextColor={colors.outline}
          value={form[field.key]}
          onChangeText={(v) => update(field.key, v)}
          secureTextEntry={field.secure && !showPassword}
          keyboardType={field.keyboardType || 'default'}
          autoCapitalize={field.key === 'username' || field.key === 'email' ? 'none' : 'words'}
        />
        {field.secure && (
          <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeButton}>
            <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={20} color={colors.onSurfaceVariant} />
          </TouchableOpacity>
        )}
      </View>
      {errors[field.key] ? <Text style={styles.errorText}>{errors[field.key]}</Text> : null}
    </View>
  );

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
        <Text style={styles.title}>Join the Crew</Text>
        <Text style={styles.subtitle}>Create your profile to start riding</Text>

        {errors.general && (
          <AlertCard
            type="error"
            title="Registration Failed"
            message={errors.general}
            onDismiss={() => setErrors(prev => ({ ...prev, general: null }))}
            style={{ marginBottom: spacing.stackMd }}
          />
        )}

        {/* QUICK GOOGLE SIGN UP */}
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
            {googleLoading ? 'Connecting to Google...' : 'Sign up with Google'}
          </Text>
        </TouchableOpacity>

        <View style={styles.divider}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>or register with email</Text>
          <View style={styles.dividerLine} />
        </View>

        {FIELDS.map(renderInput)}

        <View ref={el => { fieldRefs.current['riding_style'] = { current: el }; }} style={styles.inputGroup}>
          <Text style={styles.label}>RIDING STYLE (OPTIONAL)</Text>
          <View style={styles.chipContainer}>
            {RIDING_STYLES.map(s => (
              <TouchableOpacity
                key={s}
                style={[styles.chip, form.riding_style === s && styles.chipActive]}
                onPress={() => update('riding_style', form.riding_style === s ? '' : s)}
              >
                <Text style={[styles.chipText, form.riding_style === s && styles.chipTextActive]}>{s}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View ref={el => { fieldRefs.current['experience_level'] = { current: el }; }} style={styles.inputGroup}>
          <Text style={styles.label}>EXPERIENCE (OPTIONAL)</Text>
          <View style={styles.chipContainer}>
            {EXPERIENCE_LEVELS.map(level => (
              <TouchableOpacity
                key={level}
                style={[styles.chip, form.experience_level === level && styles.chipActive]}
                onPress={() => update('experience_level', form.experience_level === level ? '' : level)}
              >
                <Text style={[styles.chipText, form.experience_level === level && styles.chipTextActive]}>{level}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <TouchableOpacity
          style={[styles.primaryButton, loading && styles.primaryButtonDisabled]}
          onPress={handleSignup}
          disabled={loading || googleLoading}
          activeOpacity={0.8}
        >
          <Text style={styles.primaryButtonText}>{loading ? 'Creating...' : 'Create Account'}</Text>
        </TouchableOpacity>
      </ScrollView>

      <View style={styles.footer}>
        <Text style={styles.footerText}>
          ALREADY HAVE AN ACCOUNT?{' '}
          <Text style={styles.footerLink} onPress={() => navigation.navigate('Login')}>LOG IN</Text>
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
  backButton: { width: 48, height: 48, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { ...typography.displayLg, color: colors.primaryContainer, fontSize: 24, textTransform: 'uppercase', letterSpacing: -0.8 },
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
  chipContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.stackSm },
  chip: {
    paddingVertical: spacing.stackSm, paddingHorizontal: spacing.stackMd,
    borderRadius: borderRadius.full, backgroundColor: colors.surfaceContainerLowest,
    borderWidth: 1, borderColor: colors.outlineVariant,
  },
  chipActive: { backgroundColor: colors.primaryContainer, borderColor: colors.primaryContainer },
  chipText: { ...typography.labelTechnical, color: colors.onSurfaceVariant },
  chipTextActive: { color: colors.onPrimaryContainer },
  primaryButton: {
    backgroundColor: colors.primaryContainer, height: spacing.touchTargetMin,
    borderRadius: borderRadius.lg, justifyContent: 'center', alignItems: 'center',
    marginTop: spacing.stackMd, marginBottom: spacing.stackMd,
    shadowColor: colors.black, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5, shadowRadius: 0, elevation: 4,
  },
  primaryButtonDisabled: { opacity: 0.6 },
  primaryButtonText: { ...typography.titleMd, color: colors.onPrimaryContainer, textTransform: 'uppercase' },
  divider: { flexDirection: 'row', alignItems: 'center', marginVertical: spacing.stackMd },
  dividerLine: { flex: 1, height: 1, backgroundColor: colors.outlineVariant },
  dividerText: { ...typography.labelSm, color: colors.onSurfaceVariant, marginHorizontal: spacing.stackMd },
  googleButton: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    height: spacing.touchTargetMin, borderWidth: 1, borderColor: colors.outlineVariant,
    borderRadius: borderRadius.lg, marginBottom: spacing.stackSm, gap: spacing.stackSm,
    backgroundColor: colors.surfaceContainerLow,
  },
  googleButtonText: { ...typography.titleMd, color: colors.onSurface, fontSize: 14 },
  footer: { padding: spacing.marginMobile, paddingBottom: spacing.stackLg, alignItems: 'center' },
  footerText: { ...typography.labelTechnical, color: colors.onSurfaceVariant },
  footerLink: { color: colors.primaryContainer },
});
