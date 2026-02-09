import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, FlatList, TouchableOpacity, Image, Modal, Pressable, Dimensions, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { ArrowLeft, Camera, Image as ImageIcon, X } from 'lucide-react-native';
import { COLORS } from '../constants/theme';
import { useTheme } from '../context/ThemeContext';
import { fetchMessages } from '../services/api';

export default function SharedMediaScreen({ user, chatTarget, onBack }) {
    const { themeColors, isDark } = useTheme();
    const [messages, setMessages] = useState([]);
    const [loading, setLoading] = useState(true);
    const [lightboxVisible, setLightboxVisible] = useState(false);
    const [selectedImage, setSelectedImage] = useState(null);

    useEffect(() => {
        loadMedia();
    }, []);

    const loadMedia = async () => {
        try {
            const data = await fetchMessages(user.id, chatTarget.id);
            // Filter only media messages
            const mediaMessages = data.filter(m => m.messageType === 'image' || (m.attachmentUrls && m.attachmentUrls.length > 0));
            setMessages(mediaMessages);
        } catch (error) {
            console.error('Failed to load shared media', error);
        } finally {
            setLoading(false);
        }
    };

    const handleImagePress = (uri) => {
        setSelectedImage(uri);
        setLightboxVisible(true);
    };

    const renderItem = ({ item }) => {
        const uri = item.attachmentUrls?.[0] || item.content;
        return (
            <TouchableOpacity
                style={styles.gridItem}
                onPress={() => handleImagePress(uri)}
                activeOpacity={0.85}
            >
                <View style={[styles.imageWrapper, {
                    backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)',
                    shadowColor: isDark ? '#000' : themeColors.accentPrimary,
                    shadowOpacity: isDark ? 0.3 : 0.1,
                    shadowRadius: 8,
                    elevation: 3
                }]}>
                    <Image source={{ uri }} style={styles.image} />
                    {(item.attachmentUrls?.length > 1) && (
                        <View style={[styles.multiImageBadge, { backgroundColor: 'rgba(0,0,0,0.7)' }]}>
                            <ImageIcon size={10} color="white" />
                            <Text style={styles.multiImageText}>+{item.attachmentUrls.length - 1}</Text>
                        </View>
                    )}
                </View>
            </TouchableOpacity>
        );
    };

    return (
        <View style={[styles.container, { backgroundColor: isDark ? themeColors.bgDark : themeColors.bgLight }]}>
            <LinearGradient
                colors={[isDark ? themeColors.bgDark : themeColors.bgLight, isDark ? '#050511' : '#F1F5F9']}
                style={StyleSheet.absoluteFill}
            />

            <SafeAreaView edges={['top']} style={{ borderBottomWidth: 1, borderBottomColor: 'rgba(128,128,128,0.1)' }}>
                <View style={styles.header}>
                    <TouchableOpacity onPress={onBack} style={[styles.backBtn, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)' }]}>
                        <ArrowLeft color={isDark ? themeColors.textMain : themeColors.textMainLight} size={22} />
                    </TouchableOpacity>
                    <View style={{ flex: 1, alignItems: 'center' }}>
                        <Text style={[styles.headerTitle, { color: isDark ? themeColors.textMain : themeColors.textMainLight }]}>Shared Media</Text>
                        <Text style={[styles.headerSubtitle, { color: isDark ? themeColors.textDim : themeColors.textDimLight }]}>with {chatTarget.name}</Text>
                    </View>
                    <View style={{ width: 40 }} />
                </View>
            </SafeAreaView>

            {/* Premium Header */}
            <View style={styles.statsHeaderWrapper}>
                <LinearGradient
                    colors={[themeColors.accentPrimary + '15', 'transparent']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.statsHeaderGradient}
                >
                    <View style={styles.statsHeader}>
                        <View>
                            <Text style={[styles.statsTitle, { color: isDark ? themeColors.textMain : themeColors.textMainLight }]}>Photos & Images</Text>
                            <Text style={[styles.statsSubtitle, { color: isDark ? themeColors.textDim : themeColors.textDimLight }]}>Shared memories</Text>
                        </View>
                        <View style={[styles.countBadge, { backgroundColor: themeColors.accentPrimary + '20', borderColor: themeColors.accentPrimary + '30' }]}>
                            <Text style={[styles.countText, { color: themeColors.accentPrimary }]}>{messages.length}</Text>
                        </View>
                    </View>
                </LinearGradient>
            </View>

            <FlatList
                data={messages}
                numColumns={3}
                keyExtractor={item => 'media-' + item.id}
                renderItem={renderItem}
                contentContainerStyle={styles.listContent}
                showsVerticalScrollIndicator={false}
                ListEmptyComponent={
                    !loading && (
                        <View style={styles.emptyContainer}>
                            <LinearGradient
                                colors={[themeColors.accentPrimary + '10', 'transparent']}
                                style={styles.emptyIconCircle}
                            >
                                <Camera size={40} color={themeColors.accentPrimary} strokeWidth={1.5} />
                            </LinearGradient>
                            <Text style={[styles.emptyTitle, { color: isDark ? themeColors.textMain : themeColors.textMainLight }]}>No media yet</Text>
                            <Text style={[styles.emptyText, { color: isDark ? themeColors.textDim : themeColors.textDimLight }]}>Share photos to see them here</Text>
                        </View>
                    )
                }
            />

            {/* Image Lightbox */}
            <Modal
                visible={lightboxVisible}
                transparent
                animationType="fade"
                onRequestClose={() => setLightboxVisible(false)}
            >
                <Pressable
                    style={styles.lightboxOverlay}
                    onPress={() => setLightboxVisible(false)}
                >
                    <BlurView intensity={20} tint="dark" style={StyleSheet.absoluteFill} />

                    <View style={styles.lightboxHeader}>
                        <TouchableOpacity
                            style={styles.lightboxCloseBtn}
                            onPress={() => setLightboxVisible(false)}
                        >
                            <X color="white" size={28} />
                        </TouchableOpacity>
                    </View>

                    <View style={styles.lightboxImageContainer}>
                        {selectedImage && (
                            <Image
                                source={{ uri: selectedImage }}
                                style={styles.lightboxImage}
                                resizeMode="contain"
                            />
                        )}
                    </View>
                </Pressable>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 12,
    },
    backBtn: {
        width: 40,
        height: 40,
        justifyContent: 'center',
        alignItems: 'center',
        borderRadius: 20,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '900',
        letterSpacing: -0.5,
    },
    headerSubtitle: {
        fontSize: 13,
        fontWeight: '600',
        marginTop: 2,
    },
    statsHeaderWrapper: {
        marginBottom: 8,
    },
    statsHeaderGradient: {
        paddingVertical: 20,
        paddingHorizontal: 20,
    },
    statsHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    statsTitle: {
        fontSize: 20,
        fontWeight: '900',
        letterSpacing: -0.6,
        marginBottom: 2,
    },
    statsSubtitle: {
        fontSize: 13,
        fontWeight: '600',
        opacity: 0.7,
    },
    countBadge: {
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 20,
        borderWidth: 1,
    },
    countText: {
        fontSize: 16,
        fontWeight: '800',
    },
    listContent: {
        padding: 16,
        paddingBottom: 100,
    },
    gridItem: {
        flex: 1 / 3,
        aspectRatio: 1,
        padding: 4,
    },
    imageWrapper: {
        width: '100%',
        height: '100%',
        borderRadius: 12,
        overflow: 'hidden',
    },
    image: {
        width: '100%',
        height: '100%',
    },
    multiImageBadge: {
        position: 'absolute',
        top: 6,
        right: 6,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 3,
        paddingHorizontal: 6,
        paddingVertical: 3,
        borderRadius: 8,
    },
    multiImageText: {
        color: 'white',
        fontSize: 10,
        fontWeight: '700',
    },
    emptyContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 120,
        paddingHorizontal: 40,
    },
    emptyIconCircle: {
        width: 96,
        height: 96,
        borderRadius: 48,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 20,
    },
    emptyTitle: {
        fontSize: 20,
        fontWeight: '800',
        marginBottom: 6,
        textAlign: 'center',
    },
    emptyText: {
        fontSize: 14,
        fontWeight: '500',
        textAlign: 'center',
        opacity: 0.7,
    },
    // Lightbox Styles
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
});
