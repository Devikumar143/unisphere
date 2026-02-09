import React from 'react';
import { StyleSheet, View, Text, TouchableOpacity, ScrollView, Image, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, Megaphone, Target, BarChart3, Instagram, Mail, ChevronRight, Sparkles, CheckCircle2 } from 'lucide-react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, SIZES } from '../constants/theme';
import { useTheme } from '../context/ThemeContext';

const { width } = Dimensions.get('window');

export default function AdInfoScreen({ onBack }) {
    const { isDark, themeColors } = useTheme();

    return (
        <View style={[styles.container, { backgroundColor: isDark ? themeColors.bgDark : themeColors.bgLight }]}>
            <SafeAreaView style={styles.safeArea}>
                {/* Header */}
                <View style={styles.header}>
                    <TouchableOpacity onPress={onBack} style={[styles.backBtn, { backgroundColor: isDark ? themeColors.bgCard : themeColors.bgCardLight }]}>
                        <ArrowLeft color={isDark ? themeColors.textMain : themeColors.textMainLight} size={24} />
                    </TouchableOpacity>
                    <Text style={[styles.title, { color: isDark ? themeColors.textMain : themeColors.textMainLight, fontFamily: 'PlayfairDisplay-Bold' }]}>Advertising</Text>
                    <View style={{ width: 44 }} />
                </View>

                <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
                    {/* Hero Section */}
                    <LinearGradient
                        colors={[themeColors.accentPrimary, themeColors.accentSecondary]}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={styles.heroCard}
                    >
                        <Megaphone color="#FFF" size={48} style={styles.heroIcon} />
                        <Text style={styles.heroTitle}>Grow with UniSphere</Text>
                        <Text style={styles.heroSubtitle}>Reach thousands of students directly in their favorite social space.</Text>
                    </LinearGradient>

                    {/* Features Section */}
                    <View style={styles.section}>
                        <Text style={[styles.sectionTitle, { color: isDark ? themeColors.textMuted : themeColors.textMutedLight }]}>Why Advertise with us?</Text>

                        <View style={styles.featuresGrid}>
                            <FeatureCard
                                icon={Target}
                                title="Precise Targeting"
                                description="Reach specific departments, years, or interest groups."
                                themeColors={themeColors}
                                isDark={isDark}
                            />
                            <FeatureCard
                                icon={BarChart3}
                                title="High Engagement"
                                description="Our users spend 20+ minutes daily on the platform."
                                themeColors={themeColors}
                                isDark={isDark}
                            />
                        </View>
                    </View>

                    {/* Ad Slots Section */}
                    <View style={styles.section}>
                        <Text style={[styles.sectionTitle, { color: isDark ? themeColors.textMuted : themeColors.textMutedLight }]}>Available Placements</Text>

                        {[
                            { title: 'Feed Spotlight', detail: 'Native posts appearing between student updates.', icon: Sparkles },
                            { title: 'Community Feature', detail: 'Boost your community to the top of Explore.', icon: Target },
                            { title: 'Partner Badge', detail: 'Get a verified partner badge for your brand.', icon: CheckCircle2 }
                        ].map((slot, index) => (
                            <View key={index} style={[styles.slotCard, { backgroundColor: isDark ? themeColors.bgCard : themeColors.bgCardLight, borderColor: themeColors.accentPrimary + '20' }]}>
                                <View style={[styles.slotIconBox, { backgroundColor: themeColors.accentPrimary + '15' }]}>
                                    <slot.icon color={themeColors.accentPrimary} size={20} />
                                </View>
                                <View style={styles.slotInfo}>
                                    <Text style={[styles.slotTitle, { color: isDark ? themeColors.textMain : themeColors.textMainLight }]}>{slot.title}</Text>
                                    <Text style={[styles.slotDetail, { color: isDark ? themeColors.textMuted : themeColors.textMutedLight }]}>{slot.detail}</Text>
                                </View>
                            </View>
                        ))}
                    </View>

                    {/* How to Start Section */}
                    <View style={styles.section}>
                        <Text style={[styles.sectionTitle, { color: isDark ? themeColors.textMuted : themeColors.textMutedLight }]}>Instruction to Start</Text>
                        <View style={[styles.instructionCard, { backgroundColor: isDark ? themeColors.bgCard : themeColors.bgCardLight, borderColor: themeColors.accentPrimary + '15' }]}>
                            <Step number="1" text="Choose your advertising package and placement." themeColors={themeColors} isDark={isDark} />
                            <Step number="2" text="Prepare your creative assets (images, text, links)." themeColors={themeColors} isDark={isDark} />
                            <Step number="3" text="Contact us via Instagram or Email with your plan." themeColors={themeColors} isDark={isDark} />
                            <Step number="4" text="We authenticate and launch your campaign locally!" themeColors={themeColors} isDark={isDark} last />
                        </View>
                    </View>

                    {/* Contact Section */}
                    <View style={styles.section}>
                        <Text style={[styles.sectionTitle, { color: isDark ? themeColors.textMuted : themeColors.textMutedLight }]}>Get in Touch</Text>
                        <View style={[styles.contactCard, { backgroundColor: isDark ? themeColors.bgCard : themeColors.bgCardLight, borderColor: themeColors.accentPrimary + '15' }]}>
                            <TouchableOpacity style={styles.contactItem}>
                                <Instagram color={themeColors.accentPrimary} size={22} />
                                <Text style={[styles.contactText, { color: isDark ? themeColors.textMain : themeColors.textMainLight }]}>devi_._kumar</Text>
                                <ChevronRight color={isDark ? themeColors.textMuted : themeColors.textMutedLight} size={18} />
                            </TouchableOpacity>
                            <View style={[styles.divider, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }]} />
                            <TouchableOpacity style={styles.contactItem}>
                                <Mail color={themeColors.accentPrimary} size={22} />
                                <Text style={[styles.contactText, { color: isDark ? themeColors.textMain : themeColors.textMainLight }]}>anegondhikumar2@gmail.com</Text>
                                <ChevronRight color={isDark ? themeColors.textMuted : themeColors.textMutedLight} size={18} />
                            </TouchableOpacity>
                        </View>
                    </View>
                </ScrollView>
            </SafeAreaView>
        </View>
    );
}

const FeatureCard = ({ icon: Icon, title, description, themeColors, isDark }) => (
    <View style={[styles.featureCard, { backgroundColor: isDark ? themeColors.bgCard : themeColors.bgCardLight, borderColor: themeColors.accentPrimary + '10' }]}>
        <Icon color={themeColors.accentPrimary} size={24} />
        <Text style={[styles.featureTitle, { color: isDark ? themeColors.textMain : themeColors.textMainLight }]}>{title}</Text>
        <Text style={[styles.featureDescription, { color: isDark ? themeColors.textMuted : themeColors.textMutedLight }]}>{description}</Text>
    </View>
);

const Step = ({ number, text, themeColors, isDark, last }) => (
    <View style={styles.stepRow}>
        <View style={styles.stepLeft}>
            <View style={[styles.stepNumber, { backgroundColor: themeColors.accentPrimary }]}>
                <Text style={styles.stepNumberText}>{number}</Text>
            </View>
            {!last && <View style={[styles.stepLine, { backgroundColor: themeColors.accentPrimary + '30' }]} />}
        </View>
        <Text style={[styles.stepText, { color: isDark ? themeColors.textMain : themeColors.textMainLight }]}>{text}</Text>
    </View>
);

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    safeArea: {
        flex: 1,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingVertical: 16,
    },
    backBtn: {
        width: 44,
        height: 44,
        borderRadius: 22,
        justifyContent: 'center',
        alignItems: 'center',
    },
    title: {
        fontSize: 20,
        fontWeight: 'bold',
    },
    scrollContent: {
        paddingHorizontal: 20,
        paddingBottom: 40,
    },
    heroCard: {
        borderRadius: 24,
        padding: 24,
        alignItems: 'center',
        marginBottom: 32,
        elevation: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.3,
        shadowRadius: 15,
    },
    heroIcon: {
        marginBottom: 16,
    },
    heroTitle: {
        color: '#FFF',
        fontSize: 26,
        fontWeight: '900',
        marginBottom: 8,
        textAlign: 'center',
    },
    heroSubtitle: {
        color: 'rgba(255,255,255,0.9)',
        fontSize: 14,
        textAlign: 'center',
        lineHeight: 20,
    },
    section: {
        marginBottom: 32,
    },
    sectionTitle: {
        fontSize: 12,
        fontWeight: '900',
        textTransform: 'uppercase',
        letterSpacing: 2,
        marginBottom: 16,
        marginLeft: 4,
    },
    featuresGrid: {
        flexDirection: 'row',
        gap: 16,
    },
    featureCard: {
        flex: 1,
        borderRadius: 20,
        padding: 20,
        borderWidth: 1,
    },
    featureTitle: {
        fontSize: 16,
        fontWeight: '800',
        marginTop: 12,
        marginBottom: 4,
    },
    featureDescription: {
        fontSize: 12,
        lineHeight: 18,
    },
    slotCard: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        borderRadius: 20,
        borderWidth: 1,
        marginBottom: 12,
    },
    slotIconBox: {
        width: 44,
        height: 44,
        borderRadius: 14,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 16,
    },
    slotInfo: {
        flex: 1,
    },
    slotTitle: {
        fontSize: 16,
        fontWeight: '700',
        marginBottom: 2,
    },
    slotDetail: {
        fontSize: 13,
    },
    instructionCard: {
        borderRadius: 24,
        padding: 24,
        borderWidth: 1,
    },
    stepRow: {
        flexDirection: 'row',
        gap: 16,
        marginBottom: 4,
    },
    stepLeft: {
        alignItems: 'center',
    },
    stepNumber: {
        width: 28,
        height: 28,
        borderRadius: 14,
        justifyContent: 'center',
        alignItems: 'center',
    },
    stepNumberText: {
        color: '#FFF',
        fontSize: 14,
        fontWeight: '900',
    },
    stepLine: {
        width: 2,
        height: 30,
        marginVertical: 4,
    },
    stepText: {
        flex: 1,
        fontSize: 15,
        fontWeight: '600',
        paddingTop: 4,
    },
    contactCard: {
        borderRadius: 24,
        borderWidth: 1,
        overflow: 'hidden',
    },
    contactItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 20,
        gap: 16,
    },
    contactText: {
        flex: 1,
        fontSize: 15,
        fontWeight: '700',
    },
    divider: {
        height: 1,
        marginHorizontal: 20,
    }
});
