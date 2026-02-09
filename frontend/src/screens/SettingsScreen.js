import React, { useState } from 'react';
import { ArrowLeft, Bell, Lock, Moon, LogOut, ChevronRight, User, Instagram, Mail, Users, Trash2, Plus, X, CheckCheck, Shield, RefreshCw, BadgeCheck, Sparkles, Megaphone } from 'lucide-react-native';
import { StyleSheet, View, Text, TouchableOpacity, Switch, ScrollView, Modal, Image } from 'react-native';
import { COLORS, SIZES } from '../constants/theme';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../context/ThemeContext';
import signalProtocol from '../services/signalProtocol';
import { Alert } from 'react-native';

export default function SettingsScreen({ onBack, onLogout, onEditProfile, savedAccounts = [], currentUser, onSwitchAccount, onAddAccount, onRemoveAccount, onOpenAdManagement, onApplyVerification, onOpenAdminVerify, onOpenSubscription, onOpenAdInfo }) {
    const { isDark, toggleTheme, themeColors } = useTheme();
    const [accountModalVisible, setAccountModalVisible] = useState(false);
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
                        <View style={[styles.divider, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }]} />
                        <SettingItem
                            icon={Sparkles}
                            label={currentUser?.subscriptionType === 'blue' ? "UniSphere Blue (Active)" : "UniSphere Blue"}
                            onPress={onOpenSubscription}
                            showArrow
                            themeColors={themeColors}
                            isDark={isDark}
                            iconColor="#2563EB"
                        />
                        {!currentUser?.isVerified && (
                            <>
                                <View style={[styles.divider, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }]} />
                                <SettingItem
                                    icon={BadgeCheck}
                                    label="Apply for Verification"
                                    onPress={onApplyVerification}
                                    showArrow
                                    themeColors={themeColors}
                                    isDark={isDark}
                                />
                            </>
                        )}
                    </View>

                    {/* Security Fix Utility */}
                    <Text style={[styles.sectionTitle, { color: isDark ? themeColors.textMuted : themeColors.textMutedLight }]}>Security</Text>
                    <View style={[styles.card, {
                        backgroundColor: isDark ? themeColors.bgCard : themeColors.bgCardLight,
                        borderColor: themeColors.accentPrimary + '15'
                    }]}>
                        <SettingItem
                            icon={Shield}
                            label="Register Encryption Keys"
                            onPress={async () => {
                                try {
                                    await signalProtocol.registerKeys();
                                    Alert.alert("Success", "Encryption keys have been synchronized with the server!");
                                } catch (e) {
                                    Alert.alert("Error", "Failed to sync keys: " + e.message);
                                }
                            }}
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

                    {/* Admin Tools */}
                    {currentUser?.role === 'Admin' && (
                        <>
                            <Text style={[styles.sectionTitle, { color: isDark ? themeColors.textMuted : themeColors.textMutedLight }]}>Admin Tools</Text>
                            <View style={[styles.card, {
                                backgroundColor: isDark ? themeColors.bgCard : themeColors.bgCardLight,
                                borderColor: themeColors.accentPrimary + '15'
                            }]}>
                                <SettingItem
                                    icon={Users}
                                    label="Ad Management"
                                    onPress={onOpenAdManagement}
                                    showArrow
                                    themeColors={themeColors}
                                    isDark={isDark}
                                />
                                <View style={[styles.divider, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }]} />
                                <SettingItem
                                    icon={BadgeCheck}
                                    label="Verification Requests"
                                    onPress={onOpenAdminVerify}
                                    showArrow
                                    themeColors={themeColors}
                                    isDark={isDark}
                                />
                            </View>
                        </>
                    )}

                    {/* Advertising Section */}
                    <Text style={[styles.sectionTitle, { color: isDark ? themeColors.textMuted : themeColors.textMutedLight }]}>Promotion</Text>
                    <View style={[styles.card, {
                        backgroundColor: isDark ? themeColors.bgCard : themeColors.bgCardLight,
                        borderColor: themeColors.accentPrimary + '15'
                    }]}>
                        <SettingItem
                            icon={Megaphone}
                            label="Advertising Information"
                            onPress={onOpenAdInfo}
                            showArrow
                            themeColors={themeColors}
                            isDark={isDark}
                        />
                    </View>

                    {/* Actions */}
                    <TouchableOpacity style={[styles.logoutBtn, { marginBottom: 12 }]} onPress={() => setAccountModalVisible(true)}>
                        <Users color={COLORS.accentPrimary} size={20} style={{ marginRight: 12 }} />
                        <Text style={[styles.logoutText, { color: COLORS.accentPrimary }]}>Switch Accounts</Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.logoutBtn} onPress={onLogout}>
                        <LogOut color={COLORS.accentError} size={20} style={{ marginRight: 12 }} />
                        <Text style={styles.logoutText}>Log Out</Text>
                    </TouchableOpacity>

                    <Text style={styles.versionText}>UniSphere v1.0.2 (Beta)</Text>

                </ScrollView>
            </SafeAreaView>

            {/* Account Switcher Modal */}
            <Modal
                transparent
                visible={accountModalVisible}
                onRequestClose={() => setAccountModalVisible(false)}
                animationType="fade"
                statusBarTranslucent={true}
            >
                <View style={[styles.modalOverlay, { backgroundColor: 'rgba(0,0,0,0.7)' }]}>
                    <View style={[styles.accountModalCard, { backgroundColor: isDark ? themeColors.bgCard : '#fff', borderColor: themeColors.border }]}>
                        <View style={styles.modalHeader}>
                            <Text style={[styles.modalTitle, { color: isDark ? themeColors.textMain : themeColors.textMainLight }]}>Switch Accounts</Text>
                            <TouchableOpacity onPress={() => setAccountModalVisible(false)}>
                                <X size={24} color={isDark ? themeColors.textMuted : themeColors.textMutedLight} />
                            </TouchableOpacity>
                        </View>

                        <ScrollView style={{ maxHeight: 300 }}>
                            {savedAccounts.map(account => (
                                <TouchableOpacity
                                    key={account.id}
                                    style={[styles.accountItem, {
                                        backgroundColor: account.id === currentUser?.id ? (isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)') : 'transparent',
                                        borderColor: account.id === currentUser?.id ? themeColors.accentPrimary : 'transparent',
                                        borderWidth: 1
                                    }]}
                                    onPress={() => {
                                        if (account.id !== currentUser?.id) {
                                            setAccountModalVisible(false);
                                            onSwitchAccount(account);
                                        }
                                    }}
                                >
                                    <View style={styles.accountInfo}>
                                        <View style={[styles.accountAvatar, { backgroundColor: themeColors.accentPrimary }]}>
                                            {account.avatar ? (
                                                <Image source={{ uri: account.avatar }} style={{ width: '100%', height: '100%' }} />
                                            ) : (
                                                <Text style={{ color: '#fff', fontWeight: 'bold' }}>{account.full_name?.[0] || 'U'}</Text>
                                            )}
                                        </View>
                                        <View>
                                            <Text style={[styles.accountName, { color: isDark ? themeColors.textMain : themeColors.textMainLight }]}>
                                                {account.full_name} {account.id === currentUser?.id && '(Active)'}
                                            </Text>
                                            <Text style={[styles.accountHandle, { color: isDark ? themeColors.textMuted : themeColors.textMutedLight }]}>@{account.username}</Text>
                                        </View>
                                    </View>

                                    {account.id !== currentUser?.id ? (
                                        <TouchableOpacity
                                            style={styles.removeAccountBtn}
                                            onPress={() => onRemoveAccount(account.id)}
                                        >
                                            <Trash2 size={18} color={COLORS.error} />
                                        </TouchableOpacity>
                                    ) : (
                                        <CheckCheck size={20} color={themeColors.accentPrimary} />
                                    )}
                                </TouchableOpacity>
                            ))}
                        </ScrollView>

                        <TouchableOpacity
                            style={[styles.addAccountBtn, { borderColor: themeColors.border }]}
                            onPress={() => {
                                setAccountModalVisible(false);
                                onAddAccount();
                            }}
                        >
                            <Plus size={20} color={themeColors.accentPrimary} />
                            <Text style={[styles.addAccountText, { color: themeColors.accentPrimary }]}>Add New Account</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </View>
    );
}

const SettingItem = ({ icon: Icon, label, onPress, showArrow, themeColors, isDark, iconColor }) => (
    <TouchableOpacity style={styles.item} onPress={onPress}>
        <View style={styles.itemLeft}>
            <View style={[styles.iconBox, { backgroundColor: isDark ? themeColors.bgDark : themeColors.bgLight }]}>
                <Icon color={iconColor || themeColors.accentPrimary} size={20} />
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
    },
    modalOverlay: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    accountModalCard: {
        width: '100%',
        borderRadius: 20,
        padding: 20,
        borderWidth: 1,
        maxHeight: '60%',
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: '700',
    },
    accountItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        borderRadius: 12,
        marginBottom: 8,
    },
    accountInfo: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
    },
    accountAvatar: {
        width: 40,
        height: 40,
        borderRadius: 20,
        marginRight: 12,
        justifyContent: 'center',
        alignItems: 'center',
        overflow: 'hidden',
    },
    accountName: {
        fontSize: 16,
        fontWeight: '600',
    },
    accountHandle: {
        fontSize: 12,
    },
    addAccountBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
        borderRadius: 12,
        borderWidth: 1,
        borderStyle: 'dashed',
        marginTop: 10,
    },
    addAccountText: {
        fontSize: 16,
        fontWeight: '600',
        marginLeft: 8,
    },
    removeAccountBtn: {
        padding: 8,
    }
});
