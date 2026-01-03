import React, { useState } from 'react';
import { StyleSheet, View, Text, TextInput, TouchableOpacity, Image, ActivityIndicator, Alert, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { X, Image as ImageIcon, Send, User } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS, SIZES, GLASS } from '../constants/theme';
import { useTheme } from '../context/ThemeContext';
import { createPost, uploadImage } from '../services/api';
import * as ImagePicker from 'expo-image-picker';

export default function CreatePostScreen({ user, onBack, isStory, communityContext }) {
    const { themeColors, isDark } = useTheme();
    const [content, setContent] = useState('');
    const [imageUrl, setImageUrl] = useState('');
    const [loading, setLoading] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [showImageUrlInput, setShowImageUrlInput] = useState(false);
    const [selectedCommunity, setSelectedCommunity] = useState(communityContext || null);

    const pickImage = async () => {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
            Alert.alert('Permission needed', 'We need access to your gallery to pick images.');
            return;
        }

        let result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            allowsEditing: true,
            aspect: isStory ? [9, 16] : [4, 5],
            quality: 0.8,
        });

        if (!result.canceled) {
            setUploading(true);
            try {
                const uploadedUrl = await uploadImage(result.assets[0].uri);
                setImageUrl(uploadedUrl);
            } catch (error) {
                Alert.alert('Upload Failed', 'Could not upload selected image.');
            } finally {
                setUploading(false);
            }
        }
    };

    const handlePost = async () => {
        if (!content.trim()) {
            Alert.alert('Error', 'Please write something first!');
            return;
        }

        if (!user || !user.id) {
            Alert.alert('Error', 'You must be logged in to post.');
            return;
        }

        setLoading(true);
        try {
            await createPost({
                userId: user.id,
                content: content,
                mediaUrl: imageUrl || null,
                community_id: selectedCommunity?.communityId || null
            });

            // Reset and go to Feed
            setContent('');
            setImageUrl('');
            setShowImageUrlInput(false);

            // Navigate back
            if (onBack) onBack();
        } catch (error) {
            Alert.alert('Error', error.message || 'Failed to create');
        } finally {
            setLoading(false);
        }
    };

    return (
        <View style={[styles.container, { backgroundColor: themeColors.bgDark }]}>
            <LinearGradient
                colors={[themeColors.bgDark, isDark ? '#0a0d1d' : '#F1F5F9']}
                style={StyleSheet.absoluteFill}
            />

            <SafeAreaView style={styles.safeArea}>
                <View style={[styles.header, { borderBottomColor: themeColors.border }]}>
                    <TouchableOpacity onPress={onBack} style={styles.backBtn}>
                        <X color={themeColors.textMain} size={24} />
                    </TouchableOpacity>
                    <Text style={[styles.headerTitle, { color: themeColors.textMain, flex: 1, marginLeft: 16 }]}>
                        {isStory ? 'New Story' : 'New Post'}
                    </Text>
                    <TouchableOpacity
                        style={[styles.postBtn, { backgroundColor: themeColors.accentPrimary }, (!content.trim() && !imageUrl) && { backgroundColor: themeColors.bgCard }]}
                        onPress={handlePost}
                        disabled={loading || (!content.trim() && !imageUrl)}
                    >
                        {loading ? (
                            <ActivityIndicator size="small" color="white" />
                        ) : (
                            <>
                                <Text style={styles.postBtnText}>Post</Text>
                                <Send color={(!content.trim() && !imageUrl) ? themeColors.textDim : "white"} size={16} style={{ marginLeft: 6 }} />
                            </>
                        )}
                    </TouchableOpacity>
                </View>

                <ScrollView contentContainerStyle={styles.content}>
                    <View style={styles.userInfo}>
                        {user?.avatar ? (
                            <Image
                                source={{ uri: user.avatar }}
                                style={[styles.avatar, { borderColor: themeColors.border }]}
                            />
                        ) : (
                            <View style={[styles.avatar, { borderColor: themeColors.border, backgroundColor: themeColors.bgCard, justifyContent: 'center', alignItems: 'center' }]}>
                                <User size={20} color={themeColors.textDim} />
                            </View>
                        )}
                        <View style={{ flex: 1 }}>
                            <Text style={[styles.userName, { color: themeColors.textMain }]}>{user?.name || user?.full_name || 'User'}</Text>
                            <View style={styles.destinationRow}>
                                <Text style={[styles.userRole, { color: themeColors.textDim }]}>Posting to </Text>
                                <TouchableOpacity
                                    onPress={() => !communityContext && setSelectedCommunity(null)}
                                    disabled={!!communityContext}
                                >
                                    <BlurView intensity={20} tint={isDark ? "dark" : "light"} style={styles.destinationBadge}>
                                        <Text style={[styles.destinationText, { color: themeColors.accentPrimary }]}>
                                            {selectedCommunity ? selectedCommunity.communityName : 'Global Feed'}
                                        </Text>
                                        {(selectedCommunity && !communityContext) && <X size={12} color={themeColors.accentPrimary} style={{ marginLeft: 4 }} />}
                                    </BlurView>
                                </TouchableOpacity>
                            </View>
                        </View>
                    </View>

                    <TextInput
                        style={[styles.input, { color: themeColors.textMain }, isStory && { fontSize: 22, textAlign: 'center' }]}
                        placeholder={isStory ? "Add a caption..." : "What's happening on campus?"}
                        placeholderTextColor={themeColors.textDim}
                        multiline
                        autoFocus
                        value={content}
                        onChangeText={setContent}
                        textAlignVertical={isStory ? "center" : "top"}
                    />

                    {/* Image / Story Placeholder */}
                    {isStory && !imageUrl && !uploading && (
                        <TouchableOpacity style={[styles.storyPlaceholder, { borderColor: themeColors.border }]} onPress={pickImage}>
                            <ImageIcon color={themeColors.textDim} size={48} />
                            <Text style={{ color: themeColors.textDim, marginTop: 12 }}>Pick an image for your story</Text>
                        </TouchableOpacity>
                    )}

                    {/* Image Preview / Uploading State */}
                    {uploading ? (
                        <View style={[styles.imagePreviewContainer, { height: 200, justifyContent: 'center', alignItems: 'center', backgroundColor: themeColors.bgCard }]}>
                            <ActivityIndicator size="large" color={themeColors.accentPrimary} />
                            <Text style={{ color: themeColors.textDim, marginTop: 10 }}>Uploading image...</Text>
                        </View>
                    ) : imageUrl ? (
                        <View style={styles.imagePreviewContainer}>
                            <Image source={{ uri: imageUrl }} style={[styles.imagePreview, { backgroundColor: themeColors.bgCard }]} />
                            <TouchableOpacity style={styles.removeImageBtn} onPress={() => setImageUrl('')}>
                                <BlurView intensity={80} tint={isDark ? "dark" : "light"} style={styles.removeIconBlur}>
                                    <X color={themeColors.textMain} size={16} />
                                </BlurView>
                            </TouchableOpacity>
                        </View>
                    ) : null}

                    {/* Image URL Input (MVP) */}
                    {showImageUrlInput && (
                        <View style={[styles.urlInputContainer, { backgroundColor: themeColors.bgCard }]}>
                            <TextInput
                                style={[styles.urlInput, { color: themeColors.textMain }]}
                                placeholder="Paste image URL here..."
                                placeholderTextColor={themeColors.textDim}
                                value={imageUrl}
                                onChangeText={setImageUrl}
                                autoCapitalize="none"
                            />
                        </View>
                    )}
                </ScrollView>

                <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
                    <View style={[styles.toolbar, { borderTopColor: themeColors.border, backgroundColor: isDark ? 'rgba(0,0,0,0.2)' : 'rgba(255,255,255,0.5)' }]}>
                        <TouchableOpacity
                            style={[styles.toolbarBtn, { backgroundColor: themeColors.bgCard }]}
                            onPress={pickImage}
                            disabled={uploading}
                        >
                            <ImageIcon color={themeColors.accentPrimary} size={24} />
                            <Text style={[styles.toolbarText, { color: themeColors.accentPrimary }]}>Pick Image</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[styles.toolbarBtn, { marginLeft: 12, backgroundColor: themeColors.bgCard }]}
                            onPress={() => setShowImageUrlInput(prev => !prev)}
                        >
                            <Text style={[styles.toolbarText, { color: themeColors.textDim }]}>URL</Text>
                        </TouchableOpacity>
                        {/* Future: Add Video, Polls, etc. */}
                    </View>
                </KeyboardAvoidingView>

            </SafeAreaView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.bgDark,
    },
    safeArea: {
        flex: 1,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: SIZES.padding,
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255,255,255,0.05)',
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: COLORS.textMain,
    },
    backBtn: {
        width: 40,
        height: 40,
        justifyContent: 'center',
        alignItems: 'center',
        borderRadius: 20,
    },
    postBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.accentPrimary,
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
    },
    postBtnDisabled: {
        backgroundColor: 'rgba(255,255,255,0.1)',
    },
    postBtnText: {
        color: 'white',
        fontWeight: '600',
        fontSize: 14,
    },
    content: {
        padding: SIZES.padding,
        flexGrow: 1,
    },
    userInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 20,
    },
    avatar: {
        width: 44,
        height: 44,
        borderRadius: 22,
        marginRight: 12,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
    },
    userName: {
        color: COLORS.textMain,
        fontWeight: '700',
        fontSize: 16,
    },
    userRole: {
        color: COLORS.textDim,
        fontSize: 13,
    },
    destinationRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 2,
    },
    destinationBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        overflow: 'hidden',
    },
    destinationText: {
        fontSize: 12,
        fontWeight: '700',
    },
    input: {
        color: COLORS.textMain,
        fontSize: 18,
        minHeight: 120,
    },
    imagePreviewContainer: {
        marginTop: 20,
        borderRadius: SIZES.radiusMedium,
        overflow: 'hidden',
        position: 'relative',
    },
    imagePreview: {
        width: '100%',
        height: 200,
        backgroundColor: 'rgba(255,255,255,0.05)',
        resizeMode: 'cover',
    },
    removeImageBtn: {
        position: 'absolute',
        top: 10,
        right: 10,
    },
    removeIconBlur: {
        width: 30,
        height: 30,
        borderRadius: 15,
        justifyContent: 'center',
        alignItems: 'center',
        overflow: 'hidden',
    },
    urlInputContainer: {
        marginTop: 10,
        padding: 10,
        backgroundColor: 'rgba(255,255,255,0.05)',
        borderRadius: 10,
    },
    urlInput: {
        color: COLORS.textMain,
        fontSize: 14,
    },
    toolbar: {
        padding: SIZES.padding,
        borderTopWidth: 1,
        borderTopColor: 'rgba(255,255,255,0.05)',
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.2)', // Slight bg to separate
    },
    toolbarBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 8,
        borderRadius: 8,
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
    },
    toolbarText: {
        color: COLORS.accentPrimary,
        fontWeight: '600',
        marginLeft: 8,
    },
    storyPlaceholder: {
        width: '100%',
        height: 300,
        borderRadius: 20,
        borderWidth: 2,
        borderStyle: 'dashed',
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 10,
    }
});
