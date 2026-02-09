import React, { useRef, useState, useEffect, useCallback } from 'react';
import { StyleSheet, Text, View, ScrollView, Animated, TouchableOpacity, RefreshControl, ActivityIndicator, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, SIZES } from '../constants/theme';

import PostCard from '../components/PostCard';
import AdCard from '../components/AdCard';
import AdCarousel from '../components/AdCarousel';
import { fetchPosts, deletePost, fetchAds } from '../services/api';
import { useFocusEffect, useRoute, useNavigation } from '@react-navigation/native';
import { BlurView } from 'expo-blur';
import { useTheme } from '../context/ThemeContext';
import { Bell, PlusSquare, Camera, TrendingUp, Users, Calendar, Zap, Search, Heart, MessageCircle } from 'lucide-react-native';



const QUICK_ACTIONS = [
    { id: 'trending', label: 'Trending', icon: TrendingUp, color: '#BC7C6C' }, // Terracotta
    { id: 'clubs', label: 'Clubs', icon: Users, color: '#7D8E74' }, // Sage
    { id: 'events', label: 'Events', icon: Calendar, color: '#AB947E' }, // Warm Bark
    { id: 'buddies', label: 'Find Buddy', icon: Zap, color: '#6B8E23' }, // Olive Drab
    { id: 'search', label: 'Search', icon: Search, color: '#5C677D' }, // Storm Blue
];

export default function HomeScreen({ user, onOpenNotifications, onOpenMessages, onCreatePost, onViewProfile }) {
    const { isDark, themeColors } = useTheme();
    const scrollY = useRef(new Animated.Value(0)).current;
    const navigation = useNavigation();
    const [posts, setPosts] = useState([]);
    const [ads, setAds] = useState([]);

    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [toastMessage, setToastMessage] = useState('Post shared successfully!');

    const loadData = async () => {
        setLoading(true);
        try {
            const [postsData, adsData] = await Promise.all([
                fetchPosts(user?.id),
                fetchAds()
            ]);
            setPosts(postsData.reverse()); // Newest posts first
            setAds(adsData);
        } catch (error) {
            console.error("Failed to load data", error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useFocusEffect(
        useCallback(() => {
            loadData();
        }, [user?.id])
    );

    const onRefresh = () => {
        setRefreshing(true);
        loadData();
    };



    const [showToast, setShowToast] = useState(false);
    const toastAnim = useRef(new Animated.Value(-100)).current;

    // Check for navigation params
    const { params } = useRoute(); // Need to import useRoute

    useEffect(() => {
        if (params?.postCreated) {
            loadData();
            setToastMessage('Post shared successfully! ✨');
            setShowToast(true);
            Animated.spring(toastAnim, {
                toValue: 60,
                useNativeDriver: true,
            }).start();

            // Auto hide
            setTimeout(() => {
                Animated.timing(toastAnim, {
                    toValue: -100,
                    duration: 300,
                    useNativeDriver: true,
                }).start(() => setShowToast(false));

                // Reset param? Not easily possible without navigation.setParams, 
                // but local state handles the display duration.
            }, 3000);
        }
    }, [params]);

    const handleDeletePost = async (postId) => {
        try {
            await deletePost(postId, user.id);
            setPosts(prev => prev.filter(p => p.id !== postId));
        } catch (error) {
            console.error('Failed to delete post:', error);
            // Optionally show error toast
        }
    };

    const getGreeting = () => {
        const hour = new Date().getHours();
        if (hour < 12) return "Good morning";
        if (hour < 17) return "Good afternoon";
        return "Good evening";
    };

    const handleQuickAction = (id) => {
        switch (id) {
            case 'search':
                navigation.navigate('Explore');
                break;
            case 'clubs':
                navigation.navigate('Communities');
                break;
            case 'trending':
            case 'events':
            case 'buddies':
                setToastMessage(`${id.charAt(0).toUpperCase() + id.slice(1)} coming soon! 🚀`);
                setShowToast(true);
                toastAnim.setValue(-100);
                Animated.spring(toastAnim, {
                    toValue: 60,
                    useNativeDriver: true,
                }).start();

                setTimeout(() => {
                    Animated.timing(toastAnim, {
                        toValue: -100,
                        duration: 300,
                        useNativeDriver: true,
                    }).start(() => setShowToast(false));
                }, 2000);
                break;
        }
    };

    return (
        <View style={[styles.container, { backgroundColor: isDark ? themeColors.bgDark : themeColors.bgLight }]}>
            {/* Custom Success Toast */}
            {showToast && (
                <Animated.View style={[styles.toast, { transform: [{ translateY: toastAnim }] }]}>
                    <View style={[styles.toastContent, { backgroundColor: themeColors.accentPrimary }]}>
                        <View style={styles.toastIcon}>
                            <Text style={{ color: 'white', fontWeight: 'bold' }}>✓</Text>
                        </View>
                        <Text style={styles.toastText}>{toastMessage}</Text>
                    </View>
                </Animated.View>
            )}

            <SafeAreaView style={styles.safeArea}>
                <View style={[styles.header, { borderBottomWidth: 0.5, borderBottomColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)' }]}>
                    <Text style={[styles.logoText, { color: isDark ? themeColors.textMain : themeColors.textMainLight }]}>
                        UniSphere
                    </Text>

                    <View style={styles.headerActions}>
                        <TouchableOpacity onPress={() => onCreatePost()} style={styles.headerActionBtn}>
                            <PlusSquare color={isDark ? themeColors.textMain : themeColors.textMainLight} size={24} />
                        </TouchableOpacity>

                        <TouchableOpacity onPress={onOpenNotifications} style={styles.headerActionBtn}>
                            <Heart color={isDark ? themeColors.textMain : themeColors.textMainLight} size={24} />
                            <View style={[styles.notificationDot, { backgroundColor: themeColors.accentPrimary }]} />
                        </TouchableOpacity>

                        <TouchableOpacity onPress={onOpenMessages} style={styles.headerActionBtn}>
                            <MessageCircle color={isDark ? themeColors.textMain : themeColors.textMainLight} size={24} />
                        </TouchableOpacity>
                    </View>
                </View>

                <Animated.ScrollView
                    contentContainerStyle={styles.scrollContent}
                    showsVerticalScrollIndicator={false}
                    refreshControl={
                        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={themeColors.accentPrimary} />
                    }
                    onScroll={Animated.event(
                        [{ nativeEvent: { contentOffset: { y: scrollY } } }],
                        { useNativeDriver: true }
                    )}
                    scrollEventThrottle={16}
                >


                    {/* Stories Bar Placeholder */}


                    {/* Quick Actions Rail */}
                    <View style={styles.actionsWrapper}>
                        <ScrollView
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            contentContainerStyle={styles.actionsContainer}
                        >
                            {QUICK_ACTIONS.map((action) => (
                                <TouchableOpacity
                                    key={action.id}
                                    style={[styles.actionItem, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)' }]}
                                    onPress={() => handleQuickAction(action.id)}
                                >
                                    <View style={[styles.actionIconWrap, { backgroundColor: action.color + '20' }]}>
                                        <action.icon size={20} color={action.color} />
                                    </View>
                                    <Text style={[styles.actionLabel, { color: isDark ? themeColors.textMain : themeColors.textMainLight }]}>
                                        {action.label}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                    </View>

                    {/* Ads & Posters Carousel */}
                    <AdCarousel ads={ads} />

                    <View style={styles.sectionHeader}>
                        <Text style={[styles.sectionTitle, {
                            color: isDark ? themeColors.textMain : themeColors.textMainLight,
                            fontFamily: 'PlayfairDisplay-SemiBold'
                        }]}>Campus Pulse</Text>
                    </View>

                    {/* Posts Feed */}
                    <View style={styles.feed}>
                        {loading ? (
                            <ActivityIndicator size="large" color={themeColors.accentPrimary} style={{ marginTop: 20 }} />
                        ) : posts.length === 0 ? (
                            <Text style={[styles.emptyText, { color: isDark ? themeColors.textDim : themeColors.textDimLight }]}>No posts yet. Be the first to share!</Text>
                        ) : (
                            <>
                                {posts.reduce((mixed, post, index) => {
                                    mixed.push({ type: 'post', ...post });
                                    // Inject ad after every 5th post (index 4, 9, 14...)
                                    if ((index + 1) % 5 === 0 && ads.length > 0) {
                                        const adIndex = Math.floor((index + 1) / 5) - 1;
                                        if (ads[adIndex % ads.length]) {
                                            mixed.push({ type: 'ad', ...ads[adIndex % ads.length] });
                                        }
                                    }
                                    return mixed;
                                }, []).map((item, idx) => (
                                    item.type === 'ad' ? (
                                        <AdCard key={`ad-${item.id}-${idx}`} ad={item} />
                                    ) : (
                                        <PostCard
                                            key={`post-${item.id}-${idx}`}
                                            {...item}
                                            currentUser={user}
                                            onDelete={handleDeletePost}
                                            onViewProfile={onViewProfile}
                                        />
                                    )
                                ))}
                            </>
                        )}
                    </View>

                    {/* Bottom Padding for Navigation Bar */}
                    <View style={{ height: 100 }} />
                </Animated.ScrollView>
            </SafeAreaView>


        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.bgDark,
    },
    toast: {
        position: 'absolute',
        top: 0,
        left: 20,
        right: 20,
        zIndex: 100,
        alignItems: 'center',
    },
    toastBlur: {
        borderRadius: 30,
        overflow: 'hidden',
    },
    toastContent: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 14,
        borderRadius: 30,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.2,
        shadowRadius: 15,
        elevation: 10,
    },
    toastIcon: {
        width: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor: 'rgba(255,255,255,0.25)',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    toastText: {
        color: 'white',
        fontWeight: 'bold',
        fontSize: 15,
        fontFamily: 'Inter-Bold',
    },
    safeArea: {
        flex: 1,
    },
    scrollContent: {
        paddingBottom: 20,
    },
    auraContainer: {
        position: 'absolute',
        top: -100,
        left: -100,
        right: -100,
        height: 400,
        zIndex: -1,
    },
    aura: {
        flex: 1,
        borderRadius: 200,
        opacity: 0.6,
    },
    logoText: {
        fontSize: 28,
        fontFamily: 'PlayfairDisplay-Bold',
        letterSpacing: -1,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 10,
    },
    headerActions: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 20,
    },
    headerActionBtn: {
        position: 'relative',
    },
    notificationDot: {
        position: 'absolute',
        top: -2,
        right: -2,
        width: 10,
        height: 10,
        borderRadius: 5,
        borderWidth: 2,
        borderColor: COLORS.bgDark,
    },
    storiesWrapper: {
        paddingVertical: 12,
        borderBottomWidth: 0.5,
        borderBottomColor: 'rgba(255,255,255,0.05)',
    },
    storiesContainer: {
        paddingHorizontal: 16,
    },
    storyItem: {
        alignItems: 'center',
        marginRight: 16,
        width: 72,
    },
    storyCircle: {
        width: 68,
        height: 68,
        borderRadius: 34,
        padding: 3,
        position: 'relative',
    },
    storyGradient: {
        width: 68,
        height: 68,
        borderRadius: 34,
        padding: 3,
        justifyContent: 'center',
        alignItems: 'center',
    },
    storyAvatarWrap: {
        width: '100%',
        height: '100%',
        borderRadius: 31,
        borderWidth: 2,
        overflow: 'hidden',
    },
    storyAvatar: {
        width: '100%',
        height: '100%',
    },
    addStoryBtn: {
        position: 'absolute',
        bottom: 0,
        right: 0,
        width: 22,
        height: 22,
        borderRadius: 11,
        borderWidth: 2,
        borderColor: COLORS.bgDark,
        justifyContent: 'center',
        alignItems: 'center',
    },
    addStoryPlus: {
        color: 'white',
        fontSize: 16,
        fontWeight: 'bold',
        marginTop: -1,
    },
    storyName: {
        fontSize: 11,
        marginTop: 6,
        textAlign: 'center',
    },
    actionsWrapper: {
        paddingVertical: 14,
        borderBottomWidth: 0.5,
        borderBottomColor: 'rgba(255,255,255,0.05)',
    },
    actionsContainer: {
        paddingHorizontal: 16,
    },
    actionItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 8,
        paddingHorizontal: 16,
        borderRadius: 20,
        marginRight: 10,
    },
    actionIconWrap: {
        width: 32,
        height: 32,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 8,
    },
    actionLabel: {
        fontSize: 13,
        fontWeight: '700',
    },
    feed: {
        paddingHorizontal: 0, // Instagram feed is full width
        minHeight: 200,
    },
    emptyText: {
        color: COLORS.textDim,
        textAlign: 'center',
        marginTop: 40,
        fontSize: 16,
    }
});
