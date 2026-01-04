import React, { useState, useEffect } from 'react';
import { View, Text, Image, TouchableOpacity, Linking, StyleSheet } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { ExternalLink } from 'lucide-react-native';
import { fetchLinkMetadata } from '../services/api';

const LinkPreviewCard = ({ metadata: initialMetadata, url }) => {
    const { themeColors, isDark } = useTheme();
    const [metadata, setMetadata] = useState(initialMetadata || null);

    useEffect(() => {
        if (!metadata && url) {
            fetchLinkMetadata(url).then(data => {
                if (data) setMetadata(data);
            });
        }
    }, [url]);

    if (!metadata) return null;

    const handlePress = () => {
        if (metadata.url) {
            Linking.openURL(metadata.url).catch(err => console.error("Couldn't load page", err));
        }
    };

    return (
        <TouchableOpacity
            activeOpacity={0.9}
            onPress={handlePress}
            style={[styles.container, {
                backgroundColor: isDark ? 'rgba(0,0,0,0.2)' : 'rgba(255,255,255,0.7)',
                borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)'
            }]}
        >
            {metadata.image && (
                <Image
                    source={{ uri: metadata.image }}
                    style={styles.image}
                    resizeMode="cover"
                />
            )}
            <View style={styles.content}>
                <Text numberOfLines={1} style={[styles.title, { color: isDark ? themeColors.textMain : themeColors.textMainLight }]}>
                    {metadata.title || 'Link Preview'}
                </Text>
                {metadata.description && (
                    <Text numberOfLines={2} style={[styles.description, { color: isDark ? themeColors.textDim : themeColors.textDimLight }]}>
                        {metadata.description}
                    </Text>
                )}
                <View style={styles.footer}>
                    <ExternalLink size={12} color={themeColors.accentPrimary} style={{ marginRight: 4 }} />
                    <Text numberOfLines={1} style={[styles.url, { color: themeColors.accentPrimary }]}>
                        {metadata.url}
                    </Text>
                </View>
            </View>
        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
    container: {
        borderRadius: 12,
        overflow: 'hidden',
        borderWidth: 1,
        marginTop: 8,
        width: '100%',
        maxWidth: 280,
    },
    image: {
        width: '100%',
        height: 140,
        backgroundColor: 'rgba(128,128,128,0.1)'
    },
    content: {
        padding: 10,
    },
    title: {
        fontSize: 14,
        fontWeight: 'bold',
        marginBottom: 4,
    },
    description: {
        fontSize: 12,
        lineHeight: 16,
        marginBottom: 6,
    },
    footer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    url: {
        fontSize: 10,
        fontWeight: '600',
    }
});

export default LinkPreviewCard;
