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
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { colors, spacing, typography, borderRadius, moderateScale } from '../theme';
import { versionAPI } from '../api';

const { width } = Dimensions.get('window');

// Psychological stage progressions (Operational transparency technique)
const PSYCHOLOGICAL_STAGES = [
  {
    id: 'telemetry',
    shapeType: 'hexagon',
    iconFamily: 'Ionicons',
    iconName: 'flash',
    title: 'Warming Up Telemetry Engine',
    subtitle: 'Tuning encrypted squad frequencies...',
    stageLabel: 'IGNITION',
    accentColor: '#FFD600',
    subLabel: 'FREQ: 433.92 MHz • CORE ARMED',
  },
  {
    id: 'satellite',
    shapeType: 'satellite',
    iconFamily: 'MaterialCommunityIcons',
    iconName: 'satellite-variant',
    title: 'Connecting to Satellite Grid',
    subtitle: 'Calibrating high-precision GPS radar...',
    stageLabel: 'GPS ORBIT',
    accentColor: '#00E5FF',
    subLabel: 'SATELLITE FIX: 14/24 LOCKING',
  },
  {
    id: 'cloud',
    shapeType: 'cloud',
    iconFamily: 'MaterialCommunityIcons',
    iconName: 'server-network',
    title: 'Starting Cloud Cluster',
    subtitle: 'Waking server from deep sleep (Render ~45s)...',
    stageLabel: 'CLUSTER',
    accentColor: '#FF9100',
    subLabel: 'RENDER INSTANCE: SPINNING UP',
  },
  {
    id: 'radar',
    shapeType: 'radar',
    iconFamily: 'MaterialCommunityIcons',
    iconName: 'radar',
    title: 'Syncing Group Routes',
    subtitle: 'Preparing live waypoints & hazard flags...',
    stageLabel: 'WAYPOINTS',
    accentColor: '#00E676',
    subLabel: 'TELEMETRY MESH: SYNCHRONIZING',
  },
  {
    id: 'speedometer',
    shapeType: 'speedo',
    iconFamily: 'MaterialCommunityIcons',
    iconName: 'gauge',
    title: 'Engine Firing Up',
    subtitle: 'Establishing real-time WebSocket connection...',
    stageLabel: 'THROTTLE',
    accentColor: '#FF1744',
    subLabel: 'WEBSOCKET: PINGING HOST',
  },
  {
    id: 'shield',
    shapeType: 'shield',
    iconFamily: 'Ionicons',
    iconName: 'shield-checkmark',
    title: 'Almost Ready to Roll',
    subtitle: 'Finalizing secure telemetry handshake...',
    stageLabel: 'HANDSHAKE',
    accentColor: '#D500F9',
    subLabel: 'TLS 1.3 • AES-256 ENCRYPTION',
  },
  {
    id: 'connected',
    shapeType: 'ready',
    iconFamily: 'Ionicons',
    iconName: 'checkmark-circle',
    title: 'Server Online & Connected!',
    subtitle: 'Telemetry engine ready • Have a great ride!',
    stageLabel: 'LIVE',
    accentColor: '#4CAF50',
    subLabel: 'SQUAD RADAR ACTIVE • ALL SYSTEMS GO',
  },
];

export default function PsychologicalLoadingScreen({ onFinish }) {
  const [stageIndex, setStageIndex] = useState(0);
  const [isConnected, setIsConnected] = useState(false);
  const [progressPercent, setProgressPercent] = useState(8);

  // Animations
  const cardScaleAnim = useRef(new Animated.Value(0.92)).current;
  const cardFadeAnim = useRef(new Animated.Value(0)).current;
  const contentFadeAnim = useRef(new Animated.Value(1)).current;
  const stageShapeScale = useRef(new Animated.Value(1)).current;
  const progressAnim = useRef(new Animated.Value(0.08)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const waveAnim1 = useRef(new Animated.Value(0)).current;
  const waveAnim2 = useRef(new Animated.Value(0)).current;
  const needleAnim = useRef(new Animated.Value(0)).current;

  // 1. Initial Card Fade & Scale In
  useEffect(() => {
    Animated.parallel([
      Animated.timing(cardFadeAnim, {
        toValue: 1,
        duration: 450,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }),
      Animated.spring(cardScaleAnim, {
        toValue: 1,
        friction: 7,
        tension: 40,
        useNativeDriver: true,
      }),
    ]).start();

    // Pulse loop for active center shape
    const pulseLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.12, duration: 900, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 900, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ])
    );
    pulseLoop.start();

    // Continuous 360 rotation for radar / satellite orbits
    const rotateLoop = Animated.loop(
      Animated.timing(rotateAnim, {
        toValue: 1,
        duration: 4000,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );
    rotateLoop.start();

    // Continuous radar / satellite pulse waves
    const waveLoop1 = Animated.loop(
      Animated.timing(waveAnim1, {
        toValue: 1,
        duration: 2200,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      })
    );
    const waveLoop2 = Animated.loop(
      Animated.sequence([
        Animated.delay(1100),
        Animated.timing(waveAnim2, {
          toValue: 1,
          duration: 2200,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );
    waveLoop1.start();
    waveLoop2.start();

    // Speedometer needle sweep loop
    const needleLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(needleAnim, { toValue: 1, duration: 1200, easing: Easing.bezier(0.2, 0.8, 0.2, 1), useNativeDriver: true }),
        Animated.timing(needleAnim, { toValue: 0.15, duration: 1000, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ])
    );
    needleLoop.start();

    // Smooth estimated progress animation towards 94% over 45s (Render cold start duration)
    Animated.timing(progressAnim, {
      toValue: 0.94,
      duration: 45000,
      easing: Easing.bezier(0.1, 0.4, 0.25, 1),
      useNativeDriver: false,
    }).start();

    // Progress percentage numerical listener
    const listenerId = progressAnim.addListener(({ value }) => {
      setProgressPercent(Math.min(100, Math.floor(value * 100)));
    });

    return () => {
      pulseLoop.stop();
      rotateLoop.stop();
      waveLoop1.stop();
      waveLoop2.stop();
      needleLoop.stop();
      progressAnim.removeListener(listenerId);
    };
  }, []);

  // 2. Psychological Stage Rotation every 5 seconds (stages 0 to 5)
  useEffect(() => {
    if (isConnected) return;

    const interval = setInterval(() => {
      // Shape pop and cross-fade animation
      Animated.sequence([
        Animated.parallel([
          Animated.timing(contentFadeAnim, { toValue: 0, duration: 180, useNativeDriver: true }),
          Animated.timing(stageShapeScale, { toValue: 0.85, duration: 180, useNativeDriver: true }),
        ]),
        Animated.parallel([
          Animated.timing(contentFadeAnim, { toValue: 1, duration: 250, useNativeDriver: true }),
          Animated.spring(stageShapeScale, { toValue: 1, friction: 6, tension: 50, useNativeDriver: true }),
        ]),
      ]).start();

      setStageIndex(prev => {
        // Cycle stages 0 through 5 while waiting
        return (prev + 1) % (PSYCHOLOGICAL_STAGES.length - 1);
      });
    }, 5000);

    return () => clearInterval(interval);
  }, [isConnected]);

  // 3. Active Background Health Check to detect the exact moment server is alive
  useEffect(() => {
    let isMounted = true;
    let pollTimer = null;
    let retryCount = 0;

    const pingServer = async () => {
      try {
        await versionAPI.getAppVersion();
        if (!isMounted) return;

        // Server is online!
        setIsConnected(true);
        setStageIndex(6); // Final Success Stage

        // Snap progress to 100%
        Animated.timing(progressAnim, {
          toValue: 1,
          duration: 350,
          useNativeDriver: false,
        }).start();

        // Hold success celebration for 1.2s then trigger onFinish if passed
        setTimeout(() => {
          if (!isMounted) return;
          if (onFinish) {
            Animated.timing(cardFadeAnim, {
              toValue: 0,
              duration: 300,
              useNativeDriver: true,
            }).start(() => onFinish());
          }
        }, 1200);
      } catch {
        retryCount += 1;
        // Fallback: allow entering app after 12 retries (~30s) if offline
        if (retryCount >= 12) {
          if (isMounted && onFinish) {
            onFinish();
          }
          return;
        }
        // Still waking up, retry in 2.5 seconds
        if (isMounted) {
          pollTimer = setTimeout(pingServer, 2500);
        }
      }
    };

    // First ping after 1.5 seconds
    pollTimer = setTimeout(pingServer, 1500);

    return () => {
      isMounted = false;
      if (pollTimer) clearTimeout(pollTimer);
    };
  }, [onFinish]);

  const currentStage = PSYCHOLOGICAL_STAGES[stageIndex];
  const activeAccent = isConnected ? '#4CAF50' : currentStage.accentColor;

  const spin = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const needleRotate = needleAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['-90deg', '90deg'],
  });

  // Render stage-specific visual shapes
  const renderStageVisualShape = () => {
    switch (currentStage.shapeType) {
      case 'satellite':
        return (
          <View style={styles.shapeWrapper}>
            {/* Expanding Radar Wave 1 */}
            <Animated.View
              style={[
                styles.pulseWave,
                {
                  borderColor: currentStage.accentColor,
                  transform: [
                    {
                      scale: waveAnim1.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0.8, 2.2],
                      }),
                    },
                  ],
                  opacity: waveAnim1.interpolate({
                    inputRange: [0, 0.6, 1],
                    outputRange: [0.7, 0.3, 0],
                  }),
                },
              ]}
            />
            {/* Expanding Radar Wave 2 */}
            <Animated.View
              style={[
                styles.pulseWave,
                {
                  borderColor: currentStage.accentColor,
                  transform: [
                    {
                      scale: waveAnim2.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0.8, 2.2],
                      }),
                    },
                  ],
                  opacity: waveAnim2.interpolate({
                    inputRange: [0, 0.6, 1],
                    outputRange: [0.7, 0.3, 0],
                  }),
                },
              ]}
            />
            {/* Rotating Orbital Orbit Ring */}
            <Animated.View
              style={[
                styles.orbitRing,
                {
                  borderColor: `${currentStage.accentColor}55`,
                  transform: [{ rotate: spin }],
                },
              ]}
            >
              <View style={[styles.orbitDot, { backgroundColor: currentStage.accentColor }]} />
              <View style={[styles.orbitDotAlt, { backgroundColor: '#FFD600' }]} />
            </Animated.View>
            {/* Center Satellite Core */}
            <Animated.View
              style={[
                styles.shapeCoreHex,
                {
                  backgroundColor: `${currentStage.accentColor}18`,
                  borderColor: currentStage.accentColor,
                  transform: [{ scale: pulseAnim }],
                },
              ]}
            >
              <MaterialCommunityIcons name="satellite-variant" size={moderateScale(38)} color={currentStage.accentColor} />
            </Animated.View>
          </View>
        );

      case 'radar':
        return (
          <View style={styles.shapeWrapper}>
            {/* Concentric Radar Circles */}
            <View style={[styles.radarCircleOuter, { borderColor: `${currentStage.accentColor}33` }]}>
              <View style={[styles.radarCircleMid, { borderColor: `${currentStage.accentColor}55` }]} />
              <View style={[styles.radarCrossH, { backgroundColor: `${currentStage.accentColor}25` }]} />
              <View style={[styles.radarCrossV, { backgroundColor: `${currentStage.accentColor}25` }]} />
              {/* Rotating Sweep Arm Container */}
              <Animated.View
                style={[
                  styles.radarSweepContainer,
                  {
                    transform: [{ rotate: spin }],
                  },
                ]}
              >
                <View style={[styles.radarSweepArm, { backgroundColor: currentStage.accentColor }]} />
              </Animated.View>
              {/* Blips */}
              <View style={[styles.radarBlip1, { backgroundColor: currentStage.accentColor }]} />
              <View style={[styles.radarBlip2, { backgroundColor: '#FFD600' }]} />
            </View>
            <Animated.View
              style={[
                styles.shapeCoreHex,
                {
                  backgroundColor: `${currentStage.accentColor}20`,
                  borderColor: currentStage.accentColor,
                  transform: [{ scale: pulseAnim }],
                },
              ]}
            >
              <MaterialCommunityIcons name="radar" size={moderateScale(36)} color={currentStage.accentColor} />
            </Animated.View>
          </View>
        );

      case 'cloud':
        return (
          <View style={styles.shapeWrapper}>
            {/* Interconnected Node Matrix */}
            <Animated.View
              style={[
                styles.nodeRingContainer,
                {
                  transform: [{ rotate: spin }],
                },
              ]}
            >
              <View style={[styles.matrixNode, { top: 0, left: 45, backgroundColor: currentStage.accentColor }]} />
              <View style={[styles.matrixNode, { bottom: 0, right: 45, backgroundColor: currentStage.accentColor }]} />
              <View style={[styles.matrixNode, { top: 45, right: 0, backgroundColor: '#FFD600' }]} />
              <View style={[styles.matrixNode, { bottom: 45, left: 0, backgroundColor: '#00E5FF' }]} />
            </Animated.View>
            {/* Glowing Cloud Core */}
            <Animated.View
              style={[
                styles.shapeCoreHex,
                {
                  backgroundColor: `${currentStage.accentColor}18`,
                  borderColor: currentStage.accentColor,
                  transform: [{ scale: pulseAnim }],
                },
              ]}
            >
              <MaterialCommunityIcons name="server-network" size={moderateScale(38)} color={currentStage.accentColor} />
            </Animated.View>
          </View>
        );

      case 'speedo':
        return (
          <View style={styles.shapeWrapper}>
            {/* Speedometer Gauge Dial Arc */}
            <View style={[styles.gaugeDial, { borderColor: `${currentStage.accentColor}44` }]}>
              <View style={styles.gaugeTicksRow}>
                <View style={[styles.gaugeTick, { backgroundColor: '#00E676' }]} />
                <View style={[styles.gaugeTick, { backgroundColor: '#FFD600' }]} />
                <View style={[styles.gaugeTick, { backgroundColor: '#FF9100' }]} />
                <View style={[styles.gaugeTick, { backgroundColor: '#FF1744' }]} />
              </View>
              {/* Sweeping Needle Container */}
              <Animated.View
                style={[
                  styles.gaugeNeedleContainer,
                  {
                    transform: [{ rotate: needleRotate }],
                  },
                ]}
              >
                <View style={[styles.gaugeNeedle, { backgroundColor: currentStage.accentColor }]} />
              </Animated.View>
            </View>
            <Animated.View
              style={[
                styles.shapeCoreHex,
                {
                  backgroundColor: `${currentStage.accentColor}18`,
                  borderColor: currentStage.accentColor,
                  transform: [{ scale: pulseAnim }],
                },
              ]}
            >
              <MaterialCommunityIcons name="gauge" size={moderateScale(38)} color={currentStage.accentColor} />
            </Animated.View>
          </View>
        );

      case 'shield':
        return (
          <View style={styles.shapeWrapper}>
            {/* Cryptographic Rotating Perimeter */}
            <Animated.View
              style={[
                styles.cryptoShieldRing,
                {
                  borderColor: `${currentStage.accentColor}55`,
                  transform: [{ rotate: spin }],
                },
              ]}
            >
              <View style={[styles.cryptoKeyNode, { backgroundColor: currentStage.accentColor }]} />
              <View style={[styles.cryptoKeyNodeAlt, { backgroundColor: '#FFD600' }]} />
            </Animated.View>
            <Animated.View
              style={[
                styles.shapeCoreHex,
                {
                  backgroundColor: `${currentStage.accentColor}18`,
                  borderColor: currentStage.accentColor,
                  transform: [{ scale: pulseAnim }],
                },
              ]}
            >
              <Ionicons name="shield-checkmark" size={moderateScale(38)} color={currentStage.accentColor} />
            </Animated.View>
          </View>
        );

      case 'ready':
        return (
          <View style={styles.shapeWrapper}>
            <Animated.View
              style={[
                styles.pulseWave,
                {
                  borderColor: '#4CAF50',
                  transform: [
                    {
                      scale: waveAnim1.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0.8, 2.4],
                      }),
                    },
                  ],
                  opacity: waveAnim1.interpolate({
                    inputRange: [0, 0.6, 1],
                    outputRange: [0.8, 0.4, 0],
                  }),
                },
              ]}
            />
            <Animated.View
              style={[
                styles.shapeCoreHex,
                {
                  backgroundColor: 'rgba(76, 175, 80, 0.2)',
                  borderColor: '#4CAF50',
                  transform: [{ scale: 1.08 }],
                },
              ]}
            >
              <Ionicons name="checkmark-circle" size={moderateScale(42)} color="#4CAF50" />
            </Animated.View>
          </View>
        );

      case 'hexagon':
      default:
        return (
          <View style={styles.shapeWrapper}>
            {/* Pulsing Hex Core */}
            <Animated.View
              style={[
                styles.orbitRing,
                {
                  borderColor: `${currentStage.accentColor}44`,
                  borderStyle: 'dashed',
                  transform: [{ rotate: spin }],
                },
              ]}
            >
              <View style={[styles.orbitDot, { backgroundColor: currentStage.accentColor }]} />
            </Animated.View>
            <Animated.View
              style={[
                styles.shapeCoreHex,
                {
                  backgroundColor: `${currentStage.accentColor}18`,
                  borderColor: currentStage.accentColor,
                  transform: [{ scale: pulseAnim }],
                },
              ]}
            >
              <Ionicons name="flash" size={moderateScale(38)} color={currentStage.accentColor} />
            </Animated.View>
          </View>
        );
    }
  };

  return (
    <View style={styles.screenContainer}>
      {/* Background Ambient Glows */}
      <View style={styles.ambientGlow} />
      <View style={styles.ambientGlowSecondary} />

      <Animated.View
        style={[
          styles.mainCard,
          {
            opacity: cardFadeAnim,
            transform: [{ scale: cardScaleAnim }],
            borderColor: isConnected ? 'rgba(76, 175, 80, 0.5)' : 'rgba(255, 214, 0, 0.3)',
          },
        ]}
      >
        {/* Top Header with CRUVO LOGO.jpg */}
        <View style={styles.headerRow}>
          <View style={styles.logoBadge}>
            <Image
              source={require('../../assets/CRUVO LOGO.jpg')}
              style={styles.brandLogo}
              resizeMode="cover"
            />
          </View>

          <View style={styles.brandTextCol}>
            <Text style={styles.brandName}>CRUVO</Text>
            <Text style={styles.brandTagline}>SQUAD RADAR TELEMETRY</Text>
          </View>

          {/* Live Status Pill */}
          <View style={[styles.statusPill, isConnected && styles.statusPillConnected]}>
            <View style={[styles.statusDot, { backgroundColor: activeAccent }]} />
            <Text style={[styles.statusText, { color: activeAccent }]}>
              {isConnected ? 'ONLINE' : 'AWAKENING'}
            </Text>
          </View>
        </View>

        {/* Center Dynamic Shape Loading Stage */}
        <View style={styles.visualStageArea}>
          <Animated.View style={{ transform: [{ scale: stageShapeScale }] }}>
            {renderStageVisualShape()}
          </Animated.View>
        </View>

        {/* Psychological Stage Text with Cross-fade */}
        <Animated.View style={[styles.textStageContainer, { opacity: contentFadeAnim }]}>
          <View style={styles.stageChip}>
            <Text style={[styles.stageChipText, { color: activeAccent }]}>
              {currentStage.stageLabel}
            </Text>
          </View>

          <Text style={[styles.stageTitle, isConnected && { color: '#4CAF50' }]}>
            {isConnected ? 'Server Online & Connected!' : currentStage.title}
          </Text>

          <Text style={styles.stageSubtitle}>
            {isConnected ? 'Telemetry engine ready • Have a great ride!' : currentStage.subtitle}
          </Text>

          <Text style={[styles.telemetryReadout, { color: activeAccent }]}>
            {isConnected ? 'SYNC: 100% COMPLETE' : currentStage.subLabel}
          </Text>
        </Animated.View>

        {/* Multi-Shape Geometric Stage Progress Bar */}
        <View style={styles.multiShapeProgressWrapper}>
          <View style={styles.shapeNodesTrack}>
            {PSYCHOLOGICAL_STAGES.map((stg, idx) => {
              const isPast = stageIndex > idx || isConnected;
              const isCurrent = stageIndex === idx && !isConnected;

              let ShapeIconComponent = Ionicons;
              if (stg.iconFamily === 'MaterialCommunityIcons') {
                ShapeIconComponent = MaterialCommunityIcons;
              }

              return (
                <React.Fragment key={stg.id}>
                  {/* Geometric Shape Milestone */}
                  <View
                    style={[
                      styles.progressNodeShape,
                      isPast && {
                        backgroundColor: isConnected ? 'rgba(76, 175, 80, 0.3)' : 'rgba(255, 214, 0, 0.25)',
                        borderColor: isConnected ? '#4CAF50' : '#FFD600',
                      },
                      isCurrent && {
                        backgroundColor: `${stg.accentColor}33`,
                        borderColor: stg.accentColor,
                        transform: [{ scale: 1.18 }],
                      },
                    ]}
                  >
                    <ShapeIconComponent
                      name={stg.iconName}
                      size={moderateScale(11)}
                      color={
                        isCurrent
                          ? stg.accentColor
                          : isPast
                          ? isConnected
                            ? '#4CAF50'
                            : '#FFD600'
                          : 'rgba(255, 255, 255, 0.25)'
                      }
                    />
                  </View>

                  {/* Connecting Laser Conduits */}
                  {idx < PSYCHOLOGICAL_STAGES.length - 1 && (
                    <View style={styles.conduitLineTrack}>
                      <View
                        style={[
                          styles.conduitLineFill,
                          {
                            backgroundColor: isPast
                              ? isConnected
                                ? '#4CAF50'
                                : '#FFD600'
                              : 'rgba(255, 255, 255, 0.08)',
                          },
                        ]}
                      />
                    </View>
                  )}
                </React.Fragment>
              );
            })}
          </View>

          {/* Telemetry Progress Percentage Readout */}
          <View style={styles.progressBottomRow}>
            <Text style={styles.progressCounterText}>
              ESTIMATED TELEMETRY SYNC
            </Text>
            <Text style={[styles.progressCounterValue, { color: activeAccent }]}>
              {isConnected ? '100%' : `${progressPercent}%`}
            </Text>
          </View>
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  screenContainer: {
    flex: 1,
    backgroundColor: '#0D0E12',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.stackMd,
  },
  ambientGlow: {
    position: 'absolute',
    width: width * 0.9,
    height: width * 0.9,
    borderRadius: (width * 0.9) / 2,
    backgroundColor: 'rgba(255, 214, 0, 0.04)',
    top: '20%',
  },
  ambientGlowSecondary: {
    position: 'absolute',
    width: width * 0.7,
    height: width * 0.7,
    borderRadius: (width * 0.7) / 2,
    backgroundColor: 'rgba(0, 229, 255, 0.03)',
    bottom: '20%',
  },
  mainCard: {
    width: '100%',
    maxWidth: 390,
    backgroundColor: 'rgba(20, 22, 28, 0.96)',
    borderRadius: borderRadius.xl + 4,
    borderWidth: 1.5,
    paddingHorizontal: spacing.stackMd + 4,
    paddingVertical: spacing.stackLg - 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.75,
    shadowRadius: 24,
    elevation: 20,
    alignItems: 'center',
  },
  headerRow: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: spacing.stackSm + 4,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
  },
  logoBadge: {
    width: moderateScale(42),
    height: moderateScale(42),
    borderRadius: borderRadius.md,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 214, 0, 0.6)',
    overflow: 'hidden',
    backgroundColor: '#000',
  },
  brandLogo: {
    width: '100%',
    height: '100%',
  },
  brandTextCol: {
    flex: 1,
    marginLeft: spacing.stackSm + 2,
    justifyContent: 'center',
  },
  brandName: {
    ...typography.titleMd,
    fontFamily: 'HankenGrotesk_800ExtraBold',
    fontSize: moderateScale(16),
    color: '#FFF',
    letterSpacing: 1.2,
  },
  brandTagline: {
    fontFamily: 'JetBrainsMono_500Medium',
    fontSize: moderateScale(9),
    color: colors.primaryContainer,
    letterSpacing: 0.8,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 214, 0, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255, 214, 0, 0.3)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: borderRadius.sm,
    gap: 4,
  },
  statusPillConnected: {
    backgroundColor: 'rgba(76, 175, 80, 0.15)',
    borderColor: 'rgba(76, 175, 80, 0.4)',
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusText: {
    fontFamily: 'JetBrainsMono_500Medium',
    fontSize: moderateScale(9),
    fontWeight: '700',
    letterSpacing: 0.6,
  },
  visualStageArea: {
    height: moderateScale(150),
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: spacing.stackSm,
  },
  shapeWrapper: {
    width: moderateScale(130),
    height: moderateScale(130),
    justifyContent: 'center',
    alignItems: 'center',
  },
  shapeCoreHex: {
    width: moderateScale(80),
    height: moderateScale(80),
    borderRadius: borderRadius.lg + 4,
    borderWidth: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
    elevation: 8,
  },
  orbitRing: {
    position: 'absolute',
    width: moderateScale(122),
    height: moderateScale(122),
    borderRadius: moderateScale(61),
    borderWidth: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
  },
  orbitDot: {
    position: 'absolute',
    top: -5,
    width: 10,
    height: 10,
    borderRadius: 5,
    shadowColor: '#FFD600',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 6,
  },
  orbitDotAlt: {
    position: 'absolute',
    bottom: -4,
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  pulseWave: {
    position: 'absolute',
    width: moderateScale(90),
    height: moderateScale(90),
    borderRadius: moderateScale(45),
    borderWidth: 2,
  },
  radarCircleOuter: {
    position: 'absolute',
    width: moderateScale(124),
    height: moderateScale(124),
    borderRadius: moderateScale(62),
    borderWidth: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
  },
  radarCircleMid: {
    position: 'absolute',
    width: moderateScale(70),
    height: moderateScale(70),
    borderRadius: moderateScale(35),
    borderWidth: 1,
  },
  radarCrossH: {
    position: 'absolute',
    width: '100%',
    height: 1,
  },
  radarCrossV: {
    position: 'absolute',
    height: '100%',
    width: 1,
  },
  radarSweepContainer: {
    position: 'absolute',
    width: moderateScale(124),
    height: moderateScale(124),
    justifyContent: 'center',
    alignItems: 'center',
  },
  radarSweepArm: {
    position: 'absolute',
    top: 4,
    width: 2,
    height: moderateScale(58),
    borderRadius: 1,
  },
  radarBlip1: {
    position: 'absolute',
    top: 25,
    right: 32,
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  radarBlip2: {
    position: 'absolute',
    bottom: 30,
    left: 28,
    width: 5,
    height: 5,
    borderRadius: 2.5,
  },
  nodeRingContainer: {
    position: 'absolute',
    width: moderateScale(110),
    height: moderateScale(110),
  },
  matrixNode: {
    position: 'absolute',
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  gaugeDial: {
    position: 'absolute',
    width: moderateScale(120),
    height: moderateScale(120),
    borderRadius: moderateScale(60),
    borderWidth: 2,
    borderTopColor: 'transparent',
    justifyContent: 'center',
    alignItems: 'center',
  },
  gaugeTicksRow: {
    position: 'absolute',
    top: 10,
    flexDirection: 'row',
    gap: 8,
  },
  gaugeTick: {
    width: 4,
    height: 8,
    borderRadius: 2,
  },
  gaugeNeedleContainer: {
    position: 'absolute',
    width: moderateScale(120),
    height: moderateScale(120),
    justifyContent: 'center',
    alignItems: 'center',
  },
  gaugeNeedle: {
    position: 'absolute',
    top: 15,
    width: 3,
    height: moderateScale(42),
    borderRadius: 2,
  },
  cryptoShieldRing: {
    position: 'absolute',
    width: moderateScale(120),
    height: moderateScale(120),
    borderRadius: moderateScale(60),
    borderWidth: 1.5,
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cryptoKeyNode: {
    position: 'absolute',
    top: -5,
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  cryptoKeyNodeAlt: {
    position: 'absolute',
    bottom: -5,
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  textStageContainer: {
    width: '100%',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.stackSm,
  },
  stageChip: {
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    paddingHorizontal: 10,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    marginBottom: 2,
  },
  stageChipText: {
    fontFamily: 'JetBrainsMono_500Medium',
    fontSize: moderateScale(9.5),
    fontWeight: '800',
    letterSpacing: 1,
  },
  stageTitle: {
    fontFamily: 'HankenGrotesk_700Bold',
    fontSize: moderateScale(16.5),
    color: '#FFF',
    textAlign: 'center',
  },
  stageSubtitle: {
    fontFamily: 'Inter_400Regular',
    fontSize: moderateScale(12),
    color: colors.onSurfaceVariant,
    textAlign: 'center',
    lineHeight: moderateScale(16),
  },
  telemetryReadout: {
    fontFamily: 'JetBrainsMono_500Medium',
    fontSize: moderateScale(10),
    letterSpacing: 0.6,
    marginTop: 4,
    fontWeight: '600',
  },
  multiShapeProgressWrapper: {
    width: '100%',
    marginTop: spacing.stackMd,
    paddingTop: spacing.stackSm + 4,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.08)',
    gap: 8,
  },
  shapeNodesTrack: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
  },
  progressNodeShape: {
    width: moderateScale(22),
    height: moderateScale(22),
    borderRadius: moderateScale(6),
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  conduitLineTrack: {
    flex: 1,
    height: 2,
    marginHorizontal: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  conduitLineFill: {
    height: '100%',
    width: '100%',
  },
  progressBottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  progressCounterText: {
    fontFamily: 'JetBrainsMono_500Medium',
    fontSize: moderateScale(9.5),
    color: 'rgba(255, 255, 255, 0.45)',
    letterSpacing: 0.5,
  },
  progressCounterValue: {
    fontFamily: 'JetBrainsMono_500Medium',
    fontSize: moderateScale(11),
    fontWeight: '700',
    letterSpacing: 0.8,
  },
});
