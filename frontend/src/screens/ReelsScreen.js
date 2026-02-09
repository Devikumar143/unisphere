import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
    StyleSheet,
    View,
    Text,
    Dimensions,
    FlatList,
    TouchableOpacity,
    Image,
    StatusBar,
    Platform,
    ActivityIndicator,
    Alert,
    Modal,
    TextInput,
    KeyboardAvoidingView,
    Keyboard,
    TouchableWithoutFeedback,
    Share
} from 'react-native';
import { Video, ResizeMode } from 'expo-av';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import { LinearGradient } from 'expo-linear-gradient';
import { Heart, MessageCircle, Share2, MoreVertical, Music2, Camera, X, Send, Check } from 'lucide-react-native';
import { useTheme } from '../context/ThemeContext';
import * as ImagePicker from 'expo-image-picker';
import { fetchReels, uploadMedia, createPost, likePost, fetchComments, addComment, recordReelView } from '../services/api';
import { useFocusEffect, useIsFocused } from '@react-navigation/native';
import ReelItem from '../components/ReelItem';
import ShareModal from '../components/ShareModal';

const { width, height } = Dimensions.get('window');



export default function ReelsScreen({ user, onViewProfile }) {
    const bottomTabHeight = useBottomTabBarHeight();
    const isFocused = useIsFocused();
    const [activeIndex, setActiveIndex] = useState(0);
    const [reels, setReels] = useState([]);
    const [loading, setLoading] = useState(true);

    // Upload & Edit State
    const [uploading, setUploading] = useState(false);
    const [editModalVisible, setEditModalVisible] = useState(false);
    const [previewUri, setPreviewUri] = useState(null);
    const [caption, setCaption] = useState('');

    // Comment Modal State
    const [commentsVisible, setCommentsVisible] = useState(false);
    const [activeReel, setActiveReel] = useState(null);
    const [comments, setComments] = useState([]);
    const [loadingComments, setLoadingComments] = useState(false);
    const [commentText, setCommentText] = useState('');

    // Share Modal State
    const [shareModalVisible, setShareModalVisible] = useState(false);
    const [reelToShare, setReelToShare] = useState(null);

    // Theme
    const { themeColors } = useTheme();

    useEffect(() => {
        if (reels.length > 0 && reels[activeIndex] && isFocused) {
            recordReelView(reels[activeIndex].id);
        }
    }, [activeIndex, isFocused, reels.length]);

    const loadReels = async () => {
        if (!user) return;
        setLoading(true);
        try {
            const data = await fetchReels(user.id);
            setReels(data);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    useFocusEffect(
        useCallback(() => {
            loadReels();
        }, [])
    );

    const handlePickVideo = async () => {
        try {
            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Videos,
                allowsEditing: true, // Allow basic trimming
                quality: 1,
            });

            if (!result.canceled) {
                setPreviewUri(result.assets[0].uri);
                setEditModalVisible(true);
            }
        } catch (error) {
            Alert.alert('Error', 'Failed to pick video');
            console.error(error);
        }
    };

    const handlePostReel = async () => {
        if (!previewUri || uploading) return;

        setUploading(true);
        try {
            // 1. Upload Video
            const videoUrl = await uploadMedia(previewUri, 'video');

            // 2. Create Post
            await createPost({
                userId: user.id,
                content: caption,
                mediaUrl: videoUrl,
                contentType: 'Reel'
            });

            Alert.alert('Success', 'Reel posted successfully!');

            // cleanup
            setEditModalVisible(false);
            setPreviewUri(null);
            setCaption('');
            loadReels(); // Refresh feed
        } catch (error) {
            Alert.alert('Error', 'Failed to post reel');
            console.error(error);
        } finally {
            setUploading(false);
        }
    };

    const handleLike = async (reelId) => {
        // Optimistic Update
        setReels(prevReels => prevReels.map(reel => {
            if (reel.id === reelId) {
                return {
                    ...reel,
                    isLiked: !reel.isLiked,
                    likes: reel.isLiked ? reel.likes - 1 : reel.likes + 1
                };
            }
            return reel;
        }));

        try {
            await likePost(reelId, user.id);
        } catch (error) {
            console.error("Like failed", error);
            // Revert on failure
            loadReels();
        }
    };

    const handleOpenComments = async (reel) => {
        setActiveReel(reel);
        setCommentsVisible(true);
        setLoadingComments(true);
        try {
            const data = await fetchComments(reel.id);
            setComments(data);
        } catch (error) {
            console.error(error);
        } finally {
            setLoadingComments(false);
        }
    };

    const handleSendComment = async () => {
        if (!commentText.trim() || !activeReel) return;

        const textToSend = commentText;
        setCommentText(''); // Clear immediately
        Keyboard.dismiss();

        const newComment = {
            id: Date.now().toString(), // Temp ID
            content: textToSend,
            user_name: user?.full_name || 'Me',
            created_at: new Date().toISOString()
        };

        // Optimistic append
        setComments(prev => [...prev, newComment]);

        try {
            await addComment(activeReel.id, user.id, textToSend);
            // Update interaction count on reel
            setReels(prevReels => prevReels.map(r =>
                r.id === activeReel.id ? { ...r, comments: (r.comments || 0) + 1 } : r
            ));
        } catch (error) {
            console.error(error);
            Alert.alert('Error', 'Failed to send comment');
            // Revert could be implemented here
        }
    };

    const handleShare = (reel) => {
        setReelToShare(reel);
        setShareModalVisible(true);
    };

    const onViewableItemsChanged = useRef(({ viewableItems }) => {
        if (viewableItems.length > 0) {
            setActiveIndex(viewableItems[0].index);
        }
    }).current;

    const viewabilityConfig = useRef({
        itemVisiblePercentThreshold: 50
    }).current;

    if (loading && reels.length === 0) {
        return (
            <View style={[styles.screen, { justifyContent: 'center', alignItems: 'center' }]}>
                <ActivityIndicator size="large" color="white" />
            </View>
        );
    }

    return (
        <View style={styles.screen}>
            <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

            {/* Header */}
            <View style={[styles.header, { top: Platform.OS === 'ios' ? 50 : 30 }]}>
                <Text style={styles.headerTitle}>Reels</Text>
                <TouchableOpacity onPress={handlePickVideo} disabled={uploading}>
                    <Camera size={26} color="white" />
                </TouchableOpacity>
            </View>

            {reels.length === 0 ? (
                <View style={styles.emptyContainer}>
                    <Text style={styles.emptyText}>No reels yet. Be the first!</Text>
                    <TouchableOpacity style={styles.createBtn} onPress={handlePickVideo}>
                        <Text style={styles.createBtnText}>Create Reel</Text>
                    </TouchableOpacity>
                </View>
            ) : (
                <FlatList
                    data={reels}
                    renderItem={({ item, index }) => (
                        <ReelItem
                            item={item}
                            isActive={index === activeIndex && isFocused}
                            bottomTabHeight={bottomTabHeight}
                            onLike={handleLike}
                            onComment={handleOpenComments}
                            onViewProfile={onViewProfile}
                            onShare={handleShare}
                        />
                    )}
                    keyExtractor={item => item.id.toString()}
                    pagingEnabled
                    showsVerticalScrollIndicator={false}
                    snapToInterval={height - bottomTabHeight}
                    snapToAlignment="start"
                    decelerationRate="fast"
                    onViewableItemsChanged={onViewableItemsChanged}
                    viewabilityConfig={viewabilityConfig}
                    getItemLayout={(data, index) => ({
                        length: height - bottomTabHeight,
                        offset: (height - bottomTabHeight) * index,
                        index,
                    })}
                />
            )}

            {/* Edit/Preview Modal */}
            <Modal
                visible={editModalVisible}
                animationType="slide"
                presentationStyle="pageSheet"
                onRequestClose={() => setEditModalVisible(false)}
            >
                <View style={styles.editModalContainer}>
                    <View style={styles.editHeader}>
                        <TouchableOpacity onPress={() => setEditModalVisible(false)}>
                            <X size={28} color="white" />
                        </TouchableOpacity>
                        <Text style={styles.editTitle}>New Reel</Text>
                        <TouchableOpacity onPress={handlePostReel} disabled={uploading}>
                            {uploading ? (
                                <ActivityIndicator size="small" color="#6C5CE7" />
                            ) : (
                                <Text style={styles.postBtnText}>Post</Text>
                            )}
                        </TouchableOpacity>
                    </View>

                    <View style={styles.previewContainer}>
                        {previewUri && (
                            <Video
                                style={styles.previewVideo}
                                source={{ uri: previewUri }}
                                resizeMode={ResizeMode.COVER}
                                shouldPlay={true}
                                isLooping
                                useNativeControls={false}
                            />
                        )}
                    </View>

                    <View style={styles.captionContainer}>
                        <TextInput
                            style={styles.captionInput}
                            placeholder="Write a caption... #hashtag"
                            placeholderTextColor="#999"
                            multiline
                            value={caption}
                            onChangeText={setCaption}
                        />
                    </View>
                </View>
            </Modal>

            {/* Comments Modal */}
            <Modal
                visible={commentsVisible}
                animationType="slide"
                transparent={true}
                onRequestClose={() => setCommentsVisible(false)}
            >
                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                    style={styles.modalOverlay}
                >
                    <TouchableOpacity
                        style={styles.modalBackdrop}
                        activeOpacity={1}
                        onPress={() => setCommentsVisible(false)}
                    />

                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Comments</Text>
                            <TouchableOpacity onPress={() => setCommentsVisible(false)}>
                                <X size={24} color="white" />
                            </TouchableOpacity>
                        </View>

                        {loadingComments ? (
                            <ActivityIndicator size="large" color="#6C5CE7" style={{ marginTop: 20 }} />
                        ) : (
                            <FlatList
                                data={comments}
                                renderItem={({ item }) => (
                                    <View style={styles.commentItem}>
                                        <Text style={styles.commentUser}>{item.user_name}</Text>
                                        <Text style={styles.commentText}>{item.content}</Text>
                                    </View>
                                )}
                                keyExtractor={item => item.id.toString()}
                                contentContainerStyle={styles.commentList}
                                ListEmptyComponent={
                                    <Text style={styles.noCommentsText}>No comments yet. Say something!</Text>
                                }
                            />
                        )}

                        <View style={styles.inputContainer}>
                            <TextInput
                                style={styles.input}
                                placeholder="Add a comment..."
                                placeholderTextColor="#999"
                                value={commentText}
                                onChangeText={setCommentText}
                            />
                            <TouchableOpacity onPress={handleSendComment} style={styles.sendBtn}>
                                <Send size={20} color={commentText.trim() ? '#6C5CE7' : '#666'} />
                            </TouchableOpacity>
                        </View>
                    </View>
                </KeyboardAvoidingView>
            </Modal>
            {/* Share Modal */}
            <ShareModal
                visible={shareModalVisible}
                onClose={() => setShareModalVisible(false)}
                currentUser={user}
                post={reelToShare}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    screen: {
        flex: 1,
        backgroundColor: 'black',
    },
    header: {
        position: 'absolute',
        left: 20,
        right: 20,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        zIndex: 50,
    },
    headerTitle: {
        fontSize: 22,
        fontWeight: 'bold',
        color: 'white',
        textShadowColor: 'rgba(0,0,0,0.5)',
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 10,
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'black',
    },
    emptyText: {
        color: 'white',
        fontSize: 16,
        marginBottom: 20,
        opacity: 0.8,
    },
    createBtn: {
        backgroundColor: 'white',
        paddingHorizontal: 20,
        paddingVertical: 12,
        borderRadius: 25,
    },
    createBtnText: {
        color: 'black',
        fontWeight: 'bold',
        fontSize: 14,
    },
    // Edit Modal Styles
    editModalContainer: {
        flex: 1,
        backgroundColor: '#0D0B26', // Dark background
        paddingTop: Platform.OS === 'ios' ? 50 : 30,
    },
    editHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingBottom: 20,
    },
    editTitle: {
        color: 'white',
        fontSize: 18,
        fontWeight: 'bold',
    },
    postBtnText: {
        color: '#6C5CE7',
        fontSize: 16,
        fontWeight: 'bold',
    },
    previewContainer: {
        width: width,
        height: height * 0.5,
        backgroundColor: 'black',
    },
    previewVideo: {
        width: '100%',
        height: '100%',
    },
    captionContainer: {
        padding: 20,
        flex: 1,
    },
    captionInput: {
        color: 'white',
        fontSize: 16,
        height: 100,
        textAlignVertical: 'top',
    },
    // Comment Modal Styles
    modalOverlay: {
        flex: 1,
        justifyContent: 'flex-end',
    },
    modalBackdrop: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.5)',
    },
    modalContent: {
        backgroundColor: '#1A1A1A',
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        height: height * 0.6,
        padding: 20,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
        borderBottomWidth: 1,
        borderBottomColor: '#333',
        paddingBottom: 15,
    },
    modalTitle: {
        color: 'white',
        fontSize: 18,
        fontWeight: 'bold',
    },
    commentList: {
        paddingBottom: 20,
    },
    commentItem: {
        marginBottom: 15,
    },
    commentUser: {
        color: '#BBB',
        fontSize: 12,
        fontWeight: 'bold',
        marginBottom: 2,
    },
    commentText: {
        color: 'white',
        fontSize: 14,
    },
    noCommentsText: {
        color: '#666',
        textAlign: 'center',
        marginTop: 20,
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        borderTopWidth: 1,
        borderTopColor: '#333',
        paddingTop: 10,
        marginTop: 10,
    },
    input: {
        flex: 1,
        backgroundColor: '#333',
        borderRadius: 20,
        paddingHorizontal: 15,
        paddingVertical: 10,
        color: 'white',
        marginRight: 10,
    },
    sendBtn: {
        padding: 5,
    },
});
