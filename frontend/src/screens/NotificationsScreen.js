import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Image, ActivityIndicator, Animated } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, SIZES, GLASS } from '../constants/theme';
import { BlurView } from 'expo-blur';
import { ArrowLeft, Heart, MessageCircle, UserPlus, Bell, User } from 'lucide-react-native';
import { useTheme } from '../context/ThemeContext';
import { fetchNotifications, markNotificationRead, markAllNotificationsRead } from '../services/api';

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
        } else if (notification.type === 'LIKE' || notification.type === 'COMMENT') {
            // Need to fetch post or navigate to it. Assuming onViewPost takes post ID
            // Ideally we'd pass the post object, but we might only have ID here.
            // For MVP, we might just view the user who liked/commented if posts aren't easily deep-linked yet
            // OR if onViewPost can handle ID fetch. Let's assume user Nav for simplicity or implement post modal later.
            // Better UX: View the Sender Profile for now if Post Viewer isn't ready for IDs.
            // Wait, PostCard expects full post object.
            // Let's stick to Viewing Profile of interactor for now to avoid crashes, 
            // OR fetch post details. Let's verify if we have getPostById. We don't.
            // Fallback to viewing profile.
            onViewProfile && onViewProfile({ id: notification.sender_id });
        }
    };

    const handleMarkAllRead = async () => {
        setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
        await markAllNotificationsRead(user.id);
    };

    const renderIcon = (type) => {
        switch (type) {
            case 'LIKE': return <Heart size={20} color={COLORS.accentError} fill={COLORS.accentError} />;
            case 'COMMENT': return <MessageCircle size={20} color={COLORS.accentPrimary} fill={COLORS.accentPrimary} />;
            case 'FOLLOW': return <UserPlus size={20} color={COLORS.accentSuccess} />;
            default: return <Bell size={20} color={themeColors.textDim} />;
        }
    };

    const formatText = (item) => {
        const name = item.sender_name || 'Someone';
        switch (item.type) {
            case 'LIKE': return <Text style={{ color: themeColors.textMain }}><Text style={{ fontWeight: 'bold' }}>{name}</Text> liked your post.</Text>;
            case 'COMMENT': return <Text style={{ color: themeColors.textMain }}><Text style={{ fontWeight: 'bold' }}>{name}</Text> commented on your post.</Text>;
            case 'FOLLOW': return <Text style={{ color: themeColors.textMain }}><Text style={{ fontWeight: 'bold' }}>{name}</Text> started following you.</Text>;
            default: return <Text style={{ color: themeColors.textMain }}>New notification.</Text>;
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
        <View style={[styles.container, { backgroundColor: themeColors.bgDark }]}>
            {/* Deep Base Background */}
            <LinearGradient
                colors={isDark ? ['#050810', '#000000'] : ['#F8FAFC', '#FFFFFF']}
                style={StyleSheet.absoluteFill}
            />

            {/* Atmospheric Aura Glows */}
            <View style={StyleSheet.absoluteFill}>
                <View style={[styles.glowCircle, { top: -80, right: -120, backgroundColor: isDark ? '#3CB2E225' : '#3CB2E210' }]} />
                <View style={[styles.glowCircle, { bottom: -50, left: -100, backgroundColor: isDark ? '#9C27B020' : '#9C27B008' }]} />
                <View style={[styles.glowCircle, { top: '50%', left: '50%', width: 350, height: 350, backgroundColor: isDark ? '#6366F110' : '#6366F105' }]} />
            </View>

            <SafeAreaView style={styles.safeArea}>
                {/* Glassmorphic Floating Header */}
                <BlurView intensity={isDark ? 100 : 100} tint={isDark ? "dark" : "light"} style={styles.headerGlass}>
                    <View style={styles.header}>
                        <TouchableOpacity onPress={onBack} style={styles.backBtn} activeOpacity={0.7}>
                            <View style={[styles.btnHighlight, { borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' }]} />
                            <ArrowLeft color={themeColors.textMain} size={22} />
                        </TouchableOpacity>
                        <Text style={[styles.title, { color: themeColors.textMain }]}>Activity</Text>
                        <TouchableOpacity onPress={handleMarkAllRead} style={styles.readAllBtn} activeOpacity={0.7}>
                            <Text style={[styles.readAll, { color: themeColors.accentPrimary }]}>Mark All</Text>
                        </TouchableOpacity>
                    </View>
                </BlurView>

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
                                <Bell size={48} color={themeColors.textDim} style={{ marginBottom: 16, opacity: 0.5 }} />
                                <Text style={[styles.emptyText, { color: themeColors.textDim }]}>No notifications yet</Text>
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
                                    <BlurView intensity={item.is_read ? 15 : 25} tint={isDark ? "dark" : "light"} style={[styles.itemGlass, { borderColor: item.is_read ? 'rgba(255,255,255,0.03)' : 'rgba(255,255,255,0.08)' }]}>
                                        <View style={styles.row}>
                                            <View style={styles.avatarContainer}>
                                                <LinearGradient colors={avatarGlow} style={styles.avatarGlow}>
                                                    {item.sender_avatar ? (
                                                        <Image source={{ uri: item.sender_avatar }} style={styles.avatar} />
                                                    ) : (
                                                        <View style={[styles.avatar, { backgroundColor: themeColors.bgCard, justifyContent: 'center', alignItems: 'center' }]}>
                                                            <User size={24} color={themeColors.textDim} />
                                                        </View>
                                                    )}
                                                </LinearGradient>
                                                <View style={[styles.iconBadge, { backgroundColor: isDark ? '#0A0F1A' : '#F8FAFC' }]}>
                                                    {renderIcon(item.type)}
                                                </View>
                                            </View>
                                            <View style={styles.content}>
                                                <Text style={styles.text}>{formatText(item)}</Text>
                                                <Text style={[styles.time, { color: themeColors.textDim }]}>{formatTime(item.created_at)}</Text>
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
    headerGlass: {
        borderBottomWidth: 0.5,
        borderBottomColor: 'rgba(255,255,255,0.1)',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: SIZES.padding,
        paddingVertical: 14,
        paddingTop: 6,
    },
    backBtn: {
        width: 42,
        height: 42,
        borderRadius: 21,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.08)',
        overflow: 'hidden',
    },
    btnHighlight: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        borderRadius: 21,
        borderWidth: 1,
        pointerEvents: 'none',
    },
    title: {
        fontSize: 22,
        fontWeight: '900',
        letterSpacing: -0.5,
    },
    readAllBtn: {
        paddingHorizontal: 4,
    },
    readAll: {
        fontSize: 14,
        fontWeight: '600',
    },
    list: {
        paddingVertical: 10,
        paddingHorizontal: 16,
    },
    itemWrapper: {
        marginBottom: 12,
    },
    itemGlass: {
        borderRadius: 20,
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
