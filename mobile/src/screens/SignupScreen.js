import React, { useState, useRef } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography, borderRadius } from '../theme';
import { useAuth } from '../context/AuthContext';

const RIDING_STYLES = ['ADVENTURE', 'SPORT', 'TOURING', 'CRUISE', 'COMMUTE'];
const EXPERIENCE_LEVELS = ['BEGINNER', 'INTERMEDIATE', 'VETERAN', 'EXPERT'];

const FIELDS = [
  { key: 'username', icon: 'at-outline', placeholder: 'Choose a unique username' },
  { key: 'display_name', icon: 'person-outline', placeholder: 'Your name' },
  { key: 'email', icon: 'mail-outline', placeholder: 'rider@cruvo.app', keyboardType: 'email-address' },
  { key: 'password', icon: 'lock-closed-outline', placeholder: 'Create password', secure: true },
  { key: 'password2', icon: 'lock-closed-outline', placeholder: 'Confirm password', secure: true },
  { key: 'bike_make', icon: 'motorcycle-outline', placeholder: 'e.g. Royal Enfield' },
  { key: 'bike_model', icon: 'bicycle-outline', placeholder: 'e.g. Himalayan 450' },
];

export default function SignupScreen({ navigation }) {
  const { register } = useAuth();
  const [form, setForm] = useState({
    username: '', display_name: '', email: '', password: '', password2: '',
    bike_make: '', bike_model: '', riding_style: '', experience_level: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const scrollRef = useRef(null);
  const fieldRefs = useRef({});

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
        {field.key.replace(/_/g, ' ').toUpperCase()}
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
          autoCapitalize="none"
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
        <Text style={styles.title}>Create Account</Text>
        <Text style={styles.subtitle}>Join the ride community</Text>

        {errors.general && (
          <View style={styles.generalError}>
            <Ionicons name="alert-circle" size={18} color="#e53935" />
            <Text style={styles.generalErrorText}>{errors.general}</Text>
          </View>
        )}

        {FIELDS.map(f => renderInput(f))}

        <View ref={el => { fieldRefs.current['riding_style'] = { current: el }; }} style={styles.inputGroup}>
          <Text style={styles.label}>RIDING STYLE</Text>
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
          <Text style={styles.label}>EXPERIENCE</Text>
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
          disabled={loading}
          activeOpacity={0.8}
        >
          <Text style={styles.primaryButtonText}>{loading ? 'Creating...' : 'Create Account'}</Text>
        </TouchableOpacity>

        <View style={styles.divider}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>or</Text>
          <View style={styles.dividerLine} />
        </View>

        <TouchableOpacity style={styles.googleButton} activeOpacity={0.8}>
          <Ionicons name="logo-google" size={20} color={colors.onSurface} />
          <Text style={styles.googleButtonText}>Sign up with Google</Text>
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
  errorText: { ...typography.labelSm, color: '#e53935', marginTop: 6, marginLeft: 4 },
  generalError: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.stackSm,
    backgroundColor: 'rgba(229,57,53,0.1)', borderWidth: 1, borderColor: 'rgba(229,57,53,0.3)',
    borderRadius: borderRadius.lg, padding: spacing.stackMd, marginBottom: spacing.stackLg,
  },
  generalErrorText: { ...typography.bodyMd, color: '#e53935', flex: 1 },
  chipContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    paddingHorizontal: spacing.stackMd, paddingVertical: spacing.stackSm,
    borderRadius: borderRadius.lg, borderWidth: 1, borderColor: colors.outlineVariant,
    backgroundColor: colors.surfaceContainerLow,
  },
  chipActive: { backgroundColor: colors.primaryContainer, borderColor: colors.primaryContainer },
  chipText: { ...typography.labelTechnical, color: colors.onSurfaceVariant, fontSize: 12 },
  chipTextActive: { color: colors.onPrimaryContainer },
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
    height: spacing.touchTargetMin, borderWidth: 2, borderColor: colors.outlineVariant,
    borderRadius: borderRadius.lg, gap: spacing.stackSm,
  },
  googleButtonText: { ...typography.labelTechnical, color: colors.onSurface },
  footer: { padding: spacing.marginMobile, paddingBottom: spacing.stackLg, alignItems: 'center' },
  footerText: { ...typography.labelTechnical, color: colors.onSurfaceVariant },
  footerLink: { color: colors.primaryContainer },
});
