import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Image, ActivityIndicator, Animated } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, SIZES, GLASS } from '../constants/theme';
import { BlurView } from 'expo-blur';
import { ArrowLeft, Heart, MessageCircle, UserPlus, Bell, User } from 'lucide-react-native';
import { useTheme } from '../context/ThemeContext';
import { fetchNotifications, markNotificationRead, markAllNotificationsRead } from '../services/api';
import soundService from '../services/soundService';

export default function NotificationsScreen({ user, onBack, onViewPost, onViewProfile }) {
    const { isDark, themeColors } = useTheme();
    const [notifications, setNotifications] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    useEffect(() => {
        loadNotifications();
    }, []);

    const loadNotifications = async () => {
        try {
            const data = await fetchNotifications(user.id);
            setNotifications(data);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const handleNotificationPress = async (notification) => {
        // Premium Feedback
        soundService.playClink();

        // Mark as read locally
        if (!notification.is_read) {
            setNotifications(prev => prev.map(n => n.id === notification.id ? { ...n, is_read: true } : n));
            // Sync with backend silently
            markNotificationRead(notification.id, user.id);
        }

        // Navigate
        if (notification.type === 'FOLLOW') {
            // Fetch basic user data stub and navigate
            onViewProfile && onViewProfile({ id: notification.sender_id });
        } else if (notification.type === 'LIKE' || notification.type === 'COMMENT' || notification.type === 'MENTION') {
            // View the interactor's profile
            onViewProfile && onViewProfile({ id: notification.sender_id });
        } else if (notification.type === 'VERIFICATION_UPDATE') {
            // Go to settings to see status
            onBack && onBack();
        }
    };

    const handleMarkAllRead = async () => {
        soundService.triggerHaptic('success');
        setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
        await markAllNotificationsRead(user.id);
    };

    const renderIcon = (type) => {
        switch (type) {
            case 'LIKE': return <Heart size={20} color={COLORS.accentError} fill={COLORS.accentError} />;
            case 'COMMENT': return <MessageCircle size={20} color={COLORS.accentPrimary} fill={COLORS.accentPrimary} />;
            case 'FOLLOW': return <UserPlus size={20} color={COLORS.accentSuccess} />;
            case 'MENTION': return <Bell size={20} color={COLORS.accentSecondary} fill={COLORS.accentSecondary} />;
            case 'VERIFICATION_UPDATE': return <Bell size={20} color={COLORS.accentPrimary} fill={COLORS.accentPrimary} />;
            default: return <Bell size={20} color={isDark ? themeColors.textDim : themeColors.textDimLight} />;
        }
    };

    const formatText = (item) => {
        const name = item.sender_name || 'Someone';
        const textColor = isDark ? themeColors.textMain : themeColors.textMainLight;
        switch (item.type) {
            case 'LIKE': return <Text style={{ color: textColor }}><Text style={{ fontWeight: 'bold' }}>{name}</Text> liked your post.</Text>;
            case 'COMMENT': return <Text style={{ color: textColor }}><Text style={{ fontWeight: 'bold' }}>{name}</Text> commented on your post.</Text>;
            case 'FOLLOW': return <Text style={{ color: textColor }}><Text style={{ fontWeight: 'bold' }}>{name}</Text> started following you.</Text>;
            case 'MENTION': return <Text style={{ color: textColor }}><Text style={{ fontWeight: 'bold' }}>{name}</Text> mentioned you in a post.</Text>;
            case 'VERIFICATION_UPDATE': return <Text style={{ color: textColor }}>Your verification request has been updated.</Text>;
            default: return <Text style={{ color: textColor }}>New notification.</Text>;
        }
    };

    const formatTime = (dateString) => {
        const date = new Date(dateString);
        const now = new Date();
        const diff = (now - date) / 1000; // seconds

        if (diff < 60) return 'Just now';
        if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
        if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
        return `${Math.floor(diff / 86400)}d ago`;
    };

    return (
        <View style={[styles.container, { backgroundColor: isDark ? themeColors.bgDark : themeColors.bgLight }]}>
            {/* Background elements removed for Organic Earth style */}

            <SafeAreaView style={styles.safeArea}>
                {/* Floating Header */}
                <View style={styles.headerSpacer}>
                    <BlurView intensity={25} tint={isDark ? "dark" : "light"} style={styles.headerPill}>
                        <View style={styles.header}>
                            <TouchableOpacity onPress={onBack} style={[styles.backBtn, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)' }]} activeOpacity={0.7}>
                                <ArrowLeft color={isDark ? themeColors.textMain : themeColors.textMainLight} size={20} />
                            </TouchableOpacity>
                            <Text style={[styles.title, {
                                color: isDark ? themeColors.textMain : themeColors.textMainLight,
                                fontFamily: 'PlayfairDisplay-Bold'
                            }]}>Activity</Text>
                            <TouchableOpacity onPress={handleMarkAllRead} style={styles.readAllBtn} activeOpacity={0.7}>
                                <Text style={[styles.readAll, { color: themeColors.accentPrimary }]}>Mark All</Text>
                            </TouchableOpacity>
                        </View>
                    </BlurView>
                </View>

                {loading ? (
                    <ActivityIndicator size="large" color={themeColors.accentPrimary} style={{ marginTop: 50 }} />
                ) : (
                    <FlatList
                        data={notifications}
                        keyExtractor={item => item.id}
                        refreshing={refreshing}
                        onRefresh={() => {
                            setRefreshing(true);
                            loadNotifications();
                        }}
                        contentContainerStyle={styles.list}
                        ListEmptyComponent={
                            <View style={styles.emptyContainer}>
                                <Bell size={48} color={isDark ? themeColors.textDim : themeColors.textDimLight} style={{ marginBottom: 16, opacity: 0.5 }} />
                                <Text style={[styles.emptyText, { color: isDark ? themeColors.textDim : themeColors.textDimLight }]}>No notifications yet</Text>
                            </View>
                        }
                        renderItem={({ item }) => {
                            const glowColors = {
                                'LIKE': ['#FF006E', '#FF4D8F'],
                                'COMMENT': [themeColors.accentPrimary, themeColors.accentSecondary],
                                'FOLLOW': ['#10B981', '#34D399'],
                                'default': ['rgba(255,255,255,0.1)', 'rgba(255,255,255,0.05)']
                            };
                            const avatarGlow = glowColors[item.type] || glowColors['default'];

                            return (
                                <TouchableOpacity style={styles.itemWrapper} onPress={() => handleNotificationPress(item)} activeOpacity={0.7}>
                                    <BlurView intensity={item.is_read ? 15 : 30} tint={isDark ? "dark" : "light"} style={[
                                        styles.itemGlass,
                                        {
                                            borderColor: item.is_read ? 'rgba(255,255,255,0.05)' : themeColors.accentPrimary + '30'
                                        }
                                    ]}>
                                        <View style={styles.row}>
                                            <View style={styles.avatarContainer}>
                                                <View style={[styles.avatarGlow, { backgroundColor: item.is_read ? (isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)') : themeColors.accentPrimary + '30' }]}>
                                                    {item.sender_avatar ? (
                                                        <Image source={{ uri: item.sender_avatar }} style={styles.avatar} />
                                                    ) : (
                                                        <View style={[styles.avatar, { backgroundColor: isDark ? themeColors.bgDark : themeColors.bgLight, justifyContent: 'center', alignItems: 'center' }]}>
                                                            <User size={24} color={isDark ? themeColors.textMuted : themeColors.textMutedLight} />
                                                        </View>
                                                    )}
                                                </View>
                                                <View style={[styles.iconBadge, { backgroundColor: isDark ? themeColors.bgCard : themeColors.bgLight, borderColor: 'rgba(255,255,255,0.1)', borderWidth: 1 }]}>
                                                    {renderIcon(item.type)}
                                                </View>
                                            </View>
                                            <View style={styles.content}>
                                                <Text style={[styles.text, { color: isDark ? themeColors.textMain : themeColors.textMainLight }]}>{formatText(item)}</Text>
                                                <Text style={[styles.time, { color: isDark ? themeColors.textMuted : themeColors.textMutedLight }]}>{formatTime(item.created_at)}</Text>
                                            </View>
                                            {!item.is_read && <View style={[styles.dot, { backgroundColor: themeColors.accentPrimary }]} />}
                                        </View>
                                    </BlurView>
                                </TouchableOpacity>
                            );
                        }}
                    />
                )}
            </SafeAreaView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    glowCircle: {
        position: 'absolute',
        width: 300,
        height: 300,
        borderRadius: 150,
    },
    safeArea: {
        flex: 1,
    },
    headerSpacer: {
        paddingHorizontal: 20,
        paddingTop: 14,
        paddingBottom: 6,
    },
    headerPill: {
        borderRadius: 24,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 10,
    },
    backBtn: {
        width: 36,
        height: 36,
        borderRadius: 18,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.08)',
    },
    title: {
        fontSize: 18,
        fontWeight: '900',
        letterSpacing: -0.5,
    },
    readAllBtn: {
        paddingHorizontal: 4,
    },
    readAll: {
        fontSize: 13,
        fontWeight: '700',
    },
    list: {
        paddingVertical: 10,
        paddingHorizontal: 16,
    },
    itemWrapper: {
        marginBottom: 12,
    },
    itemGlass: {
        borderRadius: 24,
        overflow: 'hidden',
        borderWidth: 1,
        padding: 14,
    },
    row: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    avatarContainer: {
        position: 'relative',
        marginRight: 14,
    },
    avatarGlow: {
        width: 54,
        height: 54,
        borderRadius: 27,
        padding: 3,
        justifyContent: 'center',
        alignItems: 'center',
    },
    avatar: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: '#1A1A1A',
    },
    iconBadge: {
        position: 'absolute',
        bottom: -4,
        right: -4,
        width: 24,
        height: 24,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        elevation: 2,
    },
    content: {
        flex: 1,
        marginRight: 8,
    },
    text: {
        fontSize: 15,
        marginBottom: 4,
        lineHeight: 20,
    },
    time: {
        fontSize: 12,
    },
    dot: {
        width: 8,
        height: 8,
        borderRadius: 4,
    },
    emptyContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingTop: 100,
    },
    emptyText: {
        fontSize: 16,
    }
});
