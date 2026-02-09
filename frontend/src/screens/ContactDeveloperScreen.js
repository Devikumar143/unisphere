import React from 'react';
import { StyleSheet, View, Text, TouchableOpacity, Linking, Platform, ScrollView } from 'react-native';
import { BlurView } from 'expo-blur';
import { ArrowLeft, Mail, Instagram, Phone, MessageSquare, ExternalLink, ShieldCheck } from 'lucide-react-native';
import { COLORS, SIZES } from '../constants/theme';
import { useTheme } from '../context/ThemeContext';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function ContactDeveloperScreen({ navigation }) {
    const { isDark, themeColors } = useTheme();

    const contactDetails = {
        email: 'anegondhikumar2@gmail.com',
        instagram: 'devi_._kumar',
        phone: '+91 93927 36301',
        whatsapp: '+91 93927 36301'
    };

    const handleEmail = () => {
        Linking.openURL(`mailto:${contactDetails.email}?subject=UniSphere Blue Subscription Request`);
    };

    const handleInstagram = () => {
        Linking.openURL(`https://instagram.com/${contactDetails.instagram}`);
    };

    const handleCall = () => {
        if (contactDetails.phone.includes('X')) {
            alert("Phone number not yet configured. Please use Email or Instagram.");
            return;
        }
        Linking.openURL(`tel:${contactDetails.phone}`);
    };

    return (
        <View style={[styles.container, { backgroundColor: isDark ? themeColors.bgDark : themeColors.bgLight }]}>
            <SafeAreaView style={styles.safeArea}>
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => navigation.goBack()} style={[styles.backBtn, { backgroundColor: isDark ? themeColors.bgCard : themeColors.bgCardLight }]}>
                        <ArrowLeft color={isDark ? themeColors.textMain : themeColors.textMainLight} size={24} />
                    </TouchableOpacity>
                    <Text style={[styles.title, { color: isDark ? themeColors.textMain : themeColors.textMainLight, fontFamily: 'PlayfairDisplay-Bold' }]}>Contact Developer</Text>
                    <View style={{ width: 40 }} />
                </View>

                <ScrollView contentContainerStyle={styles.content}>
                    <View style={[styles.infoCard, { backgroundColor: themeColors.accentPrimary + '10', borderColor: themeColors.accentPrimary + '30' }]}>
                        <ShieldCheck size={40} color={themeColors.accentPrimary} style={{ marginBottom: 16 }} />
                        <Text style={[styles.infoTitle, { color: isDark ? themeColors.textMain : themeColors.textMainLight }]}>Subscription Activation</Text>
                        <Text style={[styles.infoDesc, { color: isDark ? themeColors.textMuted : themeColors.textMutedLight }]}>
                            To activate your **UniSphere Blue Badge**, please contact the developer directly. Manual activation ensures the highest level of security and personalized setup for your campus profile.
                        </Text>
                    </View>

                    <Text style={[styles.sectionTitle, { color: isDark ? themeColors.textMuted : themeColors.textMutedLight }]}>Direct Channels</Text>

                    <TouchableOpacity style={[styles.contactItem, { backgroundColor: isDark ? themeColors.bgCard : themeColors.bgCardLight }]} onPress={handleEmail}>
                        <View style={[styles.iconBox, { backgroundColor: '#EA433520' }]}>
                            <Mail size={22} color="#EA4335" />
                        </View>
                        <View style={styles.contactInfo}>
                            <Text style={[styles.contactLabel, { color: isDark ? themeColors.textDim : themeColors.textDimLight }]}>Email</Text>
                            <Text style={[styles.contactValue, { color: isDark ? themeColors.textMain : themeColors.textMainLight }]}>{contactDetails.email}</Text>
                        </View>
                        <ExternalLink size={18} color={themeColors.textDim} />
                    </TouchableOpacity>

                    <TouchableOpacity style={[styles.contactItem, { backgroundColor: isDark ? themeColors.bgCard : themeColors.bgCardLight }]} onPress={handleInstagram}>
                        <View style={[styles.iconBox, { backgroundColor: '#E4405F20' }]}>
                            <Instagram size={22} color="#E4405F" />
                        </View>
                        <View style={styles.contactInfo}>
                            <Text style={[styles.contactLabel, { color: isDark ? themeColors.textDim : themeColors.textDimLight }]}>Instagram</Text>
                            <Text style={[styles.contactValue, { color: isDark ? themeColors.textMain : themeColors.textMainLight }]}>@{contactDetails.instagram}</Text>
                        </View>
                        <ExternalLink size={18} color={themeColors.textDim} />
                    </TouchableOpacity>

                    <TouchableOpacity style={[styles.contactItem, { backgroundColor: isDark ? themeColors.bgCard : themeColors.bgCardLight }]} onPress={handleCall}>
                        <View style={[styles.iconBox, { backgroundColor: '#34A85320' }]}>
                            <Phone size={22} color="#34A853" />
                        </View>
                        <View style={styles.contactInfo}>
                            <Text style={[styles.contactLabel, { color: isDark ? themeColors.textDim : themeColors.textDimLight }]}>Phone / WhatsApp</Text>
                            <Text style={[styles.contactValue, { color: isDark ? themeColors.textMain : themeColors.textMainLight }]}>{contactDetails.phone}</Text>
                        </View>
                        <ExternalLink size={18} color={themeColors.textDim} />
                    </TouchableOpacity>

                    <View style={styles.footer}>
                        <Text style={[styles.footerText, { color: isDark ? themeColors.textDim : themeColors.textDimLight }]}>
                            Available Mon-Fri, 9AM - 6PM
                        </Text>
                    </View>
                </ScrollView>
            </SafeAreaView>
        </View>
    );
}

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
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
    },
    title: {
        fontSize: 18,
        fontWeight: '700',
    },
    content: {
        padding: 20,
    },
    infoCard: {
        padding: 24,
        borderRadius: 24,
        alignItems: 'center',
        borderWidth: 1,
        marginBottom: 32,
    },
    infoTitle: {
        fontSize: 20,
        fontWeight: '800',
        marginBottom: 12,
    },
    infoDesc: {
        fontSize: 14,
        textAlign: 'center',
        lineHeight: 22,
        opacity: 0.9,
    },
    sectionTitle: {
        fontSize: 12,
        fontWeight: '900',
        textTransform: 'uppercase',
        letterSpacing: 1.5,
        marginBottom: 16,
        marginLeft: 4,
    },
    contactItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        borderRadius: 20,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.05)',
    },
    iconBox: {
        width: 48,
        height: 48,
        borderRadius: 14,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 16,
    },
    contactInfo: {
        flex: 1,
    },
    contactLabel: {
        fontSize: 12,
        fontWeight: '600',
        marginBottom: 2,
    },
    contactValue: {
        fontSize: 16,
        fontWeight: '700',
    },
    footer: {
        marginTop: 40,
        alignItems: 'center',
    },
    footerText: {
        fontSize: 13,
        fontWeight: '500',
    }
});
