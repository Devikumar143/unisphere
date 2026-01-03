import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, View, Text, Image, Modal, TouchableOpacity, Dimensions, Animated, StatusBar, Platform, TextInput, FlatList } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { X, MoreHorizontal, Heart, Send, Eye } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS } from '../constants/theme';
import { useTheme } from '../context/ThemeContext';

const { width, height } = Dimensions.get('window');

export default function StoryViewer({ visible, stories, initialIndex = 0, onClose }) {
    const { themeColors, isDark } = useTheme();
    const [currentIndex, setCurrentIndex] = useState(initialIndex);
    const [showSeenBy, setShowSeenBy] = useState(false);
    const [message, setMessage] = useState('');
    const [reactionAnim] = useState(new Animated.Value(0));
    const progressAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        if (visible) {
            setCurrentIndex(initialIndex || 0);
            progressAnim.setValue(0);
            startAnimation();
        } else {
            progressAnim.stopAnimation();
        }
    }, [visible, initialIndex]);

    useEffect(() => {
        if (visible) {
            progressAnim.setValue(0);
            startAnimation();
        }
    }, [currentIndex]);

    const startAnimation = () => {
        Animated.timing(progressAnim, {
            toValue: 1,
            duration: 5000,
            useNativeDriver: false,
        }).start(({ finished }) => {
            if (finished) {
                goNext();
            }
        });
    };

    const goNext = () => {
        if (currentIndex < stories.length - 1) {
            setCurrentIndex(prev => prev + 1);
        } else {
            onClose();
        }
    };

    const goPrev = () => {
        if (currentIndex > 0) {
            setCurrentIndex(prev => prev - 1);
        } else {
            progressAnim.setValue(0);
            startAnimation();
        }
    };

    const handleReaction = () => {
        // Animate heart
        reactionAnim.setValue(0);
        Animated.sequence([
            Animated.spring(reactionAnim, {
                toValue: 1,
                tension: 50,
                friction: 5,
                useNativeDriver: true,
            }),
            Animated.timing(reactionAnim, {
                toValue: 0,
                duration: 300,
                delay: 500,
                useNativeDriver: true,
            })
        ]).start();

        // TODO: Send reaction to backend
        console.log('Reaction sent!');
    };

    const handleSendMessage = () => {
        if (message.trim()) {
            // TODO: Send message to backend
            console.log('Message sent:', message);
            setMessage('');
        }
    };

    if (!visible || !stories || stories.length === 0) return null;

    const currentStory = stories[currentIndex] || stories[0] || {};

    // Mock seen by data - replace with real data from backend
    const seenByUsers = [
        { id: 1, name: 'John Doe', avatar: 'https://via.placeholder.com/150' },
        { id: 2, name: 'Jane Smith', avatar: 'https://via.placeholder.com/150' },
        { id: 3, name: 'Mike Johnson', avatar: 'https://via.placeholder.com/150' },
    ];

    return (
        <Modal
            animationType="slide"
            transparent={true}
            visible={visible}
            onRequestClose={onClose}
        >
            <View style={styles.container}>
                <StatusBar hidden />

                {/* Background Image */}
                <Image source={{ uri: currentStory.image }} style={styles.image} resizeMode="cover" />

                {/* Gradient Overlay */}
                <LinearGradient
                    colors={['rgba(0,0,0,0.7)', 'transparent', 'rgba(0,0,0,0.9)']}
                    style={StyleSheet.absoluteFill}
                />

                <SafeAreaView style={styles.content} edges={['top']}>
                    {/* Progress Bars */}
                    <View style={styles.progressContainer}>
                        {stories.map((story, index) => (
                            <View key={story?.id || index} style={styles.progressBarBg}>
                                {index === currentIndex ? (
                                    <Animated.View
                                        style={[
                                            styles.progressBarFill,
                                            {
                                                width: progressAnim.interpolate({
                                                    inputRange: [0, 1],
                                                    outputRange: ['0%', '100%']
                                                })
                                            }
                                        ]}
                                    />
                                ) : (
                                    <View style={[styles.progressBarFill, { width: index < currentIndex ? '100%' : '0%' }]} />
                                )}
                            </View>
                        ))}
                    </View>

                    {/* Enhanced Header */}
                    <BlurView intensity={20} tint="dark" style={styles.headerBlur}>
                        <View style={styles.header}>
                            <View style={styles.userInfo}>
                                <LinearGradient
                                    colors={[themeColors.accentPrimary, themeColors.accentSecondary]}
                                    style={styles.avatarGlow}
                                >
                                    <Image source={{ uri: currentStory.image }} style={styles.avatar} />
                                </LinearGradient>
                                <View>
                                    <Text style={styles.userName}>{currentStory.name}</Text>
                                    <Text style={styles.timeText}>2h ago</Text>
                                </View>
                            </View>

                            <View style={styles.headerActions}>
                                <TouchableOpacity style={styles.iconBtn} onPress={() => setShowSeenBy(true)}>
                                    <Eye color="white" size={22} />
                                    <Text style={styles.viewCount}>{seenByUsers.length}</Text>
                                </TouchableOpacity>
                                <TouchableOpacity style={styles.iconBtn}>
                                    <MoreHorizontal color="white" size={22} />
                                </TouchableOpacity>
                                <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
                                    <X color="white" size={24} strokeWidth={2.5} />
                                </TouchableOpacity>
                            </View>
                        </View>
                    </BlurView>

                    {/* Touch Zones */}
                    <View style={styles.touchContainer}>
                        <TouchableOpacity style={styles.touchLeft} onPress={goPrev} activeOpacity={1} />
                        <TouchableOpacity style={styles.touchRight} onPress={goNext} activeOpacity={1} />
                    </View>

                    {/* Floating Reaction Animation */}
                    <Animated.View
                        style={[
                            styles.floatingReaction,
                            {
                                opacity: reactionAnim,
                                transform: [
                                    {
                                        translateY: reactionAnim.interpolate({
                                            inputRange: [0, 1],
                                            outputRange: [0, -100]
                                        })
                                    },
                                    {
                                        scale: reactionAnim.interpolate({
                                            inputRange: [0, 0.5, 1],
                                            outputRange: [0.5, 1.2, 1]
                                        })
                                    }
                                ]
                            }
                        ]}
                    >
                        <Text style={styles.floatingReactionEmoji}>❤️</Text>
                    </Animated.View>

                    {/* Enhanced Footer */}
                    <BlurView intensity={30} tint="dark" style={styles.footerBlur}>
                        <View style={styles.footer}>
                            <View style={styles.replyInputContainer}>
                                <TextInput
                                    style={styles.replyInput}
                                    placeholder="Send a message..."
                                    placeholderTextColor="rgba(255,255,255,0.6)"
                                    value={message}
                                    onChangeText={setMessage}
                                    returnKeyType="send"
                                    onSubmitEditing={handleSendMessage}
                                />
                            </View>
                            <TouchableOpacity style={styles.footerIcon} onPress={handleReaction}>
                                <Heart color="white" size={26} fill={reactionAnim.interpolate({
                                    inputRange: [0, 1],
                                    outputRange: ['transparent', '#FF006E']
                                })} />
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.footerIcon} onPress={handleSendMessage}>
                                <Send color="white" size={24} />
                            </TouchableOpacity>
                        </View>
                    </BlurView>
                </SafeAreaView>

                {/* Seen By Modal */}
                <Modal
                    visible={showSeenBy}
                    transparent={true}
                    animationType="slide"
                    onRequestClose={() => setShowSeenBy(false)}
                >
                    <View style={styles.seenByContainer}>
                        <TouchableOpacity
                            style={styles.seenByBackdrop}
                            activeOpacity={1}
                            onPress={() => setShowSeenBy(false)}
                        />
                        <BlurView intensity={90} tint={isDark ? "dark" : "light"} style={styles.seenByModal}>
                            <View style={styles.seenByHeader}>
                                <Text style={[styles.seenByTitle, { color: themeColors.textMain }]}>
                                    Seen by {seenByUsers.length}
                                </Text>
                                <TouchableOpacity onPress={() => setShowSeenBy(false)}>
                                    <X color={themeColors.textMain} size={24} />
                                </TouchableOpacity>
                            </View>
                            <FlatList
                                data={seenByUsers}
                                keyExtractor={(item) => item.id.toString()}
                                renderItem={({ item }) => (
                                    <View style={styles.seenByItem}>
                                        <Image source={{ uri: item.avatar }} style={styles.seenByAvatar} />
                                        <Text style={[styles.seenByName, { color: themeColors.textMain }]}>
                                            {item.name}
                                        </Text>
                                    </View>
                                )}
                                contentContainerStyle={styles.seenByList}
                            />
                        </BlurView>
                    </View>
                </Modal>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: 'black',
    },
    image: {
        ...StyleSheet.absoluteFillObject,
        width,
        height,
    },
    content: {
        flex: 1,
        justifyContent: 'space-between',
    },
    progressContainer: {
        flexDirection: 'row',
        paddingHorizontal: 12,
        paddingTop: 8,
        gap: 4,
    },
    progressBarBg: {
        flex: 1,
        height: 3,
        backgroundColor: 'rgba(255,255,255,0.3)',
        borderRadius: 1.5,
        overflow: 'hidden',
    },
    progressBarFill: {
        height: '100%',
        backgroundColor: 'white',
        borderRadius: 1.5,
    },
    headerBlur: {
        marginTop: 8,
        marginHorizontal: 12,
        borderRadius: 20,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 14,
        paddingVertical: 10,
    },
    userInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    avatarGlow: {
        width: 42,
        height: 42,
        borderRadius: 21,
        padding: 2,
        marginRight: 12,
    },
    avatar: {
        width: 38,
        height: 38,
        borderRadius: 19,
        backgroundColor: '#1A1A1A',
    },
    userName: {
        color: 'white',
        fontWeight: '800',
        fontSize: 15,
        letterSpacing: -0.3,
    },
    timeText: {
        color: 'rgba(255,255,255,0.6)',
        fontSize: 12,
        marginTop: 2,
    },
    headerActions: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    iconBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    viewCount: {
        color: 'white',
        fontSize: 12,
        fontWeight: '700',
    },
    closeBtn: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: 'rgba(255,255,255,0.15)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    touchContainer: {
        position: 'absolute',
        top: 120,
        bottom: 120,
        left: 0,
        right: 0,
        flexDirection: 'row',
    },
    touchLeft: {
        flex: 1,
    },
    touchRight: {
        flex: 2,
    },
    floatingReaction: {
        position: 'absolute',
        bottom: '50%',
        left: '50%',
        marginLeft: -30,
    },
    floatingReactionEmoji: {
        fontSize: 60,
    },
    footerBlur: {
        marginHorizontal: 12,
        marginBottom: Platform.OS === 'ios' ? 10 : 20,
        borderRadius: 30,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
    },
    footer: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 10,
        gap: 12,
    },
    replyInputContainer: {
        flex: 1,
        height: 46,
        borderRadius: 23,
        backgroundColor: 'rgba(255,255,255,0.15)',
        justifyContent: 'center',
        paddingHorizontal: 18,
    },
    replyInput: {
        color: 'white',
        fontSize: 15,
        fontWeight: '500',
    },
    footerIcon: {
        width: 46,
        height: 46,
        justifyContent: 'center',
        alignItems: 'center',
    },
    seenByContainer: {
        flex: 1,
        justifyContent: 'flex-end',
    },
    seenByBackdrop: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.5)',
    },
    seenByModal: {
        height: height * 0.6,
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
    },
    seenByHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 16,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255,255,255,0.05)',
    },
    seenByTitle: {
        fontSize: 18,
        fontWeight: '800',
        letterSpacing: -0.5,
    },
    seenByList: {
        paddingHorizontal: 20,
        paddingVertical: 12,
    },
    seenByItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
    },
    seenByAvatar: {
        width: 44,
        height: 44,
        borderRadius: 22,
        marginRight: 14,
        backgroundColor: '#1A1A1A',
    },
    seenByName: {
        fontSize: 16,
        fontWeight: '600',
    },
});
