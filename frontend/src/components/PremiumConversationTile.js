import React from 'react';
import { StyleSheet, View, Text, Image, TouchableOpacity } from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { ChevronRight } from 'lucide-react-native';
import { COLORS, SIZES } from '../constants/theme';
import { useTheme } from '../context/ThemeContext';

export default function PremiumConversationTile({ user, onPress }) {
    const { isDark, themeColors } = useTheme();

    const formatTime = (timestamp) => {
        if (!timestamp) return '';
        const date = new Date(timestamp);
        const now = new Date();

        if (date.toDateString() === now.toDateString()) {
            return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        }
        return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    };

    const hasUnread = user.unreadCount > 0;

    return (
        <TouchableOpacity
            onPress={onPress}
            activeOpacity={0.8}
            style={styles.container}
        >
            <BlurView intensity={isDark ? 20 : 40} tint={isDark ? "dark" : "light"} style={styles.card}>
                <View style={styles.avatarContainer}>
                    <LinearGradient
                        colors={user.isOnline ? [themeColors.accentPrimary, themeColors.accentSecondary] : ['transparent', 'transparent']}
                        style={styles.avatarGlow}
                    >
                        <Image source={{ uri: user.avatar }} style={styles.avatar} />
                    </LinearGradient>
                    {user.isOnline && <View style={styles.onlineIndicator} />}
                </View>

                <View style={styles.content}>
                    <View style={styles.topRow}>
                        <Text style={[styles.name, { color: themeColors.textMain, fontWeight: hasUnread ? '900' : '700' }]} numberOfLines={1}>
                            {user.name}
                        </Text>
                        <Text style={[styles.time, { color: hasUnread ? themeColors.accentPrimary : themeColors.textDim }]}>
                            {formatTime(user.lastMessageTime || user.updatedAt)}
                        </Text>
                    </View>

                    <View style={styles.bottomRow}>
                        <Text
                            style={[
                                styles.lastMessage,
                                { color: hasUnread ? themeColors.textMain : themeColors.textDim, fontWeight: hasUnread ? '600' : '400' }
                            ]}
                            numberOfLines={1}
                        >
                            {user.lastMessage || `Start chatting with ${user.name.split(' ')[0]}`}
                        </Text>

                        {hasUnread ? (
                            <View style={[styles.unreadBadge, { backgroundColor: themeColors.accentPrimary }]}>
                                <Text style={styles.unreadCount}>{user.unreadCount}</Text>
                            </View>
                        ) : (
                            <ChevronRight size={16} color={themeColors.textDim} opacity={0.3} />
                        )}
                    </View>
                </View>

                {/* Subtle Inner Highlight */}
                <View style={[styles.innerHighlight, { borderColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)' }]} />
            </BlurView>
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    container: {
        marginBottom: 12,
        borderRadius: 20,
        overflow: 'hidden',
    },
    card: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 14,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.05)',
    },
    avatarContainer: {
        position: 'relative',
    },
    avatarGlow: {
        width: 58,
        height: 58,
        borderRadius: 29,
        padding: 2,
        justifyContent: 'center',
        alignItems: 'center',
    },
    avatar: {
        width: 52,
        height: 52,
        borderRadius: 26,
        backgroundColor: '#1A1A1A',
    },
    onlineIndicator: {
        position: 'absolute',
        bottom: 2,
        right: 2,
        width: 14,
        height: 14,
        borderRadius: 7,
        backgroundColor: '#10B981',
        borderWidth: 2,
        borderColor: '#050810',
    },
    content: {
        flex: 1,
        marginLeft: 16,
    },
    topRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 4,
    },
    name: {
        fontSize: 17,
        letterSpacing: -0.3,
    },
    time: {
        fontSize: 12,
        fontWeight: '600',
    },
    bottomRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    lastMessage: {
        flex: 1,
        fontSize: 14,
        marginRight: 8,
    },
    unreadBadge: {
        minWidth: 20,
        height: 20,
        borderRadius: 10,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 6,
    },
    unreadCount: {
        color: '#FFF',
        fontSize: 11,
        fontWeight: '900',
    },
    innerHighlight: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        borderRadius: 20,
        borderWidth: 1,
        pointerEvents: 'none',
    }
});
