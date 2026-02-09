import React, { useRef, useState, useEffect } from 'react';
import {
    StyleSheet,
    View,
    Text,
    Dimensions,
    TouchableOpacity,
    Image,
    Animated,
    Easing,
    Share
} from 'react-native';
import { Video, ResizeMode } from 'expo-av';
import { LinearGradient } from 'expo-linear-gradient';
import { Heart, MessageCircle, Share2, MoreVertical, Music2, Eye, BadgeCheck } from 'lucide-react-native';

const { width, height } = Dimensions.get('window');

const ReelItem = ({ item, isActive, bottomTabHeight, onLike, onComment, onViewProfile, onShare }) => {
    const videoRef = useRef(null);
    const [status, setStatus] = useState({});

    // Animations
    const rotateAnim = useRef(new Animated.Value(0)).current;
    const scrollAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        if (isActive) {
            videoRef.current?.playAsync();
            startRotation();
            startScroll();
        } else {
            videoRef.current?.pauseAsync();
            rotateAnim.stopAnimation();
            scrollAnim.stopAnimation();
        }
    }, [isActive]);

    const startRotation = () => {
        Animated.loop(
            Animated.timing(rotateAnim, {
                toValue: 1,
                duration: 4000,
                easing: Easing.linear,
                useNativeDriver: true,
            })
        ).start();
    };

    const startScroll = () => {
        scrollAnim.setValue(0);
        Animated.loop(
            Animated.sequence([
                Animated.timing(scrollAnim, {
                    toValue: -100, // Adjust based on text length
                    duration: 6000,
                    easing: Easing.linear,
                    useNativeDriver: true,
                }),
                Animated.timing(scrollAnim, {
                    toValue: 0,
                    duration: 0,
                    useNativeDriver: true,
                })
            ])
        ).start();
    };

    const spin = rotateAnim.interpolate({
        inputRange: [0, 1],
        outputRange: ['0deg', '360deg']
    });

    const progress = status.durationMillis
        ? (status.positionMillis / status.durationMillis) * 100
        : 0;


    const togglePlay = () => {
        if (status.isPlaying) {
            videoRef.current?.pauseAsync();
        } else {
            videoRef.current?.playAsync();
        }
    };

    const renderDescription = (text) => {
        if (!text) return null;
        const words = text.split(' ');
        return (
            <Text style={styles.description} numberOfLines={2}>
                {words.map((word, index) => (
                    <Text
                        key={index}
                        style={word.startsWith('#') ? styles.hashtag : styles.descriptionText}
                    >
                        {word} {' '}
                    </Text>
                ))}
            </Text>
        );
    };

    return (
        <View style={[styles.container, { height: height - bottomTabHeight }]}>
            <TouchableOpacity activeOpacity={1} onPress={togglePlay} style={styles.videoContainer}>
                <Video
                    ref={videoRef}
                    style={styles.video}
                    source={{ uri: item.video }}
                    resizeMode={ResizeMode.COVER}
                    isLooping
                    shouldPlay={isActive}
                    onPlaybackStatusUpdate={status => setStatus(() => status)}
                />
            </TouchableOpacity>

            {/* Overlay UI */}
            <LinearGradient
                colors={['transparent', 'rgba(0,0,0,0.4)', 'rgba(0,0,0,0.8)']}
                style={[styles.gradientOverlay, { paddingBottom: 20 + 0 }]} // Removed platform specific padding for simplicity, can adjust if needed
            >
                {/* Right Actions */}
                <View style={styles.rightActions}>
                    <TouchableOpacity style={styles.actionBtn} onPress={() => onLike(item.id)}>
                        <Heart
                            size={28}
                            color={item.isLiked ? "#FF5252" : "white"}
                            fill={item.isLiked ? "#FF5252" : "transparent"}
                            strokeWidth={2}
                        />
                        <Text style={styles.actionText}>{item.likes}</Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.actionBtn} onPress={() => onComment(item)}>
                        <MessageCircle size={28} color="white" strokeWidth={2} />
                        <Text style={styles.actionText}>{item.comments}</Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.actionBtn} onPress={() => onShare && onShare(item)}>
                        <Share2 size={28} color="white" strokeWidth={2} />
                        <Text style={styles.actionText}>Share</Text>
                    </TouchableOpacity>

                    <View style={styles.actionBtn}>
                        <Eye size={28} color="white" strokeWidth={2} />
                        <Text style={styles.actionText}>{item.views || 0}</Text>
                    </View>

                    <TouchableOpacity style={styles.actionBtn}>
                        <MoreVertical size={28} color="white" strokeWidth={2} />
                    </TouchableOpacity>

                    {/* Rotating Disc */}
                    <View style={styles.discContainer}>
                        <Animated.View style={[styles.disc, { transform: [{ rotate: spin }] }]}>
                            <Image
                                source={{ uri: item.user.avatar || 'https://via.placeholder.com/50' }}
                                style={styles.discImage}
                            />
                        </Animated.View>
                    </View>
                </View>

                {/* Bottom Details */}
                <View style={styles.bottomDetails}>
                    <View style={styles.userInfo}>
                        <TouchableOpacity onPress={() => onViewProfile && onViewProfile(item.user)} style={{ flexDirection: 'row', alignItems: 'center' }}>
                            <Image source={{ uri: item.user.avatar || `https://ui-avatars.com/api/?name=${item.user.name}&background=random` }} style={styles.avatar} />
                            <Text style={styles.username}>@{item.user.username}</Text>
                            {item.user.isVerified ? (
                                <BadgeCheck size={14} color="#FFD700" style={{ marginRight: 10 }} />
                            ) : item.user.subscriptionType === 'blue' ? (
                                <BadgeCheck size={14} color="#2563EB" style={{ marginRight: 10 }} />
                            ) : null}
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.followBtn}>
                            <Text style={styles.followText}>Follow</Text>
                        </TouchableOpacity>
                    </View>

                    {renderDescription(item.description)}

                    <View style={styles.musicRow}>
                        <Music2 size={16} color="white" />
                        <View style={styles.marqueeContainer}>
                            <Animated.Text style={[styles.musicText, { transform: [{ translateX: scrollAnim }] }]}>
                                {item.song || 'Original Audio'}   •   {item.song || 'Original Audio'}   •
                            </Animated.Text>
                        </View>
                    </View>
                </View>
            </LinearGradient >

            {/* Progress Bar */}
            < View style={styles.progressBarContainer} >
                <View style={[styles.progressBar, { width: `${progress}%` }]} />
            </View >
        </View >
    );
};

const styles = StyleSheet.create({
    container: {
        width: width,
        position: 'relative',
        backgroundColor: 'black',
    },
    videoContainer: {
        width: '100%',
        height: '100%',
    },
    video: {
        width: '100%',
        height: '100%',
    },
    gradientOverlay: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: 300,
        justifyContent: 'flex-end',
        paddingHorizontal: 16,
    },
    rightActions: {
        position: 'absolute',
        right: 10,
        bottom: 100,
        alignItems: 'center',
        gap: 20,
    },
    actionBtn: {
        alignItems: 'center',
    },
    actionText: {
        color: 'white',
        fontSize: 13,
        fontWeight: '600',
        marginTop: 6,
        textShadowColor: 'rgba(0,0,0,0.5)',
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 5,
    },
    bottomDetails: {
        marginBottom: 20,
        maxWidth: '85%',
    },
    userInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 10,
    },
    avatar: {
        width: 36,
        height: 36,
        borderRadius: 18,
        borderWidth: 1.5,
        borderColor: 'white',
        marginRight: 10,
    },
    username: {
        color: 'white',
        fontSize: 16,
        fontWeight: '700',
        marginRight: 10,
        textShadowColor: 'rgba(0,0,0,0.5)',
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 5,
    },
    followBtn: {
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.6)',
        borderRadius: 6,
        paddingHorizontal: 8,
        paddingVertical: 2,
    },
    followText: {
        color: 'white',
        fontSize: 12,
        fontWeight: '600',
    },
    description: {
        marginBottom: 10,
        flexDirection: 'row',
        flexWrap: 'wrap',
    },
    descriptionText: {
        color: 'rgba(255,255,255,0.9)',
        fontSize: 14,
        lineHeight: 20,
    },
    hashtag: {
        color: '#6C5CE7', // Primary Theme Color
        fontSize: 14,
        fontWeight: 'bold',
        lineHeight: 20,
    },
    musicRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    musicText: {
        color: 'white',
        fontSize: 13,
        fontWeight: '600',
        width: 500, // Ensure enough width for scrolling
    },
    // New UI Styles
    discContainer: {
        width: 50,
        height: 50,
        borderRadius: 25,
        backgroundColor: '#1A1A1A',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 10,
        borderColor: '#111',
    },
    disc: {
        width: 30,
        height: 30,
        borderRadius: 15,
        backgroundColor: '#222',
        overflow: 'hidden',
    },
    discImage: {
        width: '100%',
        height: '100%',
    },
    marqueeContainer: {
        width: 150,
        overflow: 'hidden',
    },
    progressBarContainer: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: 2,
        backgroundColor: 'rgba(255,255,255,0.3)',
        zIndex: 10,
    },
    progressBar: {
        height: '100%',
        backgroundColor: 'white',
    }
});

export default ReelItem;
