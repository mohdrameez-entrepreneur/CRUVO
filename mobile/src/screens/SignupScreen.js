import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography, borderRadius } from '../theme';
import { useAuth } from '../context/AuthContext';

const RIDING_STYLES = ['ADVENTURE', 'SPORT', 'TOURING', 'CRUISE', 'COMMUTE'];
const EXPERIENCE_LEVELS = ['BEGINNER', 'INTERMEDIATE', 'VETERAN', 'EXPERT'];

export default function SignupScreen({ navigation }) {
  const { register } = useAuth();
  const [form, setForm] = useState({
    username: '', display_name: '', email: '', password: '', password2: '',
    bike_make: '', bike_model: '', riding_style: '', experience_level: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const update = (key, value) => setForm(prev => ({ ...prev, [key]: value }));

  const handleSignup = async () => {
    if (!form.username || !form.display_name || !form.email || !form.password || !form.password2) {
      Alert.alert('Error', 'Please fill in required fields');
      return;
    }
    setLoading(true);
    try {
      await register(form);
    } catch (err) {
      console.log('SIGNUP ERROR:', err.message, err.code, err.response?.status, err.response?.data);
      const msg = err.response?.data;
      if (msg && typeof msg === 'object') {
        const firstError = Object.values(msg)[0];
        Alert.alert('Error', Array.isArray(firstError) ? firstError[0] : firstError);
      } else {
        Alert.alert('Error', `Network error: ${err.message || 'Could not reach server'}`);
      }
    } finally {
      setLoading(false);
    }
  };

  const renderInput = (icon, key, placeholder, options = {}) => (
    <View style={styles.inputGroup}>
      <Text style={styles.label}>{key.replace(/_/g, ' ').toUpperCase()}</Text>
      <View style={styles.inputContainer}>
        <Ionicons name={icon} size={20} color={colors.onSurfaceVariant} style={styles.inputIcon} />
        <TextInput
          style={styles.input}
          placeholder={placeholder}
          placeholderTextColor={colors.outline}
          value={form[key]}
          onChangeText={(v) => update(key, v)}
          secureTextEntry={options.secure && !showPassword}
          keyboardType={options.keyboardType || 'default'}
          autoCapitalize="none"
        />
        {options.secure && (
          <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeButton}>
            <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={20} color={colors.onSurfaceVariant} />
          </TouchableOpacity>
        )}
      </View>
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

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        <Text style={styles.title}>Create Account</Text>
        <Text style={styles.subtitle}>Join the ride community</Text>

        {renderInput('at-outline', 'username', 'Choose a unique username', { autoCapitalize: 'none' })}
        {renderInput('person-outline', 'display_name', 'Your name')}
        {renderInput('mail-outline', 'email', 'rider@cruvo.app', { keyboardType: 'email-address' })}
        {renderInput('lock-closed-outline', 'password', 'Create password', { secure: true })}
        {renderInput('lock-closed-outline', 'password2', 'Confirm password', { secure: true })}
        {renderInput('motorcycle-outline', 'bike_make', 'e.g. Royal Enfield')}
        {renderInput('bicycle-outline', 'bike_model', 'e.g. Himalayan 450')}

        <View style={styles.inputGroup}>
          <Text style={styles.label}>RIDING STYLE</Text>
          <View style={styles.chipContainer}>
            {RIDING_STYLES.map(style => (
              <TouchableOpacity
                key={style}
                style={[styles.chip, form.riding_style === style && styles.chipActive]}
                onPress={() => update('riding_style', form.riding_style === style ? '' : style)}
              >
                <Text style={[styles.chipText, form.riding_style === style && styles.chipTextActive]}>{style}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.inputGroup}>
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
  inputContainer: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surfaceContainerLowest,
    borderWidth: 1, borderColor: colors.outlineVariant, borderRadius: borderRadius.lg,
    height: spacing.touchTargetMin, paddingHorizontal: spacing.stackMd,
  },
  inputIcon: { marginRight: spacing.stackSm },
  input: { flex: 1, ...typography.bodyMd, color: colors.onSurface },
  eyeButton: { padding: spacing.stackSm },
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
