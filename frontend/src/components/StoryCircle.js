import React from 'react';
import { StyleSheet, View, Image, Text, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { Plus } from 'lucide-react-native';
import { COLORS } from '../constants/theme';
import { useTheme } from '../context/ThemeContext';

export default function StoryCircle({ image, name, isUser = false, hasStory = true, onPress }) {
    const { themeColors, isDark } = useTheme();

    return (
        <TouchableOpacity style={styles.container} activeOpacity={0.7} onPress={onPress}>
            <View style={styles.borderContainer}>
                {hasStory || isUser ? (
                    <LinearGradient
                        colors={isUser
                            ? [themeColors.accentPrimary, themeColors.accentSecondary, '#FF006E']
                            : ['#3CB2E2', themeColors.accentPrimary, themeColors.accentSecondary]
                        }
                        style={styles.gradientBorder}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                    >
                        <View style={[styles.imageContainer, { backgroundColor: themeColors.bgDark }]}>
                            <Image source={{ uri: image }} style={styles.image} />
                            {/* Glassmorphic overlay for premium effect */}
                            <BlurView
                                intensity={5}
                                tint={isDark ? "dark" : "light"}
                                style={styles.glassOverlay}
                            />
                        </View>
                    </LinearGradient>
                ) : (
                    <View style={[styles.gradientBorder, {
                        backgroundColor: 'transparent',
                        borderWidth: 2,
                        borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'
                    }]}>
                        <View style={[styles.imageContainer, { backgroundColor: themeColors.bgDark }]}>
                            <Image source={{ uri: image }} style={styles.image} />
                        </View>
                    </View>
                )}

                {isUser && (
                    <LinearGradient
                        colors={[themeColors.accentPrimary, themeColors.accentSecondary]}
                        style={styles.plusBadge}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                    >
                        <View style={[styles.plusInner, { backgroundColor: isDark ? '#0A0F1A' : '#FFFFFF' }]}>
                            <Plus size={14} color={themeColors.accentPrimary} strokeWidth={3} />
                        </View>
                    </LinearGradient>
                )}
            </View>
            <Text style={[styles.name, { color: themeColors.textMain }]} numberOfLines={1}>
                {isUser ? 'Your Story' : name}
            </Text>
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    container: {
        alignItems: 'center',
        marginRight: 14,
        width: 76,
    },
    borderContainer: {
        marginBottom: 8,
    },
    gradientBorder: {
        width: 76,
        height: 76,
        borderRadius: 38,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#3CB2E2',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 8,
    },
    imageContainer: {
        width: 68,
        height: 68,
        borderRadius: 34,
        justifyContent: 'center',
        alignItems: 'center',
        overflow: 'hidden',
        borderWidth: 3,
    },
    image: {
        width: '100%',
        height: '100%',
    },
    glassOverlay: {
        ...StyleSheet.absoluteFillObject,
        borderRadius: 34,
    },
    plusBadge: {
        position: 'absolute',
        bottom: -2,
        right: -2,
        width: 26,
        height: 26,
        borderRadius: 13,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 4,
        elevation: 5,
    },
    plusInner: {
        width: 22,
        height: 22,
        borderRadius: 11,
        justifyContent: 'center',
        alignItems: 'center',
    },
    name: {
        fontSize: 12,
        fontWeight: '600',
        letterSpacing: -0.2,
    }
});
