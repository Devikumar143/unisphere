import React, { useState, useEffect, useCallback } from 'react';
import { StyleSheet, View, Text, TextInput, FlatList, ActivityIndicator, TouchableOpacity, ScrollView, Dimensions, Image, Animated } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { Search, X, TrendingUp, Sparkles, Filter, Map } from 'lucide-react-native';
import { COLORS, SIZES, GLASS } from '../constants/theme';
import { searchUsers, fetchCommunities } from '../services/api';
import UserListItem from '../components/UserListItem';
import DiscoverTile from '../components/DiscoverTile';
import { onUserOnline, onUserOffline, offUserOnline, offUserOffline } from '../services/socket';
import { useTheme } from '../context/ThemeContext';

const { width } = Dimensions.get('window');

export default function ExploreScreen({ onOpenChat, onViewProfile, onOpenCommunity, onOpenMap }) {
    const { isDark, themeColors } = useTheme();
    const [query, setQuery] = useState('');
    const [results, setResults] = useState([]);
    const [communities, setCommunities] = useState([]);
    const [loading, setLoading] = useState(false);
    const [initialLoading, setInitialLoading] = useState(true);
    const [selectedFilter, setSelectedFilter] = useState('All'); // ['All', 'People', 'Communities']
    const [communityResults, setCommunityResults] = useState([]);
    const [fadeAnim] = useState(new Animated.Value(0));

    useEffect(() => {
        if (!loading && (results.length > 0 || communityResults.length > 0)) {
            fadeAnim.setValue(0);
            Animated.spring(fadeAnim, {
                toValue: 1,
                tension: 50,
                friction: 8,
                useNativeDriver: true,
            }).start();
        }
    }, [loading, results, communityResults]);

    useEffect(() => {
        loadDiscoverData();

        const handleOnline = (userId) => {
            setResults(prev => prev.map(u => u.id === userId ? { ...u, isOnline: true } : u));
        };
        const handleOffline = (userId) => {
            setResults(prev => prev.map(u => u.id === userId ? { ...u, isOnline: false } : u));
        };

        onUserOnline(handleOnline);
        onUserOffline(handleOffline);

        return () => {
            offUserOnline(handleOnline);
            offUserOffline(handleOffline);
        };
    }, []);

    const loadDiscoverData = async () => {
        try {
            const communityData = await fetchCommunities();
            setCommunities(communityData || []);
        } catch (error) {
            console.error('Error loading discover data:', error);
        } finally {
            setInitialLoading(false);
        }
    };

    // Unified search logic with filters
    const handleSearch = async (text, filter = selectedFilter) => {
        if (!text.trim()) {
            setResults([]);
            setCommunityResults([]);
            return;
        }

        setLoading(true);
        try {
            const promises = [];
            if (filter === 'All' || filter === 'People') {
                promises.push(searchUsers(text));
            } else {
                promises.push(Promise.resolve([]));
            }

            if (filter === 'All' || filter === 'Communities') {
                promises.push(fetchCommunities('', text));
            } else {
                promises.push(Promise.resolve([]));
            }

            const [userData, communityData] = await Promise.all(promises);
            setResults(userData || []);
            setCommunityResults(communityData || []);
        } catch (error) {
            console.error('Search Error:', error);
        } finally {
            setLoading(false);
        }
    };

    // Debounce search
    useEffect(() => {
        const timer = setTimeout(() => {
            handleSearch(query, selectedFilter);
        }, 400);

        return () => clearTimeout(timer);
    }, [query, selectedFilter]);

    const clearSearch = () => {
        setQuery('');
        setResults([]);
        setCommunityResults([]);
    };

    const renderDiscoverGrid = () => {
        // Simple masonry implementation with two columns
        const leftCol = [];
        const rightCol = [];
        communities.forEach((item, index) => {
            if (index % 2 === 0) leftCol.push(item);
            else rightCol.push(item);
        });

        return (
            <View style={styles.gridContainer}>
                <View style={styles.gridColumn}>
                    {leftCol.map(item => (
                        <DiscoverTile
                            key={item.id}
                            item={item}
                            onPress={() => onOpenCommunity && onOpenCommunity(item)}
                        />
                    ))}
                </View>
                <View style={styles.gridColumn}>
                    {rightCol.map(item => (
                        <DiscoverTile
                            key={item.id}
                            item={item}
                            onPress={() => onOpenCommunity && onOpenCommunity(item)}
                        />
                    ))}
                </View>
            </View>
        );
    };

    return (
        <View style={[styles.container, { backgroundColor: isDark ? themeColors.bgDark : themeColors.bgLight }]}>
            {/* Background Glows removed for Organic Earth style */}

            <SafeAreaView edges={['top']} style={styles.safeArea}>
                <ScrollView
                    stickyHeaderIndices={[1]}
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={styles.scrollContent}
                >
                    {/* Header Section */}
                    <View style={styles.header}>
                        <BlurView intensity={20} tint={isDark ? "dark" : "light"} style={styles.headerPill}>
                            <View style={styles.headerContent}>
                                <View>
                                    <Text style={[styles.headerTitle, {
                                        color: isDark ? themeColors.textMain : themeColors.textMainLight,
                                        fontFamily: 'PlayfairDisplay-Bold'
                                    }]}>Discover</Text>
                                    <Text style={[styles.headerSubtitle, { color: isDark ? themeColors.textMuted : themeColors.textMutedLight }]}>Explore UniSphere</Text>
                                </View>
                                <View style={styles.headerActions}>
                                    <TouchableOpacity
                                        onPress={onOpenMap}
                                        style={[styles.miniIconBtn, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)' }]}
                                    >
                                        <Map color={themeColors.accentPrimary} size={18} />
                                    </TouchableOpacity>
                                    <TouchableOpacity style={[styles.miniIconBtn, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)' }]}>
                                        <Sparkles color={themeColors.accentPrimary} size={18} />
                                    </TouchableOpacity>
                                </View>
                            </View>
                        </BlurView>
                    </View>

                    {/* Search Bar (Sticky) */}
                    <View style={styles.searchWrapper}>
                        <BlurView intensity={30} tint={isDark ? "dark" : "light"} style={styles.searchPill}>
                            <Search color={isDark ? themeColors.textMuted : themeColors.textMutedLight} size={20} />
                            <TextInput
                                style={[styles.input, { color: isDark ? themeColors.textMain : themeColors.textMainLight }]}
                                placeholder="Search UniSphere..."
                                placeholderTextColor={isDark ? themeColors.textMuted : themeColors.textMutedLight}
                                value={query}
                                onChangeText={setQuery}
                                autoCapitalize="none"
                            />
                            {query.length > 0 ? (
                                <TouchableOpacity onPress={clearSearch}>
                                    <X color={isDark ? themeColors.textMuted : themeColors.textMutedLight} size={20} />
                                </TouchableOpacity>
                            ) : (
                                <TouchableOpacity>
                                    <Filter color={isDark ? themeColors.textMuted : themeColors.textMutedLight} size={18} />
                                </TouchableOpacity>
                            )}
                        </BlurView>

                        {/* Filter Tabs */}
                        <ScrollView
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            contentContainerStyle={styles.filterScroll}
                            style={styles.filterContainer}
                        >
                            {['All', 'People', 'Communities'].map((filter) => (
                                <TouchableOpacity
                                    key={filter}
                                    onPress={() => setSelectedFilter(filter)}
                                    activeOpacity={0.7}
                                >
                                    <BlurView
                                        intensity={selectedFilter === filter ? 60 : 20}
                                        tint={isDark ? "dark" : "light"}
                                        style={[
                                            styles.filterPill,
                                            selectedFilter === filter && { backgroundColor: themeColors.accentPrimary + '40' }
                                        ]}
                                    >
                                        <Text style={[
                                            styles.filterText,
                                            { color: selectedFilter === filter ? themeColors.accentPrimary : (isDark ? themeColors.textMuted : themeColors.textMutedLight) }
                                        ]}>
                                            {filter}
                                        </Text>
                                    </BlurView>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                    </View>

                    {/* Main Content Area */}
                    {query.trim() ? (
                        // Search Results List
                        <Animated.View style={[
                            styles.resultsContainer,
                            {
                                opacity: fadeAnim,
                                transform: [{
                                    translateY: fadeAnim.interpolate({
                                        inputRange: [0, 1],
                                        outputRange: [15, 0]
                                    })
                                }]
                            }
                        ]}>
                            {loading ? (
                                <ActivityIndicator size="small" color={themeColors.accentPrimary} style={{ marginTop: 40 }} />
                            ) : (
                                <>
                                    {communityResults.length > 0 && (
                                        <View style={styles.resultSection}>
                                            <Text style={[styles.resultSectionTitle, { color: isDark ? themeColors.textDim : themeColors.textDimLight }]}>COMMUNITIES ({communityResults.length})</Text>
                                            {communityResults.map(item => (
                                                <TouchableOpacity
                                                    key={`res-comm-${item.id}`}
                                                    onPress={() => onOpenCommunity && onOpenCommunity(item)}
                                                    style={styles.communityResultCard}
                                                >
                                                    <View style={[styles.communityResultInner, {
                                                        backgroundColor: isDark ? themeColors.bgCard : themeColors.bgCardLight,
                                                        borderColor: themeColors.accentPrimary + '10'
                                                    }]}>
                                                        <Image source={{ uri: item.icon || `https://picsum.photos/seed/${item.id}/100` }} style={styles.communityResultIcon} />
                                                        <View style={styles.communityResultInfo}>
                                                            <Text style={[styles.communityResultName, { color: isDark ? themeColors.textMain : themeColors.textMainLight }]}>{item.name}</Text>
                                                            <Text style={[styles.communityResultMeta, { color: isDark ? themeColors.textMuted : themeColors.textMutedLight }]}>{item.member_count} members • {item.type}</Text>
                                                        </View>
                                                        <TouchableOpacity style={[styles.joinBtnSmall, { backgroundColor: themeColors.accentPrimary }]}>
                                                            <Text style={styles.joinBtnText}>Join</Text>
                                                        </TouchableOpacity>
                                                    </View>
                                                </TouchableOpacity>
                                            ))}
                                        </View>
                                    )}

                                    {results.length > 0 && (
                                        <View style={styles.resultSection}>
                                            <Text style={[styles.resultSectionTitle, { color: isDark ? themeColors.textDim : themeColors.textDimLight }]}>PEOPLE ({results.length})</Text>
                                            {results.map(item => (
                                                <UserListItem
                                                    key={`res-user-${item.id}`}
                                                    user={item}
                                                    onPress={() => onViewProfile && onViewProfile(item)}
                                                />
                                            ))}
                                        </View>
                                    )}

                                    {results.length === 0 && communityResults.length === 0 && !loading && (
                                        <View style={styles.emptyContainer}>
                                            <Text style={[styles.emptyText, { color: isDark ? themeColors.textDim : themeColors.textDimLight }]}>No results for "{query}" in {selectedFilter}</Text>
                                        </View>
                                    )}
                                </>
                            )}
                        </Animated.View>
                    ) : (
                        // Discover Feed
                        <View style={styles.discoverFeed}>
                            {initialLoading ? (
                                <View style={{ height: 400, justifyContent: 'center' }}>
                                    <ActivityIndicator size="small" color={themeColors.accentPrimary} />
                                </View>
                            ) : (
                                <>
                                    {/* Trending Section */}
                                    <View style={styles.sectionHeader}>
                                        <TrendingUp size={18} color={themeColors.accentPrimary} />
                                        <Text style={[styles.sectionTitle, { color: isDark ? themeColors.textMain : themeColors.textMainLight }]}>Trending Communities</Text>
                                    </View>

                                    <FlatList
                                        horizontal
                                        data={communities.slice(0, 5)}
                                        keyExtractor={item => `trending-${item.id}`}
                                        renderItem={({ item }) => (
                                            <TouchableOpacity
                                                style={styles.trendingCard}
                                                onPress={() => onOpenCommunity && onOpenCommunity(item)}
                                            >
                                                <Image source={{ uri: item.cover_image || `https://picsum.photos/seed/${item.id}/400/200` }} style={styles.trendingImage} />
                                                <View style={styles.trendingOverlay}>
                                                    <LinearGradient colors={['transparent', 'rgba(0,0,0,0.8)']} style={StyleSheet.absoluteFill} />
                                                    <Text style={styles.trendingTitle} numberOfLines={1}>{item.name}</Text>
                                                    <Text style={styles.trendingMeta}>{item.member_count || '0'} members</Text>
                                                </View>
                                            </TouchableOpacity>
                                        )}
                                        showsHorizontalScrollIndicator={false}
                                        contentContainerStyle={styles.trendingList}
                                    />

                                    {/* Masonry Discover Grid */}
                                    <View style={styles.sectionHeader}>
                                        <Sparkles size={18} color={themeColors.accentPrimary} />
                                        <Text style={[styles.sectionTitle, { color: isDark ? themeColors.textMain : themeColors.textMainLight }]}>Suggested For You</Text>
                                    </View>
                                    {renderDiscoverGrid()}
                                </>
                            )}
                        </View>
                    )}
                </ScrollView>
            </SafeAreaView>
        </View>
    );
}

const COLUMN_WIDTH = (width - 48) / 2;

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    safeArea: {
        flex: 1,
    },
    scrollContent: {
        paddingBottom: 100,
    },
    glowCircle: {
        position: 'absolute',
        width: 300,
        height: 300,
        borderRadius: 150,
        opacity: 0.5,
    },
    header: {
        paddingHorizontal: 20,
        paddingTop: 16,
        paddingBottom: 8,
    },
    headerPill: {
        borderRadius: 24,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
        padding: 12,
        paddingHorizontal: 16,
    },
    headerContent: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    headerActions: {
        flexDirection: 'row',
        gap: 8,
    },
    headerTitle: {
        fontSize: 22,
        fontWeight: '900',
        letterSpacing: -0.5,
    },
    headerSubtitle: {
        fontSize: 12,
        fontWeight: '600',
        opacity: 0.6,
        marginTop: -2,
    },
    miniIconBtn: {
        width: 36,
        height: 36,
        borderRadius: 18,
        justifyContent: 'center',
        alignItems: 'center',
    },
    searchWrapper: {
        paddingHorizontal: 20,
        paddingVertical: 12,
        zIndex: 100,
    },
    searchPill: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderRadius: 24,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.15)',
    },
    input: {
        flex: 1,
        marginLeft: 12,
        fontSize: 15,
        fontWeight: '600',
    },
    resultsContainer: {
        paddingHorizontal: 20,
        paddingTop: 10,
    },
    discoverFeed: {
        paddingTop: 10,
    },
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 24,
        marginBottom: 16,
        marginTop: 10,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '900',
        marginLeft: 10,
        letterSpacing: -0.5,
    },
    trendingList: {
        paddingLeft: 24,
        paddingRight: 10,
        marginBottom: 24,
    },
    trendingCard: {
        width: 240,
        height: 140,
        borderRadius: 24,
        marginRight: 14,
        overflow: 'hidden',
        backgroundColor: '#1A1A1A',
    },
    trendingImage: {
        width: '100%',
        height: '100%',
    },
    trendingOverlay: {
        ...StyleSheet.absoluteFillObject,
        justifyContent: 'flex-end',
        padding: 16,
    },
    trendingTitle: {
        color: '#FFF',
        fontSize: 16,
        fontWeight: '900',
    },
    trendingMeta: {
        color: 'rgba(255,255,255,0.7)',
        fontSize: 12,
        fontWeight: '600',
        marginTop: 2,
    },
    gridContainer: {
        flexDirection: 'row',
        paddingHorizontal: 16,
        gap: 16,
    },
    gridColumn: {
        flex: 1,
    },
    emptyContainer: {
        alignItems: 'center',
        marginTop: 100,
    },
    emptyText: {
        fontSize: 16,
        fontWeight: '600',
        opacity: 0.5,
    },
    filterContainer: {
        marginTop: 12,
    },
    filterScroll: {
        paddingHorizontal: 0,
        gap: 10,
    },
    filterPill: {
        paddingHorizontal: 18,
        paddingVertical: 8,
        borderRadius: 20,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
    },
    filterText: {
        fontSize: 13,
        fontWeight: '800',
    },
    resultSection: {
        marginBottom: 24,
    },
    resultSectionTitle: {
        fontSize: 12,
        fontWeight: '900',
        letterSpacing: 1.5,
        marginBottom: 16,
        paddingHorizontal: 4,
    },
    communityResultCard: {
        marginBottom: 12,
        borderRadius: 20,
        overflow: 'hidden',
    },
    communityResultInner: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.05)',
    },
    communityResultIcon: {
        width: 50,
        height: 50,
        borderRadius: 15,
        backgroundColor: '#1A1A1A',
    },
    communityResultInfo: {
        flex: 1,
        marginLeft: 14,
    },
    communityResultName: {
        fontSize: 16,
        fontWeight: '700',
    },
    communityResultMeta: {
        fontSize: 13,
        marginTop: 2,
    },
    joinBtnSmall: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 12,
        backgroundColor: 'rgba(255,255,255,0.1)',
    },
    joinBtnText: {
        color: '#FFF',
        fontSize: 13,
        fontWeight: '700',
    }
});
