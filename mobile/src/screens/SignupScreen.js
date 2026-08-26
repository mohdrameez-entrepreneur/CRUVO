import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Animated,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as WebBrowser from 'expo-web-browser';
import * as Google from 'expo-auth-session/providers/google';

import { colors, spacing, typography, borderRadius, moderateScale } from '../theme';
import { useAuth } from '../context/AuthContext';
import { GOOGLE_WEB_CLIENT_ID, GOOGLE_ANDROID_CLIENT_ID, GOOGLE_IOS_CLIENT_ID } from '../config';
import AlertCard from '../components/AlertCard';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

WebBrowser.maybeCompleteAuthSession();

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const TOTAL_STEPS = 4;

const RIDING_STYLES = [
  { key: 'ALL', label: 'All-Rounder', icon: 'flash', desc: 'Any road, any pace' },
  { key: 'ADVENTURE', label: 'Adventure', icon: 'trail-sign', desc: 'Off-road & trails' },
  { key: 'TOURING', label: 'Touring', icon: 'map', desc: 'Long distance highways' },
  { key: 'SPORT', label: 'Sport', icon: 'speedometer', desc: 'Twisties & track' },
  { key: 'CRUISE', label: 'Cruiser', icon: 'glasses', desc: 'Relaxed & scenic' },
  { key: 'COMMUTE', label: 'Commuter', icon: 'business', desc: 'City & daily runs' },
];

const EXPERIENCE_LEVELS = [
  { key: 'BEGINNER', label: 'Beginner', badge: '< 1 Year', color: '#4CAF50' },
  { key: 'INTERMEDIATE', label: 'Intermediate', badge: '1 - 3 Years', color: '#FFD600' },
  { key: 'VETERAN', label: 'Veteran', badge: '3 - 5 Years', color: '#FF9800' },
  { key: 'EXPERT', label: 'Expert', badge: '5+ Years', color: '#F44336' },
];

const POPULAR_BRANDS = [
  'Royal Enfield', 'KTM', 'Yamaha', 'Triumph',
  'BMW', 'Honda', 'Kawasaki', 'Ducati', 'Harley-Davidson', 'Suzuki',
];

export default function SignupScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { register, googleLogin } = useAuth();

  const [step, setStep] = useState(1);
  const [form, setForm] = useState({
    display_name: '',
    username: '',
    email: '',
    password: '',
    password2: '',
    bike_make: '',
    bike_model: '',
    riding_style: 'ALL',
    experience_level: '',
  });

  const [showPassword, setShowPassword] = useState(false);
  const [showPassword2, setShowPassword2] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [errors, setErrors] = useState({});

  const progressAnim = useRef(new Animated.Value(1 / TOTAL_STEPS)).current;

  // Google OAuth Hook
  const [request, response, promptAsync] = Google.useAuthRequest({
    webClientId: GOOGLE_WEB_CLIENT_ID,
    androidClientId: GOOGLE_ANDROID_CLIENT_ID || GOOGLE_WEB_CLIENT_ID,
    iosClientId: GOOGLE_IOS_CLIENT_ID || GOOGLE_WEB_CLIENT_ID,
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

  const update = (key, value) => {
    setForm(prev => ({ ...prev, [key]: value }));
    if (errors[key]) setErrors(prev => ({ ...prev, [key]: null }));
  };

  const animateToStep = (newStep) => {
    setStep(newStep);
    Animated.spring(progressAnim, {
      toValue: newStep / TOTAL_STEPS,
      friction: 8,
      tension: 40,
      useNativeDriver: false,
    }).start();
  };

  // Validate Step 1 (Identity)
  const validateStep1 = () => {
    const e = {};
    if (!form.display_name.trim()) e.display_name = 'Display Name is required';
    if (!form.username.trim()) {
      e.username = 'Username is required';
    } else if (form.username.includes(' ')) {
      e.username = 'Username cannot contain spaces';
    } else if (form.username.trim().length < 3) {
      e.username = 'Username must be at least 3 characters';
    } else if (!/^[a-zA-Z0-9_]+$/.test(form.username.trim())) {
      e.username = 'Only letters, numbers, and underscores allowed';
    }

    if (Object.keys(e).length > 0) {
      setErrors(e);
      return false;
    }
    setErrors({});
    return true;
  };

  // Validate Step 2 (Security & Contact)
  const validateStep2 = () => {
    const e = {};
    if (!form.email.trim()) {
      e.email = 'Email address is required';
    } else if (!form.email.includes('@') || !form.email.includes('.')) {
      e.email = 'Please enter a valid email address';
    }

    if (!form.password) {
      e.password = 'Password is required';
    } else if (form.password.length < 8) {
      e.password = 'Password must be at least 8 characters';
    }

    if (!form.password2) {
      e.password2 = 'Please confirm your password';
    } else if (form.password !== form.password2) {
      e.password2 = 'Passwords do not match';
    }

    if (Object.keys(e).length > 0) {
      setErrors(e);
      return false;
    }
    setErrors({});
    return true;
  };

  const handleNext = () => {
    if (step === 1) {
      if (validateStep1()) animateToStep(2);
    } else if (step === 2) {
      if (validateStep2()) animateToStep(3);
    } else if (step === 3) {
      animateToStep(4);
    }
  };

  const handleBack = () => {
    if (step > 1) {
      setErrors({});
      animateToStep(step - 1);
    } else {
      navigation.goBack();
    }
  };

  const handleFinalSubmit = async () => {
    setErrors({});
    setLoading(true);

    try {
      const payload = {
        display_name: form.display_name.trim(),
        username: form.username.trim().toLowerCase(),
        email: form.email.trim().toLowerCase(),
        password: form.password,
        password2: form.password2,
        bike_make: form.bike_make.trim(),
        bike_model: form.bike_model.trim(),
        riding_style: form.riding_style || '',
        experience_level: form.experience_level || '',
      };

      await register(payload);
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
        e.general = err.message || 'Could not reach server. Please try again.';
      }

      setErrors(e);

      // Jump to the step with errors if needed
      if (e.display_name || e.username) {
        animateToStep(1);
      } else if (e.email || e.password || e.password2) {
        animateToStep(2);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* TOP HEADER */}
      <View style={[styles.header, { paddingTop: Math.max(insets.top, spacing.stackLg) }]}>
        <TouchableOpacity onPress={handleBack} style={styles.backButton} activeOpacity={0.7}>
          <Ionicons name="arrow-back" size={22} color={colors.onSurface} />
        </TouchableOpacity>

        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>CRUVO</Text>
          <Text style={styles.stepBadge}>STEP {step} OF {TOTAL_STEPS}</Text>
        </View>

        <View style={{ width: 44 }} />
      </View>

      {/* PROGRESS BAR */}
      <View style={styles.progressTrack}>
        <Animated.View
          style={[
            styles.progressBar,
            {
              width: progressAnim.interpolate({
                inputRange: [0, 1],
                outputRange: ['0%', '100%'],
              }),
            },
          ]}
        />
      </View>

      {/* STEP CONTENT */}
      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {errors.general && (
          <AlertCard
            type="error"
            title="Registration Error"
            message={errors.general}
            onDismiss={() => setErrors(prev => ({ ...prev, general: null }))}
            style={{ marginBottom: spacing.stackMd }}
          />
        )}

        {/* ================= STEP 1: IDENTITY ================= */}
        {step === 1 && (
          <View style={styles.stepBox}>
            <View style={styles.stepHeader}>
              <View style={styles.stepIconWrap}>
                <Ionicons name="person" size={22} color={colors.primaryContainer} />
              </View>
              <Text style={styles.title}>Rider Identity</Text>
              <Text style={styles.subtitle}>Choose how your crew and squad will see you.</Text>
            </View>

            {/* Quick Google Sign Up */}
            <TouchableOpacity
              style={[styles.googleButton, googleLoading && { opacity: 0.7 }]}
              activeOpacity={0.85}
              onPress={() => promptAsync()}
              disabled={!request || googleLoading}
            >
              {googleLoading ? (
                <ActivityIndicator size="small" color={colors.onSurface} style={{ marginRight: 8 }} />
              ) : (
                <Ionicons name="logo-google" size={18} color={colors.onSurface} />
              )}
              <Text style={styles.googleButtonText}>
                {googleLoading ? 'Connecting...' : 'Sign up instantly with Google'}
              </Text>
            </TouchableOpacity>

            <View style={styles.divider}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>or continue with details</Text>
              <View style={styles.dividerLine} />
            </View>

            {/* Display Name Input */}
            <View style={styles.inputGroup}>
              <Text style={[styles.label, errors.display_name && styles.labelError]}>FULL NAME / NICKNAME</Text>
              <View style={[styles.inputContainer, errors.display_name && styles.inputError]}>
                <Ionicons name="person-outline" size={18} color={errors.display_name ? '#e53935' : colors.onSurfaceVariant} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="e.g. Kabir Khan, Alex R."
                  placeholderTextColor={colors.outline}
                  value={form.display_name}
                  onChangeText={v => update('display_name', v)}
                  autoCapitalize="words"
                />
              </View>
              {errors.display_name ? <Text style={styles.errorText}>{errors.display_name}</Text> : null}
            </View>

            {/* Username Input */}
            <View style={styles.inputGroup}>
              <Text style={[styles.label, errors.username && styles.labelError]}>USERNAME (CALLSIGN)</Text>
              <View style={[styles.inputContainer, errors.username && styles.inputError]}>
                <Ionicons name="at-outline" size={18} color={errors.username ? '#e53935' : colors.onSurfaceVariant} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="e.g. kabir_ride, speed_demon"
                  placeholderTextColor={colors.outline}
                  value={form.username}
                  onChangeText={v => update('username', v.toLowerCase().replace(/\s+/g, ''))}
                  autoCapitalize="none"
                />
              </View>
              {errors.username ? <Text style={styles.errorText}>{errors.username}</Text> : null}
            </View>

            {/* Action Button */}
            <TouchableOpacity
              style={styles.primaryButton}
              onPress={handleNext}
              activeOpacity={0.85}
            >
              <Text style={styles.primaryButtonText}>NEXT: CREDENTIALS</Text>
              <Ionicons name="arrow-forward" size={18} color={colors.onPrimaryContainer} />
            </TouchableOpacity>
          </View>
        )}

        {/* ================= STEP 2: SECURITY & CONTACT ================= */}
        {step === 2 && (
          <View style={styles.stepBox}>
            <View style={styles.stepHeader}>
              <View style={styles.stepIconWrap}>
                <Ionicons name="lock-closed" size={22} color={colors.primaryContainer} />
              </View>
              <Text style={styles.title}>Account Credentials</Text>
              <Text style={styles.subtitle}>Secure your account and ride telemetry.</Text>
            </View>

            {/* Email Input */}
            <View style={styles.inputGroup}>
              <Text style={[styles.label, errors.email && styles.labelError]}>EMAIL ADDRESS</Text>
              <View style={[styles.inputContainer, errors.email && styles.inputError]}>
                <Ionicons name="mail-outline" size={18} color={errors.email ? '#e53935' : colors.onSurfaceVariant} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="rider@cruvo.app"
                  placeholderTextColor={colors.outline}
                  value={form.email}
                  onChangeText={v => update('email', v.trim())}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              </View>
              {errors.email ? <Text style={styles.errorText}>{errors.email}</Text> : null}
            </View>

            {/* Password Input */}
            <View style={styles.inputGroup}>
              <Text style={[styles.label, errors.password && styles.labelError]}>PASSWORD</Text>
              <View style={[styles.inputContainer, errors.password && styles.inputError]}>
                <Ionicons name="lock-closed-outline" size={18} color={errors.password ? '#e53935' : colors.onSurfaceVariant} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="At least 8 characters"
                  placeholderTextColor={colors.outline}
                  value={form.password}
                  onChangeText={v => update('password', v)}
                  secureTextEntry={!showPassword}
                />
                <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeButton}>
                  <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={18} color={colors.onSurfaceVariant} />
                </TouchableOpacity>
              </View>
              {errors.password ? <Text style={styles.errorText}>{errors.password}</Text> : null}
            </View>

            {/* Confirm Password Input */}
            <View style={styles.inputGroup}>
              <Text style={[styles.label, errors.password2 && styles.labelError]}>CONFIRM PASSWORD</Text>
              <View style={[styles.inputContainer, errors.password2 && styles.inputError]}>
                <Ionicons name="shield-checkmark-outline" size={18} color={errors.password2 ? '#e53935' : colors.onSurfaceVariant} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Re-enter password"
                  placeholderTextColor={colors.outline}
                  value={form.password2}
                  onChangeText={v => update('password2', v)}
                  secureTextEntry={!showPassword2}
                />
                <TouchableOpacity onPress={() => setShowPassword2(!showPassword2)} style={styles.eyeButton}>
                  <Ionicons name={showPassword2 ? 'eye-off-outline' : 'eye-outline'} size={18} color={colors.onSurfaceVariant} />
                </TouchableOpacity>
              </View>
              {errors.password2 ? <Text style={styles.errorText}>{errors.password2}</Text> : null}
            </View>

            {/* Action Row */}
            <View style={styles.buttonRow}>
              <TouchableOpacity
                style={styles.secondaryButton}
                onPress={handleBack}
                activeOpacity={0.8}
              >
                <Ionicons name="arrow-back" size={16} color={colors.onSurface} />
                <Text style={styles.secondaryButtonText}>BACK</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.primaryButton, { flex: 1, marginTop: 0 }]}
                onPress={handleNext}
                activeOpacity={0.85}
              >
                <Text style={styles.primaryButtonText}>NEXT: GARAGE</Text>
                <Ionicons name="arrow-forward" size={18} color={colors.onPrimaryContainer} />
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* ================= STEP 3: GARAGE (OPTIONAL) ================= */}
        {step === 3 && (
          <View style={styles.stepBox}>
            <View style={styles.stepHeader}>
              <View style={[styles.stepIconWrap, { backgroundColor: 'rgba(0, 240, 255, 0.15)', borderColor: '#00f0ff' }]}>
                <Ionicons name="bicycle" size={22} color="#00f0ff" />
              </View>
              <View style={styles.optionalBadgeWrap}>
                <Text style={styles.optionalBadgeText}>OPTIONAL STEP</Text>
              </View>
              <Text style={styles.title}>Your Machine</Text>
              <Text style={styles.subtitle}>Show your squad what you ride in your garage profile.</Text>
            </View>

            {/* Quick Brand Select Chips */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>POPULAR BRANDS</Text>
              <View style={styles.brandChipsWrap}>
                {POPULAR_BRANDS.map(brand => (
                  <TouchableOpacity
                    key={brand}
                    style={[styles.brandChip, form.bike_make === brand && styles.brandChipActive]}
                    onPress={() => update('bike_make', form.bike_make === brand ? '' : brand)}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.brandChipText, form.bike_make === brand && styles.brandChipTextActive]}>
                      {brand}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Bike Make Custom Input */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>BRAND / MANUFACTURER</Text>
              <View style={styles.inputContainer}>
                <Ionicons name="speedometer-outline" size={18} color={colors.onSurfaceVariant} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="e.g. Royal Enfield, KTM, Yamaha"
                  placeholderTextColor={colors.outline}
                  value={form.bike_make}
                  onChangeText={v => update('bike_make', v)}
                />
              </View>
            </View>

            {/* Bike Model Input */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>MODEL & DISPLACEMENT</Text>
              <View style={styles.inputContainer}>
                <Ionicons name="cog-outline" size={18} color={colors.onSurfaceVariant} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="e.g. Himalayan 450, Duke 390, MT-15"
                  placeholderTextColor={colors.outline}
                  value={form.bike_model}
                  onChangeText={v => update('bike_model', v)}
                />
              </View>
            </View>

            {/* Action Row */}
            <View style={styles.buttonRow}>
              <TouchableOpacity
                style={styles.secondaryButton}
                onPress={handleBack}
                activeOpacity={0.8}
              >
                <Ionicons name="arrow-back" size={16} color={colors.onSurface} />
                <Text style={styles.secondaryButtonText}>BACK</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.skipButton}
                onPress={() => {
                  update('bike_make', '');
                  update('bike_model', '');
                  animateToStep(4);
                }}
                activeOpacity={0.8}
              >
                <Text style={styles.skipButtonText}>SKIP</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.primaryButton, { flex: 1.2, marginTop: 0 }]}
                onPress={handleNext}
                activeOpacity={0.85}
              >
                <Text style={styles.primaryButtonText}>NEXT: STYLE</Text>
                <Ionicons name="arrow-forward" size={18} color={colors.onPrimaryContainer} />
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* ================= STEP 4: STYLE & EXPERIENCE (OPTIONAL) ================= */}
        {step === 4 && (
          <View style={styles.stepBox}>
            <View style={styles.stepHeader}>
              <View style={[styles.stepIconWrap, { backgroundColor: 'rgba(0, 230, 118, 0.15)', borderColor: '#00e676' }]}>
                <Ionicons name="trail-sign" size={22} color="#00e676" />
              </View>
              <View style={styles.optionalBadgeWrap}>
                <Text style={styles.optionalBadgeText}>FINAL STEP</Text>
              </View>
              <Text style={styles.title}>Rider Persona</Text>
              <Text style={styles.subtitle}>Help squad leaders match with your pace and style.</Text>
            </View>

            {/* Riding Style Selector */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>PREFERRED RIDING STYLE</Text>
              <View style={styles.styleGrid}>
                {RIDING_STYLES.map(s => {
                  const active = form.riding_style === s.key;
                  return (
                    <TouchableOpacity
                      key={s.key}
                      style={[styles.styleCard, active && styles.styleCardActive]}
                      onPress={() => update('riding_style', active ? '' : s.key)}
                      activeOpacity={0.75}
                    >
                      <Ionicons
                        name={s.icon}
                        size={20}
                        color={active ? colors.onPrimaryContainer : colors.primaryContainer}
                      />
                      <Text style={[styles.styleCardTitle, active && styles.styleCardTitleActive]}>
                        {s.label}
                      </Text>
                      <Text style={[styles.styleCardDesc, active && styles.styleCardDescActive]} numberOfLines={1}>
                        {s.desc}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Experience Level Selector */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>EXPERIENCE LEVEL</Text>
              <View style={styles.experienceList}>
                {EXPERIENCE_LEVELS.map(exp => {
                  const active = form.experience_level === exp.key;
                  return (
                    <TouchableOpacity
                      key={exp.key}
                      style={[styles.expCard, active && styles.expCardActive]}
                      onPress={() => update('experience_level', active ? '' : exp.key)}
                      activeOpacity={0.75}
                    >
                      <View style={[styles.expDot, { backgroundColor: exp.color }]} />
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.expCardTitle, active && styles.expCardTitleActive]}>
                          {exp.label}
                        </Text>
                      </View>
                      <Text style={[styles.expBadge, active && styles.expBadgeActive]}>
                        {exp.badge}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Final Submit / Skip Buttons */}
            <View style={styles.buttonRow}>
              <TouchableOpacity
                style={styles.secondaryButton}
                onPress={handleBack}
                disabled={loading}
                activeOpacity={0.8}
              >
                <Ionicons name="arrow-back" size={16} color={colors.onSurface} />
                <Text style={styles.secondaryButtonText}>BACK</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.primaryButton, { flex: 1.8, marginTop: 0 }, loading && styles.disabled]}
                onPress={handleFinalSubmit}
                disabled={loading}
                activeOpacity={0.85}
              >
                {loading ? (
                  <ActivityIndicator size="small" color={colors.onPrimaryContainer} />
                ) : (
                  <>
                    <Text style={styles.primaryButtonText}>COMPLETE REGISTRATION</Text>
                    <Ionicons name="checkmark-circle" size={20} color={colors.onPrimaryContainer} />
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        )}
      </ScrollView>

      {/* FOOTER */}
      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, spacing.stackLg) }]}>
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.marginMobile,
    paddingTop: spacing.stackLg,
    paddingBottom: spacing.stackSm,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(26, 27, 31, 0.85)',
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCenter: { alignItems: 'center' },
  headerTitle: {
    ...typography.displayLg,
    color: colors.primaryContainer,
    fontSize: 22,
    letterSpacing: -0.5,
    textTransform: 'uppercase',
  },
  stepBadge: {
    ...typography.labelSm,
    color: colors.onSurfaceVariant,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
    marginTop: 2,
  },
  progressTrack: {
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    marginHorizontal: spacing.marginMobile,
    borderRadius: 2,
    marginVertical: 10,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    backgroundColor: colors.primaryContainer,
    borderRadius: 2,
  },
  content: { flex: 1 },
  contentContainer: { paddingHorizontal: spacing.marginMobile, paddingBottom: spacing.stackLg },
  stepBox: { paddingTop: 8 },
  stepHeader: { alignItems: 'center', marginBottom: spacing.stackMd },
  stepIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255, 214, 0, 0.12)',
    borderWidth: 1,
    borderColor: colors.primaryContainer,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  optionalBadgeWrap: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    marginBottom: 6,
  },
  optionalBadgeText: {
    ...typography.labelSm,
    color: colors.onSurfaceVariant,
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  title: {
    ...typography.headlineLgMobile,
    color: colors.onSurface,
    fontSize: 22,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 4,
  },
  subtitle: {
    ...typography.bodyMd,
    color: colors.onSurfaceVariant,
    fontSize: 13,
    textAlign: 'center',
    paddingHorizontal: 16,
  },
  googleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 46,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.surfaceContainerLow,
    gap: spacing.stackSm,
    marginBottom: spacing.stackSm,
  },
  googleButtonText: { ...typography.titleMd, color: colors.onSurface, fontSize: 13 },
  divider: { flexDirection: 'row', alignItems: 'center', marginVertical: spacing.stackMd },
  dividerLine: { flex: 1, height: 1, backgroundColor: colors.outlineVariant },
  dividerText: { ...typography.labelSm, color: colors.onSurfaceVariant, marginHorizontal: spacing.stackMd, fontSize: 11 },
  inputGroup: { marginBottom: spacing.stackMd },
  label: { ...typography.labelTechnical, color: colors.onSurfaceVariant, fontSize: 11, marginBottom: 6 },
  labelError: { color: '#e53935' },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceContainerLowest,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    borderRadius: borderRadius.lg,
    height: 50,
    paddingHorizontal: spacing.stackMd,
  },
  inputError: { borderColor: '#e53935', backgroundColor: 'rgba(229,57,53,0.05)' },
  inputIcon: { marginRight: spacing.stackSm },
  input: { flex: 1, ...typography.bodyMd, color: colors.onSurface, fontSize: 14 },
  eyeButton: { padding: spacing.stackSm },
  errorText: { ...typography.labelSm, color: '#e53935', marginTop: 4, marginLeft: 4, fontSize: 11 },
  brandChipsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 },
  brandChip: {
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: borderRadius.full,
    backgroundColor: colors.surfaceContainerLowest,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
  },
  brandChipActive: { backgroundColor: colors.primaryContainer, borderColor: colors.primaryContainer },
  brandChipText: { ...typography.labelSm, color: colors.onSurfaceVariant, fontSize: 11, fontWeight: '700' },
  brandChipTextActive: { color: colors.onPrimaryContainer },
  styleGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  styleCard: {
    width: (SCREEN_WIDTH - spacing.marginMobile * 2 - 8) / 2 - 1,
    backgroundColor: colors.surfaceContainerLowest,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    borderRadius: borderRadius.lg,
    padding: 12,
    gap: 4,
  },
  styleCardActive: {
    backgroundColor: colors.primaryContainer,
    borderColor: colors.primaryContainer,
  },
  styleCardTitle: { ...typography.titleMd, color: colors.onSurface, fontSize: 13, fontWeight: '800' },
  styleCardTitleActive: { color: colors.onPrimaryContainer },
  styleCardDesc: { ...typography.labelSm, color: colors.onSurfaceVariant, fontSize: 10 },
  styleCardDescActive: { color: colors.onPrimaryContainer + 'cc' },
  experienceList: { gap: 8 },
  expCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceContainerLowest,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    borderRadius: borderRadius.lg,
    paddingVertical: 12,
    paddingHorizontal: 14,
    gap: 10,
  },
  expCardActive: {
    backgroundColor: 'rgba(255, 214, 0, 0.15)',
    borderColor: colors.primaryContainer,
  },
  expDot: { width: 10, height: 10, borderRadius: 5 },
  expCardTitle: { ...typography.titleMd, color: colors.onSurface, fontSize: 13, fontWeight: '700' },
  expCardTitleActive: { color: colors.primaryContainer },
  expBadge: { ...typography.labelTechnical, color: colors.onSurfaceVariant, fontSize: 11 },
  expBadgeActive: { color: colors.primaryContainer, fontWeight: '800' },
  buttonRow: { flexDirection: 'row', gap: 10, marginTop: spacing.stackMd, alignItems: 'center' },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.primaryContainer,
    height: 52,
    borderRadius: borderRadius.lg,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 4,
    elevation: 4,
    marginTop: spacing.stackSm,
  },
  primaryButtonText: {
    ...typography.titleMd,
    color: colors.onPrimaryContainer,
    textTransform: 'uppercase',
    fontWeight: '800',
    fontSize: 14,
  },
  secondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 52,
    paddingHorizontal: 16,
    borderRadius: borderRadius.lg,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: colors.outlineVariant,
  },
  secondaryButtonText: { ...typography.labelSm, color: colors.onSurface, fontWeight: '800', fontSize: 12 },
  skipButton: {
    height: 52,
    paddingHorizontal: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  skipButtonText: { ...typography.labelSm, color: colors.onSurfaceVariant, fontWeight: '800', fontSize: 12, textDecorationLine: 'underline' },
  disabled: { opacity: 0.6 },
  footer: { padding: spacing.marginMobile, paddingBottom: spacing.stackLg, alignItems: 'center' },
  footerText: { ...typography.labelTechnical, color: colors.onSurfaceVariant, fontSize: 11 },
  footerLink: { color: colors.primaryContainer, fontWeight: '800' },
});
