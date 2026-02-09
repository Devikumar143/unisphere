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
    Image,
    ScrollView
} from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { GraduationCap, ArrowRight, Eye, EyeOff, ChevronDown, ChevronUp } from 'lucide-react-native';
import { COLORS, SIZES, GLASS } from '../constants/theme';
import { useTheme } from '../context/ThemeContext';
import { loginUser } from '../services/api';

const { width } = Dimensions.get('window');

export default function LoginScreen({ onLogin, onGoToRegister, savedAccounts, onQuickLogin, onRemoveAccount }) {
    const { themeColors, isDark } = useTheme();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [showRecentLogins, setShowRecentLogins] = useState(false);

    const handleLogin = async () => {
        if (!email || !password) {
            setError('Please enter both email and password');
            return;
        }

        setLoading(true);
        setError('');

        try {
            const data = await loginUser(email, password);
            // data.user contains the user info, data.token contains the JWT
            onLogin({ ...data.user, token: data.token });
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
        <View style={styles.container}>
            {/* Immersive Background */}



            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={styles.content}
            >
                <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                    <View style={styles.header}>
                        <View style={[styles.logoContainer, {
                            borderColor: themeColors.accentPrimary,
                            shadowColor: themeColors.accentPrimary,
                        }]}>
                            <GraduationCap color="white" size={40} strokeWidth={2} />
                        </View>
                        <Text style={[styles.title, { color: 'white' }]}>UniSphere</Text>
                        <Text style={[styles.subtitle, { color: 'rgba(255,255,255,0.7)' }]}>Your university, digitalized.</Text>
                    </View>

                    {/* Main Glass Form */}
                    <BlurView intensity={30} tint="dark" style={[styles.loginCard, { borderColor: 'rgba(255,255,255,0.1)' }]}>

                        {/* Saved Accounts Section inside Glass */}
                        {savedAccounts && savedAccounts.length > 0 && (
                            <View style={styles.savedAccountsContainer}>
                                <TouchableOpacity
                                    style={styles.recentLoginsHeader}
                                    onPress={() => setShowRecentLogins(!showRecentLogins)}
                                    activeOpacity={0.7}
                                >
                                    <Text style={[styles.sectionTitle, { color: 'rgba(255,255,255,0.8)', marginBottom: 0 }]}>Recent Logins</Text>
                                    {showRecentLogins ?
                                        <ChevronUp size={20} color="rgba(255,255,255,0.6)" /> :
                                        <ChevronDown size={20} color="rgba(255,255,255,0.6)" />
                                    }
                                </TouchableOpacity>

                                {showRecentLogins && (
                                    <View style={styles.savedAccountsList}>
                                        {savedAccounts.map((account) => (
                                            <View key={account.id} style={styles.savedAccountWrapper}>
                                                <TouchableOpacity
                                                    style={[styles.savedAccountItem, { borderColor: themeColors.accentPrimary + '30' }]}
                                                    onPress={() => onQuickLogin(account)}
                                                >
                                                    <Image
                                                        source={{ uri: account.avatar || account.profile_image || `https://ui-avatars.com/api/?name=${account.full_name}&background=random` }}
                                                        style={styles.savedAccountAvatar}
                                                        resizeMode="cover"
                                                    />
                                                    <View style={{ flex: 1, justifyContent: 'center' }}>
                                                        <Text numberOfLines={1} style={[styles.savedAccountName, { color: 'white' }]}>
                                                            {account.full_name}
                                                        </Text>
                                                        <Text numberOfLines={1} style={styles.savedAccountUsername}>
                                                            @{account.username}
                                                        </Text>
                                                    </View>
                                                </TouchableOpacity>
                                                <TouchableOpacity
                                                    style={styles.removeAccountBtn}
                                                    onPress={() => onRemoveAccount(account.id)}
                                                >
                                                    <View style={styles.removeIconBg}>
                                                        <Text style={styles.removeIconText}>×</Text>
                                                    </View>
                                                </TouchableOpacity>
                                            </View>
                                        ))}
                                    </View>
                                )}
                                <View style={styles.divider} />
                            </View>
                        )}

                        <Text style={[styles.inputLabel, { color: 'rgba(255,255,255,0.8)' }]}>Email or Username</Text>
                        <View style={[styles.inputContainer, { backgroundColor: 'rgba(0,0,0,0.2)', borderColor: 'rgba(255,255,255,0.1)' }]}>
                            <TextInput
                                style={[styles.input, { color: 'white' }]}
                                placeholder="name@joyuniversity.edu.in"
                                placeholderTextColor="rgba(255,255,255,0.4)"
                                keyboardType="email-address"
                                autoCapitalize="none"
                                value={email}
                                onChangeText={setEmail}
                            />
                        </View>

                        <Text style={[styles.inputLabel, { color: 'rgba(255,255,255,0.8)' }]}>Password</Text>
                        <View style={[styles.inputContainer, { backgroundColor: 'rgba(0,0,0,0.2)', borderColor: 'rgba(255,255,255,0.1)', flexDirection: 'row', alignItems: 'center' }]}>
                            <TextInput
                                style={[styles.input, { color: 'white', flex: 1 }]}
                                placeholder="••••••••"
                                placeholderTextColor="rgba(255,255,255,0.4)"
                                secureTextEntry={!showPassword}
                                value={password}
                                onChangeText={setPassword}
                            />
                            <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={{ padding: 10 }}>
                                {showPassword ? (
                                    <EyeOff color="rgba(255,255,255,0.6)" size={20} />
                                ) : (
                                    <Eye color="rgba(255,255,255,0.6)" size={20} />
                                )}
                            </TouchableOpacity>
                        </View>

                        {error ? <Text style={styles.errorText}>{error}</Text> : null}

                        <TouchableOpacity
                            style={[styles.button, { backgroundColor: themeColors.accentPrimary }]}
                            onPress={handleLogin}
                            disabled={loading}
                        >
                            <LinearGradient
                                colors={[themeColors.accentPrimary, themeColors.accentSecondary || themeColors.accentPrimary]}
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
                            <Text style={[styles.footerText, { color: 'rgba(255,255,255,0.6)' }]}>
                                New here? <Text style={[styles.link, { color: themeColors.accentPrimary }]}>Create Account</Text>
                            </Text>
                        </TouchableOpacity>
                    </BlurView>
                </ScrollView>
            </KeyboardAvoidingView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#0D0B26', // Solid dark background
    },
    backgroundImage: {
        ...StyleSheet.absoluteFillObject,
        width: '100%',
        height: '100%',
    },
    content: {
        flex: 1,
    },
    scrollContent: {
        flexGrow: 1,
        justifyContent: 'center',
        padding: 24,
    },
    header: {
        alignItems: 'center',
        marginBottom: 30,
    },
    logoContainer: {
        width: 72,
        height: 72,
        borderRadius: 24,
        backgroundColor: 'rgba(255,255,255,0.1)',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 16,
        borderWidth: 1,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.6,
        shadowRadius: 15,
        elevation: 10,
    },
    title: {
        fontSize: 42,
        fontWeight: '900',
        letterSpacing: -1,
        fontFamily: 'PlayfairDisplay-Bold',
        marginBottom: 4,
        textShadowColor: 'rgba(0,0,0,0.5)',
        textShadowOffset: { width: 0, height: 2 },
        textShadowRadius: 10,
    },
    subtitle: {
        fontSize: 16,
        fontWeight: '500',
    },
    loginCard: {
        borderRadius: 32,
        overflow: 'hidden',
        borderWidth: 1,
        padding: 24,
    },
    inputLabel: {
        fontSize: 13,
        fontWeight: '600',
        marginBottom: 8,
        marginLeft: 4,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    inputContainer: {
        height: 56,
        borderRadius: 18,
        paddingHorizontal: 16,
        justifyContent: 'center',
        marginBottom: 20,
        borderWidth: 1,
    },
    input: {
        fontSize: 16,
        fontWeight: '500',
    },
    errorText: {
        color: '#ff4d4d',
        marginBottom: 20,
        fontSize: 14,
        textAlign: 'center',
        backgroundColor: 'rgba(255, 77, 77, 0.15)',
        padding: 10,
        borderRadius: 12,
        overflow: 'hidden',
    },
    button: {
        height: 56,
        borderRadius: 18,
        overflow: 'hidden',
        marginTop: 8,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.3,
        shadowRadius: 12,
        elevation: 8,
    },
    buttonGradient: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
    },
    buttonText: {
        color: 'white',
        fontSize: 17,
        fontWeight: '800',
        letterSpacing: 0.5,
    },
    footerBtn: {
        marginTop: 24,
        alignItems: 'center'
    },
    footerText: {
        fontSize: 14,
        fontWeight: '500',
    },
    link: {
        fontWeight: '800'
    },
    savedAccountsContainer: {
        marginBottom: 20,
        alignItems: 'center',
    },
    savedAccountsList: {
        paddingVertical: 10,
        width: '100%',
    },
    savedAccountWrapper: {
        marginBottom: 10,
        width: '100%',
        position: 'relative',
    },
    savedAccountItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 10,
        borderRadius: 16,
        backgroundColor: 'rgba(255,255,255,0.05)',
        borderWidth: 1,
        width: '100%',
    },
    savedAccountAvatar: {
        width: 44,
        height: 44,
        borderRadius: 22,
        marginRight: 12,
    },
    savedAccountName: {
        fontSize: 14,
        fontWeight: '600',
    },
    savedAccountUsername: {
        fontSize: 11,
        color: 'rgba(255,255,255,0.5)',
        marginTop: 2,
    },
    removeAccountBtn: {
        position: 'absolute',
        right: 12,
        top: 18,
        zIndex: 10,
    },
    removeIconBg: {
        width: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor: 'rgba(255,82,82,0.2)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    removeIconText: {
        color: '#FF5252',
        fontSize: 16,
        fontWeight: '600',
        marginTop: -2,
    },
    divider: {
        height: 1,
        backgroundColor: 'rgba(255,255,255,0.1)',
        width: '100%',
        marginTop: 16,
        marginBottom: 4,
    },
    sectionTitle: {
        fontSize: 14,
        fontWeight: '700',
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
    recentLoginsHeader: {
        width: '100%',
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 8,
        paddingHorizontal: 4,
        marginBottom: 8,
    },
});
