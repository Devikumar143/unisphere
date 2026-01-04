import React, { useState } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, Switch, ScrollView } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { ArrowLeft, Bell, Lock, Moon, LogOut, ChevronRight, User, Instagram, Mail } from 'lucide-react-native';
import { COLORS, SIZES } from '../constants/theme';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../context/ThemeContext';

export default function SettingsScreen({ onBack, onLogout, onEditProfile }) {
    const { isDark, toggleTheme, themeColors } = useTheme();
    console.log('SettingsScreen Rendered', {
        hasOnBack: !!onBack,
        hasOnLogout: !!onLogout,
        hasOnEditProfile: !!onEditProfile
    });

    const [notifications, setNotifications] = useState(true);

    return (
        <View style={[styles.container, { backgroundColor: isDark ? themeColors.bgDark : themeColors.bgLight }]}>
            {/* Background elements removed for Organic Earth style */}

            <SafeAreaView style={styles.safeArea}>
                {/* Header */}
                <View style={styles.header}>
                    <TouchableOpacity onPress={onBack} style={[styles.backBtn, { backgroundColor: isDark ? themeColors.bgCard : themeColors.bgCardLight }]}>
                        <ArrowLeft color={isDark ? themeColors.textMain : themeColors.textMainLight} size={24} />
                    </TouchableOpacity>
                    <Text style={[styles.title, {
                        color: isDark ? themeColors.textMain : themeColors.textMainLight,
                        fontFamily: 'PlayfairDisplay-Bold'
                    }]}>Settings</Text>
                    <View style={{ width: 40 }} />
                </View>

                <ScrollView contentContainerStyle={styles.content}>

                    {/* Account Section */}
                    <Text style={[styles.sectionTitle, { color: isDark ? themeColors.textMuted : themeColors.textMutedLight }]}>Account</Text>
                    <View style={[styles.card, {
                        backgroundColor: isDark ? themeColors.bgCard : themeColors.bgCardLight,
                        borderColor: themeColors.accentPrimary + '15'
                    }]}>
                        <SettingItem
                            icon={User}
                            label="Edit Profile"
                            onPress={onEditProfile}
                            showArrow
                            themeColors={themeColors}
                            isDark={isDark}
                        />
                        <View style={[styles.divider, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }]} />
                        <SettingItem
                            icon={Lock}
                            label="Privacy & Security"
                            onPress={() => { }}
                            showArrow
                            themeColors={themeColors}
                            isDark={isDark}
                        />
                    </View>

                    {/* Preferences Section */}
                    <Text style={[styles.sectionTitle, { color: isDark ? themeColors.textMuted : themeColors.textMutedLight }]}>Preferences</Text>
                    <View style={[styles.card, {
                        backgroundColor: isDark ? themeColors.bgCard : themeColors.bgCardLight,
                        borderColor: themeColors.accentPrimary + '15'
                    }]}>
                        <SettingToggle
                            icon={Bell}
                            label="Notifications"
                            value={notifications}
                            onValueChange={setNotifications}
                            themeColors={themeColors}
                            isDark={isDark}
                        />
                        <View style={[styles.divider, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }]} />
                        <SettingToggle
                            icon={Moon}
                            label="Dark Mode"
                            value={isDark}
                            onValueChange={toggleTheme}
                            themeColors={themeColors}
                            isDark={isDark}
                        />
                    </View>

                    {/* Developer Details */}
                    <Text style={[styles.sectionTitle, { color: isDark ? themeColors.textMuted : themeColors.textMutedLight }]}>Developer</Text>
                    <View style={[styles.card, {
                        backgroundColor: isDark ? themeColors.bgCard : themeColors.bgCardLight,
                        borderColor: themeColors.accentPrimary + '15'
                    }]}>
                        <SettingItem
                            icon={Instagram}
                            label="Instagram: devi_._kumar"
                            onPress={() => { }}
                            themeColors={themeColors}
                            isDark={isDark}
                        />
                        <View style={[styles.divider, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }]} />
                        <SettingItem
                            icon={Mail}
                            label="Email: anegondhikumar2@gmail.com"
                            onPress={() => { }}
                            themeColors={themeColors}
                            isDark={isDark}
                        />
                    </View>

                    {/* Actions */}
                    <TouchableOpacity style={styles.logoutBtn} onPress={onLogout}>
                        <LogOut color={COLORS.accentError} size={20} style={{ marginRight: 12 }} />
                        <Text style={styles.logoutText}>Log Out</Text>
                    </TouchableOpacity>

                    <Text style={styles.versionText}>UniSphere v1.0.2 (Beta)</Text>

                </ScrollView>
            </SafeAreaView>
        </View>
    );
}

const SettingItem = ({ icon: Icon, label, onPress, showArrow, themeColors, isDark }) => (
    <TouchableOpacity style={styles.item} onPress={onPress}>
        <View style={styles.itemLeft}>
            <View style={[styles.iconBox, { backgroundColor: isDark ? themeColors.bgDark : themeColors.bgLight }]}>
                <Icon color={themeColors.accentPrimary} size={20} />
            </View>
            <Text style={[styles.itemLabel, { color: isDark ? themeColors.textMain : themeColors.textMainLight }]}>{label}</Text>
        </View>
        {showArrow && <ChevronRight color={isDark ? themeColors.textMuted : themeColors.textMutedLight} size={20} />}
    </TouchableOpacity>
);

const SettingToggle = ({ icon: Icon, label, value, onValueChange, themeColors, isDark }) => (
    <View style={styles.item}>
        <View style={styles.itemLeft}>
            <View style={[styles.iconBox, { backgroundColor: isDark ? themeColors.bgDark : themeColors.bgLight }]}>
                <Icon color={themeColors.accentPrimary} size={20} />
            </View>
            <Text style={[styles.itemLabel, { color: isDark ? themeColors.textMain : themeColors.textMainLight }]}>{label}</Text>
        </View>
        <Switch
            trackColor={{ false: isDark ? '#333' : '#DDD', true: themeColors.accentPrimary }}
            thumbColor={'#fff'}
            onValueChange={onValueChange}
            value={value}
        />
    </View>
);

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.bgDark,
    },
    safeArea: {
        flex: 1,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: SIZES.padding,
        paddingVertical: 16,
        marginBottom: 0,
    },
    backBtn: {
        width: 40,
        height: 40,
        justifyContent: 'center',
        alignItems: 'center',
        borderRadius: 20,
        backgroundColor: 'rgba(255,255,255,0.05)',
    },
    title: {
        fontSize: 20,
        fontWeight: '700',
        color: COLORS.textMain,
    },
    content: {
        padding: SIZES.padding,
    },
    sectionTitle: {
        fontSize: 14,
        fontWeight: '600',
        color: COLORS.textDim,
        marginBottom: 12,
        marginLeft: 4,
        marginTop: 8,
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
    card: {
        borderRadius: SIZES.radiusMedium,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.08)',
        backgroundColor: 'rgba(255,255,255,0.03)',
        marginBottom: 24,
    },
    item: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 16,
        height: 64,
    },
    itemLeft: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    iconBox: {
        width: 32,
        height: 32,
        borderRadius: 8,
        backgroundColor: 'rgba(255,255,255,0.05)',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 16,
    },
    itemLabel: {
        fontSize: 16,
        color: COLORS.textMain,
        fontWeight: '500',
    },
    divider: {
        height: 1,
        backgroundColor: 'rgba(255,255,255,0.05)',
        marginLeft: 64,
    },
    logoutBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        height: 56,
        borderRadius: SIZES.radiusMedium,
        backgroundColor: 'rgba(239, 68, 68, 0.1)', // Red tint
        borderWidth: 1,
        borderColor: 'rgba(239, 68, 68, 0.2)',
        marginTop: 8,
    },
    logoutText: {
        color: COLORS.accentError,
        fontSize: 16,
        fontWeight: '700',
    },
    versionText: {
        textAlign: 'center',
        color: '#444',
        marginTop: 32,
        fontSize: 12,
    }
});
