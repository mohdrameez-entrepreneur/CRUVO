import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Dimensions,
  Easing,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, typography, borderRadius } from '../theme';
import { versionAPI } from '../api';

const { width } = Dimensions.get('window');

const STAGES = [
  {
    tag: 'IGNITION',
    title: 'Warming Squad Engine',
    subtitle: 'Initializing secure local telemetry...',
    icon: 'flash-outline',
    color: '#F59E0B',
  },
  {
    tag: 'RADAR GRID',
    title: 'Calibrating Satellite Mesh',
    subtitle: 'Connecting to live GPS radar cluster...',
    icon: 'navigate-outline',
    color: '#0284C7',
  },
  {
    tag: 'ROUTE SYNC',
    title: 'Synchronizing Waypoints',
    subtitle: 'Loading live ride channels & hazard flags...',
    icon: 'sync-outline',
    color: '#8B5CF6',
  },
  {
    tag: 'HANDSHAKE',
    title: 'Establishing Connection',
    subtitle: 'Waking cloud server (Render spin-up ~25s)...',
    icon: 'shield-checkmark-outline',
    color: '#F59E0B',
  },
  {
    tag: 'ONLINE',
    title: 'All Systems Go',
    subtitle: 'Telemetry engine ready • Have a great ride!',
    icon: 'checkmark-circle-outline',
    color: '#10B981',
  },
];

export default function PsychologicalLoadingScreen({ onFinish }) {
  const [stageIndex, setStageIndex] = useState(0);
  const [isConnected, setIsConnected] = useState(false);
  const [progressPercent, setProgressPercent] = useState(12);

  // Core Animations
  const cardFadeAnim = useRef(new Animated.Value(0)).current;
  const contentFadeAnim = useRef(new Animated.Value(1)).current;
  const orbitAnim = useRef(new Animated.Value(0)).current;
  const counterOrbitAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const progressAnim = useRef(new Animated.Value(0.12)).current;
  const successScaleAnim = useRef(new Animated.Value(1)).current;

  // 1. Initial fade-in, hypnotic orbital rotations, and progress bar drive
  useEffect(() => {
    // Card entry fade
    Animated.timing(cardFadeAnim, {
      toValue: 1,
      duration: 400,
      easing: Easing.out(Easing.ease),
      useNativeDriver: true,
    }).start();

    // Smooth continuous outer orbit rotation (3.6s loop)
    const orbitLoop = Animated.loop(
      Animated.timing(orbitAnim, {
        toValue: 1,
        duration: 3600,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );
    orbitLoop.start();

    // Smooth counter orbit rotation (5.4s loop)
    const counterLoop = Animated.loop(
      Animated.timing(counterOrbitAnim, {
        toValue: 1,
        duration: 5400,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );
    counterLoop.start();

    // Gentle hypnotic breathing pulse on inner halo
    const pulseLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.08,
          duration: 1400,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1400,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );
    pulseLoop.start();

    // Smooth gradual progress toward 92% over 38 seconds
    Animated.timing(progressAnim, {
      toValue: 0.92,
      duration: 38000,
      easing: Easing.bezier(0.1, 0.45, 0.25, 1),
      useNativeDriver: false,
    }).start();

    const progressListener = progressAnim.addListener(({ value }) => {
      setProgressPercent(Math.min(100, Math.floor(value * 100)));
    });

    return () => {
      orbitLoop.stop();
      counterLoop.stop();
      pulseLoop.stop();
      progressAnim.removeListener(progressListener);
    };
  }, []);

  // 2. Cycle stages smoothly while waiting
  useEffect(() => {
    if (isConnected) return;

    const interval = setInterval(() => {
      Animated.sequence([
        Animated.timing(contentFadeAnim, {
          toValue: 0,
          duration: 180,
          useNativeDriver: true,
        }),
        Animated.timing(contentFadeAnim, {
          toValue: 1,
          duration: 250,
          useNativeDriver: true,
        }),
      ]).start();

      setStageIndex((prev) => (prev + 1) % (STAGES.length - 1));
    }, 4500);

    return () => clearInterval(interval);
  }, [isConnected]);

  // 3. Background server health polling
  useEffect(() => {
    let isMounted = true;
    let pollTimer = null;
    let retryCount = 0;

    const pingServer = async () => {
      try {
        await versionAPI.getAppVersion();
        if (!isMounted) return;

        // Server responded!
        setIsConnected(true);
        setStageIndex(STAGES.length - 1);

        // Snap progress to 100%
        Animated.timing(progressAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: false,
        }).start();

        // Little spring celebration on success icon
        Animated.spring(successScaleAnim, {
          toValue: 1.15,
          friction: 4,
          tension: 60,
          useNativeDriver: true,
        }).start();

        // Hold success celebration then transition out
        setTimeout(() => {
          if (!isMounted) return;
          Animated.timing(cardFadeAnim, {
            toValue: 0,
            duration: 320,
            useNativeDriver: true,
          }).start(() => {
            if (onFinish) onFinish();
          });
        }, 950);
      } catch {
        retryCount += 1;
        // Fallback: enter app after ~30s if server is unreachable
        if (retryCount >= 12) {
          if (isMounted && onFinish) onFinish();
          return;
        }
        if (isMounted) {
          pollTimer = setTimeout(pingServer, 2400);
        }
      }
    };

    pollTimer = setTimeout(pingServer, 1200);

    return () => {
      isMounted = false;
      if (pollTimer) clearTimeout(pollTimer);
    };
  }, [onFinish]);

  const currentStage = STAGES[stageIndex];
  const activeColor = isConnected ? '#10B981' : currentStage.color;

  const orbitRotate = orbitAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const counterOrbitRotate = counterOrbitAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['360deg', '0deg'],
  });

  const progressWidth = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  return (
    <View style={styles.container}>
      <Animated.View
        style={[
          styles.contentCard,
          {
            opacity: cardFadeAnim,
          },
        ]}
      >
        {/* Top Minimal Brand Row */}
        <View style={styles.header}>
          <Image
            source={require('../../assets/cruvo_logo.png')}
            style={styles.logoImage}
            resizeMode="contain"
          />
          <View style={styles.headerTextGroup}>
            <Text style={styles.brandTitle}>CRUVO</Text>
            <Text style={styles.brandSubtitle}>RIDER TELEMETRY</Text>
          </View>
          <View style={[styles.statusBadge, { borderColor: `${activeColor}40` }]}>
            <View style={[styles.statusDot, { backgroundColor: activeColor }]} />
            <Text style={[styles.statusText, { color: activeColor }]}>
              {isConnected ? 'ONLINE' : 'CONNECTING'}
            </Text>
          </View>
        </View>

        {/* Center Minimal Hypnotic Orbit */}
        <View style={styles.orbitContainer}>
          {/* Subtle Outer Halo */}
          <Animated.View
            style={[
              styles.haloRing,
              {
                borderColor: `${activeColor}15`,
                backgroundColor: `${activeColor}06`,
                transform: [{ scale: pulseAnim }],
              },
            ]}
          />

          {/* Outer Orbit Track & Glowing Bead */}
          <Animated.View
            style={[
              styles.orbitTrack,
              {
                borderColor: isConnected ? 'rgba(16, 185, 129, 0.4)' : '#E2E8F0',
                transform: [{ rotate: orbitRotate }],
              },
            ]}
          >
            <View style={[styles.orbitBead, { backgroundColor: activeColor }]} />
          </Animated.View>

          {/* Inner Counter Orbit Track & Smaller Bead */}
          <Animated.View
            style={[
              styles.innerOrbitTrack,
              {
                borderColor: isConnected ? 'rgba(16, 185, 129, 0.25)' : 'rgba(226, 232, 240, 0.7)',
                transform: [{ rotate: counterOrbitRotate }],
              },
            ]}
          >
            <View
              style={[
                styles.innerOrbitBead,
                { backgroundColor: isConnected ? '#10B981' : '#F59E0B' },
              ]}
            />
          </Animated.View>

          {/* Center Glass Disc with Stage Icon */}
          <Animated.View
            style={[
              styles.centerDisc,
              {
                borderColor: isConnected ? 'rgba(16, 185, 129, 0.5)' : '#E2E8F0',
                transform: [{ scale: isConnected ? successScaleAnim : 1 }],
              },
            ]}
          >
            <Ionicons
              name={isConnected ? 'checkmark' : currentStage.icon}
              size={30}
              color={activeColor}
            />
          </Animated.View>
        </View>

        {/* Stage Typography with Smooth Crossfade */}
        <Animated.View
          style={[
            styles.stageInfo,
            {
              opacity: contentFadeAnim,
            },
          ]}
        >
          <View style={[styles.stageTagWrap, { backgroundColor: `${activeColor}15` }]}>
            <Text style={[styles.stageTag, { color: activeColor }]}>
              {currentStage.tag}
            </Text>
          </View>
          <Text style={styles.stageTitle}>{currentStage.title}</Text>
          <Text style={styles.stageSubtitle}>{currentStage.subtitle}</Text>
        </Animated.View>

        {/* Minimal Progress Bar */}
        <View style={styles.progressSection}>
          <View style={styles.progressTrack}>
            <Animated.View
              style={[
                styles.progressBarFill,
                {
                  width: progressWidth,
                  backgroundColor: activeColor,
                },
              ]}
            />
          </View>
          <View style={styles.progressMeta}>
            <Text style={styles.progressMetaLabel}>
              {isConnected ? 'Handshake established' : 'Syncing telemetry grid'}
            </Text>
            <Text style={[styles.progressMetaValue, { color: activeColor }]}>
              {progressPercent}%
            </Text>
          </View>
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  contentCard: {
    width: Math.min(width - 32, 380),
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    paddingVertical: 28,
    paddingHorizontal: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#0A192F',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.06,
    shadowRadius: 24,
    elevation: 4,
  },
  header: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 26,
  },
  logoImage: {
    width: 32,
    height: 32,
    borderRadius: 8,
  },
  headerTextGroup: {
    flex: 1,
    marginLeft: 10,
  },
  brandTitle: {
    fontFamily: 'Inter_700Bold',
    fontWeight: '700',
    fontSize: 16,
    color: '#0A192F',
    letterSpacing: 1.5,
  },
  brandSubtitle: {
    fontFamily: 'Inter_400Regular',
    fontSize: 9,
    color: '#64748B',
    letterSpacing: 1.2,
    marginTop: 1,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 12,
    borderWidth: 1,
    backgroundColor: '#F8F9FA',
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 6,
  },
  statusText: {
    fontFamily: 'Inter_600SemiBold',
    fontWeight: '600',
    fontSize: 10,
    letterSpacing: 0.8,
  },
  orbitContainer: {
    width: 170,
    height: 170,
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 14,
  },
  haloRing: {
    position: 'absolute',
    width: 168,
    height: 168,
    borderRadius: 84,
    borderWidth: 1,
  },
  orbitTrack: {
    position: 'absolute',
    width: 144,
    height: 144,
    borderRadius: 72,
    borderWidth: 1,
    justifyContent: 'flex-start',
    alignItems: 'center',
  },
  orbitBead: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginTop: -5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  innerOrbitTrack: {
    position: 'absolute',
    width: 104,
    height: 104,
    borderRadius: 52,
    borderWidth: 1,
    justifyContent: 'flex-start',
    alignItems: 'center',
  },
  innerOrbitBead: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginTop: -3,
  },
  centerDisc: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#0A192F',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 3,
  },
  stageInfo: {
    alignItems: 'center',
    marginTop: 18,
    marginBottom: 22,
    minHeight: 74,
  },
  stageTagWrap: {
    paddingVertical: 3,
    paddingHorizontal: 10,
    borderRadius: 8,
    marginBottom: 8,
  },
  stageTag: {
    fontFamily: 'Inter_600SemiBold',
    fontWeight: '600',
    fontSize: 9,
    letterSpacing: 1,
  },
  stageTitle: {
    fontFamily: 'Inter_700Bold',
    fontWeight: '700',
    fontSize: 17,
    color: '#0A192F',
    marginBottom: 4,
    textAlign: 'center',
  },
  stageSubtitle: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    color: '#64748B',
    textAlign: 'center',
    paddingHorizontal: 12,
  },
  progressSection: {
    width: '100%',
    marginTop: 4,
  },
  progressTrack: {
    width: '100%',
    height: 5,
    borderRadius: 3,
    backgroundColor: '#E2E8F0',
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  progressMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  progressMetaLabel: {
    fontFamily: 'Inter_400Regular',
    fontSize: 11,
    color: '#64748B',
  },
  progressMetaValue: {
    fontFamily: 'Inter_600SemiBold',
    fontWeight: '600',
    fontSize: 12,
  },
});
