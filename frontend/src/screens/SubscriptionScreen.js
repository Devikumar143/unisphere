import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, ScrollView, ActivityIndicator, Alert, Platform } from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { BadgeCheck, ArrowLeft, CheckCircle2, Zap, ShieldCheck, Star, Sparkles, CreditCard } from 'lucide-react-native';
import { COLORS, SIZES } from '../constants/theme';
import { useTheme } from '../context/ThemeContext';
import { subscribeToBlue, fetchSubscriptionStatus } from '../services/api';

export default function SubscriptionScreen({ navigation, route, onUpdateUser }) {
    const { isDark, themeColors } = useTheme();
    const { currentUser } = route.params;
    const [loading, setLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [currentSubscription, setCurrentSubscription] = useState(null);

    useEffect(() => {
        loadStatus();
    }, []);

    const loadStatus = async () => {
        try {
            const status = await fetchSubscriptionStatus(currentUser.id);
            setCurrentSubscription(status);
        } catch (error) {
            console.error(error);
        }
    };

    const handleSubscribe = () => {
        navigation.navigate('CONTACT_DEVELOPER');
    };

    const features = [
        { icon: BadgeCheck, title: 'Verified Badge', desc: 'A blue checkmark next to your name' },
        { icon: ShieldCheck, title: 'Priority Support', desc: 'Get help faster from our team' },
        { icon: Zap, title: 'Early Access', desc: 'Try new features before anyone else' },
        { icon: Star, title: 'Exclusive Badge Styles', desc: 'Customize your verified look' }
    ];

    if (loading) {
        return (
            <View style={[styles.container, { backgroundColor: isDark ? themeColors.bgDark : themeColors.bgLight, justifyContent: 'center' }]}>
                <ActivityIndicator size="large" color={themeColors.accentPrimary} />
            </View>
        );
    }

    return (
        <View style={[styles.container, { backgroundColor: isDark ? themeColors.bgDark : themeColors.bgLight }]}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()}>
                    <ArrowLeft size={24} color={isDark ? themeColors.textMain : themeColors.textMainLight} />
                </TouchableOpacity>
                <Text style={[styles.headerTitle, { color: isDark ? themeColors.textMain : themeColors.textMainLight }]}>UniSphere Blue</Text>
                <View style={{ width: 24 }} />
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                <LinearGradient
                    colors={['#4B9CD3', '#1E40AF']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.heroCard}
                >
                    <Sparkles size={40} color="#FFF" style={styles.sparkle} />
                    <View style={styles.badgePreview}>
                        <Text style={styles.previewName}>{currentUser.name || currentUser.username}</Text>
                        <BadgeCheck size={20} color="#FFF" style={{ marginLeft: 6 }} />
                    </View>
                    <Text style={styles.heroTitle}>UniSphere Blue Badge</Text>
                    <Text style={styles.heroPrice}>₹499 / Year</Text>
                </LinearGradient>

                <View style={styles.featuresSection}>
                    <Text style={[styles.sectionTitle, { color: isDark ? themeColors.textMain : themeColors.textMainLight }]}>Exclusive Benefits</Text>
                    {features.map((item, index) => (
                        <View key={index} style={styles.featureItem}>
                            <View style={[styles.featureIconBox, { backgroundColor: themeColors.accentPrimary + '15' }]}>
                                <item.icon size={22} color={themeColors.accentPrimary} />
                            </View>
                            <View style={styles.featureText}>
                                <Text style={[styles.featureTitle, { color: isDark ? themeColors.textMain : themeColors.textMainLight }]}>{item.title}</Text>
                                <Text style={[styles.featureDesc, { color: isDark ? themeColors.textMuted : themeColors.textMutedLight }]}>{item.desc}</Text>
                            </View>
                        </View>
                    ))}
                </View>

                <View style={[styles.pricingCard, { backgroundColor: isDark ? themeColors.bgCard : themeColors.bgCardLight, borderColor: themeColors.border }]}>
                    <View style={styles.planHeader}>
                        <View>
                            <Text style={[styles.planTitle, { color: isDark ? themeColors.textMain : themeColors.textMainLight }]}>Monthly Plan</Text>
                            <Text style={[styles.planSub, { color: isDark ? themeColors.textDim : themeColors.textDimLight }]}>Cancel anytime</Text>
                        </View>
                        <CheckCircle2 size={24} color={themeColors.accentPrimary} />
                    </View>

                    <View style={[styles.divider, { backgroundColor: themeColors.border }]} />

                    <View style={styles.planFooter}>
                        <Text style={[styles.totalText, { color: isDark ? themeColors.textMain : themeColors.textMainLight }]}>Total Due Today</Text>
                        <Text style={[styles.totalAmount, { color: isDark ? themeColors.textMain : themeColors.textMainLight }]}>₹499</Text>
                    </View>
                </View>

                <TouchableOpacity
                    style={[styles.subscribeBtn, { backgroundColor: '#4B9CD3' }]}
                    onPress={handleSubscribe}
                    disabled={submitting}
                >
                    {submitting ? (
                        <ActivityIndicator color="#FFF" />
                    ) : (
                        <>
                            <CreditCard size={20} color="#FFF" style={{ marginRight: 10 }} />
                            <Text style={styles.subscribeBtnText}>Subscribe Now</Text>
                        </>
                    )}
                </TouchableOpacity>

                <Text style={[styles.disclaimer, { color: isDark ? themeColors.textDim : themeColors.textDimLight }]}>
                    Recurring billing. Cancel in Settings at least 24 hours before renewal. By subscribing, you agree to our Terms of Service.
                </Text>
            </ScrollView>
        </View>
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
    heroCard: {
        borderRadius: 24,
        padding: 30,
        alignItems: 'center',
        marginBottom: 30,
        overflow: 'hidden',
    },
    sparkle: {
        position: 'absolute',
        top: 15,
        right: 15,
        opacity: 0.5,
    },
    badgePreview: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.2)',
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        marginBottom: 20,
    },
    previewName: {
        color: '#FFF',
        fontWeight: '700',
        fontSize: 14,
    },
    heroTitle: {
        color: '#FFF',
        fontSize: 24,
        fontWeight: '900',
        textAlign: 'center',
        marginBottom: 10,
    },
    heroPrice: {
        color: 'rgba(255,255,255,0.9)',
        fontSize: 18,
        fontWeight: '700',
    },
    featuresSection: {
        marginBottom: 30,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '800',
        marginBottom: 20,
    },
    featureItem: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
    },
    featureIconBox: {
        width: 44,
        height: 44,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 16,
    },
    featureText: {
        flex: 1,
    },
    featureTitle: {
        fontSize: 15,
        fontWeight: '700',
        marginBottom: 2,
    },
    featureDesc: {
        fontSize: 13,
    },
    pricingCard: {
        borderRadius: 20,
        borderWidth: 1,
        padding: 20,
        marginBottom: 20,
    },
    planHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    planTitle: {
        fontSize: 16,
        fontWeight: '700',
    },
    planSub: {
        fontSize: 12,
    },
    divider: {
        height: 1,
        marginBottom: 16,
    },
    planFooter: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    totalText: {
        fontSize: 14,
        fontWeight: '600',
    },
    totalAmount: {
        fontSize: 18,
        fontWeight: '800',
    },
    subscribeBtn: {
        height: 56,
        borderRadius: 28,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 20,
    },
    subscribeBtnText: {
        color: '#FFF',
        fontSize: 16,
        fontWeight: '700',
    },
    disclaimer: {
        fontSize: 12,
        textAlign: 'center',
        paddingHorizontal: 20,
        lineHeight: 18,
    }
});
