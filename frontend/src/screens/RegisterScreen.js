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
    Alert,
    ScrollView
} from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { User, Mail, Lock, BookOpen, ArrowRight, AtSign, Eye, EyeOff } from 'lucide-react-native';
import { COLORS, SIZES, GLASS } from '../constants/theme';
import { useTheme } from '../context/ThemeContext';
import { registerUser } from '../services/api';

const { width } = Dimensions.get('window');

export default function RegisterScreen({ onRegister, onBackToLogin }) {
    const { themeColors, isDark } = useTheme();
    const [formData, setFormData] = useState({
        fullName: '',
        username: '',
        email: '',
        department: '',
    });
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleRegister = async () => {
        const { fullName, email, password, department, username } = formData;

        if (!fullName || !email || !password || !department || !username) {
            setError('Please fill in all details to join UniSphere.');
            return;
        }

        setLoading(true);
        setError('');

        try {
            const data = await registerUser(formData);
            onRegister(data.user);
        } catch (err) {
            setError(err.message || 'Registration failed');
            Alert.alert("Registration Error", err.message);
        } finally {
            setLoading(false);
        }
    };

    const updateField = (field, value) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    return (
        <View style={[styles.container, { backgroundColor: themeColors.bgDark }]}>
            <LinearGradient
                colors={[themeColors.bgDark, isDark ? '#0a0d1d' : '#F1F5F9']}
                style={StyleSheet.absoluteFill}
            />

            <View style={[styles.glow, { backgroundColor: themeColors.accentSecondary }]} />

            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={styles.flex}
            >
                <ScrollView contentContainerStyle={styles.scrollContent}>
                    <View style={styles.header}>
                        <Text style={[styles.title, { color: themeColors.textMain }]}>Join the Sphere</Text>
                        <Text style={[styles.subtitle, { color: themeColors.textMuted }]}>Create your university profile</Text>
                    </View>

                    <BlurView intensity={GLASS.intensity} tint={isDark ? "dark" : "light"} style={[styles.card, { borderColor: themeColors.border, backgroundColor: themeColors.bgCard }]}>
                        <InputField
                            label="Full Name"
                            icon={User}
                            placeholder="John Doe"
                            value={formData.fullName}
                            onChangeText={(v) => updateField('fullName', v)}
                            themeColors={themeColors}
                        />

                        <InputField
                            label="Username"
                            icon={AtSign}
                            placeholder="@handle"
                            value={formData.username}
                            onChangeText={(v) => updateField('username', v)}
                            autoCapitalize="none"
                            themeColors={themeColors}
                        />

                        <InputField
                            label="University Email"
                            icon={Mail}
                            placeholder="name@university.edu"
                            keyboardType="email-address"
                            value={formData.email}
                            onChangeText={(v) => updateField('email', v)}
                            themeColors={themeColors}
                        />

                        <InputField
                            label="Department"
                            icon={BookOpen}
                            placeholder="Computer Science"
                            value={formData.department}
                            onChangeText={(v) => updateField('department', v)}
                            themeColors={themeColors}
                        />

                        <InputField
                            label="Password"
                            icon={Lock}
                            placeholder="••••••••"
                            secureTextEntry={!showPassword}
                            value={formData.password}
                            onChangeText={(v) => updateField('password', v)}
                            themeColors={themeColors}
                            rightElement={
                                <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={{ padding: 10 }}>
                                    {showPassword ? (
                                        <EyeOff color={themeColors.textDim} size={18} />
                                    ) : (
                                        <Eye color={themeColors.textDim} size={18} />
                                    )}
                                </TouchableOpacity>
                            }
                        />

                        {error ? <Text style={styles.errorText}>{error}</Text> : null}

                        <TouchableOpacity
                            style={styles.button}
                            onPress={handleRegister}
                            disabled={loading}
                        >
                            <LinearGradient
                                colors={[themeColors.accentPrimary, themeColors.accentSecondary]}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 0 }}
                                style={styles.buttonGradient}
                            >
                                {loading ? (
                                    <ActivityIndicator color="white" />
                                ) : (
                                    <>
                                        <Text style={styles.buttonText}>Get Started</Text>
                                        <ArrowRight color="white" size={20} style={{ marginLeft: 8 }} />
                                    </>
                                )}
                            </LinearGradient>
                        </TouchableOpacity>

                        <TouchableOpacity onPress={onBackToLogin} style={styles.footerBtn}>
                            <Text style={[styles.footerText, { color: themeColors.textDim }]}>
                                Already have an account? <Text style={[styles.link, { color: themeColors.accentPrimary }]}>Login</Text>
                            </Text>
                        </TouchableOpacity>
                    </BlurView>
                </ScrollView>
            </KeyboardAvoidingView>
        </View>
    );
}

const InputField = ({ label, icon: Icon, themeColors = COLORS, rightElement, ...props }) => (
    <View style={styles.fieldContainer}>
        <Text style={[styles.label, { color: themeColors.textMuted }]}>{label}</Text>
        <View style={[styles.inputWrapper, { backgroundColor: themeColors.bgDark, borderColor: themeColors.border }]}>
            <Icon color={themeColors.accentPrimary} size={18} style={styles.inputIcon} />
            <TextInput
                style={[styles.input, { color: themeColors.textMain }]}
                placeholderTextColor={themeColors.textDim}
                autoCapitalize="none"
                {...props}
            />
            {rightElement}
        </View>
    </View>
);

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.bgDark },
    flex: { flex: 1 },
    scrollContent: { padding: SIZES.padding, paddingTop: 60, paddingBottom: 40 },
    glow: {
        position: 'absolute',
        top: -50,
        left: -50,
        width: 250,
        height: 250,
        borderRadius: 125,
        backgroundColor: COLORS.accentSecondary,
        opacity: 0.1,
    },
    header: { marginBottom: 32 },
    title: { fontSize: 32, fontWeight: '800', color: COLORS.textMain, letterSpacing: -0.5 },
    subtitle: { fontSize: 16, color: COLORS.textMuted, marginTop: 4 },
    card: {
        padding: 24,
        borderRadius: SIZES.radiusLarge,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
    },
    fieldContainer: { marginBottom: 20 },
    label: { color: COLORS.textMuted, fontSize: 13, fontWeight: '600', marginBottom: 8 },
    inputWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        height: 52,
        backgroundColor: 'rgba(255,255,255,0.05)',
        borderRadius: SIZES.radiusMedium,
        paddingHorizontal: 16,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
    },
    inputIcon: { marginRight: 12 },
    input: { flex: 1, color: COLORS.textMain, fontSize: 15 },
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
    button: { height: 56, borderRadius: SIZES.radiusMedium, overflow: 'hidden', marginTop: 10 },
    buttonGradient: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
    buttonText: { color: 'white', fontSize: 17, fontWeight: '700' },
    footerBtn: { marginTop: 24, alignItems: 'center' },
    footerText: { color: COLORS.textDim, fontSize: 14 },
    link: { color: COLORS.accentPrimary, fontWeight: '700' }
});
