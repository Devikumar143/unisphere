import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, Image, ScrollView, TouchableOpacity, Dimensions, ActivityIndicator, Animated, Modal, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { Settings, MapPin, Link as LinkIcon, Edit3, Grid, Bookmark, ArrowLeft, MessageCircle, UserPlus, UserCheck, Users, Sparkles, Trash2, Monitor } from 'lucide-react-native';
import { COLORS, GLASS, SIZES } from '../constants/theme';
import { useTheme } from '../context/ThemeContext';
import { fetchUserProfile, fetchUserByUsername, followUser, fetchUserPosts, deletePost } from '../services/api';
import PostCard from '../components/PostCard';
import { Alert } from 'react-native';

const { width } = Dimensions.get('window');

export default function ProfileScreen({ targetUser, currentUser, onOpenSettings, onEditProfile, onOpenAdManagement, onBack, onOpenChat }) {
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
    const deleteScale = React.useRef(new Animated.Value(0.8)).current;
    const deleteOpacity = React.useRef(new Animated.Value(0)).current;

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

    const loadProfile = async () => {
        if (!targetUser?.id && !targetUser?.username) return;

        setLoading(true);
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
            setLoading(false);
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

    useEffect(() => {
        const userId = profileData?.id || targetUser?.id;
        if (userId && activeTab === 'Activity') {
            loadPosts(userId);
        }
    }, [profileData?.id, targetUser?.id, activeTab]);

    const loadPosts = async (userId) => {
        setLoadingPosts(true);
        try {
            const posts = await fetchUserPosts(userId, currentUser?.id);
            setUserPosts(posts);
        } catch (e) {
            console.error(e);
        } finally {
            setLoadingPosts(false);
        }
    };

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
            coverImage: effectiveUser.coverImage || "https://images.unsplash.com/photo-1541339907198-e08756dedf3f?w=800&fit=crop"
        };
    } catch (e) {
        console.error("Error formatting display profile:", e);
    }

    return (
        <View style={[styles.container, { backgroundColor: isDark ? themeColors.bgDark : themeColors.bgLight }]}>
            {/* Background Aura Glows removed for Organic Earth style */}

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
                {/* Header Cover */}
                <View style={[styles.coverContainer, { backgroundColor: isDark ? themeColors.bgCard : themeColors.bgLight, borderBottomWidth: 1, borderBottomColor: isDark ? 'transparent' : 'rgba(0,0,0,0.05)' }]}>
                    {/* Cover image removed as per user request */}

                    {isDark && (
                        <LinearGradient
                            colors={['rgba(0,0,0,0)', 'rgba(0,0,0,0.2)']}
                            style={StyleSheet.absoluteFill}
                        />
                    )}

                    {/* Back Button */}
                    {onBack && (
                        <TouchableOpacity style={styles.backBtn} onPress={onBack}>
                            <View style={[styles.iconButton, { backgroundColor: isDark ? 'rgba(0,0,0,0.3)' : 'rgba(0,0,0,0.05)' }]}>
                                <ArrowLeft color={isDark ? "#FFFFFF" : themeColors.textMainLight} size={20} />
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
                            <View style={[styles.iconButton, { backgroundColor: isDark ? 'rgba(0,0,0,0.3)' : 'rgba(0,0,0,0.05)' }]}>
                                <Settings color={isDark ? "#FFFFFF" : themeColors.textMainLight} size={20} />
                            </View>
                        </TouchableOpacity>
                    )}
                </View>

                {/* Profile Information Section */}
                <View style={styles.profileContent}>
                    <View style={styles.mainInfo}>
                        <View style={[styles.avatarBorder, { backgroundColor: themeColors.accentPrimary, padding: 4 }]}>
                            {displayProfile.avatar ? (
                                <Image source={{ uri: displayProfile.avatar }} style={styles.avatar} />
                            ) : (
                                <View style={[styles.avatar, { backgroundColor: isDark ? themeColors.bgCard : themeColors.bgCardLight, justifyContent: 'center', alignItems: 'center' }]}>
                                    <Users size={32} color={themeColors.textDim} />
                                </View>
                            )}
                            <View style={[styles.onlineStatus, { borderColor: isDark ? themeColors.bgDark : themeColors.bgLight }]} />
                        </View>

                        <View style={styles.nameSection}>
                            <Text style={[styles.name, {
                                color: isDark ? themeColors.textMain : themeColors.textMainLight,
                                fontFamily: 'PlayfairDisplay-Bold',
                            }]}>{displayProfile.name}</Text>
                            <View style={styles.handleRow}>
                                <Text style={[styles.handle, {
                                    color: isDark ? themeColors.textMuted : themeColors.textMutedLight,
                                }]}>@{displayProfile.username}</Text>
                                <View style={[styles.badge, { backgroundColor: themeColors.accentPrimary }]}>
                                    <Text style={[styles.badgeText, { color: '#FFFFFF' }]}>{displayProfile.role || 'Explorer'}</Text>
                                </View>
                            </View>

                            <View style={styles.locationGroup}>
                                <View style={styles.metaRow}>
                                    <MapPin size={14} color={isDark ? themeColors.textMuted : themeColors.textMutedLight} />
                                    <Text style={[styles.metaText, { color: isDark ? themeColors.textMuted : themeColors.textMutedLight }]}>{displayProfile.location || 'Student City'}</Text>
                                </View>
                                <View style={styles.metaRow}>
                                    <LinkIcon size={14} color={isDark ? themeColors.textMuted : themeColors.textMutedLight} />
                                    <Text style={[styles.metaText, { color: themeColors.accentPrimary }]}>unisphere.me/{displayProfile.username}</Text>
                                </View>
                            </View>
                        </View>
                    </View>

                    {/* Aura Stats Section */}
                    <View style={styles.auraStatsGrid}>
                        <StatCard
                            label="Connections"
                            value={displayProfile.stats.connections}
                            icon={Users}
                            color={themeColors.sage}
                        />
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
                            style={[styles.tabItem, activeTab === 'Saved' && styles.tabItemActive]}
                            onPress={() => setActiveTab('Saved')}
                        >
                            <Bookmark size={20} color={activeTab === 'Saved' ? themeColors.accentPrimary : (isDark ? themeColors.textDim : themeColors.textDimLight)} />
                            <Text style={[styles.tabText, { color: activeTab === 'Saved' ? (isDark ? themeColors.textMain : themeColors.textMainLight) : (isDark ? themeColors.textDim : themeColors.textDimLight) }]}>Saved</Text>
                        </TouchableOpacity>
                    </View>

                    {/* Posts List */}
                    <View style={{ paddingBottom: 20 }}>
                        {loadingPosts ? (
                            <ActivityIndicator color={themeColors.accentPrimary} style={{ marginTop: 20 }} />
                        ) : activeTab === 'Activity' ? (
                            userPosts.length > 0 ? (
                                userPosts.map(post => (
                                    <PostCard
                                        key={post.id}
                                        {...post}
                                        currentUser={currentUser}
                                        onDelete={showDeleteConfirm}
                                    />
                                ))
                            ) : (
                                <Text style={{ textAlign: 'center', color: isDark ? themeColors.textDim : themeColors.textDimLight, marginTop: 20 }}>No posts yet.</Text>
                            )
                        ) : (
                            <Text style={{ textAlign: 'center', color: isDark ? themeColors.textDim : themeColors.textDimLight, marginTop: 20 }}>Saved posts coming soon.</Text>
                        )}
                    </View>
                </View>
            </ScrollView>

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
        </View>
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
    glowCircle: {
        position: 'absolute',
        width: 300,
        height: 300,
        borderRadius: 150,
        opacity: 0.6,
    },
    coverContainer: {
        height: 280,
        width: '100%',
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
        backgroundColor: 'rgba(0,0,0,0.2)'
    },
    profileContent: {
        marginTop: -60,
        paddingHorizontal: 24,
    },
    mainInfo: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        marginBottom: 32,
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
        fontSize: 32,
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
        gap: 6,
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
    },
    bioWrapper: {
        marginBottom: 32,
    },
    bioCard: {
        borderRadius: 24,
        padding: 24,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.08)',
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
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        marginRight: 24,
        gap: 8,
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
    }
});
