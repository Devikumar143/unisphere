import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, ScrollView, Image, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { ArrowLeft, Phone, Video, Bell, BellOff, Shield, Palette, Trash, UserX, AlertCircle, Image as ImageIcon, Bookmark, User } from 'lucide-react-native';
import { useTheme } from '../context/ThemeContext';
import { fetchMessages } from '../services/api';

export default function ChatInfoScreen({
    user,
    chatTarget,
    onBack,
    onOpenSharedMedia,
    onOpenSavedMessages,
    isMuted,
    onToggleMute,
    encryptionEnabled,
    onToggleEncryption,
    onClearChat,
    onBlockUser,
    onReportUser
}) {
    const { isDark, themeColors } = useTheme();
    const [mediaCount, setMediaCount] = useState(0);
    const [recentMedia, setRecentMedia] = useState([]);

    useEffect(() => {
        loadMediaPreview();
    }, []);

    const loadMediaPreview = async () => {
        try {
            const messages = await fetchMessages(user.id, chatTarget.id);
            const mediaMessages = messages.filter(m =>
                m.messageType === 'image' || (m.attachmentUrls && m.attachmentUrls.length > 0)
            );

            setMediaCount(mediaMessages.length);

            // Get up to 6 most recent media items for preview
            const recent = mediaMessages
                .slice(-6)
                .reverse()
                .flatMap(m => m.attachmentUrls || []);
            setRecentMedia(recent.slice(0, 6));
        } catch (error) {
            console.error('Error loading media preview:', error);
        }
    };

    return (
        <View style={[styles.container, { backgroundColor: isDark ? themeColors.bgDark : themeColors.bgLight }]}>
            <SafeAreaView edges={['top']} style={{ flex: 1 }}>
                {/* Header */}
                <View style={styles.header}>
                    <TouchableOpacity onPress={onBack} style={styles.backButton}>
                        <ArrowLeft color={isDark ? themeColors.textMain : themeColors.textMainLight} size={24} />
                    </TouchableOpacity>
                    <Text style={[styles.headerTitle, { color: isDark ? themeColors.textMain : themeColors.textMainLight }]}>
                        Contact Info
                    </Text>
                    <View style={{ width: 40 }} />
                </View>

                <ScrollView showsVerticalScrollIndicator={false}>
                    {/* Profile Section */}
                    <View style={styles.profileSection}>
                        <View style={styles.avatarContainer}>
                            {chatTarget.avatar ? (
                                <Image source={{ uri: chatTarget.avatar }} style={styles.avatar} />
                            ) : (
                                <LinearGradient
                                    colors={['#8B5CF6', '#6366F1']}
                                    style={styles.avatar}
                                >
                                    <User size={60} color="#FFFFFF" />
                                </LinearGradient>
                            )}
                        </View>
                        <Text style={[styles.profileName, { color: isDark ? themeColors.textMain : themeColors.textMainLight }]}>
                            {chatTarget.name}
                        </Text>
                        {chatTarget.role && (
                            <Text style={[styles.profileRole, { color: isDark ? themeColors.textDim : themeColors.textDimLight }]}>
                                {chatTarget.role}
                            </Text>
                        )}
                    </View>

                    {/* Quick Actions */}
                    <View style={[styles.quickActions, { backgroundColor: isDark ? themeColors.bgCard : '#FFFFFF' }]}>
                        <TouchableOpacity style={styles.quickActionButton}>
                            <View style={[styles.quickActionIcon, { backgroundColor: '#10B981' + '20' }]}>
                                <Phone color="#10B981" size={22} />
                            </View>
                            <Text style={[styles.quickActionText, { color: isDark ? themeColors.textMain : themeColors.textMainLight }]}>
                                Call
                            </Text>
                        </TouchableOpacity>

                        <TouchableOpacity style={styles.quickActionButton}>
                            <View style={[styles.quickActionIcon, { backgroundColor: '#3B82F6' + '20' }]}>
                                <Video color="#3B82F6" size={22} />
                            </View>
                            <Text style={[styles.quickActionText, { color: isDark ? themeColors.textMain : themeColors.textMainLight }]}>
                                Video
                            </Text>
                        </TouchableOpacity>

                        <TouchableOpacity style={styles.quickActionButton} onPress={onToggleMute}>
                            <View style={[styles.quickActionIcon, { backgroundColor: themeColors.accentPrimary + '20' }]}>
                                {isMuted ? (
                                    <BellOff color={themeColors.accentPrimary} size={22} />
                                ) : (
                                    <Bell color={themeColors.accentPrimary} size={22} />
                                )}
                            </View>
                            <Text style={[styles.quickActionText, { color: isDark ? themeColors.textMain : themeColors.textMainLight }]}>
                                {isMuted ? 'Unmute' : 'Mute'}
                            </Text>
                        </TouchableOpacity>
                    </View>

                    {/* Shared Media Section */}
                    <View style={[styles.section, { backgroundColor: isDark ? themeColors.bgCard : '#FFFFFF' }]}>
                        <TouchableOpacity
                            style={styles.sectionHeader}
                            onPress={onOpenSharedMedia}
                        >
                            <View style={styles.sectionTitleRow}>
                                <ImageIcon color={isDark ? themeColors.textMain : themeColors.textMainLight} size={20} />
                                <Text style={[styles.sectionTitle, { color: isDark ? themeColors.textMain : themeColors.textMainLight }]}>
                                    Shared Media
                                </Text>
                            </View>
                            <Text style={[styles.sectionCount, { color: isDark ? themeColors.textDim : themeColors.textDimLight }]}>
                                {mediaCount}
                            </Text>
                        </TouchableOpacity>

                        {recentMedia.length > 0 && (
                            <View style={styles.mediaGrid}>
                                {recentMedia.map((url, index) => (
                                    <TouchableOpacity
                                        key={index}
                                        style={styles.mediaGridItem}
                                        onPress={onOpenSharedMedia}
                                    >
                                        <Image source={{ uri: url }} style={styles.mediaGridImage} />
                                    </TouchableOpacity>
                                ))}
                            </View>
                        )}
                    </View>

                    {/* Saved Messages */}
                    <View style={[styles.section, { backgroundColor: isDark ? themeColors.bgCard : '#FFFFFF', marginTop: 12 }]}>
                        <TouchableOpacity
                            style={styles.settingsItem}
                            onPress={onOpenSavedMessages}
                        >
                            <View style={[styles.settingsIconCircle, { backgroundColor: themeColors.accentPrimary + '20' }]}>
                                <Bookmark color={themeColors.accentPrimary} size={20} />
                            </View>
                            <Text style={[styles.settingsItemTitle, { color: isDark ? themeColors.textMain : themeColors.textMainLight }]}>
                                Saved Messages
                            </Text>
                        </TouchableOpacity>
                    </View>

                    {/* Chat Settings */}
                    <View style={[styles.section, { backgroundColor: isDark ? themeColors.bgCard : '#FFFFFF', marginTop: 12 }]}>
                        <Text style={[styles.sectionLabel, { color: isDark ? themeColors.textDim : themeColors.textDimLight }]}>
                            CHAT SETTINGS
                        </Text>

                        <TouchableOpacity
                            style={styles.settingsItem}
                            onPress={onToggleEncryption}
                        >
                            <View style={[styles.settingsIconCircle, { backgroundColor: '#10B981' + '20' }]}>
                                <Shield color="#10B981" size={20} />
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={[styles.settingsItemTitle, { color: isDark ? themeColors.textMain : themeColors.textMainLight }]}>
                                    End-to-End Encryption
                                </Text>
                                <Text style={[styles.settingsItemSubtitle, { color: isDark ? themeColors.textDim : themeColors.textDimLight }]}>
                                    {encryptionEnabled ? 'Enabled' : 'Disabled'}
                                </Text>
                            </View>
                        </TouchableOpacity>

                        <TouchableOpacity style={styles.settingsItem}>
                            <View style={[styles.settingsIconCircle, { backgroundColor: '#F59E0B' + '20' }]}>
                                <Palette color="#F59E0B" size={20} />
                            </View>
                            <Text style={[styles.settingsItemTitle, { color: isDark ? themeColors.textMain : themeColors.textMainLight }]}>
                                Wallpaper
                            </Text>
                        </TouchableOpacity>
                    </View>

                    {/* Danger Zone */}
                    <View style={[styles.section, { backgroundColor: isDark ? themeColors.bgCard : '#FFFFFF', marginTop: 12, marginBottom: 40 }]}>
                        <Text style={[styles.sectionLabel, { color: '#EF4444' }]}>
                            DANGER ZONE
                        </Text>

                        <TouchableOpacity
                            style={styles.settingsItem}
                            onPress={onClearChat}
                        >
                            <View style={[styles.settingsIconCircle, { backgroundColor: '#EF4444' + '20' }]}>
                                <Trash color="#EF4444" size={20} />
                            </View>
                            <Text style={[styles.settingsItemTitle, { color: '#EF4444' }]}>
                                Clear Chat
                            </Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.settingsItem}
                            onPress={onBlockUser}
                        >
                            <View style={[styles.settingsIconCircle, { backgroundColor: '#EF4444' + '20' }]}>
                                <UserX color="#EF4444" size={20} />
                            </View>
                            <Text style={[styles.settingsItemTitle, { color: '#EF4444' }]}>
                                Block {chatTarget.name}
                            </Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[styles.settingsItem, { borderBottomWidth: 0 }]}
                            onPress={onReportUser}
                        >
                            <View style={[styles.settingsIconCircle, { backgroundColor: '#EF4444' + '20' }]}>
                                <AlertCircle color="#EF4444" size={20} />
                            </View>
                            <Text style={[styles.settingsItemTitle, { color: '#EF4444' }]}>
                                Report User
                            </Text>
                        </TouchableOpacity>
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
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 12,
    },
    backButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '700',
    },
    profileSection: {
        alignItems: 'center',
        paddingVertical: 32,
    },
    avatarContainer: {
        marginBottom: 16,
    },
    avatar: {
        width: 120,
        height: 120,
        borderRadius: 60,
        justifyContent: 'center',
        alignItems: 'center',
    },
    profileName: {
        fontSize: 24,
        fontWeight: '900',
        marginBottom: 4,
    },
    profileRole: {
        fontSize: 14,
        fontWeight: '500',
    },
    quickActions: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        marginHorizontal: 16,
        marginBottom: 12,
        padding: 20,
        borderRadius: 16,
    },
    quickActionButton: {
        alignItems: 'center',
    },
    quickActionIcon: {
        width: 56,
        height: 56,
        borderRadius: 28,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 8,
    },
    quickActionText: {
        fontSize: 12,
        fontWeight: '600',
    },
    section: {
        marginHorizontal: 16,
        borderRadius: 16,
        padding: 16,
    },
    sectionLabel: {
        fontSize: 11,
        fontWeight: '900',
        letterSpacing: 0.5,
        marginBottom: 12,
        paddingHorizontal: 4,
    },
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    sectionTitleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: '700',
    },
    sectionCount: {
        fontSize: 14,
        fontWeight: '600',
    },
    mediaGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 4,
    },
    mediaGridItem: {
        width: '32%',
        aspectRatio: 1,
        borderRadius: 8,
        overflow: 'hidden',
    },
    mediaGridImage: {
        width: '100%',
        height: '100%',
    },
    settingsItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(128,128,128,0.1)',
    },
    settingsIconCircle: {
        width: 44,
        height: 44,
        borderRadius: 22,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 16,
    },
    settingsItemTitle: {
        fontSize: 16,
        fontWeight: '600',
    },
    settingsItemSubtitle: {
        fontSize: 13,
        fontWeight: '500',
        marginTop: 2,
    },
});
