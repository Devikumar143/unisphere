import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TextInput, FlatList, TouchableOpacity, Image, StyleSheet, ActivityIndicator, Modal, Platform } from 'react-native';
import { Search, X } from 'lucide-react-native';
import { BlurView } from 'expo-blur';
import { useTheme } from '../context/ThemeContext';
import { COLORS } from '../constants/theme';

const GIPHY_API_KEY = 'YOUR_GIPHY_API_KEY_HERE'; // TODO: Move to env

const GifPicker = ({ visible, onClose, onSelect }) => {
    const { isDark, themeColors } = useTheme();
    const [searchQuery, setSearchQuery] = useState('');
    const [gifs, setGifs] = useState([]);
    const [loading, setLoading] = useState(false);
    const searchTimeout = useRef(null);

    // Fetch trending GIFs on mount
    useEffect(() => {
        if (visible && !searchQuery) {
            fetchGifs();
        }
    }, [visible, searchQuery]);

    const fetchGifs = async (query = '') => {
        setLoading(true);
        try {
            const endpoint = query
                ? `https://api.giphy.com/v1/gifs/search?api_key=${GIPHY_API_KEY}&q=${query}&limit=20&rating=g`
                : `https://api.giphy.com/v1/gifs/trending?api_key=${GIPHY_API_KEY}&limit=20&rating=g`;

            const response = await fetch(endpoint);
            const data = await response.json();
            setGifs(data.data);
        } catch (error) {
            console.error('Error fetching GIFs:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSearch = (text) => {
        setSearchQuery(text);
        if (searchTimeout.current) clearTimeout(searchTimeout.current);

        searchTimeout.current = setTimeout(() => {
            fetchGifs(text);
        }, 500);
    };

    const renderItem = ({ item }) => (
        <TouchableOpacity
            style={styles.gifItem}
            onPress={() => {
                onSelect(item.images.fixed_height.url);
                onClose();
            }}
        >
            <Image
                source={{ uri: item.images.fixed_height.url }}
                style={styles.gifImage}
                resizeMode="cover"
            />
        </TouchableOpacity>
    );

    return (
        <Modal
            visible={visible}
            animationType="slide"
            transparent={true}
            onRequestClose={onClose}
        >
            <View style={styles.modalOverlay}>
                <BlurView intensity={isDark ? 80 : 50} tint={isDark ? 'dark' : 'light'} style={StyleSheet.absoluteFill} />

                <View style={[styles.container, { backgroundColor: isDark ? themeColors.bgDark : themeColors.bgLight }]}>
                    <View style={styles.header}>
                        <View style={[styles.searchBar, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' }]}>
                            <Search size={20} color={isDark ? '#BBB' : '#666'} />
                            <TextInput
                                style={[styles.input, { color: isDark ? '#FFF' : '#000' }]}
                                placeholder="Search GIPHY..."
                                placeholderTextColor={isDark ? '#888' : '#999'}
                                value={searchQuery}
                                onChangeText={handleSearch}
                            />
                            {searchQuery.length > 0 && (
                                <TouchableOpacity onPress={() => handleSearch('')}>
                                    <X size={18} color={isDark ? '#BBB' : '#666'} />
                                </TouchableOpacity>
                            )}
                        </View>
                        <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                            <Text style={{ color: themeColors.accentPrimary, fontWeight: '600' }}>Cancel</Text>
                        </TouchableOpacity>
                    </View>

                    {loading ? (
                        <View style={styles.loadingContainer}>
                            <ActivityIndicator size="large" color={themeColors.accentPrimary} />
                        </View>
                    ) : (
                        <FlatList
                            data={gifs}
                            renderItem={renderItem}
                            keyExtractor={(item) => item.id}
                            numColumns={2}
                            contentContainerStyle={styles.listContent}
                            columnWrapperStyle={styles.columnWrapper}
                            showsVerticalScrollIndicator={false}
                        />
                    )}
                </View>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    modalOverlay: {
        flex: 1,
        justifyContent: 'flex-end',
    },
    container: {
        height: '80%',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        overflow: 'hidden',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        paddingBottom: 10,
    },
    searchBar: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        height: 48,
        borderRadius: 24,
        marginRight: 12,
    },
    input: {
        flex: 1,
        marginLeft: 8,
        fontSize: 16,
        fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
    },
    closeBtn: {
        padding: 8,
    },
    listContent: {
        padding: 8,
        paddingBottom: 40,
    },
    columnWrapper: {
        justifyContent: 'space-between',
    },
    gifItem: {
        width: '48%',
        aspectRatio: 1.2,
        marginBottom: 12,
        borderRadius: 12,
        overflow: 'hidden',
        backgroundColor: '#EEE',
    },
    gifImage: {
        width: '100%',
        height: '100%',
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    }
});

export default GifPicker;
