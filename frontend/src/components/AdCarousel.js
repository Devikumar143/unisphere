import React, { useState, useRef, useEffect } from 'react';
import { StyleSheet, View, Text, Image, TouchableOpacity, FlatList, Dimensions, Animated } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { useTheme } from '../context/ThemeContext';
import { ExternalLink } from 'lucide-react-native';

const { width } = Dimensions.get('window');
const CAROUSEL_WIDTH = width - 40;
const CAROUSEL_HEIGHT = 180;

export default function AdCarousel({ ads }) {
    const { isDark, themeColors } = useTheme();
    const [activeIndex, setActiveIndex] = useState(0);
    const scrollX = useRef(new Animated.Value(0)).current;

    if (!ads || ads.length === 0) return null;

    const renderItem = ({ item }) => (
        <TouchableOpacity
            activeOpacity={0.9}
            style={styles.cardContainer}
            onPress={() => {
                // Handle redirect if needed
                console.log('Ad Clicked:', item.title);
            }}
        >
            <Image source={{ uri: item.image_url }} style={styles.image} />
            <LinearGradient
                colors={['transparent', 'rgba(0,0,0,0.8)']}
                style={styles.gradient}
            >
                <View style={styles.content}>
                    <View style={[styles.badge, { backgroundColor: themeColors.accentPrimary + 'CC' }]}>
                        <Text style={styles.badgeText}>{item.category || 'Featured'}</Text>
                    </View>
                    <Text style={styles.title} numberOfLines={2}>{item.title}</Text>
                </View>
            </LinearGradient>

            {item.redirect_url && (
                <View style={styles.linkIcon}>
                    <BlurView intensity={30} tint="dark" style={styles.linkBlur}>
                        <ExternalLink size={14} color="white" />
                    </BlurView>
                </View>
            )}
        </TouchableOpacity>
    );

    const handleScroll = Animated.event(
        [{ nativeEvent: { contentOffset: { x: scrollX } } }],
        { useNativeDriver: false }
    );

    return (
        <View style={styles.container}>
            <FlatList
                data={ads}
                renderItem={renderItem}
                keyExtractor={item => item.id}
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                snapToAlignment="center"
                decelerationRate="fast"
                onScroll={handleScroll}
                onMomentumScrollEnd={(ev) => {
                    const index = Math.round(ev.nativeEvent.contentOffset.x / CAROUSEL_WIDTH);
                    setActiveIndex(index);
                }}
            />

            {/* Pagination Indicators */}
            <View style={styles.pagination}>
                {ads.map((_, i) => {
                    const opacity = scrollX.interpolate({
                        inputRange: [
                            (i - 1) * CAROUSEL_WIDTH,
                            i * CAROUSEL_WIDTH,
                            (i + 1) * CAROUSEL_WIDTH
                        ],
                        outputRange: [0.4, 1, 0.4],
                        extrapolate: 'clamp'
                    });

                    const scale = scrollX.interpolate({
                        inputRange: [
                            (i - 1) * CAROUSEL_WIDTH,
                            i * CAROUSEL_WIDTH,
                            (i + 1) * CAROUSEL_WIDTH
                        ],
                        outputRange: [0.8, 1.2, 0.8],
                        extrapolate: 'clamp'
                    });

                    return (
                        <Animated.View
                            key={i}
                            style={[
                                styles.dot,
                                {
                                    opacity,
                                    transform: [{ scale }],
                                    backgroundColor: i === activeIndex ? themeColors.accentPrimary : (isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.1)')
                                }
                            ]}
                        />
                    );
                })}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        marginTop: 20,
        marginBottom: 8,
        paddingHorizontal: 20,
    },
    cardContainer: {
        width: CAROUSEL_WIDTH,
        height: CAROUSEL_HEIGHT,
        borderRadius: 24,
        overflow: 'hidden',
        backgroundColor: '#1E1E1E',
        elevation: 5,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 10,
    },
    image: {
        width: '100%',
        height: '100%',
        resizeMode: 'cover',
    },
    gradient: {
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: 0,
        height: '70%',
        justifyContent: 'flex-end',
        padding: 16,
    },
    content: {
        gap: 6,
    },
    badge: {
        alignSelf: 'flex-start',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
    },
    badgeText: {
        color: 'white',
        fontSize: 10,
        fontWeight: '900',
        letterSpacing: 0.5,
        textTransform: 'uppercase',
    },
    title: {
        color: 'white',
        fontSize: 18,
        fontWeight: '900',
        letterSpacing: -0.5,
    },
    linkIcon: {
        position: 'absolute',
        top: 12,
        right: 12,
    },
    linkBlur: {
        width: 28,
        height: 28,
        borderRadius: 14,
        justifyContent: 'center',
        alignItems: 'center',
        overflow: 'hidden',
    },
    pagination: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 12,
        gap: 8,
    },
    dot: {
        width: 6,
        height: 6,
        borderRadius: 3,
    },
});
