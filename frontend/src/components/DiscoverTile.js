import React from 'react';
import { StyleSheet, View, Text, Image, TouchableOpacity, Dimensions } from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { Users, ArrowUpRight } from 'lucide-react-native';
import { useTheme } from '../context/ThemeContext';

const { width } = Dimensions.get('window');
const COLUMN_WIDTH = (width - 48) / 2;

export default function DiscoverTile({ item, onPress, type = 'community' }) {
    const { isDark, themeColors } = useTheme();

    // Random height for masonry effect (in real use, this could be based on content)
    const height = React.useMemo(() => [200, 240, 180, 220][Math.floor(Math.random() * 4)], []);

    const imageUri = type === 'community' ? item.cover_image : item.avatar;

    return (
        <TouchableOpacity
            style={[styles.tile, { height, width: COLUMN_WIDTH }]}
            onPress={onPress}
            activeOpacity={0.9}
        >
            {imageUri ? (
                <Image source={{ uri: imageUri }} style={StyleSheet.absoluteFill} />
            ) : (
                <View style={[StyleSheet.absoluteFill, { backgroundColor: themeColors.bgCard, justifyContent: 'center', alignItems: 'center' }]}>
                    <Users color={themeColors.textDim} size={32} />
                </View>
            )}

            {/* Overlay Gradient */}
            <LinearGradient
                colors={['transparent', 'rgba(0,0,0,0.8)']}
                style={StyleSheet.absoluteFill}
            />

            {/* Glass Badge */}
            <View style={styles.badgeWrapper}>
                <BlurView intensity={30} tint="dark" style={styles.badge}>
                    {type === 'community' ? (
                        <Users color="#FFF" size={12} />
                    ) : (
                        <ArrowUpRight color="#FFF" size={12} />
                    )}
                    <Text style={styles.badgeText}>
                        {type === 'community' ? (item.member_count || '0') : 'View'}
                    </Text>
                </BlurView>
            </View>

            {/* Info Footer */}
            <View style={styles.footer}>
                <Text style={styles.title} numberOfLines={2}>
                    {type === 'community' ? item.name : item.full_name}
                </Text>
                <Text style={styles.subtitle} numberOfLines={1}>
                    {type === 'community' ? (item.description || 'Join the conversation') : (item.role || 'Member')}
                </Text>
            </View>

            {/* Subtle Inner Border */}
            <View style={[styles.innerBorder, { borderColor: 'rgba(255,255,255,0.15)' }]} />
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    tile: {
        borderRadius: 24,
        overflow: 'hidden',
        marginBottom: 16,
        backgroundColor: '#1A1A1A',
        elevation: 5,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
    },
    badgeWrapper: {
        position: 'absolute',
        top: 12,
        right: 12,
    },
    badge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 20,
        backgroundColor: 'rgba(255,255,255,0.1)',
        overflow: 'hidden',
    },
    badgeText: {
        color: '#FFF',
        fontSize: 10,
        fontWeight: '800',
        marginLeft: 4,
    },
    footer: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        padding: 16,
    },
    title: {
        color: '#FFF',
        fontSize: 15,
        fontWeight: '900',
        lineHeight: 18,
        letterSpacing: -0.3,
    },
    subtitle: {
        color: 'rgba(255,255,255,0.7)',
        fontSize: 11,
        fontWeight: '600',
        marginTop: 4,
    },
    innerBorder: {
        ...StyleSheet.absoluteFillObject,
        borderWidth: 1,
        borderRadius: 24,
    }
});
