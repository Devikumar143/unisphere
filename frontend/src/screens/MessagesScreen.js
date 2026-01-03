import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, FlatList, TouchableOpacity, ActivityIndicator, TextInput, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { Search, Users, MessageSquare } from 'lucide-react-native';
import { COLORS, SIZES, GLASS } from '../constants/theme';
import PremiumConversationTile from '../components/PremiumConversationTile';
import { useTheme } from '../context/ThemeContext';
import { fetchConversations } from '../services/api';
import { onUserOnline, onUserOffline, offUserOnline, offUserOffline } from '../services/socket';

const { width } = Dimensions.get('window');

export default function MessagesScreen({ user, onOpenChat }) {
    const { themeColors, isDark } = useTheme();
    const [conversations, setConversations] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadConversations();

        const handleOnline = (userId) => {
            setConversations(prev => prev.map(u => u.id === userId ? { ...u, isOnline: true } : u));
        };
        const handleOffline = (userId) => {
            setConversations(prev => prev.map(u => u.id === userId ? { ...u, isOnline: false } : u));
        };

        onUserOnline(handleOnline);
        onUserOffline(handleOffline);

        return () => {
            offUserOnline(handleOnline);
            offUserOffline(handleOffline);
        };
    }, []);

    const loadConversations = async () => {
        try {
            const data = await fetchConversations(user.id);
            setConversations(data);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const filteredConversations = conversations.filter(conv =>
        conv.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (conv.username && conv.username.toLowerCase().includes(searchQuery.toLowerCase()))
    );

    return (
        <View style={[styles.container, { backgroundColor: themeColors.bgDark }]}>
            {/* Deep Base Background */}
            <LinearGradient
                colors={isDark ? ['#050810', '#000000'] : ['#F8FAFC', '#FFFFFF']}
                style={StyleSheet.absoluteFill}
            />

            {/* Atmospheric Aura Glows (Layered Above Base) */}
            <View style={StyleSheet.absoluteFill}>
                <View style={[styles.glowCircle, { top: -50, right: -100, backgroundColor: isDark ? '#3CB2E225' : '#3CB2E210' }]} />
                <View style={[styles.glowCircle, { bottom: 50, left: -100, backgroundColor: isDark ? '#9C27B020' : '#9C27B008' }]} />
                <View style={[styles.glowCircle, { top: '40%', alignSelf: 'center', width: 400, height: 400, backgroundColor: isDark ? '#6366F110' : '#6366F105' }]} />
            </View>

            <SafeAreaView style={styles.safeArea}>
                <View style={styles.header}>
                    <View style={styles.headerTop}>
                        <Text style={[styles.headerTitle, { color: themeColors.textMain }]}>Messages</Text>
                        <TouchableOpacity style={[styles.iconBtn, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }]}>
                            <Users size={20} color={themeColors.textMain} />
                        </TouchableOpacity>
                    </View>

                    {/* Frosted Search Bar */}
                    <BlurView intensity={isDark ? 30 : 60} tint={isDark ? "dark" : "light"} style={styles.searchContainer}>
                        <Search size={18} color={themeColors.textDim} style={styles.searchIcon} />
                        <TextInput
                            placeholder="Search conversations..."
                            placeholderTextColor={themeColors.textDim}
                            style={[styles.searchInput, { color: themeColors.textMain }]}
                            value={searchQuery}
                            onChangeText={setSearchQuery}
                        />
                    </BlurView>
                </View>

                {loading ? (
                    <View style={styles.loadingContainer}>
                        <ActivityIndicator size="large" color={themeColors.accentPrimary} />
                    </View>
                ) : (
                    <FlatList
                        data={filteredConversations}
                        keyExtractor={item => item.id}
                        renderItem={({ item }) => (
                            <PremiumConversationTile
                                user={item}
                                onPress={() => onOpenChat(item)}
                            />
                        )}
                        contentContainerStyle={styles.listContent}
                        ListEmptyComponent={
                            <View style={styles.emptyContainer}>
                                <BlurView intensity={20} tint={isDark ? "dark" : "light"} style={styles.emptyIconBox}>
                                    <MessageSquare size={40} color={themeColors.textDim} opacity={0.5} />
                                </BlurView>
                                <Text style={[styles.emptyText, { color: themeColors.textMain }]}>
                                    {searchQuery ? "No matches found" : "No messages yet"}
                                </Text>
                                <Text style={[styles.emptySubtext, { color: themeColors.textDim }]}>
                                    {searchQuery ? "Try searching for someone else" : "Start a conversation from Explore"}
                                </Text>
                            </View>
                        }
                    />
                )}
            </SafeAreaView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    glowCircle: {
        position: 'absolute',
        width: 300,
        height: 300,
        borderRadius: 150,
    },
    safeArea: {
        flex: 1,
    },
    header: {
        paddingHorizontal: 24,
        paddingTop: 12,
        paddingBottom: 24,
    },
    headerTop: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
    },
    headerTitle: {
        fontSize: 34,
        fontWeight: '900',
        letterSpacing: -1,
    },
    iconBtn: {
        width: 44,
        height: 44,
        borderRadius: 22,
        justifyContent: 'center',
        alignItems: 'center',
    },
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        height: 50,
        borderRadius: 25,
        paddingHorizontal: 16,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.05)',
        overflow: 'hidden',
    },
    searchIcon: {
        marginRight: 10,
    },
    searchInput: {
        flex: 1,
        fontSize: 16,
        fontWeight: '500',
    },
    listContent: {
        paddingHorizontal: 20,
        paddingBottom: 100,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    emptyContainer: {
        alignItems: 'center',
        marginTop: 60,
    },
    emptyIconBox: {
        width: 100,
        height: 100,
        borderRadius: 50,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 20,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.05)',
        overflow: 'hidden',
    },
    emptyText: {
        fontSize: 20,
        fontWeight: '700',
        marginBottom: 8,
    },
    emptySubtext: {
        fontSize: 15,
        textAlign: 'center',
        paddingHorizontal: 40,
        lineHeight: 22,
    }
});
