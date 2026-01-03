import React from 'react';
import { StyleSheet, View, Text, Image, TouchableOpacity } from 'react-native';
import { BlurView } from 'expo-blur';
import { COLORS, GLASS, SIZES } from '../constants/theme';
import { MessageCircle } from 'lucide-react-native';
import { useTheme } from '../context/ThemeContext';

export default function UserListItem({ user, onPress }) {
    const { isDark, themeColors } = useTheme();
    const formatTime = (timestamp) => {
        if (!timestamp) return '';
        const date = new Date(timestamp);
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    return (
        <TouchableOpacity
            onPress={onPress}
            activeOpacity={0.7}
            style={styles.container}
        >
            <BlurView intensity={GLASS.intensity} tint={isDark ? "dark" : "light"} style={[styles.card, { backgroundColor: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)' }]}>
                <View>
                    <Image source={{ uri: user.avatar }} style={[styles.avatar, { borderColor: themeColors.border }]} />
                    {user.isOnline && <View style={[styles.onlineBadge, { borderColor: themeColors.bgDark }]} />}
                </View>
                <View style={styles.info}>
                    <View style={styles.nameRow}>
                        <Text style={[styles.name, { color: themeColors.textMain }]} numberOfLines={1}>{user.name}</Text>
                        {user.lastMessageTime && (
                            <Text style={[styles.time, { color: themeColors.textMuted }]}>{formatTime(user.lastMessageTime)}</Text>
                        )}
                    </View>

                    {user.lastMessage ? (
                        <Text style={[styles.lastMessage, { color: themeColors.textDim }]} numberOfLines={1}>
                            {user.lastMessage}
                        </Text>
                    ) : (
                        <Text style={[styles.role, { color: themeColors.textDim }]} numberOfLines={1}>
                            {user.role} • {user.department}
                        </Text>
                    )}
                </View>
                {!user.lastMessage && (
                    <View style={[styles.messageBtn, { backgroundColor: isDark ? 'rgba(59, 130, 246, 0.1)' : 'rgba(59, 130, 246, 0.05)' }]}>
                        <MessageCircle size={20} color={themeColors.accentPrimary} />
                    </View>
                )}
            </BlurView>
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    container: {
        marginBottom: 12,
        borderRadius: SIZES.radiusMedium,
        overflow: 'hidden',
    },
    card: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        backgroundColor: 'rgba(255,255,255,0.02)',
    },
    avatar: {
        width: 50,
        height: 50,
        borderRadius: 25,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
    },
    onlineBadge: {
        position: 'absolute',
        bottom: 2,
        right: 2,
        width: 12,
        height: 12,
        borderRadius: 6,
        backgroundColor: '#10B981', // Emerald 500
        borderWidth: 2,
        borderColor: '#050511', // Match bgDark
    },
    info: {
        flex: 1,
        marginLeft: 12,
    },
    nameRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    name: {
        color: COLORS.textMain,
        fontWeight: '700',
        fontSize: 16,
        flex: 1,
    },
    time: {
        color: COLORS.textMuted,
        fontSize: 11,
        marginLeft: 8,
    },
    lastMessage: {
        color: COLORS.textDim,
        fontSize: 14,
        marginTop: 2,
    },
    role: {
        color: COLORS.textDim,
        fontSize: 13,
        marginTop: 2,
    },
    location: {
        color: COLORS.textMuted,
        fontSize: 12,
        marginTop: 2,
    },
    messageBtn: {
        padding: 8,
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        borderRadius: 20,
    }
});
