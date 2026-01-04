import { StyleSheet, View, Text, TouchableOpacity, ScrollView, Image, ActivityIndicator, Alert, FlatList, Modal, TextInput, Platform, Animated } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../context/ThemeContext';
import { SIZES } from '../constants/theme';
import { ArrowLeft, Plus, Grid, Settings, Save, Trash2, X, MessageSquare } from 'lucide-react-native';
import { useNavigation, useRoute, useFocusEffect } from '@react-navigation/native';
import { fetchCommunityDetails, fetchCommunityPosts, joinCommunity, leaveCommunity, updateCommunity, deleteCommunity } from '../services/api';
import PostCard from '../components/PostCard';
import React, { useState, useCallback } from 'react'; // Added React and useState, useCallback imports

export default function CommunityDetailScreen({ user, route, onBack, onViewProfile, onCreatePost, onOpenLounge }) {
    const { isDark, themeColors } = useTheme();
    // const navigation = useNavigation(); // Can't use navigation.goBack() if not in stack
    // const route = useRoute();
    const { communityId } = route.params;

    const [community, setCommunity] = useState(null);
    const [posts, setPosts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [joining, setJoining] = useState(false);
    const [showSettings, setShowSettings] = useState(false);
    const [editName, setEditName] = useState('');
    const [editDesc, setEditDesc] = useState('');

    const [updating, setUpdating] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [deleting, setDeleting] = useState(false);
    // Aura animation removed for Organic Earth style

    const loadData = async () => {
        try {
            const [details, postsData] = await Promise.all([
                fetchCommunityDetails(communityId, user?.id),
                fetchCommunityPosts(communityId, user?.id)
            ]);
            setCommunity(details);
            setPosts(postsData);
        } catch (error) {
            console.error(error);
            Alert.alert('Error', 'Failed to load community details');
        } finally {
            setLoading(false);
        }
    };

    useFocusEffect(
        useCallback(() => {
            loadData();
        }, [communityId])
    );

    const handleUpdateCommunity = async () => {
        setUpdating(true);
        try {
            const updated = await updateCommunity(communityId, { name: editName, description: editDesc }, user.id);
            setCommunity(prev => ({ ...prev, ...updated }));
            setShowSettings(false);
            Alert.alert('Success', 'Community updated successfully');
        } catch (error) {
            Alert.alert('Error', 'Failed to update community');
        } finally {
            setUpdating(false);
        }
    };

    const handleDeleteCommunity = () => {
        // Close settings first if open (optional, or keep it open behind?)
        // Better to close settings to focus on delete
        setShowSettings(false);
        setShowDeleteConfirm(true);
    };

    const confirmDelete = async () => {
        setDeleting(true);
        try {
            await deleteCommunity(communityId, user.id);
            setShowDeleteConfirm(false);
            onBack();
        } catch (error) {
            Alert.alert('Error', 'Failed to delete community');
            setDeleting(false);
        }
    };

    const openSettings = () => {
        setEditName(community.name);
        setEditDesc(community.description);
        setShowSettings(true);
    };

    const handleJoin = async () => {
        if (!community) return;
        setJoining(true);
        try {
            await joinCommunity(communityId, user.id);
            setCommunity(prev => ({ ...prev, is_member: true, member_count: parseInt(prev.member_count) + 1 }));
        } catch (error) {
            Alert.alert('Error', 'Failed to join community');
        } finally {
            setJoining(false);
        }
    };

    const handleLeave = async () => {
        if (!community) return;
        setJoining(true);
        try {
            await leaveCommunity(communityId, user.id);
            setCommunity(prev => ({ ...prev, is_member: false, member_count: parseInt(prev.member_count) - 1 }));
        } catch (error) {
            Alert.alert('Error', 'Failed to leave community');
        } finally {
            setJoining(false);
        }
    };

    const handleCreatePost = () => {
        onCreatePost && onCreatePost({
            communityId: communityId,
            communityName: community?.name
        });
    };

    if (loading) {
        return (
            <View style={[styles.container, { backgroundColor: isDark ? themeColors.bgDark : themeColors.bgLight, justifyContent: 'center', alignItems: 'center' }]}>
                <ActivityIndicator size="large" color={themeColors.accentPrimary} />
            </View>
        );
    }

    if (!community) return null;

    return (
        <View style={[styles.container, { backgroundColor: isDark ? themeColors.bgDark : themeColors.bgLight }]}>
            <SafeAreaView style={styles.safeArea}>
                {/* Header */}
                <View style={styles.header}>
                    <TouchableOpacity onPress={onBack} style={styles.backBtn}>
                        <View style={[styles.headerIcon, { backgroundColor: isDark ? themeColors.bgCard : themeColors.bgCardLight, borderColor: themeColors.accentPrimary + '15', borderWidth: 1 }]}>
                            <ArrowLeft color={isDark ? themeColors.textMain : themeColors.textMainLight} size={24} />
                        </View>
                    </TouchableOpacity>

                    <Text style={[styles.headerTitle, {
                        color: isDark ? themeColors.textMain : themeColors.textMainLight,
                        fontFamily: 'PlayfairDisplay-Bold'
                    }]} numberOfLines={1}>
                        {community.name}
                    </Text>

                    {community.user_role === 'admin' ? (
                        <TouchableOpacity onPress={openSettings}>
                            <View style={[styles.headerIcon, { backgroundColor: isDark ? themeColors.bgCard : themeColors.bgCardLight, borderColor: themeColors.accentPrimary + '15', borderWidth: 1 }]}>
                                <Settings color={isDark ? themeColors.textMuted : themeColors.textMutedLight} size={24} />
                            </View>
                        </TouchableOpacity>
                    ) : (
                        <View style={{ width: 40 }} />
                    )}
                </View>

                {/* Aura Effect removed for Organic Earth style */}

                <FlatList
                    data={posts}
                    keyExtractor={item => item.id}
                    contentContainerStyle={styles.content}
                    ListHeaderComponent={
                        <View style={styles.infoSection}>
                            {/* Background Banner */}
                            <View style={styles.bannerContainer}>
                                {community.icon ? (
                                    <Image source={{ uri: community.icon }} style={styles.bannerImage} blurRadius={community.icon ? 5 : 0} />
                                ) : (
                                    <View style={[styles.bannerPlaceholder, { backgroundColor: themeColors.accentPrimary + '15' }]} />
                                )}
                                <View style={[styles.bannerGradient, { backgroundColor: isDark ? themeColors.bgDark + '80' : themeColors.bgLight + '80' }]} />
                            </View>

                            <View style={styles.contentOverlay}>
                                <View style={[styles.iconLarge, { backgroundColor: themeColors.accentPrimary, elevation: 10 }]}>
                                    {community.icon && community.icon.length > 2 ? (
                                        <Image source={{ uri: community.icon }} style={styles.iconImageLarge} />
                                    ) : (
                                        <Text style={{ fontSize: 40 }}>{community.icon || '👥'}</Text>
                                    )}
                                </View>

                                <View style={styles.titleRow}>
                                    <Text style={[styles.title, {
                                        color: isDark ? themeColors.textMain : themeColors.textMainLight,
                                        fontFamily: 'PlayfairDisplay-Bold'
                                    }]}>{community.name}</Text>
                                    {community.user_role === 'admin' && (
                                        <View style={[styles.adminBadge, { backgroundColor: themeColors.accentPrimary }]}>
                                            <Text style={styles.adminBadgeText}>Admin</Text>
                                        </View>
                                    )}
                                </View>

                                <Text style={[styles.description, { color: isDark ? themeColors.textMuted : themeColors.textMutedLight }]}>{community.description}</Text>

                                <View style={[styles.statsContainer, {
                                    backgroundColor: isDark ? themeColors.bgCard : themeColors.bgCardLight,
                                    borderColor: themeColors.accentPrimary + '15',
                                    borderWidth: 1
                                }]}>
                                    <View style={styles.statItem}>
                                        <Text style={[styles.statNumber, { color: isDark ? themeColors.textMain : themeColors.textMainLight }]}>{community.member_count}</Text>
                                        <Text style={[styles.statLabel, { color: isDark ? themeColors.textMuted : themeColors.textMutedLight }]}>Members</Text>
                                    </View>
                                    <View style={[styles.statDivider, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)' }]} />
                                    <View style={styles.statItem}>
                                        <Text style={[styles.statNumber, { color: isDark ? themeColors.textMain : themeColors.textMainLight }]}>{community.type}</Text>
                                        <Text style={[styles.statLabel, { color: isDark ? themeColors.textMuted : themeColors.textMutedLight }]}>Type</Text>
                                    </View>
                                </View>

                                {community.admin_details && (
                                    <View style={[styles.adminContainer, { backgroundColor: isDark ? themeColors.bgCard : themeColors.bgCardLight, borderColor: themeColors.accentPrimary + '15', borderWidth: 1 }]}>
                                        <Text style={[styles.adminLabel, { color: isDark ? themeColors.textMuted : themeColors.textMutedLight }]}>Created by</Text>
                                        <View style={styles.adminProfile}>
                                            <Image
                                                source={{ uri: community.admin_details.avatar || 'https://via.placeholder.com/40' }}
                                                style={styles.adminAvatar}
                                            />
                                            <Text style={[styles.adminName, { color: isDark ? themeColors.textMain : themeColors.textMainLight }]}>
                                                {community.admin_details.name}
                                            </Text>
                                        </View>
                                    </View>
                                )}

                                <TouchableOpacity
                                    activeOpacity={0.8}
                                    style={[
                                        styles.joinButton,
                                        {
                                            backgroundColor: community.is_member ? (isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)') : themeColors.accentPrimary,
                                            borderColor: community.is_member ? themeColors.accentPrimary + '30' : 'transparent',
                                            borderWidth: community.is_member ? 1 : 0
                                        }
                                    ]}
                                    onPress={community.is_member ? handleLeave : handleJoin}
                                    disabled={joining}
                                >
                                    <Text style={[styles.joinButtonText, { color: community.is_member ? (isDark ? themeColors.textMain : themeColors.textMainLight) : 'white' }]}>
                                        {joining ? 'Updating...' : community.is_member ? 'Joined' : 'Join Community'}
                                    </Text>
                                </TouchableOpacity>

                                {community.is_member && (
                                    <TouchableOpacity
                                        activeOpacity={0.8}
                                        style={[styles.loungeButton, { backgroundColor: themeColors.accentPrimary }]}
                                        onPress={onOpenLounge}
                                    >
                                        <MessageSquare color="white" size={20} style={{ marginRight: 8 }} />
                                        <Text style={styles.loungeButtonText}>Enter Lounge</Text>
                                    </TouchableOpacity>
                                )}
                            </View>
                        </View>
                    }
                    renderItem={({ item }) => (
                        <PostCard key={item.id} {...item} currentUser={user} onViewProfile={onViewProfile} />
                    )}
                    ListEmptyComponent={
                        <View style={styles.emptyFeed}>
                            <Text style={{ color: isDark ? themeColors.textMuted : themeColors.textMutedLight }}>No posts yet. Be the first!</Text>
                        </View>
                    }
                />

                {/* FAB */}
                {community.is_member && (
                    <TouchableOpacity
                        style={[styles.fab, { backgroundColor: themeColors.accentPrimary }]}
                        onPress={handleCreatePost}
                    >
                        <Plus color="white" size={32} />
                    </TouchableOpacity>
                )}
                {/* Settings Modal */}
                <Modal
                    visible={showSettings}
                    animationType="slide"
                    transparent={true}
                >
                    <View style={styles.modalOverlay}>
                        <View style={[styles.modalContent, {
                            backgroundColor: isDark ? themeColors.bgDark : themeColors.bgLight,
                            borderColor: themeColors.accentPrimary + '20',
                            borderTopWidth: 1
                        }]}>
                            <View style={styles.modalHeader}>
                                <Text style={[styles.modalTitle, { color: isDark ? themeColors.textMain : themeColors.textMainLight }]}>Community Settings</Text>
                                <TouchableOpacity onPress={() => setShowSettings(false)}>
                                    <X color={themeColors.textDim} size={24} />
                                </TouchableOpacity>
                            </View>

                            <ScrollView style={styles.settingsScroll}>
                                <View style={styles.inputGroup}>
                                    <Text style={[styles.inputLabel, { color: isDark ? themeColors.textMuted : themeColors.textMutedLight }]}>Community Name</Text>
                                    <TextInput
                                        style={[styles.input, {
                                            color: isDark ? themeColors.textMain : themeColors.textMainLight,
                                            backgroundColor: isDark ? themeColors.bgCard : themeColors.bgCardLight,
                                            borderColor: themeColors.accentPrimary + '15'
                                        }]}
                                        value={editName}
                                        onChangeText={setEditName}
                                        placeholder="Name your club..."
                                        placeholderTextColor={isDark ? themeColors.textMuted : themeColors.textMutedLight}
                                    />
                                </View>

                                <View style={styles.inputGroup}>
                                    <Text style={[styles.inputLabel, { color: isDark ? themeColors.textMuted : themeColors.textMutedLight }]}>Description</Text>
                                    <TextInput
                                        style={[styles.input, styles.textArea, {
                                            color: isDark ? themeColors.textMain : themeColors.textMainLight,
                                            backgroundColor: isDark ? themeColors.bgCard : themeColors.bgCardLight,
                                            borderColor: themeColors.accentPrimary + '15'
                                        }]}
                                        value={editDesc}
                                        onChangeText={setEditDesc}
                                        multiline
                                        numberOfLines={4}
                                        placeholder="What is this club about?"
                                        placeholderTextColor={isDark ? themeColors.textMuted : themeColors.textMutedLight}
                                    />
                                </View>

                                <TouchableOpacity
                                    style={[styles.saveBtn, { backgroundColor: themeColors.accentPrimary }]}
                                    onPress={handleUpdateCommunity}
                                    disabled={updating}
                                >
                                    {updating ? (
                                        <ActivityIndicator color="white" />
                                    ) : (
                                        <>
                                            <Save color="white" size={20} style={{ marginRight: 8 }} />
                                            <Text style={styles.saveBtnText}>Save Changes</Text>
                                        </>
                                    )}
                                </TouchableOpacity>

                                <View style={[styles.divider, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : '#E2E8F0' }]} />

                                <TouchableOpacity
                                    style={styles.deleteBtn}
                                    onPress={handleDeleteCommunity}
                                >
                                    <Trash2 color={themeColors.error} size={20} style={{ marginRight: 8 }} />
                                    <Text style={[styles.deleteBtnText, { color: themeColors.error }]}>Delete Community</Text>
                                </TouchableOpacity>
                            </ScrollView>
                        </View>
                    </View>
                </Modal>

                {/* Delete Confirmation Modal */}
                <Modal
                    visible={showDeleteConfirm}
                    transparent={true}
                    animationType="fade"
                    onRequestClose={() => setShowDeleteConfirm(false)}
                >
                    <View style={[styles.modalOverlay, { justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.7)' }]}>
                        <View style={[styles.confirmCard, {
                            backgroundColor: isDark ? themeColors.bgCard : themeColors.bgCardLight,
                            borderColor: themeColors.accentPrimary + '20',
                            borderWidth: 1
                        }]}>
                            <View style={styles.confirmIconContainer}>
                                <Trash2 color={themeColors.error} size={32} />
                            </View>
                            <Text style={[styles.confirmTitle, {
                                color: isDark ? themeColors.textMain : themeColors.textMainLight,
                                fontFamily: 'PlayfairDisplay-Bold'
                            }]}>Delete Community?</Text>
                            <Text style={[styles.confirmMessage, { color: isDark ? themeColors.textMuted : themeColors.textMutedLight }]}>
                                Are you sure you want to delete "{community.name}"? This action cannot be undone and all posts will be lost.
                            </Text>

                            <View style={styles.confirmActions}>
                                <TouchableOpacity
                                    style={[styles.cancelBtn, { borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)' }]}
                                    onPress={() => setShowDeleteConfirm(false)}
                                >
                                    <Text style={{ color: isDark ? themeColors.textMain : themeColors.textMainLight, fontWeight: '600' }}>Cancel</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={[styles.confirmDeleteBtn, { backgroundColor: COLORS.error }]}
                                    onPress={confirmDelete}
                                    disabled={deleting}
                                >
                                    {deleting ? (
                                        <ActivityIndicator color="white" size="small" />
                                    ) : (
                                        <Text style={{ color: 'white', fontWeight: '700' }}>Delete</Text>
                                    )}
                                </TouchableOpacity>
                            </View>
                        </View>
                    </View>
                </Modal>
            </SafeAreaView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    safeArea: {
        flex: 1,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: SIZES.padding,
        paddingTop: Platform.OS === 'android' ? 45 : 12,
        paddingBottom: 12,
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 100,
    },
    headerIcon: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
        overflow: 'hidden',
    },
    headerTitle: {
        fontSize: 20,
        fontFamily: 'PlayfairDisplay-Bold',
        flex: 1,
        textAlign: 'center',
    },
    content: {
        paddingBottom: 100,
    },
    infoSection: {
        alignItems: 'center',
        marginBottom: 24,
    },
    bannerContainer: {
        width: '100%',
        height: 200,
        position: 'absolute',
        top: 0,
    },
    bannerImage: {
        width: '100%',
        height: '100%',
        opacity: 0.5,
    },
    bannerPlaceholder: {
        width: '100%',
        height: '100%',
    },
    bannerGradient: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: 150,
    },
    contentOverlay: {
        width: '100%',
        paddingTop: 80,
        paddingHorizontal: 24,
        alignItems: 'center',
    },
    iconLarge: {
        width: 100,
        height: 100,
        borderRadius: 32,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 16,
        borderWidth: 3,
        borderColor: 'rgba(255,255,255,0.2)',
    },
    iconImageLarge: {
        width: 100,
        height: 100,
        borderRadius: 29,
    },
    titleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
        marginBottom: 10,
    },
    title: {
        fontSize: 28,
        fontWeight: '900',
        textAlign: 'center',
        letterSpacing: -0.5,
    },
    adminBadge: {
        paddingHorizontal: 10,
        paddingVertical: 3,
        borderRadius: 8,
    },
    adminBadgeText: {
        fontSize: 11,
        fontWeight: '900',
        color: 'white',
        textTransform: 'uppercase',
    },
    description: {
        textAlign: 'center',
        marginBottom: 20,
        lineHeight: 22,
        fontSize: 15,
        opacity: 0.8,
    },
    statsContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 24,
        paddingHorizontal: 20,
        paddingVertical: 12,
        borderRadius: 20,
    },
    statItem: {
        alignItems: 'center',
        paddingHorizontal: 15,
    },
    statNumber: {
        fontSize: 18,
        fontWeight: '800',
    },
    statLabel: {
        fontSize: 12,
        fontWeight: '600',
    },
    statDivider: {
        width: 1,
        height: 20,
    },
    joinButton: {
        paddingHorizontal: 40,
        paddingVertical: 14,
        borderRadius: 28,
        minWidth: 160,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 10,
        elevation: 5,
    },
    emptyFeed: {
        alignItems: 'center',
        padding: 40,
    },
    fab: {
        position: 'absolute',
        bottom: 30,
        right: 20,
        width: 60,
        height: 60,
        borderRadius: 30,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: "#000",
        shadowOffset: {
            width: 0,
            height: 10,
        },
        shadowOpacity: 0.3,
        shadowRadius: 12,
        elevation: 10,
    },
    // Aura styles removed
    // Modal Styles
    modalOverlay: {
        flex: 1,
        justifyContent: 'flex-end',
        backgroundColor: 'rgba(0,0,0,0.5)',
    },
    modalContent: {
        borderTopLeftRadius: 32,
        borderTopRightRadius: 32,
        padding: 24,
        paddingBottom: Platform.OS === 'ios' ? 40 : 24,
        maxHeight: '90%',
        overflow: 'hidden',
    },
    // Confirm Modal Styles
    confirmCard: {
        width: '85%',
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
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 24,
    },
    adminContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        marginBottom: 24,
        gap: 10,
    },
    adminLabel: {
        fontSize: 12,
        fontWeight: '500',
    },
    adminProfile: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    adminAvatar: {
        width: 24,
        height: 24,
        borderRadius: 12,
    },
    adminName: {
        fontSize: 13,
        fontWeight: '700',
    },
    modalTitle: {
        fontSize: 22,
        fontWeight: '900',
    },
    settingsScroll: {
        marginBottom: 20,
    },
    inputGroup: {
        marginBottom: 20,
    },
    inputLabel: {
        fontSize: 14,
        fontWeight: '700',
        marginBottom: 8,
        marginLeft: 4,
    },
    input: {
        borderRadius: 16,
        padding: 18,
        fontSize: 16,
        fontWeight: '500',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
    },
    textArea: {
        height: 120,
        textAlignVertical: 'top',
    },
    saveBtn: {
        flexDirection: 'row',
        height: 56,
        borderRadius: 28,
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 10,
    },
    saveBtnText: {
        color: 'white',
        fontSize: 16,
        fontWeight: '800',
    },
    divider: {
        height: 1,
        marginVertical: 24,
    },
    deleteBtn: {
        flexDirection: 'row',
        height: 56,
        borderRadius: 28,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(239, 68, 68, 0.2)',
    },
    joinButtonText: {
        fontSize: 16,
        fontWeight: '700',
    },
    loungeButton: {
        width: '100%',
        height: 52,
        borderRadius: 16,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 12,
        elevation: 2,
    },
    loungeButtonText: {
        color: 'white',
        fontSize: 16,
        fontWeight: '800',
    },
    deleteBtnText: {
        fontSize: 16,
        fontWeight: '800',
    }
});
