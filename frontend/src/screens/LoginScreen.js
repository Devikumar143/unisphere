import React, { useState } from 'react';
import {
    StyleSheet,
    Text,
    View,
    TextInput,
    TouchableOpacity,
    Dimensions,
    KeyboardAvoidingView,
    Platform,
    ActivityIndicator,
    Alert
} from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { GraduationCap, ArrowRight, Eye, EyeOff } from 'lucide-react-native';
import { COLORS, SIZES, GLASS } from '../constants/theme';
import { useTheme } from '../context/ThemeContext';
import { loginUser } from '../services/api';

const { width } = Dimensions.get('window');

export default function LoginScreen({ onLogin, onGoToRegister }) {
    const { themeColors, isDark } = useTheme();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleLogin = async () => {
        if (!email || !password) {
            setError('Please enter both email and password');
            return;
        }

        setLoading(true);
        setError('');

        try {
            const data = await loginUser(email, password);
            // data.user contains the user info
            onLogin(data.user);
        } catch (err) {
            let errorMsg = err.message || 'Login failed';

            // Helpful hint for local network issues
            if (errorMsg.includes('Network request failed')) {
                errorMsg = "Unable to connect to server. Ensure your phone and PC are on the same Wi-Fi and the IP in api.js is correct.";
            }

            setError(errorMsg);
            Alert.alert("Login Failed", errorMsg);
        } finally {
            setLoading(false);
        }
    };

    return (
        <View style={[styles.container, { backgroundColor: themeColors.bgDark }]}>
            <LinearGradient
                colors={[themeColors.bgDark, isDark ? '#0a0d1d' : '#F1F5F9']}
                style={StyleSheet.absoluteFill}
            />

            {/* Background Decorative Blur */}
            <View style={[styles.glow, { backgroundColor: themeColors.accentPrimary }]} />

            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={styles.content}
            >
                <View style={styles.header}>
                    <View style={[styles.logoContainer, { backgroundColor: isDark ? 'rgba(99, 102, 241, 0.1)' : 'rgba(99, 102, 241, 0.2)', borderColor: 'rgba(99, 102, 241, 0.2)' }]}>
                        <GraduationCap color={themeColors.accentPrimary} size={48} strokeWidth={1.5} />
                    </View>
                    <Text style={[styles.title, { color: themeColors.textMain }]}>UniSphere</Text>
                    <Text style={[styles.subtitle, { color: themeColors.textMuted }]}>Your university, digitalized.</Text>
                </View>

                <BlurView intensity={GLASS.intensity} tint={isDark ? "dark" : "light"} style={[styles.loginCard, { borderColor: themeColors.border, backgroundColor: themeColors.bgCard }]}>
                    <Text style={[styles.inputLabel, { color: themeColors.textMuted }]}>Email or Username</Text>
                    <View style={[styles.inputContainer, { backgroundColor: themeColors.bgDark, borderColor: themeColors.border }]}>
                        <TextInput
                            style={[styles.input, { color: themeColors.textMain }]}
                            placeholder="name@university.edu or @username"
                            placeholderTextColor={themeColors.textDim}
                            keyboardType="email-address"
                            autoCapitalize="none"
                            value={email}
                            onChangeText={setEmail}
                        />
                    </View>

                    <Text style={[styles.inputLabel, { color: themeColors.textMuted }]}>Password</Text>
                    <View style={[styles.inputContainer, { backgroundColor: themeColors.bgDark, borderColor: themeColors.border, flexDirection: 'row', alignItems: 'center' }]}>
                        <TextInput
                            style={[styles.input, { color: themeColors.textMain, flex: 1 }]}
                            placeholder="••••••••"
                            placeholderTextColor={themeColors.textDim}
                            secureTextEntry={!showPassword}
                            value={password}
                            onChangeText={setPassword}
                        />
                        <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={{ padding: 10 }}>
                            {showPassword ? (
                                <EyeOff color={themeColors.textDim} size={20} />
                            ) : (
                                <Eye color={themeColors.textDim} size={20} />
                            )}
                        </TouchableOpacity>
                    </View>

                    {error ? <Text style={styles.errorText}>{error}</Text> : null}

                    <TouchableOpacity
                        style={styles.button}
                        onPress={handleLogin}
                        disabled={loading}
                    >
                        <LinearGradient
                            colors={[COLORS.accentPrimary, COLORS.accentSecondary]}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 0 }}
                            style={styles.buttonGradient}
                        >
                            {loading ? (
                                <ActivityIndicator color="white" />
                            ) : (
                                <>
                                    <Text style={styles.buttonText}>Connect</Text>
                                    <ArrowRight color="white" size={20} style={{ marginLeft: 8 }} />
                                </>
                            )}
                        </LinearGradient>
                    </TouchableOpacity>

                    <TouchableOpacity onPress={onGoToRegister} style={styles.footerBtn}>
                        <Text style={[styles.footerText, { color: themeColors.textDim }]}>
                            Don't have an account? <Text style={[styles.link, { color: themeColors.accentPrimary }]}>Register</Text>
                        </Text>
                    </TouchableOpacity>
                </BlurView>

                <Text style={[styles.footer, { color: themeColors.textDim }]}>
                    Exclusively for verified university students.
                </Text>
            </KeyboardAvoidingView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.bgDark,
    },
    glow: {
        position: 'absolute',
        top: -100,
        right: -100,
        width: 300,
        height: 300,
        borderRadius: 150,
        backgroundColor: COLORS.accentPrimary,
        opacity: 0.15,
    },
    content: {
        flex: 1,
        justifyContent: 'center',
        padding: SIZES.padding,
    },
    header: {
        alignItems: 'center',
        marginBottom: 40,
    },
    logoContainer: {
        width: 80,
        height: 80,
        borderRadius: 24,
        backgroundColor: 'rgba(99, 102, 241, 0.1)',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 16,
        borderWidth: 1,
        borderColor: 'rgba(99, 102, 241, 0.2)',
    },
    title: {
        fontSize: 36,
        fontWeight: '800',
        color: COLORS.textMain,
        letterSpacing: -1,
    },
    subtitle: {
        fontSize: 16,
        color: COLORS.textMuted,
        marginTop: 4,
    },
    loginCard: {
        padding: 24,
        borderRadius: SIZES.radiusLarge,
        overflow: 'hidden',
        borderWidth: GLASS.borderWidth,
        borderColor: GLASS.borderColor,
    },
    inputLabel: {
        color: COLORS.textMuted,
        fontSize: 14,
        marginBottom: 8,
        fontWeight: '600',
    },
    inputContainer: {
        height: 56,
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        borderRadius: SIZES.radiusMedium,
        paddingHorizontal: 16,
        justifyContent: 'center',
        marginBottom: 16,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.1)',
    },
    input: {
        color: COLORS.textMain,
        fontSize: 16,
    },
    errorText: {
        color: '#ef4444',
        marginBottom: 20,
        fontSize: 14,
        textAlign: 'center',
        backgroundColor: 'rgba(239, 68, 68, 0.1)',
        padding: 8,
        borderRadius: 8,
        width: '100%',
    },
    button: {
        height: 56,
        borderRadius: SIZES.radiusMedium,
        overflow: 'hidden',
    },
    buttonGradient: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
    },
    buttonText: {
        color: 'white',
        fontSize: 18,
        fontWeight: '700',
    },
    footerBtn: {
        marginTop: 20,
        alignItems: 'center'
    },
    footerText: {
        color: COLORS.textDim,
        fontSize: 14
    },
    link: {
        color: COLORS.accentPrimary,
        fontWeight: '700'
    },
    footer: {
        position: 'absolute',
        bottom: 40,
        left: 0,
        right: 0,
        textAlign: 'center',
        color: COLORS.textDim,
        fontSize: 12,
    }
});
