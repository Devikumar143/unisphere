import React, { useRef, useState, useEffect, useCallback } from 'react';
import { StyleSheet, Text, View, ScrollView, Animated, TouchableOpacity, RefreshControl, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, SIZES } from '../constants/theme';

import PostCard from '../components/PostCard';
import AdCarousel from '../components/AdCarousel';
import { fetchPosts, deletePost, fetchAds } from '../services/api';
import { useFocusEffect, useRoute, useNavigation } from '@react-navigation/native';
import { BlurView } from 'expo-blur';
import { useTheme } from '../context/ThemeContext';
import { Bell, PlusSquare, Camera, TrendingUp, Users, Calendar, Zap, Search } from 'lucide-react-native';



const QUICK_ACTIONS = [
    { id: 'trending', label: 'Trending', icon: TrendingUp, color: '#f59e0b' },
    { id: 'clubs', label: 'Clubs', icon: Users, color: '#8b5cf6' },
    { id: 'events', label: 'Events', icon: Calendar, color: '#ec4899' },
    { id: 'buddies', label: 'Find Buddy', icon: Zap, color: '#10b981' },
    { id: 'search', label: 'Search', icon: Search, color: '#3b82f6' },
];

export default function HomeScreen({ user, onOpenNotifications, onCreatePost }) {
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
            setPosts(postsData);
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
                // Show a "Coming Soon" toast
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
        <View style={[styles.container, { backgroundColor: themeColors.bgDark }]}>
            {/* Custom Success Toast */}
            {showToast && (
                <Animated.View style={[styles.toast, { transform: [{ translateY: toastAnim }] }]}>
                    <BlurView intensity={90} tint={isDark ? "dark" : "light"} style={styles.toastBlur}>
                        <View style={styles.toastContent}>
                            <View style={[styles.toastIcon, { backgroundColor: themeColors.accentPrimary }]}>
                                <Text style={{ color: themeColors.bgDark, fontWeight: 'bold' }}>i</Text>
                            </View>
                            <Text style={[styles.toastText, { color: themeColors.textMain }]}>{toastMessage}</Text>
                        </View>
                    </BlurView>
                </Animated.View>
            )}

            <LinearGradient
                colors={[themeColors.bgDark, isDark ? '#020617' : '#EFF6FF']}
                style={StyleSheet.absoluteFill}
            />

            <SafeAreaView style={styles.safeArea}>
                {/* Aura Glow Effect */}
                <View style={styles.auraContainer}>
                    <LinearGradient
                        colors={[
                            isDark ? 'rgba(59, 130, 246, 0.15)' : 'rgba(59, 130, 246, 0.1)',
                            'transparent'
                        ]}
                        style={styles.aura}
                    />
                </View>

                <View style={styles.header}>
                    <View style={styles.greetingSection}>
                        <Text style={[styles.greetingText, { color: themeColors.textDim }]}>
                            {getGreeting()},
                        </Text>
                        <Text style={[styles.userNameText, { color: themeColors.textMain }]}>
                            {user?.name?.split(' ')[0] || 'Viky'}
                        </Text>
                    </View>

                    <View style={styles.headerActions}>
                        <TouchableOpacity onPress={() => onCreatePost()} style={styles.headerActionBtn}>
                            <BlurView intensity={isDark ? 30 : 50} tint={isDark ? "dark" : "light"} style={styles.iconCircle}>
                                <PlusSquare color={themeColors.accentPrimary} size={22} />
                            </BlurView>
                        </TouchableOpacity>

                        <TouchableOpacity onPress={onOpenNotifications} style={styles.headerActionBtn}>
                            <BlurView intensity={isDark ? 30 : 50} tint={isDark ? "dark" : "light"} style={styles.iconCircle}>
                                <Bell color={themeColors.textMain} size={22} />
                                <View style={[styles.notificationDot, { backgroundColor: themeColors.accentPrimary }]} />
                            </BlurView>
                        </TouchableOpacity>
                    </View>
                </View>

                <ScrollView
                    contentContainerStyle={styles.scrollContent}
                    showsVerticalScrollIndicator={false}
                    refreshControl={
                        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={themeColors.accentPrimary} />
                    }
                >


                    {/* Quick Actions Rail */}
                    <View style={styles.quickActionsContainer}>
                        <ScrollView
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            contentContainerStyle={styles.quickActionsContent}
                        >
                            {QUICK_ACTIONS.map((action) => (
                                <TouchableOpacity
                                    key={action.id}
                                    style={styles.actionCardWrapper}
                                    activeOpacity={0.7}
                                    onPress={() => handleQuickAction(action.id)}
                                >
                                    <BlurView
                                        intensity={isDark ? 20 : 40}
                                        tint={isDark ? "dark" : "light"}
                                        style={styles.actionCard}
                                    >
                                        <View style={[styles.actionIconContainer, { backgroundColor: action.color + '20' }]}>
                                            <action.icon size={20} color={action.color} />
                                        </View>
                                        <Text style={[styles.actionLabel, { color: themeColors.textMain }]}>
                                            {action.label}
                                        </Text>
                                    </BlurView>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                    </View>

                    {/* Ads & Posters Carousel */}
                    <AdCarousel ads={ads} />

                    <View style={styles.sectionHeader}>
                        <Text style={[styles.sectionTitle, { color: themeColors.textMain }]}>Campus Pulse</Text>
                    </View>

                    {/* Posts Feed */}
                    <View style={styles.feed}>
                        {loading ? (
                            <ActivityIndicator size="large" color={themeColors.accentPrimary} style={{ marginTop: 20 }} />
                        ) : posts.length === 0 ? (
                            <Text style={[styles.emptyText, { color: themeColors.textDim }]}>No posts yet. Be the first to share!</Text>
                        ) : (
                            posts.map(post => (
                                <PostCard
                                    key={post.id}
                                    {...post}
                                    currentUser={user}
                                    onDelete={handleDeletePost}
                                />
                            ))
                        )}
                    </View>

                    {/* Bottom Padding for Navigation Bar */}
                    <View style={{ height: 100 }} />
                </ScrollView>
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
        paddingHorizontal: 16,
        paddingVertical: 12,
        backgroundColor: '#6366f1', // Indigo base
        borderRadius: 30,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.2,
        shadowRadius: 20,
    },
    toastIcon: {
        width: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor: 'rgba(255,255,255,0.2)',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 10,
    },
    toastText: {
        color: 'white',
        fontWeight: '700',
        fontSize: 14,
    },
    safeArea: {
        flex: 0,
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
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingTop: 12,
        paddingBottom: 16,
    },
    greetingSection: {
        flex: 1,
    },
    greetingText: {
        fontSize: 14,
        fontWeight: '500',
        letterSpacing: 0.2,
        marginBottom: 2,
    },
    userNameText: {
        fontSize: 24,
        fontWeight: '800',
        letterSpacing: -0.5,
    },
    headerActions: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    headerActionBtn: {
        borderRadius: 20,
        overflow: 'hidden',
    },
    iconCircle: {
        width: 44,
        height: 44,
        justifyContent: 'center',
        alignItems: 'center',
        borderRadius: 22,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
    },
    notificationDot: {
        position: 'absolute',
        top: 12,
        right: 12,
        width: 8,
        height: 8,
        borderRadius: 4,
        borderWidth: 1.5,
        borderColor: '#fff',
    },
    scrollContent: {
        paddingTop: 10,
    },
    storiesContainer: {
        marginBottom: 24,
    },
    storiesContent: {
        paddingHorizontal: SIZES.padding,
    },
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: SIZES.padding,
        marginBottom: 16,
    },
    sectionTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: COLORS.textMain,
    },
    quickActionsContainer: {
        marginBottom: 24,
    },
    quickActionsContent: {
        paddingHorizontal: 20,
        gap: 12,
    },
    actionCardWrapper: {
        borderRadius: 20,
        overflow: 'hidden',
    },
    actionCard: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 10,
        paddingHorizontal: 16,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
    },
    actionIconContainer: {
        width: 32,
        height: 32,
        borderRadius: 10,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 10,
    },
    actionLabel: {
        fontSize: 14,
        fontWeight: '700',
        letterSpacing: -0.2,
    },
    feed: {
        paddingHorizontal: SIZES.padding,
        minHeight: 200,
    },
    emptyText: {
        color: COLORS.textDim,
        textAlign: 'center',
        marginTop: 40,
        fontSize: 16,
    }
});
