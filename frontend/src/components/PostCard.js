import React, { useState, useRef, useEffect } from 'react';
import { StyleSheet, View, Text, Image, TouchableOpacity, Modal, TextInput, FlatList, KeyboardAvoidingView, Platform, ActivityIndicator, Share, Animated, Dimensions } from 'react-native';
import { BlurView } from 'expo-blur';
import { Heart, MessageCircle, Share2, MoreHorizontal, X, Send, Trash, AlertTriangle, Clock, User, CheckCircle2 } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, GLASS, SIZES, SHADOWS } from '../constants/theme';
import { likePost, fetchComments, addComment } from '../services/api';
import { useTheme } from '../context/ThemeContext';

const { width } = Dimensions.get('window');

export default function PostCard({ id, user = {}, content = '', image, stats = {}, time, currentUser, onDelete, onViewProfile }) {
    const { isDark, themeColors } = useTheme();
    const [likes, setLikes] = useState(stats?.likes || 0);
    const [isLiked, setIsLiked] = useState(stats?.isLiked || false);
    const [commentsCount, setCommentsCount] = useState(stats?.comments || 0);
    const [lastTap, setLastTap] = useState(0);
    const heartAnim = useRef(new Animated.Value(0)).current;

    // Sync state
    useEffect(() => {
        setLikes(stats?.likes || 0);
        setIsLiked(stats?.isLiked || false);
        setCommentsCount(stats?.comments || 0);
    }, [stats]);

    const [showComments, setShowComments] = useState(false);
    const [comments, setComments] = useState([]);
    const [newComment, setNewComment] = useState('');
    const [loadingComments, setLoadingComments] = useState(false);

    // Like Logic
    const handleLike = async () => {
        const newIsLiked = !isLiked;
        setIsLiked(newIsLiked);
        setLikes(prev => newIsLiked ? prev + 1 : prev - 1); // Optimistic

        // Haptic feedback or animation trigger
        if (newIsLiked) {
            // Optional: trigger small heart bounce on button if desired
        }

        try {
            if (currentUser?.id) {
                await likePost(id, currentUser.id);
            }
        } catch (error) {
            // Revert
            setIsLiked(!newIsLiked);
            setLikes(prev => !newIsLiked ? prev + 1 : prev - 1);
            console.error(error);
        }
    };

    const handleDoubleTap = () => {
        const now = Date.now();
        const DOUBLE_TAP_DELAY = 300;
        if (lastTap && (now - lastTap) < DOUBLE_TAP_DELAY) {
            if (!isLiked) handleLike();

            // Big Heart Animation
            heartAnim.setValue(0);
            Animated.sequence([
                Animated.spring(heartAnim, {
                    toValue: 1,
                    friction: 4,
                    tension: 50,
                    useNativeDriver: true,
                }),
                Animated.timing(heartAnim, {
                    toValue: 0,
                    duration: 150,
                    delay: 500,
                    useNativeDriver: true,
                })
            ]).start();
            setLastTap(0);
        } else {
            setLastTap(now);
        }
    };

    // Comments Logic
    const handleOpenComments = async () => {
        setShowComments(true);
        setLoadingComments(true);
        try {
            const data = await fetchComments(id);
            setComments(data);
        } catch (error) {
            console.error(error);
        } finally {
            setLoadingComments(false);
        }
    };

    const handleSendComment = async () => {
        if (!newComment.trim() || !currentUser?.id) return;
        try {
            const addedComment = await addComment(id, currentUser.id, newComment);
            setComments(prev => [...prev, addedComment]);
            setCommentsCount(prev => prev + 1);
            setNewComment('');
        } catch (error) {
            console.error(error);
        }
    };

    // Share Logic
    const handleShare = async () => {
        try {
            await Share.share({
                message: `Check out this post on UniSphere: ${content}`,
            });
        } catch (error) {
            console.error(error);
        }
    };

    const handleDelete = () => {
        setShowDeleteConfirm(false);
        if (onDelete) onDelete(id);
    };

    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false); // If specific deleting state needed

    return (
        <View style={[styles.card, { backgroundColor: themeColors.bgCard, borderColor: themeColors.border }]}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity
                    style={styles.userInfo}
                    onPress={() => onViewProfile && onViewProfile(user)}
                    activeOpacity={0.8}
                >
                    <View style={styles.avatarContainer}>
                        {user.avatar ? (
                            <Image source={{ uri: user.avatar }} style={styles.avatar} />
                        ) : (
                            <View style={[styles.avatar, { backgroundColor: isDark ? themeColors.bgDark : themeColors.sand, justifyContent: 'center', alignItems: 'center' }]}>
                                <User size={20} color={isDark ? themeColors.textMuted : themeColors.textMutedLight} />
                            </View>
                        )}
                    </View>
                    <View style={styles.userText}>
                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                            <Text style={[styles.userName, {
                                color: isDark ? themeColors.textMain : themeColors.textMainLight,
                                fontFamily: 'PlayfairDisplay-Bold'
                            }]}>
                                {user.name || 'Anonymous user'}
                            </Text>
                            {user.role === 'admin' && <CheckCircle2 size={12} color={themeColors.accentPrimary} style={{ marginLeft: 4 }} />}
                        </View>
                        <Text style={[styles.userRole, { color: isDark ? themeColors.textMuted : themeColors.textMutedLight }]}>
                            {user.role || 'Member'} • {time}
                        </Text>
                    </View>
                </TouchableOpacity>

                {/* More Options */}
                {/* Delete Option (Owner Only) */}
                <TouchableOpacity
                    style={styles.moreBtn}
                    onPress={() => setShowDeleteConfirm(true)}
                >
                    <MoreHorizontal size={20} color={isDark ? themeColors.textDim : themeColors.textDimLight} />
                </TouchableOpacity>
            </View>

            {/* Media (Instagram Style - Middle) */}
            {image && (
                <TouchableOpacity
                    activeOpacity={0.95}
                    onPress={handleDoubleTap}
                    style={styles.mediaContainer}
                >
                    <Image source={{ uri: image }} style={styles.media} resizeMode="cover" />

                    {/* Heart Animation Overlay */}
                    <Animated.View style={[
                        styles.heartOverlay,
                        {
                            opacity: heartAnim,
                            transform: [{ scale: heartAnim }]
                        }
                    ]}>
                        <View style={[styles.heartBlur, { backgroundColor: 'rgba(255,255,255,0.2)' }]}>
                            <Heart size={80} color={themeColors.error} fill={themeColors.error} />
                        </View>
                    </Animated.View>
                </TouchableOpacity>
            )}

            {/* Footer / Actions (Instagram Style - Below Media) */}
            <View style={styles.footer}>
                <View style={styles.actionRow}>
                    <View style={styles.leftActions}>
                        <TouchableOpacity style={styles.actionBtn} onPress={handleLike}>
                            <Heart
                                size={28}
                                color={isLiked ? themeColors.error : (isDark ? themeColors.textMain : themeColors.textMainLight)}
                                fill={isLiked ? themeColors.error : 'transparent'}
                            />
                        </TouchableOpacity>

                        <TouchableOpacity style={styles.actionBtn} onPress={handleOpenComments}>
                            <MessageCircle size={28} color={isDark ? themeColors.textMain : themeColors.textMainLight} />
                        </TouchableOpacity>

                        <TouchableOpacity style={styles.actionBtn} onPress={handleShare}>
                            <Share2 size={26} color={isDark ? themeColors.textMain : themeColors.textMainLight} />
                        </TouchableOpacity>
                    </View>

                    {/* Save or other right action could go here */}
                </View>

                {/* Likes Counter */}
                <TouchableOpacity activeOpacity={0.8}>
                    <Text style={[styles.likesCountText, { color: isDark ? themeColors.textMain : themeColors.textMainLight }]}>
                        {likes.toLocaleString()} {likes === 1 ? 'like' : 'likes'}
                    </Text>
                </TouchableOpacity>

                {/* Caption / Content (Instagram Style - Below Actions) */}
                {content ? (
                    <View style={styles.captionContainer}>
                        <Text style={[styles.captionText, { color: isDark ? themeColors.textMain : themeColors.textMainLight }]} numberOfLines={3}>
                            <Text style={styles.captionUser}>{user.name || 'User'} </Text>
                            {content}
                        </Text>
                    </View>
                ) : null}

                {/* Comments Link */}
                <TouchableOpacity onPress={handleOpenComments}>
                    <Text style={[styles.viewCommentsLink, { color: isDark ? themeColors.textDim : themeColors.textDimLight }]}>
                        {commentsCount > 0 ? `View all ${commentsCount} comments` : 'Add a comment...'}
                    </Text>
                </TouchableOpacity>

                {/* Timestamp */}
                <Text style={[styles.timeAgo, { color: isDark ? themeColors.textDim : themeColors.textDimLight }]}>
                    {time.toUpperCase()}
                </Text>
            </View>

            {/* Comments Modal */}
            <Modal
                visible={showComments}
                animationType="slide"
                transparent={true}
                onRequestClose={() => setShowComments(false)}
            >
                <KeyboardAvoidingView
                    behavior={Platform.OS === "ios" ? "padding" : "height"}
                    style={{ flex: 1 }}
                >
                    <TouchableOpacity
                        style={styles.modalOverlay}
                        activeOpacity={1}
                        onPress={() => setShowComments(false)}
                    />
                    <View style={[styles.modalContainer, { backgroundColor: isDark ? '#121212' : '#ffffff' }]}>
                        <View style={styles.modalHandle} />

                        <View style={styles.modalHeader}>
                            <Text style={[styles.modalTitle, { color: isDark ? themeColors.textMain : themeColors.textMainLight }]}>Comments</Text>
                            <TouchableOpacity onPress={() => setShowComments(false)} style={styles.modalCloseBtn}>
                                <X size={22} color={isDark ? themeColors.textMain : themeColors.textMainLight} />
                            </TouchableOpacity>
                        </View>

                        {loadingComments ? (
                            <ActivityIndicator size="large" color={themeColors.accentPrimary} style={{ marginTop: 40 }} />
                        ) : (
                            <FlatList
                                data={comments}
                                keyExtractor={item => item.id.toString()}
                                renderItem={({ item }) => (
                                    <View style={[styles.commentItem, { borderBottomColor: themeColors.border }]}>
                                        <View style={[styles.commentAvatar, { backgroundColor: '#333' }]}>
                                            <User size={14} color="#ccc" />
                                        </View>
                                        <View style={styles.commentContent}>
                                            <Text style={[styles.commentUser, { color: isDark ? themeColors.textMain : themeColors.textMainLight }]}>
                                                {item.user_name || 'User'}
                                            </Text>
                                            <Text style={[styles.commentText, { color: isDark ? themeColors.textDim : themeColors.textDimLight }]}>
                                                {item.content}
                                            </Text>
                                        </View>
                                    </View>
                                )}
                                contentContainerStyle={{ paddingBottom: 20 }}
                                ListEmptyComponent={
                                    <View style={{ alignItems: 'center', marginTop: 50 }}>
                                        <Text style={{ color: isDark ? themeColors.textDim : themeColors.textDimLight }}>No comments yet.</Text>
                                        <Text style={{ color: themeColors.accentPrimary, marginTop: 8 }}>Be the first to comment!</Text>
                                    </View>
                                }
                            />
                        )}

                        <View style={[styles.inputContainer, { borderTopColor: themeColors.border, backgroundColor: isDark ? 'rgba(0,0,0,0.3)' : 'rgba(255,255,255,0.5)' }]}>
                            <TextInput
                                style={[styles.input, {
                                    color: isDark ? themeColors.textMain : themeColors.textMainLight,
                                    backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)'
                                }]}
                                placeholder="Add a comment..."
                                placeholderTextColor={isDark ? themeColors.textDim : themeColors.textDimLight}
                                value={newComment}
                                onChangeText={setNewComment}
                            />
                            <TouchableOpacity onPress={handleSendComment} disabled={!newComment.trim()}>
                                <View style={[styles.sendBtn, { backgroundColor: newComment.trim() ? themeColors.accentPrimary : 'transparent' }]}>
                                    <Send size={18} color={newComment.trim() ? '#FFF' : (isDark ? themeColors.textDim : themeColors.textDimLight)} />
                                </View>
                            </TouchableOpacity>
                        </View>
                    </View>
                </KeyboardAvoidingView>
            </Modal>

            {/* Delete Confirmation Modal - Simplified */}
            <Modal
                visible={showDeleteConfirm}
                transparent={true}
                animationType="fade"
                onRequestClose={() => setShowDeleteConfirm(false)}
            >
                <View style={[styles.modalOverlay, { justifyContent: 'center', alignItems: 'center' }]}>
                    <View style={[styles.confirmBox, {
                        backgroundColor: isDark ? themeColors.bgCard : themeColors.bgCardLight,
                        borderColor: themeColors.accentPrimary + '20'
                    }]}>
                        <AlertTriangle size={40} color={themeColors.error} style={{ marginBottom: 16 }} />
                        <Text style={[styles.confirmTitle, { color: isDark ? themeColors.textMain : themeColors.textMainLight }]}>Delete Post?</Text>
                        <Text style={[styles.confirmSubtitle, { color: isDark ? themeColors.textMuted : themeColors.textMutedLight }]}>Are you sure? This cannot be undone.</Text>

                        <View style={styles.confirmRow}>
                            <TouchableOpacity
                                style={[styles.confirmBtn, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }]}
                                onPress={() => setShowDeleteConfirm(false)}
                            >
                                <Text style={{ color: isDark ? '#fff' : '#000', fontWeight: '600' }}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.confirmBtn, { backgroundColor: themeColors.error }]}
                                onPress={handleDelete}
                            >
                                <Text style={{ color: '#fff', fontWeight: '600' }}>Delete</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </View >
    );
}

const styles = StyleSheet.create({
    card: {
        marginBottom: 30, // More breathing room
        borderRadius: 0, // Insta feed posts are edge-to-edge usually, but we'll stick to slightly rounded for UniSphere
        backgroundColor: 'transparent', // Let it blend with the main background
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        justifyContent: 'space-between',
    },
    userInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    avatarContainer: {
        width: 42,
        height: 42,
        borderRadius: 21,
        overflow: 'hidden',
        marginRight: 12,
    },
    avatar: {
        width: '100%',
        height: '100%',
    },
    userText: {
        justifyContent: 'center',
    },
    userName: {
        fontSize: 16,
        fontWeight: '700',
    },
    userRole: {
        fontSize: 11,
        fontWeight: '500',
        marginTop: 2,
    },
    mediaContainer: {
        width: '100%',
        aspectRatio: 1, // Instagram square default
        backgroundColor: '#000',
        position: 'relative',
        justifyContent: 'center',
        alignItems: 'center',
    },
    media: {
        width: '100%',
        height: '100%',
    },
    heartOverlay: {
        position: 'absolute',
        justifyContent: 'center',
        alignItems: 'center',
    },
    heartBlur: {
        padding: 20,
        borderRadius: 60,
        overflow: 'hidden',
    },
    footer: {
        paddingHorizontal: 16,
        paddingBottom: 16,
        paddingTop: 12,
    },
    actionRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 10,
    },
    leftActions: {
        flexDirection: 'row',
        gap: 16,
    },
    actionBtn: {
        justifyContent: 'center',
        alignItems: 'center',
    },
    likesCountText: {
        fontSize: 14,
        fontWeight: '800',
        marginBottom: 6,
    },
    captionContainer: {
        marginBottom: 6,
    },
    captionText: {
        fontSize: 14,
        lineHeight: 20,
    },
    captionUser: {
        fontWeight: '800',
        fontFamily: 'PlayfairDisplay-Bold',
    },
    viewCommentsLink: {
        fontSize: 14,
        fontWeight: '500',
        marginBottom: 4,
    },
    timeAgo: {
        fontSize: 10,
        fontWeight: '600',
        letterSpacing: 0.2,
    },

    // Comments Modal
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
    },
    modalContainer: {
        height: '75%',
        marginTop: 'auto',
        borderTopLeftRadius: 32,
        borderTopRightRadius: 32,
        overflow: 'hidden',
    },
    modalHandle: {
        width: 40,
        height: 4,
        backgroundColor: 'rgba(255,255,255,0.2)',
        borderRadius: 2,
        alignSelf: 'center',
        marginTop: 12,
        marginBottom: 20,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 24,
        marginBottom: 16,
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: '800',
    },
    modalCloseBtn: {
        padding: 4,
    },
    commentItem: {
        flexDirection: 'row',
        paddingHorizontal: 24,
        paddingVertical: 12,
        borderBottomWidth: StyleSheet.hairlineWidth,
    },
    commentAvatar: {
        width: 32,
        height: 32,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    commentContent: {
        flex: 1,
    },
    commentUser: {
        fontSize: 13,
        fontWeight: '700',
        marginBottom: 2,
    },
    commentText: {
        fontSize: 14,
        lineHeight: 20,
    },
    inputContainer: {
        padding: 16,
        paddingBottom: Platform.OS === 'ios' ? 32 : 16,
        flexDirection: 'row',
        alignItems: 'center',
        borderTopWidth: 1,
    },
    input: {
        flex: 1,
        height: 44,
        borderRadius: 22,
        paddingHorizontal: 16,
        marginRight: 12,
    },
    sendBtn: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
    },

    // Confirm Box
    confirmBox: {
        width: width * 0.8,
        borderRadius: 24,
        padding: 24,
        alignItems: 'center',
        borderWidth: 1,
        overflow: 'hidden',
    },
    confirmTitle: {
        color: 'white',
        fontSize: 20,
        fontWeight: '800',
        marginBottom: 8,
    },
    confirmSubtitle: {
        color: 'rgba(255,255,255,0.7)',
        fontSize: 14,
        marginBottom: 24,
        textAlign: 'center',
    },
    confirmRow: {
        flexDirection: 'row',
        gap: 12,
        width: '100%',
    },
    confirmBtn: {
        flex: 1,
        height: 44,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
    },
});
