import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, TextInput, TouchableOpacity, ScrollView, ActivityIndicator, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { BadgeCheck, ArrowLeft, Send, CheckCircle2, Clock, AlertCircle } from 'lucide-react-native';
import { COLORS, GLASS, SIZES } from '../constants/theme';
import { useTheme } from '../context/ThemeContext';
import { applyForVerification, fetchVerificationStatus } from '../services/api';

export default function VerificationApplyScreen({ navigation, route }) {
    const { isDark, themeColors } = useTheme();
    const { currentUser } = route.params;
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [status, setStatus] = useState(null);

    // Form State
    const [formData, setFormData] = useState({
        fullName: currentUser?.name || '',
        category: '',
        description: ''
    });

    const categories = ['Influencer', 'Student Leader', 'Faculty', 'Content Creator', 'Campus Organization', 'Other'];

    useEffect(() => {
        checkStatus();
    }, []);

    const checkStatus = async () => {
        try {
            const data = await fetchVerificationStatus(currentUser.id);
            setStatus(data);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async () => {
        if (!formData.fullName || !formData.category || !formData.description) {
            Alert.alert("Missing Fields", "Please fill in all the required details.");
            return;
        }

        setSubmitting(true);
        try {
            await applyForVerification({
                userId: currentUser.id,
                ...formData
            });
            Alert.alert("Success", "Your application has been submitted and is under review.");
            checkStatus();
        } catch (error) {
            Alert.alert("Error", error.message || "Failed to submit application");
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) {
        return (
            <View style={[styles.container, { backgroundColor: isDark ? themeColors.bgDark : themeColors.bgLight, justifyContent: 'center' }]}>
                <ActivityIndicator size="large" color={themeColors.accentPrimary} />
            </View>
        );
    }

    if (status && status.status === 'pending') {
        return (
            <View style={[styles.container, { backgroundColor: isDark ? themeColors.bgDark : themeColors.bgLight }]}>
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => navigation.goBack()}>
                        <ArrowLeft size={24} color={isDark ? themeColors.textMain : themeColors.textMainLight} />
                    </TouchableOpacity>
                    <Text style={[styles.headerTitle, { color: isDark ? themeColors.textMain : themeColors.textMainLight }]}>Verification</Text>
                    <View style={{ width: 24 }} />
                </View>

                <View style={styles.statusContainer}>
                    <View style={[styles.statusIconBox, { backgroundColor: 'rgba(255, 165, 0, 0.1)' }]}>
                        <Clock size={48} color="#FFA500" />
                    </View>
                    <Text style={[styles.statusTitle, { color: isDark ? themeColors.textMain : themeColors.textMainLight }]}>Application Under Review</Text>
                    <Text style={[styles.statusDesc, { color: isDark ? themeColors.textMuted : themeColors.textMutedLight }]}>
                        We're currently reviewing your request for a verified badge. This usually takes 2-3 business days.
                    </Text>
                    <TouchableOpacity
                        style={[styles.backBtn, { backgroundColor: themeColors.accentPrimary }]}
                        onPress={() => navigation.goBack()}
                    >
                        <Text style={styles.backBtnText}>Got it</Text>
                    </TouchableOpacity>
                </View>
            </View>
        );
    }

    if (currentUser.isVerified) {
        return (
            <View style={[styles.container, { backgroundColor: isDark ? themeColors.bgDark : themeColors.bgLight }]}>
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => navigation.goBack()}>
                        <ArrowLeft size={24} color={isDark ? themeColors.textMain : themeColors.textMainLight} />
                    </TouchableOpacity>
                    <Text style={[styles.headerTitle, { color: isDark ? themeColors.textMain : themeColors.textMainLight }]}>Verification</Text>
                    <View style={{ width: 24 }} />
                </View>

                <View style={styles.statusContainer}>
                    <View style={[styles.statusIconBox, { backgroundColor: 'rgba(37, 99, 235, 0.1)' }]}>
                        <BadgeCheck size={64} color="#2563EB" />
                    </View>
                    <Text style={[styles.statusTitle, { color: isDark ? themeColors.textMain : themeColors.textMainLight }]}>You are Verified!</Text>
                    <Text style={[styles.statusDesc, { color: isDark ? themeColors.textMuted : themeColors.textMutedLight }]}>
                        Your account has been verified. The blue badge helps the community identify authentic accounts.
                    </Text>
                    <TouchableOpacity
                        style={[styles.backBtn, { backgroundColor: themeColors.accentPrimary }]}
                        onPress={() => navigation.goBack()}
                    >
                        <Text style={styles.backBtnText}>Back to Settings</Text>
                    </TouchableOpacity>
                </View>
            </View>
        );
    }

    return (
        <KeyboardAvoidingView
            style={[styles.container, { backgroundColor: isDark ? themeColors.bgDark : themeColors.bgLight }]}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()}>
                    <ArrowLeft size={24} color={isDark ? themeColors.textMain : themeColors.textMainLight} />
                </TouchableOpacity>
                <Text style={[styles.headerTitle, { color: isDark ? themeColors.textMain : themeColors.textMainLight }]}>Apply for Verification</Text>
                <View style={{ width: 24 }} />
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                <View style={[styles.promoCard, { backgroundColor: isDark ? themeColors.bgCard : themeColors.bgCardLight }]}>
                    <BadgeCheck size={40} color="#2563EB" style={{ marginBottom: 12 }} />
                    <Text style={[styles.promoTitle, { color: isDark ? themeColors.textMain : themeColors.textMainLight }]}>Join the Verified Community</Text>
                    <Text style={[styles.promoDesc, { color: isDark ? themeColors.textMuted : themeColors.textMutedLight }]}>
                        A verified badge confirms that this is the authentic presence of a public figure, celebrity, or brand.
                    </Text>
                </View>

                <View style={styles.formSection}>
                    <Text style={[styles.label, { color: isDark ? themeColors.textMain : themeColors.textMainLight }]}>Step 1: Confirm Authenticity</Text>
                    <Text style={[styles.inputLabel, { color: isDark ? themeColors.textDim : themeColors.textDimLight }]}>Full Name (as on ID)</Text>
                    <TextInput
                        style={[styles.input, {
                            backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)',
                            color: isDark ? themeColors.textMain : themeColors.textMainLight,
                            borderColor: themeColors.border
                        }]}
                        value={formData.fullName}
                        onChangeText={(text) => setFormData({ ...formData, fullName: text })}
                        placeholder="Enter your legal full name"
                        placeholderTextColor={isDark ? themeColors.textMuted : themeColors.textMutedLight}
                    />

                    <Text style={[styles.label, { color: isDark ? themeColors.textMain : themeColors.textMainLight, marginTop: 24 }]}>Step 2: Confirm Notability</Text>
                    <Text style={[styles.inputLabel, { color: isDark ? themeColors.textDim : themeColors.textDimLight }]}>Category</Text>
                    <View style={styles.categoryContainer}>
                        {categories.map((cat) => (
                            <TouchableOpacity
                                key={cat}
                                style={[
                                    styles.categoryChip,
                                    {
                                        backgroundColor: formData.category === cat ? themeColors.accentPrimary : (isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'),
                                        borderColor: formData.category === cat ? themeColors.accentPrimary : themeColors.border
                                    }
                                ]}
                                onPress={() => setFormData({ ...formData, category: cat })}
                            >
                                <Text style={[
                                    styles.categoryText,
                                    { color: formData.category === cat ? '#FFF' : (isDark ? themeColors.textMain : themeColors.textMainLight) }
                                ]}>
                                    {cat}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>

                    <Text style={[styles.inputLabel, { color: isDark ? themeColors.textDim : themeColors.textDimLight, marginTop: 16 }]}>Tell us why you should be verified</Text>
                    <TextInput
                        style={[styles.input, styles.textArea, {
                            backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)',
                            color: isDark ? themeColors.textMain : themeColors.textMainLight,
                            borderColor: themeColors.border
                        }]}
                        value={formData.description}
                        onChangeText={(text) => setFormData({ ...formData, description: text })}
                        placeholder="Provide links to social profiles, news articles, or achievements..."
                        placeholderTextColor={isDark ? themeColors.textMuted : themeColors.textMutedLight}
                        multiline
                        numberOfLines={4}
                    />
                </View>

                <TouchableOpacity
                    style={[styles.submitBtn, { backgroundColor: themeColors.accentPrimary }]}
                    onPress={handleSubmit}
                    disabled={submitting}
                >
                    {submitting ? (
                        <ActivityIndicator color="#FFF" />
                    ) : (
                        <>
                            <Text style={styles.submitBtnText}>Submit Application</Text>
                            <Send size={18} color="#FFF" style={{ marginLeft: 8 }} />
                        </>
                    )}
                </TouchableOpacity>

                <View style={styles.infoBox}>
                    <AlertCircle size={16} color={isDark ? themeColors.textMuted : themeColors.textMutedLight} />
                    <Text style={[styles.infoText, { color: isDark ? themeColors.textMuted : themeColors.textMutedLight }]}>
                        Submitting a request does not guarantee verification.
                    </Text>
                </View>
            </ScrollView>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingTop: Platform.OS === 'ios' ? 60 : 20,
        paddingBottom: 20,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '700',
    },
    scrollContent: {
        padding: 20,
        paddingBottom: 40,
    },
    promoCard: {
        borderRadius: 24,
        padding: 24,
        alignItems: 'center',
        marginBottom: 24,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.05)',
    },
    promoTitle: {
        fontSize: 20,
        fontWeight: '800',
        textAlign: 'center',
        marginBottom: 8,
    },
    promoDesc: {
        fontSize: 14,
        textAlign: 'center',
        lineHeight: 20,
    },
    formSection: {
        marginBottom: 24,
    },
    label: {
        fontSize: 16,
        fontWeight: '700',
        marginBottom: 16,
    },
    inputLabel: {
        fontSize: 13,
        fontWeight: '600',
        marginBottom: 8,
        marginTop: 4,
    },
    input: {
        borderRadius: 12,
        paddingHorizontal: 16,
        height: 50,
        fontSize: 15,
        borderWidth: 1,
    },
    textArea: {
        height: 120,
        paddingTop: 12,
        textAlignVertical: 'top',
    },
    categoryContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
        marginBottom: 16,
    },
    categoryChip: {
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 20,
        borderWidth: 1,
    },
    categoryText: {
        fontSize: 13,
        fontWeight: '600',
    },
    submitBtn: {
        height: 56,
        borderRadius: 28,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 10,
    },
    submitBtnText: {
        color: '#FFF',
        fontSize: 16,
        fontWeight: '700',
    },
    infoBox: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 20,
        gap: 6,
    },
    infoText: {
        fontSize: 12,
    },
    statusContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        padding: 40,
    },
    statusIconBox: {
        width: 100,
        height: 100,
        borderRadius: 50,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 24,
    },
    statusTitle: {
        fontSize: 22,
        fontWeight: '800',
        textAlign: 'center',
        marginBottom: 12,
    },
    statusDesc: {
        fontSize: 15,
        textAlign: 'center',
        lineHeight: 22,
        marginBottom: 32,
    },
    backBtn: {
        paddingHorizontal: 32,
        paddingVertical: 14,
        borderRadius: 25,
    },
    backBtnText: {
        color: '#FFF',
        fontWeight: '700',
        fontSize: 15,
    }
});
