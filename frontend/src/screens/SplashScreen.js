import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Animated, Easing, Dimensions, TouchableOpacity, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS } from '../constants/theme';
import { useTheme } from '../context/ThemeContext';
import { Globe, RefreshCw, WifiOff } from 'lucide-react-native';
import { remoteLog } from '../services/api';

const { width } = Dimensions.get('window');

export default function SplashScreen() {
    const { themeColors, isDark } = useTheme();

    // Animation Values
    const rotateAnim = useRef(new Animated.Value(0)).current;
    const pulseAnim = useRef(new Animated.Value(1)).current;
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const textSlideAnim = useRef(new Animated.Value(20)).current;

    const [status, setStatus] = useState('Connecting to UniSphere...');
    const [showRetry, setShowRetry] = useState(false);

    useEffect(() => {
        // Star the animations
        console.log('[Splash] Animation starting...');
        Animated.parallel([
            // ... existing animations ...
            Animated.loop(
                Animated.timing(rotateAnim, {
                    toValue: 1,
                    duration: 3000,
                    easing: Easing.linear,
                    useNativeDriver: true,
                })
            ),
            Animated.loop(
                Animated.sequence([
                    Animated.timing(pulseAnim, {
                        toValue: 1.2,
                        duration: 1000,
                        easing: Easing.inOut(Easing.ease),
                        useNativeDriver: true,
                    }),
                    Animated.timing(pulseAnim, {
                        toValue: 1,
                        duration: 1000,
                        easing: Easing.inOut(Easing.ease),
                        useNativeDriver: true,
                    })
                ])
            ),
            Animated.timing(fadeAnim, {
                toValue: 1,
                duration: 800,
                delay: 300,
                useNativeDriver: true,
            }),
            Animated.timing(textSlideAnim, {
                toValue: 0,
                duration: 800,
                delay: 300,
                easing: Easing.out(Easing.back(1.5)),
                useNativeDriver: true,
            })
        ]).start();

        // Connection Diagnostic
        const timeout = setTimeout(() => {
            setStatus('Connection taking longer than expected...');
            setShowRetry(true);
            remoteLog('warn', 'Splash - Connection Timeout', { status: 'hanging' });
        }, 5000);

        return () => clearTimeout(timeout);
    }, []);

    // Interpolate rotation
    const spin = rotateAnim.interpolate({
        inputRange: [0, 1],
        outputRange: ['0deg', '360deg']
    });

    // Reverse spin for inner element to create counter-rotation effect
    const counterSpin = rotateAnim.interpolate({
        inputRange: [0, 1],
        outputRange: ['360deg', '0deg']
    });

    return (
        <View style={[styles.container, { backgroundColor: themeColors.bgDark }]}>
            <LinearGradient
                colors={[themeColors.bgDark, isDark ? '#02040a' : '#E2E8F0']}
                style={StyleSheet.absoluteFill}
            />

            <View style={styles.animationContainer}>
                {/* Outer Orbit Ring */}
                <Animated.View style={[
                    styles.orbitRing,
                    {
                        borderColor: themeColors.border,
                        transform: [{ rotate: spin }, { scale: 1.2 }]
                    }
                ]}>
                    <View style={[styles.satellite, { backgroundColor: themeColors.accentSecondary, top: -6, left: '50%', marginLeft: -6 }]} />
                    <View style={[styles.satellite, { backgroundColor: themeColors.accentPrimary, bottom: -6, left: '50%', marginLeft: -6 }]} />
                </Animated.View>

                {/* Inner Pulsing Core */}
                <Animated.View style={[
                    styles.coreContainer,
                    {
                        transform: [{ scale: pulseAnim }],
                        backgroundColor: isDark ? 'rgba(99, 102, 241, 0.2)' : 'rgba(99, 102, 241, 0.1)'
                    }
                ]}>
                    <LinearGradient
                        colors={[themeColors.accentPrimary, themeColors.accentSecondary]}
                        style={styles.coreGradient}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                    >
                        <Animated.View style={{ transform: [{ rotate: counterSpin }] }}>
                            <Globe color="white" size={32} strokeWidth={2.5} />
                        </Animated.View>
                    </LinearGradient>
                </Animated.View>
            </View>

            <Animated.View style={[styles.textContainer, { opacity: fadeAnim, transform: [{ translateY: textSlideAnim }] }]}>
                <Text style={[styles.title, { color: themeColors.textMain }]}>UniSphere</Text>
                <Text style={[styles.tagline, { color: themeColors.textDim }]}>Network. Together.</Text>

                <View style={styles.statusBox}>
                    <ActivityIndicator size="small" color={themeColors.accentPrimary} style={{ marginRight: 8 }} />
                    <Text style={[styles.statusText, { color: themeColors.textMuted }]}>{status}</Text>
                </View>

                {showRetry && (
                    <TouchableOpacity
                        style={[styles.retryBtn, { borderColor: themeColors.accentPrimary }]}
                        onPress={() => {
                            setStatus('Retrying connection...');
                            // We don't have a direct "retry" here, but we can signal the parent
                            // or just let them know it's a network issue.
                        }}
                    >
                        <WifiOff color={themeColors.accentPrimary} size={16} />
                        <Text style={[styles.retryText, { color: themeColors.accentPrimary }]}>Check Network Settings</Text>
                    </TouchableOpacity>
                )}
            </Animated.View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    animationContainer: {
        width: 200,
        height: 200,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 40,
    },
    orbitRing: {
        width: 140,
        height: 140,
        borderRadius: 70,
        borderWidth: 1,
        borderStyle: 'dashed',
        position: 'absolute',
        justifyContent: 'center',
        alignItems: 'center',
    },
    satellite: {
        width: 12,
        height: 12,
        borderRadius: 6,
        position: 'absolute',
    },
    coreContainer: {
        width: 80,
        height: 80,
        borderRadius: 40,
        justifyContent: 'center',
        alignItems: 'center',
        // Glow effect
        shadowColor: COLORS.accentPrimary,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.5,
        shadowRadius: 20,
        elevation: 10,
    },
    coreGradient: {
        width: 60,
        height: 60,
        borderRadius: 30,
        justifyContent: 'center',
        alignItems: 'center',
    },
    textContainer: {
        alignItems: 'center',
    },
    title: {
        fontSize: 36,
        fontWeight: '900',
        marginBottom: 8,
        letterSpacing: -1,
    },
    tagline: {
        fontSize: 16,
        fontWeight: '500',
        letterSpacing: 2,
        textTransform: 'uppercase',
        opacity: 0.7,
    }
});
