import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  ScrollView, ActivityIndicator, Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography, borderRadius, scale, moderateScale } from '../theme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { authAPI } from '../api';
import AlertCard from '../components/AlertCard';

const STEPS = { EMAIL: 0, OTP: 1, RESET: 2, SUCCESS: 3 };
const OTP_LENGTH = 6;
const OTP_TTL_SECONDS = 15 * 60;

export default function ForgotPasswordScreen({ navigation }) {
  const insets = useSafeAreaInsets();

  const [step, setStep] = useState(STEPS.EMAIL);
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [resetToken, setResetToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPw, setShowNewPw] = useState(false);
  const [showConfirmPw, setShowConfirmPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [countdown, setCountdown] = useState(OTP_TTL_SECONDS);
  const [canResend, setCanResend] = useState(false);

  const otpRefs = useRef([]);
  const countdownRef = useRef(null);
  const slideAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (step === STEPS.OTP) {
      setCountdown(OTP_TTL_SECONDS);
      setCanResend(false);
      countdownRef.current = setInterval(() => {
        setCountdown(prev => {
          if (prev <= 1) {
            clearInterval(countdownRef.current);
            setCanResend(true);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(countdownRef.current);
  }, [step]);

  const animateStep = useCallback(() => {
    slideAnim.setValue(40);
    Animated.spring(slideAnim, {
      toValue: 0, useNativeDriver: true, tension: 80, friction: 10,
    }).start();
  }, [slideAnim]);

  const formatCountdown = (secs) => {
    const m = Math.floor(secs / 60).toString().padStart(2, '0');
    const s = (secs % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const getPasswordStrength = (pw) => {
    if (!pw) return { label: '', color: colors.outlineVariant, width: '0%' };
    let score = 0;
    if (pw.length >= 8) score++;
    if (pw.length >= 12) score++;
    if (/[A-Z]/.test(pw)) score++;
    if (/[0-9]/.test(pw)) score++;
    if (/[^A-Za-z0-9]/.test(pw)) score++;
    if (score <= 1) return { label: 'Weak', color: '#e53935', width: '20%' };
    if (score <= 2) return { label: 'Fair', color: '#fb8c00', width: '45%' };
    if (score <= 3) return { label: 'Good', color: '#ffd600', width: '65%' };
    if (score <= 4) return { label: 'Strong', color: '#43a047', width: '85%' };
    return { label: 'Very Strong', color: '#00c853', width: '100%' };
  };

  const handleSendOTP = async () => {
    setError('');
    if (!email.trim()) { setError('Please enter your email address'); return; }
    if (!/\S+@\S+\.\S+/.test(email)) { setError('Please enter a valid email address'); return; }
    setLoading(true);
    try {
      await authAPI.forgotPasswordRequest({ email: email.trim().toLowerCase() });
      setStep(STEPS.OTP);
      animateStep();
      setTimeout(() => otpRefs.current[0]?.focus(), 300);
    } catch (err) {
      if (!err.response) {
        setError('Could not reach the server. Check your internet connection and try again.');
      } else if (err.response.status === 500) {
        setError('Server error. Please try again in a moment.');
      } else {
        setError(err.response?.data?.error || err.response?.data?.detail || 'Failed to send reset code. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleOtpChange = (val, index) => {
    const cleaned = val.replace(/[^0-9]/g, '');
    const newOtp = [...otp];
    if (cleaned.length > 1) {
      const pasted = cleaned.slice(0, OTP_LENGTH - index);
      pasted.split('').forEach((ch, i) => { newOtp[index + i] = ch; });
      setOtp(newOtp);
      const nextIndex = Math.min(index + pasted.length, OTP_LENGTH - 1);
      otpRefs.current[nextIndex]?.focus();
      return;
    }
    newOtp[index] = cleaned;
    setOtp(newOtp);
    if (cleaned && index < OTP_LENGTH - 1) {
      otpRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyPress = ({ nativeEvent }, index) => {
    if (nativeEvent.key === 'Backspace' && !otp[index] && index > 0) {
      const newOtp = [...otp];
      newOtp[index - 1] = '';
      setOtp(newOtp);
      otpRefs.current[index - 1]?.focus();
    }
  };

  const handleVerifyOTP = async () => {
    setError('');
    const otpStr = otp.join('');
    if (otpStr.length < OTP_LENGTH) { setError('Please enter all 6 digits'); return; }
    setLoading(true);
    try {
      const res = await authAPI.forgotPasswordVerify({ email: email.trim().toLowerCase(), otp: otpStr });
      setResetToken(res.data.reset_token);
      setStep(STEPS.RESET);
      animateStep();
    } catch (err) {
      if (!err.response) {
        setError('Could not reach the server. Check your internet connection.');
      } else if (err.response.status === 400) {
        setError(err.response.data?.error || 'Incorrect or expired code. Please try again.');
        setOtp(['', '', '', '', '', '']);
        setTimeout(() => otpRefs.current[0]?.focus(), 100);
      } else {
        setError('Verification failed. Please request a new code.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setError('');
    setOtp(['', '', '', '', '', '']);
    setCanResend(false);
    setLoading(true);
    try {
      await authAPI.forgotPasswordRequest({ email: email.trim().toLowerCase() });
      setCountdown(OTP_TTL_SECONDS);
      countdownRef.current = setInterval(() => {
        setCountdown(prev => {
          if (prev <= 1) { clearInterval(countdownRef.current); setCanResend(true); return 0; }
          return prev - 1;
        });
      }, 1000);
      setTimeout(() => otpRefs.current[0]?.focus(), 300);
    } catch {
      setCanResend(true);
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async () => {
    setError('');
    if (!newPassword) { setError('Please enter a new password'); return; }
    if (newPassword.length < 8) { setError('Password must be at least 8 characters'); return; }
    if (newPassword !== confirmPassword) { setError('Passwords do not match'); return; }
    setLoading(true);
    try {
      await authAPI.forgotPasswordReset({
        reset_token: resetToken,
        new_password: newPassword,
        confirm_password: confirmPassword,
      });
      setStep(STEPS.SUCCESS);
      animateStep();
    } catch (err) {
      if (!err.response) {
        setError('Could not reach the server. Check your internet connection.');
      } else if (err.response.status === 400) {
        setError(err.response.data?.error || 'Reset failed. The session may have expired — please start over.');
      } else {
        setError('Something went wrong. Please go back and start over.');
      }
    } finally {
      setLoading(false);
    }
  };

  const strength = getPasswordStrength(newPassword);

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: Math.max(insets.top, spacing.stackLg) }]}>
        <TouchableOpacity
          onPress={() => step === STEPS.EMAIL || step === STEPS.SUCCESS ? navigation.goBack() : setStep(s => s - 1)}
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={24} color={colors.onSurface} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>CRUVO</Text>
        <View style={styles.backButton} />
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        <View style={styles.stepPills}>
          {[STEPS.EMAIL, STEPS.OTP, STEPS.RESET].map(s => (
            <View key={s} style={[styles.pill, step >= s ? styles.pillActive : styles.pillInactive]} />
          ))}
        </View>

        <Animated.View style={{ transform: [{ translateY: slideAnim }] }}>

          {/* STEP 0: EMAIL */}
          {step === STEPS.EMAIL && (
            <>
              <View style={styles.iconCircle}>
                <Ionicons name="lock-open-outline" size={32} color={colors.primaryContainer} />
              </View>
              <Text style={styles.title}>Forgot password?</Text>
              <Text style={styles.subtitle}>
                Enter the email tied to your account and we'll send you a 6-digit reset code.
              </Text>
              {!!error && (
                <AlertCard type="error" title="Error" message={error}
                  onDismiss={() => setError('')} style={{ marginBottom: spacing.stackMd }} />
              )}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>EMAIL ADDRESS</Text>
                <View style={styles.inputContainer}>
                  <Ionicons name="mail-outline" size={20} color={colors.onSurfaceVariant} style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="Enter your email"
                    placeholderTextColor={colors.outline}
                    value={email}
                    onChangeText={v => { setEmail(v); setError(''); }}
                    autoCapitalize="none"
                    keyboardType="email-address"
                    autoComplete="email"
                    returnKeyType="send"
                    onSubmitEditing={handleSendOTP}
                  />
                </View>
              </View>
              <TouchableOpacity
                style={[styles.primaryButton, loading && styles.buttonDisabled]}
                onPress={handleSendOTP}
                disabled={loading}
                activeOpacity={0.8}
              >
                {loading
                  ? <ActivityIndicator size="small" color={colors.onPrimaryContainer} />
                  : <Text style={styles.primaryButtonText}>Send Reset Code</Text>
                }
              </TouchableOpacity>
            </>
          )}

          {/* STEP 1: OTP */}
          {step === STEPS.OTP && (
            <>
              <View style={styles.iconCircle}>
                <Ionicons name="keypad-outline" size={32} color={colors.primaryContainer} />
              </View>
              <Text style={styles.title}>Check your email</Text>
              <Text style={styles.subtitle}>
                We sent a 6-digit code to{'\n'}
                <Text style={styles.emailHighlight}>{email}</Text>
              </Text>
              {!!error && (
                <AlertCard type="error" title="Error" message={error}
                  onDismiss={() => setError('')} style={{ marginBottom: spacing.stackMd }} />
              )}
              <View style={styles.otpRow}>
                {otp.map((digit, i) => (
                  <TextInput
                    key={i}
                    ref={ref => { otpRefs.current[i] = ref; }}
                    style={[styles.otpBox, digit ? styles.otpBoxFilled : null]}
                    value={digit}
                    onChangeText={v => handleOtpChange(v, i)}
                    onKeyPress={e => handleOtpKeyPress(e, i)}
                    keyboardType="number-pad"
                    maxLength={6}
                    selectTextOnFocus
                    caretHidden
                    textContentType="oneTimeCode"
                  />
                ))}
              </View>
              <View style={styles.countdownRow}>
                {canResend ? (
                  <TouchableOpacity onPress={handleResend} disabled={loading}>
                    <Text style={styles.resendLink}>{loading ? 'Resending...' : 'Resend code'}</Text>
                  </TouchableOpacity>
                ) : (
                  <Text style={styles.countdownText}>
                    Code expires in{' '}
                    <Text style={[styles.countdownTimer, countdown < 60 && styles.countdownTimerUrgent]}>
                      {formatCountdown(countdown)}
                    </Text>
                  </Text>
                )}
              </View>
              <TouchableOpacity
                style={[styles.primaryButton, (loading || otp.join('').length < 6) && styles.buttonDisabled]}
                onPress={handleVerifyOTP}
                disabled={loading || otp.join('').length < 6}
                activeOpacity={0.8}
              >
                {loading
                  ? <ActivityIndicator size="small" color={colors.onPrimaryContainer} />
                  : <Text style={styles.primaryButtonText}>Verify Code</Text>
                }
              </TouchableOpacity>
            </>
          )}

          {/* STEP 2: NEW PASSWORD */}
          {step === STEPS.RESET && (
            <>
              <View style={styles.iconCircle}>
                <Ionicons name="shield-checkmark-outline" size={32} color={colors.primaryContainer} />
              </View>
              <Text style={styles.title}>Set new password</Text>
              <Text style={styles.subtitle}>
                Choose a strong password you haven't used before.
              </Text>
              {!!error && (
                <AlertCard type="error" title="Error" message={error}
                  onDismiss={() => setError('')} style={{ marginBottom: spacing.stackMd }} />
              )}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>NEW PASSWORD</Text>
                <View style={styles.inputContainer}>
                  <Ionicons name="lock-closed-outline" size={20} color={colors.onSurfaceVariant} style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="At least 8 characters"
                    placeholderTextColor={colors.outline}
                    value={newPassword}
                    onChangeText={v => { setNewPassword(v); setError(''); }}
                    secureTextEntry={!showNewPw}
                  />
                  <TouchableOpacity onPress={() => setShowNewPw(p => !p)} style={styles.eyeButton}>
                    <Ionicons name={showNewPw ? 'eye-off-outline' : 'eye-outline'} size={20} color={colors.onSurfaceVariant} />
                  </TouchableOpacity>
                </View>
                {newPassword.length > 0 && (
                  <View style={styles.strengthContainer}>
                    <View style={styles.strengthBarBg}>
                      <View style={[styles.strengthBarFill, { width: strength.width, backgroundColor: strength.color }]} />
                    </View>
                    <Text style={[styles.strengthLabel, { color: strength.color }]}>{strength.label}</Text>
                  </View>
                )}
              </View>
              <View style={styles.inputGroup}>
                <Text style={styles.label}>CONFIRM PASSWORD</Text>
                <View style={[styles.inputContainer,
                  confirmPassword && newPassword !== confirmPassword && styles.inputError
                ]}>
                  <Ionicons name="lock-closed-outline" size={20} color={colors.onSurfaceVariant} style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="Repeat your password"
                    placeholderTextColor={colors.outline}
                    value={confirmPassword}
                    onChangeText={v => { setConfirmPassword(v); setError(''); }}
                    secureTextEntry={!showConfirmPw}
                    returnKeyType="done"
                    onSubmitEditing={handleResetPassword}
                  />
                  <TouchableOpacity onPress={() => setShowConfirmPw(p => !p)} style={styles.eyeButton}>
                    <Ionicons name={showConfirmPw ? 'eye-off-outline' : 'eye-outline'} size={20} color={colors.onSurfaceVariant} />
                  </TouchableOpacity>
                </View>
                {confirmPassword && newPassword !== confirmPassword && (
                  <Text style={styles.errorText}>Passwords do not match</Text>
                )}
              </View>
              <TouchableOpacity
                style={[styles.primaryButton, loading && styles.buttonDisabled]}
                onPress={handleResetPassword}
                disabled={loading}
                activeOpacity={0.8}
              >
                {loading
                  ? <ActivityIndicator size="small" color={colors.onPrimaryContainer} />
                  : <Text style={styles.primaryButtonText}>Reset Password</Text>
                }
              </TouchableOpacity>
            </>
          )}

          {/* STEP 3: SUCCESS */}
          {step === STEPS.SUCCESS && (
            <View style={styles.successContainer}>
              <View style={styles.successIconRing}>
                <Ionicons name="checkmark" size={40} color={colors.primaryContainer} />
              </View>
              <Text style={styles.title}>Password reset!</Text>
              <Text style={styles.subtitle}>
                Your password has been updated. You can now sign in with your new credentials.
              </Text>
              <TouchableOpacity
                style={styles.primaryButton}
                onPress={() => navigation.navigate('Login')}
                activeOpacity={0.8}
              >
                <Text style={styles.primaryButtonText}>Sign In Now</Text>
              </TouchableOpacity>
            </View>
          )}

        </Animated.View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: spacing.marginMobile, paddingBottom: spacing.stackMd,
  },
  backButton: { width: scale(48), height: scale(48), justifyContent: 'center', alignItems: 'center' },
  headerTitle: {
    ...typography.displayLg, color: colors.primaryContainer,
    fontSize: moderateScale(24), textTransform: 'uppercase', letterSpacing: -0.8,
  },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: spacing.marginMobile, paddingBottom: spacing.stackLg },
  stepPills: { flexDirection: 'row', gap: moderateScale(8), marginBottom: spacing.stackLg },
  pill: { flex: 1, height: moderateScale(4), borderRadius: moderateScale(2) },
  pillActive: { backgroundColor: colors.primaryContainer },
  pillInactive: { backgroundColor: colors.outlineVariant },
  iconCircle: {
    width: moderateScale(64), height: moderateScale(64), borderRadius: moderateScale(32),
    backgroundColor: colors.surfaceContainerHigh, justifyContent: 'center', alignItems: 'center',
    marginBottom: spacing.stackMd, borderWidth: 1, borderColor: colors.outlineVariant,
  },
  title: { ...typography.headlineLgMobile, color: colors.onSurface, marginBottom: spacing.stackSm },
  subtitle: {
    ...typography.bodyMd, color: colors.onSurfaceVariant,
    marginBottom: spacing.stackLg, lineHeight: moderateScale(22),
  },
  emailHighlight: { color: colors.primaryContainer, fontWeight: '700' },
  inputGroup: { marginBottom: spacing.stackMd },
  label: { ...typography.labelTechnical, color: colors.onSurfaceVariant, marginBottom: spacing.stackSm },
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
  otpRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    marginBottom: spacing.stackMd, gap: moderateScale(8),
  },
  otpBox: {
    flex: 1, height: moderateScale(56), borderRadius: borderRadius.lg,
    backgroundColor: colors.surfaceContainerLowest, borderWidth: 1, borderColor: colors.outlineVariant,
    textAlign: 'center', color: colors.onSurface, fontSize: moderateScale(22), fontWeight: '800',
  },
  otpBoxFilled: { borderColor: colors.primaryContainer, backgroundColor: 'rgba(255,214,0,0.08)' },
  countdownRow: { alignItems: 'center', marginBottom: spacing.stackLg },
  countdownText: { ...typography.labelSm, color: colors.onSurfaceVariant },
  countdownTimer: { color: colors.primaryContainer, fontWeight: '700' },
  countdownTimerUrgent: { color: '#e53935' },
  resendLink: { ...typography.labelSm, color: colors.primaryContainer, fontWeight: '700' },
  strengthContainer: {
    flexDirection: 'row', alignItems: 'center',
    marginTop: moderateScale(8), gap: moderateScale(8),
  },
  strengthBarBg: {
    flex: 1, height: moderateScale(4), backgroundColor: colors.outlineVariant,
    borderRadius: moderateScale(2), overflow: 'hidden',
  },
  strengthBarFill: { height: '100%', borderRadius: moderateScale(2) },
  strengthLabel: { ...typography.labelSm, fontSize: moderateScale(11), minWidth: moderateScale(60) },
  primaryButton: {
    backgroundColor: colors.primaryContainer, height: spacing.touchTargetMin,
    borderRadius: borderRadius.lg, justifyContent: 'center', alignItems: 'center',
    marginBottom: spacing.stackMd, shadowColor: colors.black,
    shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.5, shadowRadius: 0, elevation: 4,
  },
  buttonDisabled: { opacity: 0.5 },
  primaryButtonText: { ...typography.titleMd, color: colors.onPrimaryContainer, textTransform: 'uppercase' },
  successContainer: { alignItems: 'flex-start' },
  successIconRing: {
    width: moderateScale(80), height: moderateScale(80), borderRadius: moderateScale(40),
    backgroundColor: 'rgba(255,214,0,0.12)', justifyContent: 'center', alignItems: 'center',
    marginBottom: spacing.stackMd, borderWidth: 2, borderColor: colors.primaryContainer,
  },
});
