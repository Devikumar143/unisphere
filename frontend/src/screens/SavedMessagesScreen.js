import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, FlatList, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { ArrowLeft, Bookmark, Trash2, MessageSquare } from 'lucide-react-native';
import { COLORS, SIZES } from '../constants/theme';
import { useTheme } from '../context/ThemeContext';
import { fetchSavedMessages, unsaveMessage } from '../services/api';

export default function SavedMessagesScreen({ user, onBack }) {
    const { themeColors, isDark } = useTheme();
    const [messages, setMessages] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadSavedMessages();
    }, []);

    const loadSavedMessages = async () => {
        try {
            const data = await fetchSavedMessages(user.id);
            setMessages(data);
        } catch (error) {
            console.error('Failed to load saved messages', error);
            Alert.alert('Error', 'Failed to load saved messages');
        } finally {
            setLoading(false);
        }
    };

    const handleUnsave = async (messageId) => {
        try {
            await unsaveMessage(messageId, user.id);
            setMessages(prev => prev.filter(m => m.id !== messageId));
        } catch (error) {
            Alert.alert('Error', 'Failed to remove from saved');
        }
    };

    const renderItem = ({ item }) => {
        const isMe = item.sender_id === user.id;

        return (
            <View style={[styles.messageCard, { backgroundColor: themeColors.bgCard, borderColor: themeColors.border }]}>
                <View style={styles.messageHeader}>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <View style={[styles.avatarPlaceholder, { backgroundColor: themeColors.accentSecondary }]}>
                            <Text style={{ color: '#FFF', fontWeight: 'bold' }}>
                                {item.sender_name ? item.sender_name[0].toUpperCase() : '?'}
                            </Text>
                        </View>
                        <View style={{ marginLeft: 10 }}>
                            <Text style={[styles.senderName, { color: themeColors.textMain }]}>
                                {isMe ? 'You' : item.sender_name}
                            </Text>
                            <Text style={[styles.timestamp, { color: themeColors.textDim }]}>
                                {new Date(item.created_at).toLocaleDateString()} • {new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </Text>
                        </View>
                    </View>
                    <TouchableOpacity onPress={() => handleUnsave(item.message_id || item.id)}>
                        <Trash2 size={20} color={themeColors.textDim} />
                    </TouchableOpacity>
                </View>

                <View style={[styles.contentBox, { backgroundColor: themeColors.bgLight }]}>
                    {item.message_type === 'voice' ? (
                        <Text style={{ color: themeColors.textMain, fontStyle: 'italic' }}>🎤 Voice Message</Text>
                    ) : (
                        <Text style={[styles.messageContent, { color: themeColors.textMain }]}>
                            {item.content}
                        </Text>
                    )}
                </View>
            </View>
        );
    };

    return (
        <View style={[styles.container, { backgroundColor: themeColors.bgDark }]}>
            <LinearGradient
                colors={[themeColors.bgDark, isDark ? '#050511' : '#F1F5F9']}
                style={StyleSheet.absoluteFill}
            />

            <SafeAreaView edges={['top']} style={{ borderBottomWidth: 1, borderBottomColor: themeColors.border }}>
                <View style={styles.header}>
                    <TouchableOpacity onPress={onBack} style={styles.backBtn}>
                        <ArrowLeft color={themeColors.textMain} size={24} />
                    </TouchableOpacity>
                    <Text style={[styles.headerTitle, { color: themeColors.textMain }]}>Saved Messages</Text>
                    <View style={{ width: 40 }} />
                </View>
            </SafeAreaView>

            <FlatList
                data={messages}
                keyExtractor={item => (item.id || item.message_id).toString()}
                renderItem={renderItem}
                contentContainerStyle={styles.listContent}
                ListEmptyComponent={
                    !loading && (
                        <View style={styles.emptyContainer}>
                            <Bookmark size={48} color={themeColors.textDim} />
                            <Text style={[styles.emptyText, { color: themeColors.textDim }]}>
                                No saved messages yet
                            </Text>
                        </View>
                    )
                }
            />
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
        fontWeight: 'bold',
    },
    listContent: {
        padding: 16,
    },
    messageCard: {
        borderRadius: 16,
        padding: 16,
        marginBottom: 16,
        borderWidth: 1,
    },
    messageHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    avatarPlaceholder: {
        width: 36,
        height: 36,
        borderRadius: 18,
        justifyContent: 'center',
        alignItems: 'center',
    },
    senderName: {
        fontWeight: 'bold',
        fontSize: 14,
    },
    timestamp: {
        fontSize: 12,
    },
    contentBox: {
        padding: 12,
        borderRadius: 12,
    },
    messageContent: {
        fontSize: 15,
        lineHeight: 22,
    },
    emptyContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 100,
        opacity: 0.5,
    },
    emptyText: {
        marginTop: 16,
        fontSize: 16,
    }
});
