import React, { useState, useCallback } from 'react';
import { StyleSheet, View, Text, FlatList, TouchableOpacity, Image, RefreshControl, ActivityIndicator, TextInput, Animated } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../context/ThemeContext';
import { COLORS, SIZES } from '../constants/theme';
import { Search, Plus, Grid } from 'lucide-react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { fetchCommunities, joinCommunity } from '../services/api';
import { BlurView } from 'expo-blur';

export default function CommunitiesScreen({ user, onOpenCommunity, onCreateCommunity }) {
    const { isDark, themeColors } = useTheme();
    const [communities, setCommunities] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [auraAnim] = useState(new Animated.Value(0));

    React.useEffect(() => {
        Animated.loop(
            Animated.sequence([
                Animated.timing(auraAnim, {
                    toValue: 1,
                    duration: 4000,
                    useNativeDriver: true,
                }),
                Animated.timing(auraAnim, {
                    toValue: 0,
                    duration: 4000,
                    useNativeDriver: true,
                }),
            ])
        ).start();
    }, []);

    const loadCommunities = async () => {
        try {
            const data = await fetchCommunities(user?.id);
            setCommunities(data);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useFocusEffect(
        useCallback(() => {
            loadCommunities();
        }, [])
    );

    const handleJoin = async (communityId) => {
        try {
            await joinCommunity(communityId, user.id);
            // Optimistic update
            setCommunities(prev => prev.map(c =>
                c.id === communityId ? { ...c, is_member: true, member_count: parseInt(c.member_count) + 1 } : c
            ));
        } catch (error) {
            console.error('Failed to join', error);
        }
    };

    const filteredCommunities = communities.filter(c =>
        c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (c.description && c.description.toLowerCase().includes(searchQuery.toLowerCase()))
    );

    const AvatarPile = ({ members = [] }) => {
        if (!members || members.length === 0) return null;
        return (
            <View style={styles.avatarPile}>
                {members.slice(0, 4).map((member, index) => (
                    <View key={member.id} style={[styles.pileAvatarWrapper, { marginLeft: index === 0 ? 0 : -10, zIndex: 10 - index }]}>
                        <Image
                            source={{ uri: member.avatar || 'https://via.placeholder.com/100' }}
                            style={[styles.pileAvatar, { borderColor: isDark ? '#1a1d2e' : '#fff' }]}
                        />
                    </View>
                ))}
                {members.length > 4 && (
                    <View style={[styles.pileAvatarWrapper, styles.moreBadge, { marginLeft: -10, backgroundColor: themeColors.accentPrimary }]}>
                        <Text style={styles.moreText}>+{members.length - 4}</Text>
                    </View>
                )}
            </View>
        );
    };

    const renderItem = ({ item }) => (
        <TouchableOpacity
            activeOpacity={0.7}
            style={styles.cardWrapper}
            onPress={() => onOpenCommunity && onOpenCommunity(item)}
        >
            <View style={[styles.cardContainer, { backgroundColor: isDark ? 'rgba(36, 47, 45, 0.85)' : '#fff', borderColor: isDark ? 'rgba(255,255,255,0.12)' : '#E0E0E0' }]}>
                <View style={styles.cardContent}>
                    <View style={styles.cardTop}>
                        <View style={[styles.iconContainer, { backgroundColor: isDark ? '#2A3B38' : '#F0F0F0' }]}>
                            {item.icon ? (
                                <Image source={{ uri: item.icon }} style={styles.icon} />
                            ) : (
                                <Text style={{ fontSize: 24 }}>{item.icon || '🚀'}</Text>
                            )}
                        </View>

                        <View style={styles.infoContainer}>
                            <Text style={[styles.title, { color: themeColors.textMain }]}>{item.name}</Text>
                            <Text style={[styles.memberCount, { color: themeColors.textDim }]}>
                                {item.member_count} {item.member_count == 1 ? 'member' : 'members'}
                            </Text>
                        </View>

                        {item.is_member ? (
                            <View style={[styles.statusBadge, { backgroundColor: themeColors.accentPrimary + '15', borderColor: themeColors.accentPrimary + '30' }]}>
                                <Text style={[styles.statusText, { color: themeColors.accentPrimary }]}>JOINED</Text>
                            </View>
                        ) : (
                            <TouchableOpacity
                                activeOpacity={0.8}
                                onPress={() => handleJoin(item.id)}
                            >
                                <LinearGradient
                                    colors={[themeColors.accentPrimary, themeColors.terracotta]}
                                    start={{ x: 0, y: 0 }}
                                    end={{ x: 1, y: 1 }}
                                    style={styles.joinButton}
                                >
                                    <Text style={styles.joinButtonText}>Join</Text>
                                </LinearGradient>
                            </TouchableOpacity>
                        )}
                    </View>

                    {item.description ? (
                        <Text numberOfLines={2} style={[styles.description, { color: themeColors.textMuted }]}>
                            {item.description}
                        </Text>
                    ) : (
                        <View style={{ height: 16 }} />
                    )}

                    <View style={styles.cardBottom}>
                        <View style={[styles.categoryPill, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#f0f0f0', borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'transparent' }]}>
                            <Text style={[styles.categoryText, { color: themeColors.textDim }]}>{item.category || 'General'}</Text>
                        </View>

                        <AvatarPile members={item.member_previews} />
                    </View>
                </View>
            </View>
        </TouchableOpacity>
    );

    return (
        <View style={[styles.container, { backgroundColor: isDark ? themeColors.bgDark : themeColors.bgLight }]}>
            {/* Background Aura removed for clean look */}

            {/* Floating Glass Header */}
            <View style={styles.headerWrapper}>
                <SafeAreaView edges={['top']}>
                    <View style={styles.headerContainer}>
                        <BlurView intensity={isDark ? 30 : 50} tint={isDark ? "dark" : "light"} style={styles.headerGlass}>
                            <View style={styles.headerContent}>
                                <Text style={[styles.headerTitle, { color: isDark ? themeColors.textMain : themeColors.textMainLight }]}>Communities</Text>
                                <TouchableOpacity
                                    style={[styles.createBtn, { backgroundColor: themeColors.accentPrimary }]}
                                    onPress={() => onCreateCommunity && onCreateCommunity()}
                                >
                                    <Plus color="white" size={24} />
                                </TouchableOpacity>
                            </View>
                        </BlurView>
                    </View>

                    {/* Floating Search Pill */}
                    <View style={styles.searchWrapper}>
                        <BlurView intensity={isDark ? 20 : 40} tint={isDark ? "dark" : "light"} style={[styles.searchBar, { borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' }]}>
                            <Search color={isDark ? themeColors.textDim : themeColors.textDimLight} size={20} />
                            <TextInput
                                style={[styles.searchInput, { color: isDark ? themeColors.textMain : themeColors.textMainLight }]}
                                placeholder="Find a club, group or course..."
                                placeholderTextColor={isDark ? themeColors.textMuted : themeColors.textMutedLight}
                                value={searchQuery}
                                onChangeText={setSearchQuery}
                            />
                        </BlurView>
                    </View>
                </SafeAreaView>
            </View>

            {loading ? (
                <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                    <ActivityIndicator size="large" color={themeColors.accentPrimary} />
                </View>
            ) : (
                <FlatList
                    data={filteredCommunities}
                    renderItem={renderItem}
                    keyExtractor={item => item.id}
                    contentContainerStyle={[styles.listContent, { paddingTop: 180 }]}
                    showsVerticalScrollIndicator={false}
                    refreshControl={
                        <RefreshControl
                            refreshing={refreshing}
                            onRefresh={() => { setRefreshing(true); loadCommunities(); }}
                            tintColor={themeColors.accentPrimary}
                            progressViewOffset={180}
                        />
                    }
                    ListEmptyComponent={
                        <View style={styles.emptyContainer}>
                            <Grid color={isDark ? themeColors.textDim : themeColors.textDimLight} size={48} />
                            <Text style={[styles.emptyText, { color: isDark ? themeColors.textDim : themeColors.textDimLight }]}>No communities found.</Text>
                            <TouchableOpacity onPress={onCreateCommunity}>
                                <Text style={{ color: themeColors.accentPrimary, marginTop: 10, fontWeight: '700' }}>Create one?</Text>
                            </TouchableOpacity>
                        </View>
                    }
                />
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    headerWrapper: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 100,
    },
    headerContainer: {
        paddingHorizontal: 16,
        paddingTop: 10,
        paddingBottom: 10,
    },
    headerGlass: {
        borderRadius: 30,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.08)',
    },
    headerContent: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 12,
    },
    headerTitle: {
        fontSize: 22,
        fontWeight: '900',
        fontFamily: 'PlayfairDisplay-Bold',
        letterSpacing: -0.5,
    },
    createBtn: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
    },
    searchWrapper: {
        paddingHorizontal: 16,
        paddingBottom: 10,
    },
    searchBar: {
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: 25,
        paddingHorizontal: 20,
        height: 50,
        overflow: 'hidden',
        borderWidth: 1,
        backgroundColor: 'rgba(255,255,255,0.03)',
    },
    searchInput: {
        flex: 1,
        marginLeft: 12,
        fontSize: 15,
        fontWeight: '500',
    },
    listContent: {
        paddingHorizontal: 16,
        paddingBottom: 100,
    },
    cardWrapper: {
        marginBottom: 16,
        borderRadius: 24,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
        elevation: 4,
    },
    cardContainer: {
        borderRadius: 24,
        borderWidth: 1,
        overflow: 'hidden',
    },
    cardContent: {
        padding: 20,
    },
    cardTop: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
    },
    iconContainer: {
        width: 56,
        height: 56,
        borderRadius: 18,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 16,
    },
    icon: {
        width: '100%',
        height: '100%',
        borderRadius: 18,
    },
    infoContainer: {
        flex: 1,
        justifyContent: 'center',
    },
    title: {
        fontSize: 18,
        fontWeight: '800',
        marginBottom: 4,
        letterSpacing: -0.3,
    },
    memberCount: {
        fontSize: 12,
        fontWeight: '600',
    },
    joinButton: {
        paddingHorizontal: 18,
        paddingVertical: 8,
        borderRadius: 20,
    },
    joinButtonText: {
        color: '#fff',
        fontWeight: '700',
        fontSize: 13,
    },
    statusBadge: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 16,
        borderWidth: 1,
    },
    statusText: {
        fontSize: 10,
        fontWeight: '800',
        letterSpacing: 0.5,
    },
    description: {
        fontSize: 14,
        lineHeight: 20,
        marginBottom: 16,
    },
    cardBottom: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingTop: 16,
        borderTopWidth: 1,
        borderTopColor: 'rgba(255,255,255,0.05)',
    },
    categoryPill: {
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 10,
        borderWidth: 1,
    },
    categoryText: {
        fontSize: 11,
        fontWeight: '600',
    },
    avatarPile: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    pileAvatarWrapper: {
        width: 28,
        height: 28,
        borderRadius: 14,
        borderWidth: 2,
    },
    pileAvatar: {
        width: '100%',
        height: '100%',
        borderRadius: 12,
    },
    moreBadge: {
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: 'transparent',
    },
    moreText: {
        color: 'white',
        fontSize: 10,
        fontWeight: '900',
    },
    emptyContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        padding: 40,
        marginTop: 60,
        opacity: 0.8,
    },
    emptyText: {
        fontSize: 16,
        fontWeight: '600',
        marginTop: 20,
        marginBottom: 10,
    },
});
