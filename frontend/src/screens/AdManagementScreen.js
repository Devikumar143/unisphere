import React, { useState, useEffect } from 'react';
import {
    StyleSheet,
    View,
    Text,
    FlatList,
    TouchableOpacity,
    Image,
    Alert,
    ActivityIndicator,
    TextInput,
    Modal,
    ScrollView,
    KeyboardAvoidingView,
    Platform
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';
import { useTheme } from '../context/ThemeContext';
import { fetchAds, createAd, deleteAd, uploadFile, cleanImageUrl } from '../services/api';
import { ArrowLeft, Plus, Trash2, Camera, X } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import { COLORS } from '../constants/theme';

export default function AdManagementScreen({ onBack, currentUser }) {
    const { isDark, themeColors } = useTheme();
    const [ads, setAds] = useState([]);
    const [loading, setLoading] = useState(true);
    const [modalVisible, setModalVisible] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    // Form State
    const [title, setTitle] = useState('');
    const [category, setCategory] = useState('Announcement');
    const [image, setImage] = useState(null);

    useEffect(() => {
        loadAds();
    }, []);

    const loadAds = async () => {
        setLoading(true);
        try {
            const data = await fetchAds();
            setAds(data);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteAd = (id) => {
        Alert.alert(
            "Delete Ad",
            "Are you sure you want to remove this poster?",
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Delete",
                    style: "destructive",
                    onPress: async () => {
                        try {
                            await deleteAd(id);
                            setAds(prev => prev.filter(a => a.id !== id));
                        } catch (error) {
                            console.error('[AdManagement] Delete Error:', error);
                            Alert.alert("Error", error.message || "Failed to delete ad");
                        }
                    }
                }
            ]
        );
    };

    const pickImage = async () => {
        let result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            allowsEditing: true,
            aspect: [16, 9],
            quality: 0.8,
        });

        if (!result.canceled) {
            setImage(result.assets[0]);
        }
    };

    const handleCreateAd = async () => {
        if (!title || !image) {
            Alert.alert("Error", "Please provide a title and an image");
            return;
        }

        setSubmitting(true);
        try {
            // 1. Upload Image
            const imageUrl = await uploadFile(image.uri);

            // 2. Create Ad Record
            console.log(`[AdManagement] Creating ad: ${title} with image: ${imageUrl}`);
            await createAd({
                title,
                imageUrl,
                category
            });

            setModalVisible(false);
            setTitle('');
            setImage(null);
            loadAds();
            Alert.alert("Success", "Ad posted successfully! ✨");
        } catch (error) {
            console.error('[Push-Debug] [AdManagement] Create Error:', error);
            Alert.alert("Error", `Failed to create ad: ${error.message}`);
        } finally {
            setSubmitting(false);
        }
    };

    const renderAdItem = ({ item }) => (
        <View style={[styles.adCard, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#fff' }]}>
            <Image source={{ uri: cleanImageUrl(item.image_url) }} style={styles.adThumb} />
            <View style={styles.adInfo}>
                <Text style={[styles.adTitle, { color: themeColors.textMain }]} numberOfLines={1}>{item.title}</Text>
                <Text style={[styles.adCategory, { color: themeColors.textDim }]}>{item.category}</Text>
            </View>
            <TouchableOpacity onPress={() => handleDeleteAd(item.id)} style={styles.deleteBtn}>
                <Trash2 color={COLORS.error} size={20} />
            </TouchableOpacity>
        </View>
    );

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: themeColors.bgDark }]}>
            <View style={styles.header}>
                <TouchableOpacity onPress={onBack} style={styles.backBtn}>
                    <ArrowLeft color={themeColors.textMain} size={24} />
                </TouchableOpacity>
                <Text style={[styles.headerTitle, { color: themeColors.textMain }]}>Ad Management</Text>
                <TouchableOpacity onPress={() => setModalVisible(true)} style={styles.addBtn}>
                    <Plus color={themeColors.accentPrimary} size={24} />
                </TouchableOpacity>
            </View>

            {loading ? (
                <View style={styles.center}>
                    <ActivityIndicator color={themeColors.accentPrimary} size="large" />
                </View>
            ) : (
                <FlatList
                    data={ads}
                    renderItem={renderAdItem}
                    keyExtractor={item => item.id}
                    contentContainerStyle={styles.listContent}
                    ListEmptyComponent={
                        <View style={styles.emptyContainer}>
                            <Text style={[styles.emptyText, { color: themeColors.textDim }]}>No posters yet.</Text>
                        </View>
                    }
                />
            )}

            {/* Create Ad Modal */}
            <Modal visible={modalVisible} animationType="slide" transparent>
                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                    style={styles.modalOverlay}
                >
                    <BlurView intensity={isDark ? 50 : 80} tint={isDark ? "dark" : "light"} style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={[styles.modalTitle, { color: themeColors.textMain }]}>Create New Poster</Text>
                            <TouchableOpacity onPress={() => setModalVisible(false)} style={styles.closeBtn}>
                                <X color={themeColors.textMain} size={24} />
                            </TouchableOpacity>
                        </View>

                        <ScrollView contentContainerStyle={styles.modalBody}>
                            <TouchableOpacity
                                style={[styles.imagePlaceholder, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#f0f0f0' }]}
                                onPress={pickImage}
                            >
                                {image ? (
                                    <Image source={{ uri: image.uri }} style={styles.pickedImage} />
                                ) : (
                                    <View style={styles.placeholderInner}>
                                        <Camera color={themeColors.textDim} size={40} />
                                        <Text style={{ color: themeColors.textDim, marginTop: 8 }}>Select Poster Image (16:9)</Text>
                                    </View>
                                )}
                            </TouchableOpacity>

                            <View style={styles.inputGroup}>
                                <Text style={[styles.label, { color: themeColors.textDim }]}>TITLE</Text>
                                <TextInput
                                    style={[styles.input, { color: themeColors.textMain, backgroundColor: isDark ? 'rgba(0,0,0,0.2)' : '#fff' }]}
                                    placeholder="Enter poster title..."
                                    placeholderTextColor={themeColors.textDim}
                                    value={title}
                                    onChangeText={setTitle}
                                />
                            </View>

                            <View style={styles.inputGroup}>
                                <Text style={[styles.label, { color: themeColors.textDim }]}>CATEGORY</Text>
                                <View style={styles.categories}>
                                    {['Ad', 'Event', 'Announcement'].map(cat => (
                                        <TouchableOpacity
                                            key={cat}
                                            style={[
                                                styles.catBadge,
                                                category === cat && { backgroundColor: themeColors.accentPrimary }
                                            ]}
                                            onPress={() => setCategory(cat)}
                                        >
                                            <Text style={[styles.catText, category === cat && { color: '#fff' }]}>{cat}</Text>
                                        </TouchableOpacity>
                                    ))}
                                </View>
                            </View>

                            <TouchableOpacity
                                style={[styles.submitBtn, { backgroundColor: themeColors.accentPrimary }]}
                                onPress={handleCreateAd}
                                disabled={submitting}
                            >
                                {submitting ? (
                                    <ActivityIndicator color="white" />
                                ) : (
                                    <Text style={styles.submitText}>Post Ad</Text>
                                )}
                            </TouchableOpacity>
                        </ScrollView>
                    </BlurView>
                </KeyboardAvoidingView>
            </Modal>
        </SafeAreaView>
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
        paddingHorizontal: 20,
        paddingVertical: 15,
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: '900',
    },
    backBtn: {
        padding: 5,
    },
    addBtn: {
        padding: 5,
    },
    center: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    listContent: {
        padding: 20,
    },
    adCard: {
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: 16,
        padding: 12,
        marginBottom: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
    },
    adThumb: {
        width: 80,
        height: 45,
        borderRadius: 8,
        backgroundColor: '#eee',
    },
    adInfo: {
        flex: 1,
        marginLeft: 15,
    },
    adTitle: {
        fontSize: 16,
        fontWeight: '700',
    },
    adCategory: {
        fontSize: 12,
        marginTop: 2,
    },
    deleteBtn: {
        padding: 8,
    },
    modalOverlay: {
        flex: 1,
        justifyContent: 'flex-end',
    },
    modalContent: {
        height: '85%',
        borderTopLeftRadius: 32,
        borderTopRightRadius: 32,
        overflow: 'hidden',
    },
    modalHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 24,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255,255,255,0.1)',
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: '900',
    },
    modalBody: {
        padding: 24,
    },
    imagePlaceholder: {
        width: '100%',
        aspectRatio: 16 / 9,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
        borderStyle: 'dashed',
    },
    pickedImage: {
        width: '100%',
        height: '100%',
    },
    placeholderInner: {
        alignItems: 'center',
    },
    inputGroup: {
        marginTop: 24,
    },
    label: {
        fontSize: 12,
        fontWeight: '900',
        marginBottom: 8,
        letterSpacing: 1,
    },
    input: {
        borderRadius: 12,
        padding: 16,
        fontSize: 16,
    },
    categories: {
        flexDirection: 'row',
        gap: 10,
    },
    catBadge: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        backgroundColor: 'rgba(255,255,255,0.1)',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.05)',
    },
    catText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#666',
    },
    submitBtn: {
        marginTop: 40,
        borderRadius: 16,
        padding: 18,
        alignItems: 'center',
    },
    submitText: {
        color: '#fff',
        fontSize: 18,
        fontWeight: '900',
    },
    emptyContainer: {
        paddingTop: 100,
        alignItems: 'center',
    },
    emptyText: {
        fontSize: 16,
    }
});
