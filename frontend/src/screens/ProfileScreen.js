import React, { useState, useEffect, useCallback } from 'react';
import { StyleSheet, View, Text, Image, ScrollView, TouchableOpacity, Dimensions, ActivityIndicator, Animated, Modal, Platform, RefreshControl, Pressable, FlatList } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { Settings, MapPin, Link as LinkIcon, Edit3, Grid, Bookmark, ArrowLeft, MessageCircle, UserPlus, UserCheck, Users, Sparkles, Trash2, Monitor, Image as ImageIcon, X, User, Clapperboard, Video as VideoIcon, BadgeCheck } from 'lucide-react-native';
import { Video, ResizeMode } from 'expo-av';
import ReelItem from '../components/ReelItem';
import { COLORS, GLASS, SIZES } from '../constants/theme';
import { useTheme } from '../context/ThemeContext';
import { fetchUserProfile, fetchUserByUsername, followUser, fetchUserPosts, deletePost, fetchUserFollowers, fetchUserFollowing, updateUserStatus, fetchReels, fetchUserReels, likePost, addComment, fetchComments, recordReelView } from '../services/api';
import PostCard from '../components/PostCard';
import UserListItem from '../components/UserListItem';
import { Alert } from 'react-native';
import GlobalImageViewer from '../components/GlobalImageViewer';

const { width } = Dimensions.get('window');

export default function ProfileScreen({ targetUser, currentUser, onOpenSettings, onEditProfile, onOpenAdManagement, onBack, onOpenChat, onViewProfile }) {
    const { themeColors, isDark } = useTheme();
    const [profileData, setProfileData] = useState(null);
    const [loading, setLoading] = useState(!targetUser);
    const [isFollowing, setIsFollowing] = useState(false);
    const [followLoading, setFollowLoading] = useState(false);
    const [userPosts, setUserPosts] = useState([]);
    const [activeTab, setActiveTab] = useState('Activity');
    const [loadingPosts, setLoadingPosts] = useState(false);
    const [deleteModalVisible, setDeleteModalVisible] = useState(false);
    const [postToDelete, setPostToDelete] = useState(null);
    const [refreshing, setRefreshing] = useState(false);
    const [lightboxVisible, setLightboxVisible] = useState(false);
    const [selectedImage, setSelectedImage] = useState(null);
    const scrollRef = React.useRef(null);
    const postLayouts = React.useRef({}).current;
    const deleteScale = React.useRef(new Animated.Value(0.8)).current;
    const deleteOpacity = React.useRef(new Animated.Value(0)).current;
    const [connectionsModalVisible, setConnectionsModalVisible] = useState(false);
    const [connectionsTab, setConnectionsTab] = useState('Followers');
    const [connectionsList, setConnectionsList] = useState([]);
    const [loadingConnections, setLoadingConnections] = useState(false);
    const [userReels, setUserReels] = useState([]);
    const [loadingReels, setLoadingReels] = useState(false);
    const [reelModalVisible, setReelModalVisible] = useState(false);
    const [selectedReel, setSelectedReel] = useState(null);

    const isOwnProfile = (currentUser?.id && targetUser?.id) ? (currentUser.id == targetUser.id) : !onBack;

    console.log('Profile ownership check:', {
        currentId: currentUser?.id,
        targetId: targetUser?.id,
        isOwn: isOwnProfile,
        hasBack: !!onBack
    });

    useEffect(() => {
        if (targetUser && (targetUser.id || targetUser.username)) {
            loadProfile();
        } else {
            console.warn('[ProfileScreen] No ID or Username found on targetUser:', targetUser);
        }
    }, [targetUser?.id, targetUser?.username]);

    const loadProfile = async (silent = false) => {
        if (!targetUser?.id && !targetUser?.username) return;

        if (!silent) setLoading(true);
        try {
            console.log(`[ProfileScreen] Loading profile for: ${targetUser.id || targetUser.username}`);
            let data;
            if (targetUser.id) {
                data = await fetchUserProfile(targetUser.id, currentUser?.id);
            } else if (targetUser.username) {
                data = await fetchUserByUsername(targetUser.username, currentUser?.id);
            }
            setProfileData(data);
            setIsFollowing(data.isFollowing);
        } catch (error) {
            console.error('[ProfileScreen] Failed to load profile:', error);
        } finally {
            if (!silent) setLoading(false);
        }
    };

    const handleFollow = async () => {
        if (!currentUser?.id || !targetUser?.id) return;

        setFollowLoading(true);
        try {
            const result = await followUser(targetUser.id, currentUser.id);
            setIsFollowing(result.isFollowing);

            // Optimistically update connections count if we have the data
            if (profileData) {
                setProfileData({
                    ...profileData,
                    stats: {
                        ...profileData.stats,
                        connections: result.isFollowing
                            ? (profileData.stats.connections + 1)
                            : Math.max(0, profileData.stats.connections - 1)
                    }
                });
            }
        } catch (error) {
            console.error('Follow failed:', error);
        } finally {
            setFollowLoading(false);
        }
    };

    const handleImagePress = (uri) => {
        setSelectedImage(uri);
        setLightboxVisible(true);
    };

    useEffect(() => {
        const userId = profileData?.id || targetUser?.id;
        if (userId) {
            if (activeTab === 'Activity') {
                loadPosts(userId);
            } else if (activeTab === 'Reels') {
                loadUserReels(userId);
            }
        }
    }, [profileData?.id, targetUser?.id, activeTab]);

    const loadUserReels = async (userId) => {
        setLoadingReels(true);
        try {
            const reels = await fetchUserReels(userId, currentUser?.id);
            setUserReels(reels);
        } catch (e) {
            console.error(e);
        } finally {
            setLoadingReels(false);
        }
    };

    const loadPosts = async (userId, silent = false) => {
        if (!silent) setLoadingPosts(true);
        try {
            const posts = await fetchUserPosts(userId, currentUser?.id);
            setUserPosts(posts);
        } catch (e) {
            console.error(e);
        } finally {
            if (!silent) setLoadingPosts(false);
        }
    };

    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        const userId = profileData?.id || targetUser?.id;
        try {
            await Promise.all([
                loadProfile(true),
                userId ? loadPosts(userId, true) : Promise.resolve()
            ]);
        } catch (error) {
            console.error('[ProfileScreen] Refresh failed:', error);
        } finally {
            setRefreshing(false);
        }
    }, [profileData?.id, targetUser?.id, targetUser?.username, currentUser?.id]);

    const showDeleteConfirm = (postId) => {
        setPostToDelete(postId);
        setDeleteModalVisible(true);
        Animated.parallel([
            Animated.spring(deleteScale, { toValue: 1, useNativeDriver: true, tension: 50, friction: 7 }),
            Animated.timing(deleteOpacity, { toValue: 1, duration: 200, useNativeDriver: true })
        ]).start();
    };

    const hideDeleteConfirm = () => {
        Animated.parallel([
            Animated.timing(deleteScale, { toValue: 0.8, duration: 200, useNativeDriver: true }),
            Animated.timing(deleteOpacity, { toValue: 0, duration: 150, useNativeDriver: true })
        ]).start(() => {
            setDeleteModalVisible(false);
            setPostToDelete(null);
        });
    };

    const confirmDeletePost = async () => {
        if (!postToDelete) return;
        try {
            await deletePost(postToDelete, currentUser.id);
            setUserPosts(prev => prev.filter(p => p.id !== postToDelete));
            if (profileData && profileData.stats) {
                setProfileData({
                    ...profileData,
                    stats: { ...profileData.stats, posts: Math.max(0, profileData.stats.posts - 1) }
                });
            }
            hideDeleteConfirm();
        } catch (e) {
            Alert.alert('Error', 'Failed to delete post');
            hideDeleteConfirm();
        }
    };

    const handleOpenConnections = async (tab) => {
        const userId = profileData?.id || targetUser?.id;
        if (!userId) return;

        setConnectionsTab(tab);
        setConnectionsModalVisible(true);
        setLoadingConnections(true);
        try {
            const list = tab === 'Followers'
                ? await fetchUserFollowers(userId)
                : await fetchUserFollowing(userId);
            setConnectionsList(list);
        } catch (error) {
            console.error('Failed to fetch connections:', error);
        } finally {
            setLoadingConnections(false);
        }
    };

    const handleConnectionPress = (user) => {
        setConnectionsModalVisible(false);
        if (targetUser && targetUser.id === user.id) return; // Already on this profile
        // If we are on ProfileScreen, we usually navigation.push or update targetUser
        // But ProfileScreen here is a component.
        // We need to notify the parent to view this user.
        if (onViewProfile) {
            onViewProfile(user);
        }

    };

    const handleReelPress = (reel) => {
        setSelectedReel(reel);
        setReelModalVisible(true);
        recordReelView(reel.id);
    };

    const handleReelLike = async (reelId) => {
        if (!selectedReel) return;
        // Optimistic update
        setSelectedReel(prev => ({
            ...prev,
            isLiked: !prev.isLiked,
            likes: prev.isLiked ? prev.likes - 1 : prev.likes + 1
        }));
        setUserReels(prev => prev.map(r => r.id === reelId ? {
            ...r,
            isLiked: !r.isLiked,
            likes: r.isLiked ? r.likes - 1 : r.likes + 1
        } : r));

        try {
            await likePost(reelId, currentUser.id);
        } catch (error) {
            console.error(error);
        }
    };

    const handleOpenReelComments = async (reel) => {
        // This would ideally open a comment modal on top of the reel modal
        // For simplicity, we can reuse logic if we extracted it, or just show an alert for now "Comments on profile reel view coming soon"
        // Or implement a simple comment fetch
        Alert.alert("Comments", "View comments in the main Reels tab for optimal experience.");
    };

    if (loading && !profileData) {
        return (
            <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
                <ActivityIndicator size="large" color={COLORS.accentPrimary} />
            </View>
        );
    }

    const effectiveUser = profileData || targetUser;

    let displayProfile = {
        name: "User",
        username: "",
        role: "Student",
        department: "General",
        location: "Campus",
        bio: "No bio yet.",
        stats: { connections: 0, posts: 0, views: 0 },
        avatar: "https://i.pravatar.cc/150",
        coverImage: "https://images.unsplash.com/photo-1541339907198-e08756dedf3f?w=800&fit=crop"
    };

    try {
        displayProfile = {
            name: effectiveUser.full_name || effectiveUser.name || "User",
            username: effectiveUser.username,
            role: effectiveUser.role || "Student",
            department: effectiveUser.department || "General",
            location: effectiveUser.location || "Campus",
            bio: effectiveUser.bio || "No bio yet.",
            stats: effectiveUser.stats || { connections: 0, posts: 0, views: 0 },
            avatar: effectiveUser.avatar || ("https://i.pravatar.cc/150?u=" + (effectiveUser.id || effectiveUser.full_name || "User")),
            coverImage: effectiveUser.coverImage || "https://images.unsplash.com/photo-1541339907198-e08756dedf3f?w=800&fit=crop",
            isVerified: effectiveUser.isVerified,
            subscriptionType: effectiveUser.subscriptionType,
            subscriptionExpiry: effectiveUser.subscriptionExpiry
        };
    } catch (e) {
        console.error("Error formatting display profile:", e);
    }

    return (
        <View style={[styles.container, { backgroundColor: isDark ? themeColors.bgDark : themeColors.bgLight }]}>
            {/* Background Aura Glows removed for Organic Earth style */}

            <ScrollView
                ref={scrollRef}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: 100 }}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={onRefresh}
                        colors={[themeColors.accentPrimary]}
                        tintColor={isDark ? '#FFF' : themeColors.accentPrimary}
                    />
                }
            >
                {/* Header Cover */}
                <View style={[styles.coverContainer, { backgroundColor: isDark ? themeColors.bgCard : themeColors.bgLight }]}>
                    <TouchableOpacity
                        style={StyleSheet.absoluteFill}
                        activeOpacity={0.9}
                        onPress={() => handleImagePress(displayProfile.avatar)}
                    >
                        <Image
                            source={{ uri: displayProfile.avatar || "https://images.unsplash.com/photo-1541339907198-e08756dedf3f?w=800&fit=crop" }}
                            style={StyleSheet.absoluteFill}
                            resizeMode="cover"
                        />
                        {effectiveUser.status && (
                            <View style={styles.statusBadgeOnAvatar}>
                                <Text style={styles.statusAvatarText}>
                                    {[
                                        { label: 'Studying', icon: '📖' },
                                        { label: 'In Class', icon: '🏫' },
                                        { label: 'Researching', icon: '🔬' },
                                        { label: 'Coffee Break', icon: '☕' },
                                        { label: 'Deep Focus', icon: '🎯' },
                                        { label: 'Available', icon: '✅' }
                                    ].find(s => s.label === effectiveUser.status)?.icon || '✨'}
                                </Text>
                            </View>
                        )}
                    </TouchableOpacity>

                    {/* Readable Overlay Gradients */}
                    <LinearGradient
                        colors={['rgba(0,0,0,0.4)', 'rgba(0,0,0,0)', 'rgba(0,0,0,0.7)']}
                        style={StyleSheet.absoluteFill}
                    />

                    {/* Back Button */}
                    {onBack && (
                        <TouchableOpacity style={styles.backBtn} onPress={onBack}>
                            <View style={[styles.iconButton, { backgroundColor: 'rgba(0,0,0,0.3)' }]}>
                                <ArrowLeft color="#FFFFFF" size={20} />
                            </View>
                        </TouchableOpacity>
                    )}

                    {/* Ad Management Button (Visible only to Developers/Admins) */}
                    {isOwnProfile && (currentUser?.role === 'Developer' || currentUser?.role === 'Admin') && (
                        <TouchableOpacity style={[styles.settingsBtn, { right: 70 }]} onPress={onOpenAdManagement}>
                            <BlurView intensity={30} tint="dark" style={styles.iconButton}>
                                <Monitor color="#FFFFFF" size={20} />
                            </BlurView>
                        </TouchableOpacity>
                    )}

                    {/* Settings Button */}
                    {isOwnProfile && (
                        <TouchableOpacity style={styles.settingsBtn} onPress={onOpenSettings}>
                            <View style={[styles.iconButton, { backgroundColor: 'rgba(0,0,0,0.3)' }]}>
                                <Settings color="#FFFFFF" size={20} />
                            </View>
                        </TouchableOpacity>
                    )}

                    {/* Name/Handle/Meta Overlayed on Banner Bottom */}
                    <View style={styles.bannerInfoOverlay}>
                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                            <Text style={[styles.name, { color: '#FFFFFF', fontFamily: 'PlayfairDisplay-Bold' }]}>
                                {displayProfile.name}
                            </Text>
                            {displayProfile.isVerified ? (
                                <BadgeCheck size={18} color="#FFD700" style={{ marginLeft: 6 }} />
                            ) : displayProfile.subscriptionType === 'blue' ? (
                                <BadgeCheck size={18} color="#4B9CD3" style={{ marginLeft: 6 }} />
                            ) : null}
                        </View>
                        <View style={styles.handleRow}>
                            <Text style={[styles.handle, { color: 'rgba(255,255,255,0.8)' }]}>
                                @{displayProfile.username}
                            </Text>
                            {displayProfile.role && (
                                <View style={[styles.badge, { backgroundColor: themeColors.accentPrimary }]}>
                                    <Text style={[styles.badgeText, { color: '#FFFFFF' }]}>{displayProfile.role}</Text>
                                </View>
                            )}
                        </View>

                        {/* Meta Info on Banner */}
                        <View style={[styles.locationGroup, { marginTop: 8 }]}>
                            <View style={styles.metaRow}>
                                <MapPin size={14} color="#FFFFFF" />
                                <Text style={[styles.metaText, { color: '#FFFFFF' }]}>{displayProfile.location || 'Student City'}</Text>
                            </View>
                            <View style={styles.metaRow}>
                                <LinkIcon size={14} color="#FFFFFF" />
                                <Text style={[styles.metaText, { color: 'rgba(255,255,255,0.9)' }]}>UniSphere.me/{displayProfile.username}</Text>
                            </View>
                        </View>
                    </View>
                </View>



                {/* Profile Information Section */}
                <View style={styles.profileContent}>
                    <View style={styles.mainInfo}>
                        {/* Avatar and Meta Info removed as per user request - banner used instead */}
                    </View>

                    {/* Aura Stats Section */}
                    <View style={styles.auraStatsGrid}>
                        <TouchableOpacity
                            style={{ flex: 1 }}
                            onPress={() => handleOpenConnections('Followers')}
                        >
                            <StatCard
                                label="Connections"
                                value={displayProfile.stats.connections}
                                icon={Users}
                                color={themeColors.sage}
                            />
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={{ flex: 1 }}
                            onPress={() => setActiveTab('Activity')}
                        >
                            <StatCard
                                label="Posts"
                                value={displayProfile.stats.posts || 0}
                                icon={Grid}
                                color={themeColors.terracotta}
                            />
                        </TouchableOpacity>
                    </View>

                    {/* Bio Card */}
                    <View style={styles.bioWrapper}>
                        <View style={[styles.bioCard, {
                            backgroundColor: isDark ? themeColors.bgCard : themeColors.bgCardLight,
                            borderColor: themeColors.accentPrimary + '10'
                        }]}>
                            <Text style={[styles.bioLabel, { color: isDark ? themeColors.textMuted : themeColors.textMutedLight }]}>BIOGRAPHY</Text>
                            <Text style={[styles.bioText, { color: isDark ? themeColors.textMain : themeColors.textMainLight }]}>
                                {displayProfile.bio || "Crafting experiences and building connections in the digital universe."}
                            </Text>

                            {/* Inner Accent Line */}
                            <View
                                style={[styles.bioAccent, { backgroundColor: themeColors.accentPrimary }]}
                            />
                        </View>
                    </View>

                    {/* Primary Actions */}
                    <View style={styles.primaryActions}>
                        {isOwnProfile ? (
                            <TouchableOpacity style={styles.editProfileBtn} onPress={onEditProfile}>
                                <View style={[styles.actionGradient, { backgroundColor: themeColors.accentPrimary }]}>
                                    <Edit3 color="white" size={18} style={{ marginRight: 8 }} />
                                    <Text style={styles.actionBtnText}>Update Profile</Text>
                                </View>
                            </TouchableOpacity>
                        ) : (
                            <View style={styles.interactionRow}>
                                <TouchableOpacity
                                    style={styles.connectBtn}
                                    onPress={handleFollow}
                                    disabled={followLoading}
                                >
                                    <LinearGradient
                                        colors={isFollowing ? ['#334155', '#1e293b'] : [themeColors.accentPrimary, themeColors.accentSecondary]}
                                        style={styles.actionGradient}
                                        start={{ x: 0, y: 0 }}
                                        end={{ x: 1, y: 0 }}
                                    >
                                        {followLoading ? (
                                            <ActivityIndicator size="small" color="white" />
                                        ) : (
                                            <>
                                                {isFollowing ? (
                                                    <UserCheck color="white" size={18} style={{ marginRight: 8 }} />
                                                ) : (
                                                    <UserPlus color="white" size={18} style={{ marginRight: 8 }} />
                                                )}
                                                <Text style={styles.actionBtnText}>{isFollowing ? 'Connected' : 'Connect'}</Text>
                                            </>
                                        )}
                                    </LinearGradient>
                                </TouchableOpacity>

                                <TouchableOpacity style={styles.messageIconBtn} onPress={() => onOpenChat && onOpenChat(effectiveUser)}>
                                    <BlurView intensity={30} tint={isDark ? "dark" : "light"} style={styles.messageBtnInner}>
                                        <MessageCircle color={themeColors.textMain} size={22} />
                                    </BlurView>
                                </TouchableOpacity>
                            </View>
                        )}
                    </View>

                    {/* Content Tabs (Minimal) */}
                    <View style={styles.contentTabs}>
                        <TouchableOpacity
                            style={[styles.tabItem, activeTab === 'Activity' && styles.tabItemActive]}
                            onPress={() => setActiveTab('Activity')}
                        >
                            <Grid size={20} color={activeTab === 'Activity' ? themeColors.accentPrimary : (isDark ? themeColors.textDim : themeColors.textDimLight)} />
                            <Text style={[styles.tabText, { color: activeTab === 'Activity' ? (isDark ? themeColors.textMain : themeColors.textMainLight) : (isDark ? themeColors.textDim : themeColors.textDimLight) }]}>Activity</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.tabItem, activeTab === 'Reels' && styles.tabItemActive]}
                            onPress={() => setActiveTab('Reels')}
                        >
                            <Clapperboard size={20} color={activeTab === 'Reels' ? themeColors.accentPrimary : (isDark ? themeColors.textDim : themeColors.textDimLight)} />
                            <Text style={[styles.tabText, { color: activeTab === 'Reels' ? (isDark ? themeColors.textMain : themeColors.textMainLight) : (isDark ? themeColors.textDim : themeColors.textDimLight) }]}>Reels</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.tabItem, activeTab === 'Gallery' && styles.tabItemActive]}
                            onPress={() => setActiveTab('Gallery')}
                        >
                            <ImageIcon size={20} color={activeTab === 'Gallery' ? themeColors.accentPrimary : (isDark ? themeColors.textDim : themeColors.textDimLight)} />
                            <Text style={[styles.tabText, { color: activeTab === 'Gallery' ? (isDark ? themeColors.textMain : themeColors.textMainLight) : (isDark ? themeColors.textDim : themeColors.textDimLight) }]}>Gallery</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.tabItem, activeTab === 'Saved' && styles.tabItemActive]}
                            onPress={() => setActiveTab('Saved')}
                        >
                            <Bookmark size={20} color={activeTab === 'Saved' ? themeColors.accentPrimary : (isDark ? themeColors.textDim : themeColors.textDimLight)} />
                            <Text style={[styles.tabText, { color: activeTab === 'Saved' ? (isDark ? themeColors.textMain : themeColors.textMainLight) : (isDark ? themeColors.textDim : themeColors.textDimLight) }]}>Saved</Text>
                        </TouchableOpacity>
                    </View>

                    {/* Posts / Gallery List */}
                    <View style={{ paddingBottom: 20 }}>
                        {loadingPosts ? (
                            <ActivityIndicator color={themeColors.accentPrimary} style={{ marginTop: 20 }} />
                        ) : activeTab === 'Activity' ? (
                            userPosts.length > 0 ? (
                                userPosts.map(post => (
                                    <View
                                        key={post.id}
                                        onLayout={(event) => {
                                            const { y } = event.nativeEvent.layout;
                                            postLayouts[post.id] = y;
                                        }}
                                    >
                                        <PostCard
                                            {...post}
                                            currentUser={currentUser}
                                            onDelete={showDeleteConfirm}
                                        />
                                    </View>
                                ))
                            ) : (
                                <Text style={{ textAlign: 'center', color: isDark ? themeColors.textDim : themeColors.textDimLight, marginTop: 20 }}>No posts yet.</Text>
                            )
                        ) : activeTab === 'Reels' ? (
                            loadingReels ? (
                                <ActivityIndicator color={themeColors.accentPrimary} style={{ marginTop: 20 }} />
                            ) : userReels.length > 0 ? (
                                <View style={styles.mediaGrid}>
                                    {userReels.map((reel) => (
                                        <TouchableOpacity
                                            key={reel.id}
                                            style={styles.mediaGridItem}
                                            onPress={() => handleReelPress(reel)}
                                        >
                                            <Video
                                                source={{ uri: reel.video }}
                                                style={styles.gridImage}
                                                resizeMode={ResizeMode.COVER}
                                                shouldPlay={false}
                                                isMuted={true}
                                            />
                                            <View style={styles.reelIconOverlay}>
                                                <Clapperboard color="white" size={16} />
                                                <Text style={styles.reelOverlayText}>{reel.views || 0}</Text>
                                            </View>
                                        </TouchableOpacity>
                                    ))}
                                </View>
                            ) : (
                                <Text style={{ textAlign: 'center', color: isDark ? themeColors.textDim : themeColors.textDimLight, marginTop: 20 }}>No reels shared yet.</Text>
                            )
                        ) : activeTab === 'Gallery' ? (
                            (() => {
                                const mediaPosts = userPosts.filter(p => p.image);
                                return mediaPosts.length > 0 ? (
                                    <View style={styles.mediaGrid}>
                                        {mediaPosts.map((post) => (
                                            <TouchableOpacity
                                                key={post.id}
                                                style={styles.mediaGridItem}
                                                onPress={() => handleImagePress(post.image)}
                                            >
                                                <Image source={{ uri: post.image }} style={styles.gridImage} />
                                            </TouchableOpacity>
                                        ))}
                                    </View>
                                ) : (
                                    <Text style={{ textAlign: 'center', color: isDark ? themeColors.textDim : themeColors.textDimLight, marginTop: 20 }}>No media found.</Text>
                                );
                            })()
                        ) : (
                            <Text style={{ textAlign: 'center', color: isDark ? themeColors.textDim : themeColors.textDimLight, marginTop: 20 }}>Saved posts coming soon.</Text>
                        )}
                    </View>
                </View>
            </ScrollView >

            <Modal
                transparent
                visible={deleteModalVisible}
                onRequestClose={hideDeleteConfirm}
                animationType="none"
            >
                <View style={styles.modalOverlay}>
                    <Animated.View style={[styles.confirmCard, {
                        backgroundColor: isDark ? 'rgba(30,30,40,0.95)' : 'white',
                        transform: [{ scale: deleteScale }],
                        opacity: deleteOpacity
                    }]}>
                        <View style={styles.confirmIconContainer}>
                            <Trash2 color={COLORS.error} size={32} />
                        </View>
                        <Text style={[styles.confirmTitle, { color: isDark ? themeColors.textMain : themeColors.textMainLight }]}>Delete Post?</Text>
                        <Text style={[styles.confirmMessage, { color: isDark ? themeColors.textDim : themeColors.textDimLight }]}>
                            Are you sure you want to delete this post? This action cannot be undone.
                        </Text>
                        <View style={styles.confirmActions}>
                            <TouchableOpacity style={[styles.cancelBtn, { borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)' }]} onPress={hideDeleteConfirm}>
                                <Text style={[styles.buttonText, { color: isDark ? themeColors.textMain : themeColors.textMainLight }]}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={[styles.confirmDeleteBtn, { backgroundColor: COLORS.error }]} onPress={confirmDeletePost}>
                                <Text style={[styles.buttonText, { color: 'white' }]}>Delete</Text>
                            </TouchableOpacity>
                        </View>
                    </Animated.View>
                </View>
            </Modal>

            {/* Global Image Viewer */}
            <GlobalImageViewer
                visible={lightboxVisible}
                imageUrl={selectedImage}
                onClose={() => setLightboxVisible(false)}
            />

            {/* Connections Modal */}
            <Modal
                visible={connectionsModalVisible}
                animationType="slide"
                transparent={true}
                onRequestClose={() => setConnectionsModalVisible(false)}
            >
                <View style={styles.connectionsModalOverlay}>
                    <TouchableOpacity
                        style={{ flex: 1 }}
                        activeOpacity={1}
                        onPress={() => setConnectionsModalVisible(false)}
                    />
                    <View style={[styles.modalContainer, { backgroundColor: isDark ? themeColors.bgDark : themeColors.bgLight, height: '80%' }]}>
                        <View style={styles.modalHandle} />
                        <View style={styles.modalHeader}>
                            <Text style={[styles.modalTitle, { color: isDark ? themeColors.textMain : themeColors.textMainLight }]}>Connections</Text>
                            <TouchableOpacity onPress={() => setConnectionsModalVisible(false)} style={styles.modalCloseBtn}>
                                <X size={22} color={isDark ? themeColors.textMain : themeColors.textMainLight} />
                            </TouchableOpacity>
                        </View>

                        <View style={styles.modalTabs}>
                            <TouchableOpacity
                                style={[styles.modalTab, connectionsTab === 'Followers' && styles.modalTabActive, { borderBottomColor: themeColors.accentPrimary }]}
                                onPress={() => handleOpenConnections('Followers')}
                            >
                                <Text style={[styles.modalTabText, { color: connectionsTab === 'Followers' ? themeColors.accentPrimary : (isDark ? themeColors.textDim : themeColors.textDimLight) }]}>Followers</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.modalTab, connectionsTab === 'Following' && styles.modalTabActive, { borderBottomColor: themeColors.accentPrimary }]}
                                onPress={() => handleOpenConnections('Following')}
                            >
                                <Text style={[styles.modalTabText, { color: connectionsTab === 'Following' ? themeColors.accentPrimary : (isDark ? themeColors.textDim : themeColors.textDimLight) }]}>Following</Text>
                            </TouchableOpacity>
                        </View>

                        {loadingConnections ? (
                            <ActivityIndicator size="large" color={themeColors.accentPrimary} style={{ marginTop: 40 }} />
                        ) : (
                            <FlatList
                                data={connectionsList}
                                keyExtractor={item => (item.id || Math.random()).toString()}
                                renderItem={({ item }) => (
                                    <UserListItem
                                        user={item}
                                        onPress={() => handleConnectionPress(item)}
                                    />
                                )}
                                contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40 }}
                                ListEmptyComponent={
                                    <View style={{ alignItems: 'center', marginTop: 50 }}>
                                        <Users size={48} color={isDark ? themeColors.textDim : themeColors.textDimLight} style={{ marginBottom: 16, opacity: 0.3 }} />
                                        <Text style={{ color: isDark ? themeColors.textDim : themeColors.textDimLight }}>No connections yet.</Text>
                                    </View>
                                }
                            />
                        )}
                    </View>
                </View>
            </Modal>
            <Modal
                visible={reelModalVisible}
                animationType="slide"
                onRequestClose={() => setReelModalVisible(false)}
            >
                <View style={{ flex: 1, backgroundColor: 'black' }}>
                    <TouchableOpacity
                        style={styles.closeReelBtn}
                        onPress={() => setReelModalVisible(false)}
                    >
                        <X color="white" size={28} />
                    </TouchableOpacity>
                    {selectedReel && (
                        <ReelItem
                            item={selectedReel}
                            isActive={true}
                            bottomTabHeight={0}
                            onLike={handleReelLike}
                            onComment={handleOpenReelComments}
                            onViewProfile={() => {
                                setReelModalVisible(false);
                                // already on profile, maybe check if it's the same user or different?
                                // if it's a different user (e.g. shared reel), fetch that user.
                                // But here we are viewing USER's reels, so it's the same user.
                            }}
                            onShare={() => { }} // Could implement share from here too
                        />
                    )}
                </View>
            </Modal>
        </View >
    );
}

const StatCard = ({ label, value, icon: Icon, color }) => {
    const { isDark, themeColors } = useTheme();
    return (
        <View style={styles.statCardWrapper}>
            <View style={[styles.statCard, {
                backgroundColor: isDark ? themeColors.bgCard : themeColors.bgCardLight,
                borderColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'
            }]}>
                <View style={[styles.statIconBox, { backgroundColor: color + '15' }]}>
                    <Icon size={16} color={color} />
                </View>
                <Text style={[styles.statValue, { color: isDark ? themeColors.textMain : themeColors.textMainLight }]}>{value}</Text>
                <Text style={[styles.statLabel, { color: isDark ? themeColors.textMuted : themeColors.textMutedLight }]}>{label.toUpperCase()}</Text>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    coverContainer: {
        height: 450,
        width: '100%',
        borderBottomLeftRadius: 20,
        borderBottomRightRadius: 20,
        overflow: 'hidden',
    },
    coverImage: {
    },
    settingsBtn: {
        position: 'absolute',
        top: 50,
        right: 20,
        zIndex: 10,
    },
    backBtn: {
        position: 'absolute',
        top: 50,
        left: 20,
        zIndex: 10,
    },
    iconButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
        justifyContent: 'center',
        alignItems: 'center',
        overflow: 'hidden',
    },
    bannerInfoOverlay: {
        position: 'absolute',
        bottom: 20,
        left: 24,
        right: 24,
    },
    profileContent: {
        marginTop: 0,
        paddingHorizontal: 24,
        paddingTop: 24,
    },
    mainInfo: {
        marginBottom: 24,
    },
    avatarBorder: {
        width: 104,
        height: 104,
        borderRadius: 52,
        padding: 4,
        elevation: 15,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.3,
        shadowRadius: 15,
    },
    avatar: {
        width: '100%',
        height: '100%',
        borderRadius: 48,
        backgroundColor: '#1A1A1A',
    },
    onlineStatus: {
        position: 'absolute',
        bottom: 4,
        right: 4,
        width: 18,
        height: 18,
        borderRadius: 9,
        backgroundColor: '#10b981',
        borderWidth: 3,
        borderColor: '#050810',
    },
    nameSection: {
        marginLeft: 20,
        flex: 1,
        paddingBottom: 4,
    },
    name: {
        fontSize: 28,
        fontWeight: '900',
        letterSpacing: -1,
    },
    handleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 4,
    },
    handle: {
        fontSize: 16,
        fontWeight: '700',
    },
    badge: {
        marginLeft: 8,
        paddingHorizontal: 10,
        paddingVertical: 2,
        borderRadius: 12,
    },
    badgeText: {
        fontSize: 11,
        fontWeight: '900',
        letterSpacing: 0.5,
    },
    locationGroup: {
        marginTop: 12,
        flexDirection: 'row',
        gap: 12,
    },
    metaRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    metaText: {
        fontSize: 13,
        fontWeight: '600',
    },
    auraStatsGrid: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 32,
        gap: 12,
    },
    statCardWrapper: {
        flex: 1,
    },
    statCard: {
        borderRadius: 24,
        padding: 16,
        alignItems: 'center',
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.08)',
    },
    statIconBox: {
        width: 32,
        height: 32,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 8,
    },
    statValue: {
        fontSize: 20,
        fontWeight: '900',
        letterSpacing: -0.5,
    },
    statLabel: {
        fontSize: 10,
        fontWeight: '800',
        color: 'rgba(128,128,128,0.7)',
        marginTop: 2,
    },
    statGlow: {
        position: 'absolute',
        width: 100,
        height: 100,
        borderRadius: 50,
        bottom: -50,
        right: -50,
        opacity: 0.2,
    },
    statusBadgeOnAvatar: {
        position: 'absolute',
        bottom: 20,
        right: 20,
        backgroundColor: '#FFF',
        width: 36,
        height: 36,
        borderRadius: 18,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 3,
        borderColor: '#8B5CF6',
        elevation: 5,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
    },
    statusAvatarText: {
        fontSize: 18,
    },
    statusPickerWrapper: {
        paddingHorizontal: 24,
        marginTop: 32,
        marginBottom: 8,
    },
    statusLabel: {
        fontSize: 10,
        fontWeight: '900',
        letterSpacing: 2,
        marginBottom: 16,
    },
    statusScroll: {
        gap: 12,
        paddingRight: 24,
    },
    statusItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 16,
        borderWidth: 1.5,
        borderColor: 'transparent',
        backgroundColor: 'rgba(0,0,0,0.03)',
    },
    statusIcon: {
        fontSize: 18,
        marginRight: 8,
    },
    statusItemText: {
        fontSize: 13,
        fontWeight: '700',
    },
    bioWrapper: {
        marginBottom: 32,
    },
    bioCard: {
        borderRadius: 24,
        padding: 24,
        overflow: 'hidden',
        borderWidth: 1,
    },
    bioLabel: {
        fontSize: 11,
        fontWeight: '900',
        letterSpacing: 1,
        marginBottom: 12,
    },
    bioText: {
        fontSize: 16,
        lineHeight: 24,
        fontWeight: '500',
    },
    bioAccent: {
        position: 'absolute',
        top: 24,
        left: 0,
        width: 4,
        height: 24,
        borderTopRightRadius: 2,
        borderBottomRightRadius: 2,
    },
    primaryActions: {
        marginBottom: 32,
    },
    interactionRow: {
        flexDirection: 'row',
        gap: 12,
    },
    connectBtn: {
        flex: 1,
        height: 56,
        borderRadius: 28,
        overflow: 'hidden',
    },
    editProfileBtn: {
        height: 56,
        borderRadius: 28,
        overflow: 'hidden',
    },
    actionGradient: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
    },
    actionBtnText: {
        color: '#FFF',
        fontSize: 16,
        fontWeight: '800',
    },
    messageIconBtn: {
        width: 56,
        height: 56,
        borderRadius: 28,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
    },
    messageBtnInner: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    contentTabs: {
        flexDirection: 'row',
        borderBottomWidth: 1,
        borderColor: 'rgba(128,128,128,0.1)',
        marginBottom: 20,
    },
    tabItem: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 12,
        gap: 8,
    },
    modalContainer: {
        borderTopLeftRadius: 32,
        borderTopRightRadius: 32,
        overflow: 'hidden',
        width: '100%',
    },
    modalHandle: {
        width: 40,
        height: 4,
        backgroundColor: 'rgba(128,128,128,0.3)',
        borderRadius: 2,
        alignSelf: 'center',
        marginTop: 12,
    },
    modalHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 20,
        paddingHorizontal: 24,
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: '800',
    },
    modalCloseBtn: {
        position: 'absolute',
        right: 24,
        padding: 4,
    },
    modalTabs: {
        flexDirection: 'row',
        paddingHorizontal: 20,
        marginBottom: 16,
    },
    modalTab: {
        flex: 1,
        paddingVertical: 12,
        alignItems: 'center',
        borderBottomWidth: 2,
        borderBottomColor: 'transparent',
    },
    modalTabActive: {},
    modalTabText: {
        fontSize: 15,
        fontWeight: '700',
    },
    connectionItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(128,128,128,0.05)',
    },
    connectionAvatarContainer: {
        marginRight: 16,
    },
    connectionAvatar: {
        width: 50,
        height: 50,
        borderRadius: 25,
    },
    connectionInfo: {
        flex: 1,
    },
    connectionName: {
        fontSize: 16,
        fontWeight: '700',
    },
    connectionHandle: {
        fontSize: 14,
        marginTop: 2,
    },
    tabItemActive: {
        borderBottomWidth: 2,
        borderColor: COLORS.accentPrimary,
    },
    tabText: {
        fontSize: 15,
        fontWeight: '700',
    },
    // Modal Styles
    modalOverlay: {
        flex: 1,
        justifyContent: 'center',
        padding: 24,
        backgroundColor: 'rgba(0,0,0,0.6)',
    },
    confirmCard: {
        width: '100%',
        alignSelf: 'center',
        padding: 24,
        borderRadius: 24,
        alignItems: 'center',
        overflow: 'hidden',
    },
    confirmIconContainer: {
        width: 64,
        height: 64,
        borderRadius: 32,
        backgroundColor: 'rgba(239, 68, 68, 0.1)',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 16,
    },
    confirmTitle: {
        fontSize: 20,
        fontWeight: '800',
        marginBottom: 8,
        textAlign: 'center',
    },
    confirmMessage: {
        fontSize: 14,
        textAlign: 'center',
        lineHeight: 20,
        marginBottom: 24,
    },
    confirmActions: {
        flexDirection: 'row',
        gap: 12,
        width: '100%',
    },
    cancelBtn: {
        flex: 1,
        paddingVertical: 12,
        borderRadius: 12,
        borderWidth: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    confirmDeleteBtn: {
        flex: 1,
        paddingVertical: 12,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    buttonText: {
        fontSize: 16,
        fontWeight: '600',
    },
    mediaGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        marginHorizontal: -2,
    },
    mediaGridItem: {
        width: (width - 48) / 3, // Screen width - horizontal padding (24 * 2)
        aspectRatio: 1,
        padding: 2,
    },
    gridImage: {
        width: '100%',
        height: '100%',
        borderRadius: 8,
        backgroundColor: 'rgba(0,0,0,0.05)',
    },
    // Lightbox & Gallery Styles
    lightboxOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.95)',
    },
    lightboxHeader: {
        position: 'absolute',
        top: Platform.OS === 'ios' ? 60 : 40,
        right: 20,
        zIndex: 100,
    },
    lightboxCloseBtn: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: 'rgba(255,255,255,0.15)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    lightboxImageContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    lightboxImage: {
        width: Dimensions.get('window').width,
        height: Dimensions.get('window').height * 0.8,
    },
    connectionsModalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.6)',
        justifyContent: 'flex-end',
        overflow: 'hidden',
    },
    // Reel Styles
    reelIconOverlay: {
        position: 'absolute',
        bottom: 5,
        left: 5,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4
    },
    reelOverlayText: {
        color: 'white',
        fontSize: 12,
        fontWeight: '600',
        textShadowColor: 'rgba(0,0,0,0.5)',
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 3
    },
    closeReelBtn: {
        position: 'absolute',
        top: 40,
        right: 20,
        zIndex: 100,
        padding: 10,
        backgroundColor: 'rgba(0,0,0,0.3)',
        borderRadius: 20
    }
});
