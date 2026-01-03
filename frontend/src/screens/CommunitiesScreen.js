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
    // const navigation = useNavigation(); // Remove this as we use state-based nav in App.js
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
            activeOpacity={0.9}
            style={styles.cardWrapper}
            onPress={() => onOpenCommunity && onOpenCommunity(item)}
        >
            <View style={[styles.cardContainer, { backgroundColor: isDark ? 'rgba(30, 30, 46, 0.7)' : '#fff', borderColor: themeColors.border }]}>
                <View style={styles.cardContent}>
                    <View style={styles.cardTop}>
                        <View style={[styles.iconContainer, { backgroundColor: themeColors.bgDark }]}>
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
                                style={[styles.joinButton, { backgroundColor: themeColors.accentPrimary }]}
                                onPress={() => handleJoin(item.id)}
                            >
                                <Text style={styles.joinButtonText}>Join</Text>
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
                        <View style={[styles.categoryPill, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#f0f0f0' }]}>
                            <Text style={[styles.categoryText, { color: themeColors.textDim }]}>{item.category || 'General'}</Text>
                        </View>

                        <AvatarPile members={item.member_previews} />
                    </View>
                </View>
            </View>
        </TouchableOpacity>
    );

    return (
        <View style={[styles.container, { backgroundColor: themeColors.bgDark }]}>
            {/* Aura Effect */}
            <Animated.View style={[
                styles.auraContainer,
                {
                    opacity: auraAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0.3, 0.6]
                    }),
                    transform: [{
                        scale: auraAnim.interpolate({
                            inputRange: [0, 1],
                            outputRange: [1, 1.2]
                        })
                    }]
                }
            ]}>
                <LinearGradient
                    colors={[themeColors.accentPrimary + '30', 'transparent']}
                    style={styles.aura}
                />
            </Animated.View>

            <SafeAreaView style={styles.safeArea}>
                <View style={styles.header}>
                    <View>
                        <Text style={[styles.headerTitle, { color: themeColors.textMain }]}>Communities</Text>
                        <Text style={[styles.headerSubtitle, { color: themeColors.textDim }]}>Discover your tribe</Text>
                    </View>
                    <TouchableOpacity
                        style={[styles.createBtn, { backgroundColor: themeColors.accentPrimary }]}
                        onPress={() => onCreateCommunity && onCreateCommunity()}
                    >
                        <Plus color="white" size={24} />
                    </TouchableOpacity>
                </View>

                <View style={styles.searchContainer}>
                    <BlurView intensity={isDark ? 20 : 40} tint={isDark ? "dark" : "light"} style={styles.searchBar}>
                        <Search color={themeColors.textDim} size={20} />
                        <TextInput
                            style={[styles.searchInput, { color: themeColors.textMain }]}
                            placeholder="Find a club, group or course..."
                            placeholderTextColor={themeColors.textDim}
                            value={searchQuery}
                            onChangeText={setSearchQuery}
                        />
                    </BlurView>
                </View>

                {loading ? (
                    <ActivityIndicator size="large" color={themeColors.accentPrimary} style={{ marginTop: 20 }} />
                ) : (
                    <FlatList
                        data={filteredCommunities}
                        renderItem={renderItem}
                        keyExtractor={item => item.id}
                        contentContainerStyle={styles.listContent}
                        refreshControl={
                            <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadCommunities(); }} />
                        }
                        ListEmptyComponent={
                            <View style={styles.emptyContainer}>
                                <Grid color={themeColors.textDim} size={48} />
                                <Text style={[styles.emptyText, { color: themeColors.textDim }]}>No communities found.</Text>
                                <TouchableOpacity onPress={onCreateCommunity}>
                                    <Text style={{ color: themeColors.accentPrimary, marginTop: 10 }}>Create one?</Text>
                                </TouchableOpacity>
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
    safeArea: {
        flex: 1,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: SIZES.padding,
        paddingVertical: 10,
    },
    headerTitle: {
        fontSize: 32,
        fontWeight: '900',
        letterSpacing: -0.5,
    },
    headerSubtitle: {
        fontSize: 16,
        fontWeight: '500',
        marginTop: -2,
    },
    createBtn: {
        width: 48,
        height: 48,
        borderRadius: 24,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 4,
    },
    searchContainer: {
        paddingHorizontal: SIZES.padding,
        marginBottom: 16,
    },
    searchBar: {
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: 16,
        paddingHorizontal: 16,
        height: 52,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
    },
    searchInput: {
        flex: 1,
        marginLeft: 12,
        fontSize: 16,
        fontWeight: '500',
    },
    listContent: {
        padding: SIZES.padding,
        paddingTop: 8,
        paddingBottom: 120,
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
        fontWeight: '700',
        marginBottom: 4,
    },
    memberCount: {
        fontSize: 13,
        fontWeight: '500',
    },
    joinButton: {
        paddingHorizontal: 16,
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
        borderRadius: 12,
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
    },
    categoryPill: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 8,
    },
    categoryText: {
        fontSize: 11,
        fontWeight: '600',
        opacity: 0.8,
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
    auraContainer: {
        position: 'absolute',
        top: -100,
        right: -100,
        width: 400,
        height: 400,
        zIndex: 0,
    },
    aura: {
        width: '100%',
        height: '100%',
        borderRadius: 200,
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
        marginTop: 16,
        marginBottom: 8,
    },
});
