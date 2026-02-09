import React from 'react';
import { StyleSheet, View, Text, TouchableOpacity, ScrollView, Platform } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { ArrowLeft } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import PostCard from '../components/PostCard';
import ReelItem from '../components/ReelItem';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';

export default function SinglePostScreen({ post, onBack }) {
    const { isDark, themeColors } = useTheme();
    // Default to 0 if not in a tab context, though usually safe
    let bottomTabHeight = 0;
    try {
        bottomTabHeight = useBottomTabBarHeight();
    } catch (e) {
        // Ignore if not inside tab navigator
    }

    if (!post) {
        return (
            <View style={[styles.container, { backgroundColor: isDark ? themeColors.bgMain : themeColors.bgMainLight, justifyContent: 'center', alignItems: 'center' }]}>
                <Text style={{ color: isDark ? themeColors.textMuted : themeColors.textMutedLight }}>Post not found</Text>
                <TouchableOpacity onPress={onBack} style={{ marginTop: 20, padding: 10 }}>
                    <Text style={{ color: themeColors.accentPrimary }}>Go Back</Text>
                </TouchableOpacity>
            </View>
        );
    }

    const isReel = post.contentType === 'Reel' || post.video; // Check for video or explicit type

    return (
        <View style={[styles.container, { backgroundColor: isReel ? 'black' : (isDark ? themeColors.bgMain : themeColors.bgMainLight) }]}>
            {/* Header */}
            <View style={[styles.header, {
                backgroundColor: isReel ? 'transparent' : (isDark ? themeColors.bgMain : themeColors.bgMainLight),
                position: isReel ? 'absolute' : 'relative',
                zIndex: 10,
                marginTop: Platform.OS === 'ios' ? 50 : 30
            }]}>
                <TouchableOpacity onPress={onBack} style={styles.backBtn}>
                    <ArrowLeft size={24} color={isReel ? 'white' : (isDark ? themeColors.textMain : themeColors.textMainLight)} />
                </TouchableOpacity>
                {!isReel && (
                    <Text style={[styles.headerTitle, { color: isDark ? themeColors.textMain : themeColors.textMainLight }]}>
                        Post
                    </Text>
                )}
            </View>

            {isReel ? (
                <View style={{ flex: 1 }}>
                    <ReelItem
                        item={post}
                        isActive={true}
                        bottomTabHeight={0} // Full screen
                        // Pass dummy handlers or real ones if needed
                        onLike={() => { }}
                        onComment={() => { }}
                        onViewProfile={() => { }}
                        onShare={() => { }}
                    />
                </View>
            ) : (
                <ScrollView contentContainerStyle={{ paddingBottom: 50 }}>
                    <PostCard
                        id={post.id}
                        user={post.user}
                        content={post.content}
                        image={post.image}
                        stats={{
                            likes: post.likes || 0,
                            comments: post.comments || 0,
                            isLiked: post.isLiked
                        }}
                        time={post.created_at || post.timestamp} // Validation fallback
                        currentUser={{ id: 'me' }} // Simplified
                    />
                </ScrollView>
            )}
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
        paddingHorizontal: 16,
        paddingBottom: 10,
    },
    backBtn: {
        padding: 5,
        marginRight: 15,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '700',
    }
});
