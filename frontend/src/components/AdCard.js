
import React from 'react';
import { StyleSheet, View, Text, Image, TouchableOpacity, Linking } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { ExternalLink, Info } from 'lucide-react-native';

export default function AdCard({ ad }) {
    const { themeColors, isDark } = useTheme();

    const handlePress = () => {
        if (ad.redirect_url) {
            Linking.openURL(ad.redirect_url);
        }
    };

    return (
        <View style={[styles.container, {
            backgroundColor: isDark ? themeColors.bgCard : themeColors.bgCardLight,
            borderColor: themeColors.border,
            shadowColor: themeColors.shadow
        }]}>
            {/* Header */}
            <View style={styles.header}>
                <View style={styles.badgeContainer}>
                    <Text style={[styles.badgeText, { color: themeColors.accentPrimary }]}>SPONSORED</Text>
                </View>
                <TouchableOpacity>
                    <Info size={16} color={themeColors.textDim} />
                </TouchableOpacity>
            </View>

            {/* Media */}
            <TouchableOpacity activeOpacity={0.9} onPress={handlePress}>
                <Image
                    source={{ uri: ad.image_url }}
                    style={styles.media}
                    resizeMode="cover"
                />
            </TouchableOpacity>

            {/* Content */}
            <View style={styles.content}>
                <View style={styles.textContainer}>
                    <Text style={[styles.title, { color: themeColors.textMain }]}>{ad.title}</Text>
                    <Text style={[styles.category, { color: themeColors.textDim }]}>{ad.category || 'Advertisement'}</Text>
                </View>

                {ad.redirect_url && (
                    <TouchableOpacity
                        style={[styles.actionBtn, { backgroundColor: themeColors.accentPrimary + '15' }]}
                        onPress={handlePress}
                    >
                        <Text style={[styles.actionText, { color: themeColors.accentPrimary }]}>Learn More</Text>
                        <ExternalLink size={16} color={themeColors.accentPrimary} style={{ marginLeft: 6 }} />
                    </TouchableOpacity>
                )}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        marginHorizontal: 16,
        marginBottom: 16,
        borderRadius: 20,
        borderWidth: 1,
        overflow: 'hidden',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05,
        shadowRadius: 10,
        elevation: 3,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 12,
        paddingVertical: 10,
    },
    badgeContainer: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 8,
        backgroundColor: 'rgba(0,0,0,0.05)',
    },
    badgeText: {
        fontSize: 10,
        fontWeight: '800',
        letterSpacing: 1,
    },
    media: {
        width: '100%',
        height: 200,
    },
    content: {
        padding: 16,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    textContainer: {
        flex: 1,
        marginRight: 10,
    },
    title: {
        fontSize: 16,
        fontWeight: '700',
        marginBottom: 4,
    },
    category: {
        fontSize: 12,
        fontWeight: '500',
    },
    actionBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 8,
        paddingHorizontal: 12,
        borderRadius: 12,
    },
    actionText: {
        fontSize: 12,
        fontWeight: '700',
    },
});
