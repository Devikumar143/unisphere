import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, Modal, TouchableOpacity, FlatList, Image, TextInput, ActivityIndicator } from 'react-native';
import { X, Search, Send, CheckCircle2 } from 'lucide-react-native';
import { BlurView } from 'expo-blur';
import { COLORS, SIZES } from '../constants/theme';
import { useTheme } from '../context/ThemeContext';
import { fetchUserFollowing } from '../services/api';
import { sendMessage } from '../services/socket';

export default function ShareModal({ visible, onClose, currentUser, post }) {
    const { isDark, themeColors } = useTheme();
    const [searchQuery, setSearchQuery] = useState('');
    const [following, setFollowing] = useState([]);
    const [loading, setLoading] = useState(false);
    const [sentUsers, setSentUsers] = useState(new Set());

    useEffect(() => {
        if (visible && currentUser?.id) {
            loadFollowing();
        }
    }, [visible, currentUser]);

    const loadFollowing = async () => {
        setLoading(true);
        try {
            const users = await fetchUserFollowing(currentUser.id);
            setFollowing(users);
        } catch (error) {
            console.error("Failed to load following", error);
        } finally {
            setLoading(false);
        }
    };

    const handleSend = (user) => {
        if (sentUsers.has(user.id)) return;

        // Construct message content
        const messageContent = post.video
            ? `Check out this reel from @${post.user.username}`
            : `Check out this post from @${post.user.username}: ${post.content || ''}`;

        // Add attachment URL if it's an image post or reel
        const attachmentUrls = post.image ? [post.image] : (post.video ? [post.video] : []);
        const messageType = post.video ? 'reel' : (post.image ? 'image' : 'text');

        // Send message via socket
        sendMessage(
            currentUser.id,
            user.id,
            messageContent,
            null,
            false,
            'shared_post', // New type
            null,
            null,
            attachmentUrls,
            post // Pass full post object as metadata (using pollData param)
        );

        // Update UI state
        setSentUsers(prev => new Set(prev).add(user.id));
    };

    const filteredUsers = following.filter(user =>
        user.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (user.name && user.name.toLowerCase().includes(searchQuery.toLowerCase()))
    );

    const renderItem = ({ item }) => {
        const isSent = sentUsers.has(item.id);

        return (
            <View style={styles.userItem}>
                <View style={styles.userInfo}>
                    <Image
                        source={{ uri: item.avatar || 'https://via.placeholder.com/50' }}
                        style={styles.avatar}
                    />
                    <View>
                        <Text style={[styles.name, { color: isDark ? themeColors.textMain : themeColors.textMainLight }]}>
                            {item.name || item.username}
                        </Text>
                        <Text style={[styles.username, { color: isDark ? themeColors.textMuted : themeColors.textMutedLight }]}>
                            @{item.username}
                        </Text>
                    </View>
                </View>

                <TouchableOpacity
                    style={[
                        styles.sendBtn,
                        isSent ? { backgroundColor: isDark ? '#333' : '#eee' } : { backgroundColor: themeColors.accentPrimary }
                    ]}
                    onPress={() => handleSend(item)}
                    disabled={isSent}
                >
                    {isSent ? (
                        <Text style={[styles.sendBtnText, { color: isDark ? themeColors.textMain : themeColors.textMainLight }]}>Sent</Text>
                    ) : (
                        <Text style={[styles.sendBtnText, { color: '#fff' }]}>Send</Text>
                    )}
                </TouchableOpacity>
            </View>
        );
    };

    return (
        <Modal
            visible={visible}
            transparent
            animationType="slide"
            onRequestClose={onClose}
        >
            <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={onClose}>
                <BlurView intensity={20} style={StyleSheet.absoluteFill} tint={isDark ? "dark" : "light"} />

                <TouchableOpacity activeOpacity={1} style={[styles.modalContent, { backgroundColor: isDark ? themeColors.bgCard : '#fff' }]}>
                    <View style={styles.header}>
                        <Text style={[styles.title, { color: isDark ? themeColors.textMain : themeColors.textMainLight }]}>Share to...</Text>
                        <TextInput
                            style={[styles.searchInput, { backgroundColor: isDark ? themeColors.bgDark : '#f0f0f0', color: isDark ? '#fff' : '#000' }]}
                            placeholder="Search"
                            placeholderTextColor={isDark ? '#888' : '#666'}
                            value={searchQuery}
                            onChangeText={setSearchQuery}
                        />
                    </View>

                    {loading ? (
                        <ActivityIndicator size="large" color={themeColors.accentPrimary} style={{ marginTop: 20 }} />
                    ) : (
                        <FlatList
                            data={filteredUsers}
                            keyExtractor={item => item.id}
                            renderItem={renderItem}
                            style={styles.list}
                            contentContainerStyle={{ paddingBottom: 20 }}
                            ListEmptyComponent={
                                <Text style={{ textAlign: 'center', marginTop: 20, color: isDark ? '#888' : '#666' }}>
                                    No followers found.
                                </Text>
                            }
                        />
                    )}
                </TouchableOpacity>
            </TouchableOpacity>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        justifyContent: 'flex-end',
        backgroundColor: 'rgba(0,0,0,0.5)',
    },
    modalContent: {
        height: '70%',
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        padding: 20,
        elevation: 10,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.1,
        shadowRadius: 10,
    },
    header: {
        marginBottom: 15,
    },
    title: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 15,
        textAlign: 'center',
    },
    searchInput: {
        height: 44,
        borderRadius: 12,
        paddingHorizontal: 15,
        fontSize: 16,
    },
    list: {
        flex: 1,
    },
    userItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 15,
    },
    userInfo: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    avatar: {
        width: 44,
        height: 44,
        borderRadius: 22,
        marginRight: 12,
    },
    name: {
        fontSize: 16,
        fontWeight: '600',
    },
    username: {
        fontSize: 14,
    },
    sendBtn: {
        paddingHorizontal: 20,
        paddingVertical: 8,
        borderRadius: 8,
    },
    sendBtnText: {
        fontSize: 14,
        fontWeight: '600',
    }
});
