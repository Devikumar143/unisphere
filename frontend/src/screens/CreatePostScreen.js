import React, { useState } from 'react';
import { StyleSheet, View, Text, TextInput, TouchableOpacity, Image, ActivityIndicator, Alert, KeyboardAvoidingView, Platform, ScrollView, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { X, Image as ImageIcon, Send, User, ChevronDown } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS, SIZES, FONTS, EARTH_COLORS } from '../constants/theme';
import { useTheme } from '../context/ThemeContext';
import { createPost, uploadImage } from '../services/api';
import * as ImagePicker from 'expo-image-picker';

const { width } = Dimensions.get('window');

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
        <View style={[styles.container, { backgroundColor: isDark ? themeColors.bgDark : themeColors.bgLight }]}>
            <SafeAreaView style={styles.safeArea}>
                {/* 1. Header */}
                <View style={styles.header}>
                    <TouchableOpacity
                        onPress={onBack}
                        style={[styles.closeBtn, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }]}
                    >
                        <X color={isDark ? themeColors.textMain : themeColors.textMainLight} size={20} />
                    </TouchableOpacity>

                    <Text style={[styles.headerTitle, { color: isDark ? themeColors.textMain : themeColors.textMainLight }]}>
                        {isStory ? 'New Story' : 'New Post'}
                    </Text>

                    <TouchableOpacity
                        style={[
                            styles.postBtn,
                            { backgroundColor: themeColors.accentPrimary },
                            (!content.trim() && !imageUrl) && { opacity: 0.6 }
                        ]}
                        onPress={handlePost}
                        disabled={loading || (!content.trim() && !imageUrl)}
                    >
                        {loading ? (
                            <ActivityIndicator size="small" color="white" />
                        ) : (
                            <Text style={styles.postBtnText}>Post</Text>
                        )}
                    </TouchableOpacity>
                </View>

                {/* 2. Content Area */}
                <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

                    {/* User Info Row */}
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
                            <Text style={[styles.userName, { color: isDark ? themeColors.textMain : themeColors.textMainLight }]}>
                                {user?.name || user?.full_name || 'User'}
                            </Text>
                            <TouchableOpacity
                                style={[styles.destinationBadge, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)' }]}
                                onPress={() => !communityContext && setSelectedCommunity(null)}
                                disabled={!!communityContext}
                            >
                                <Text style={[styles.destinationText, { color: isDark ? themeColors.textMuted : themeColors.textMutedLight }]}>
                                    Posting to <Text style={{ color: themeColors.accentPrimary, fontWeight: '700' }}>
                                        {selectedCommunity ? selectedCommunity.communityName : 'Global Feed'}
                                    </Text>
                                </Text>
                                {(!communityContext && selectedCommunity) && (
                                    <X size={12} color={themeColors.textDim} style={{ marginLeft: 6 }} />
                                )}
                                {(!communityContext && !selectedCommunity) && (
                                    <ChevronDown size={12} color={themeColors.textDim} style={{ marginLeft: 6 }} />
                                )}
                            </TouchableOpacity>
                        </View>
                    </View>

                    {/* Text Input */}
                    <TextInput
                        style={[
                            styles.input,
                            {
                                color: isDark ? themeColors.textMain : themeColors.textMainLight,
                                fontFamily: FONTS.body || 'System'
                            },
                            isStory && { fontSize: 24, textAlign: 'center', fontFamily: FONTS.header }
                        ]}
                        placeholder={isStory ? "Add a caption..." : "What's happening on campus?"}
                        placeholderTextColor={isDark ? themeColors.textDim : themeColors.textDimLight}
                        multiline
                        autoFocus
                        value={content}
                        onChangeText={setContent}
                        textAlignVertical="top"
                    />

                    {/* Media Preview */}
                    {uploading ? (
                        <View style={[styles.imagePreviewContainer, { backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)' }]}>
                            <ActivityIndicator size="large" color={themeColors.accentPrimary} />
                            <Text style={{ color: themeColors.textDim, marginTop: 12 }}>Uploading...</Text>
                        </View>
                    ) : imageUrl ? (
                        <View style={styles.imagePreviewContainer}>
                            <Image source={{ uri: imageUrl }} style={styles.imagePreview} />
                            <TouchableOpacity
                                style={styles.removeImageBtn}
                                onPress={() => setImageUrl('')}
                            >
                                <BlurView intensity={20} tint="dark" style={styles.removeIconBlur}>
                                    <X color="#FFF" size={16} />
                                </BlurView>
                            </TouchableOpacity>
                        </View>
                    ) : null}

                    {/* URL Input (if enabled) */}
                    {showImageUrlInput && (
                        <View style={[styles.urlInputContainer, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }]}>
                            <TextInput
                                style={[styles.urlInput, { color: isDark ? themeColors.textMain : themeColors.textMainLight }]}
                                placeholder="Paste image URL here..."
                                placeholderTextColor={themeColors.textDim}
                                value={imageUrl}
                                onChangeText={setImageUrl}
                                autoCapitalize="none"
                            />
                            <TouchableOpacity onPress={() => setShowImageUrlInput(false)}>
                                <X size={18} color={themeColors.textDim} />
                            </TouchableOpacity>
                        </View>
                    )}
                </ScrollView>

                {/* 3. Bottom Toolbar */}
                <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
                    <View style={[styles.toolbar, {
                        borderTopColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)',
                        backgroundColor: isDark ? themeColors.bgDark : themeColors.bgLight
                    }]}>
                        <TouchableOpacity
                            style={[styles.toolbarItem, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }]}
                            onPress={pickImage}
                            disabled={uploading}
                        >
                            <ImageIcon color={themeColors.accentPrimary} size={22} />
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[styles.toolbarItem, { marginLeft: 12, backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }]}
                            onPress={() => setShowImageUrlInput(prev => !prev)}
                        >
                            <Text style={[styles.toolbarText, { color: isDark ? themeColors.textMuted : themeColors.textMutedLight }]}>URL</Text>
                        </TouchableOpacity>

                        <View style={{ flex: 1 }} />

                        {/* Character count or other indicators could go here */}
                        <Text style={{ color: themeColors.textDim, fontSize: 12 }}>
                            {content.length}/500
                        </Text>
                    </View>
                </KeyboardAvoidingView>
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
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: SIZES.padding,
        paddingVertical: 16,
    },
    headerTitle: {
        fontSize: 16,
        fontFamily: FONTS.header,
        fontWeight: '700',
    },
    closeBtn: {
        width: 36,
        height: 36,
        borderRadius: 18,
        justifyContent: 'center',
        alignItems: 'center',
    },
    postBtn: {
        paddingHorizontal: 20,
        paddingVertical: 8,
        borderRadius: 20,
        minWidth: 70,
        alignItems: 'center',
        justifyContent: 'center',
    },
    postBtnText: {
        color: 'white',
        fontWeight: '600',
        fontSize: 14,
    },
    content: {
        padding: SIZES.padding,
        paddingTop: 0,
    },
    userInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        marginVertical: 20,
    },
    avatar: {
        width: 48,
        height: 48,
        borderRadius: 24,
        marginRight: 14,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
    },
    userName: {
        fontSize: 16,
        fontWeight: '700',
        marginBottom: 4,
    },
    destinationBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 8,
        alignSelf: 'flex-start',
    },
    destinationText: {
        fontSize: 13,
    },
    input: {
        fontSize: 18,
        minHeight: 120,
        lineHeight: 26,
        textAlignVertical: 'top',
    },
    imagePreviewContainer: {
        marginTop: 20,
        width: '100%',
        height: 250,
        borderRadius: SIZES.radiusMedium,
        overflow: 'hidden',
        justifyContent: 'center',
        alignItems: 'center',
        position: 'relative',
    },
    imagePreview: {
        width: '100%',
        height: '100%',
        resizeMode: 'cover',
    },
    removeImageBtn: {
        position: 'absolute',
        top: 12,
        right: 12,
    },
    removeIconBlur: {
        width: 32,
        height: 32,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
        overflow: 'hidden',
    },
    urlInputContainer: {
        marginTop: 15,
        padding: 12,
        borderRadius: 12,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    urlInput: {
        flex: 1,
        fontSize: 14,
        marginRight: 10,
    },
    toolbar: {
        padding: SIZES.padding,
        paddingBottom: Platform.OS === 'ios' ? 0 : SIZES.padding,
        flexDirection: 'row',
        alignItems: 'center',
    },
    toolbarItem: {
        width: 44,
        height: 44,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
    },
    toolbarText: {
        fontWeight: '600',
        fontSize: 13,
    }
});
