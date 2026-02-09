import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { BlurView } from 'expo-blur';
import { StyleSheet, View, Platform } from 'react-native';
import { Home, Compass, Mail, Users, UserCircle, Clapperboard, PlaySquare } from 'lucide-react-native';
import HomeScreen from '../screens/HomeScreen';
import ProfileScreen from '../screens/ProfileScreen';
import CreatePostScreen from '../screens/CreatePostScreen';
import ExploreScreen from '../screens/ExploreScreen';
import MessagesScreen from '../screens/MessagesScreen';
import ReelsScreen from '../screens/ReelsScreen';
import CommunitiesScreen from '../screens/CommunitiesScreen';
import { COLORS } from '../constants/theme';
import { useTheme } from '../context/ThemeContext';

const Tab = createBottomTabNavigator();

export default function MainTabs({ user, onOpenSettings, onEditProfile, onOpenChat, onOpenMessages, onViewProfile, onOpenNotifications, onOpenAdManagement, onOpenCommunity, onCreateCommunity, onCreatePost, onOpenMap, initialTab, onTabChange }) {
    const { isDark, themeColors } = useTheme();

    return (
        <Tab.Navigator
            initialRouteName={initialTab}
            screenOptions={{
                headerShown: false,
                tabBarShowLabel: false,
                tabBarStyle: [styles.tabBar, { borderColor: themeColors.border }],
                tabBarBackground: () => (
                    <BlurView
                        tint={isDark ? "dark" : "light"}
                        intensity={95} // Heavier frosted effect
                        style={[StyleSheet.absoluteFill, { backgroundColor: isDark ? 'rgba(0,0,0,0.3)' : 'rgba(255,255,255,0.3)' }]}
                    />
                ),
                tabBarActiveTintColor: themeColors.accentPrimary,
                tabBarInactiveTintColor: themeColors.textDim,
            }}
        >
            <Tab.Screen
                name="Home"
                children={() => <HomeScreen user={user} onOpenNotifications={onOpenNotifications} onOpenMessages={onOpenMessages} onCreatePost={onCreatePost} onViewProfile={onViewProfile} />}
                listeners={{
                    tabPress: () => onTabChange && onTabChange('Home'),
                }}
                options={{
                    tabBarIcon: ({ color, focused }) => (
                        <View style={styles.iconContainer}>
                            <Home color={color} size={focused ? 28 : 26} strokeWidth={focused ? 2 : 2} />
                            {focused && <View style={styles.activeDot} />}
                        </View>
                    )
                }}
            />
            <Tab.Screen
                name="Explore"
                children={() => <ExploreScreen onOpenChat={onOpenChat} onViewProfile={onViewProfile} onOpenCommunity={onOpenCommunity} onOpenMap={onOpenMap} />}
                listeners={{
                    tabPress: () => onTabChange && onTabChange('Explore'),
                }}
                options={{
                    tabBarIcon: ({ color, focused }) => (
                        <View style={styles.iconContainer}>
                            <Compass color={color} size={focused ? 28 : 26} strokeWidth={focused ? 2 : 2} />
                            {focused && <View style={styles.activeDot} />}
                        </View>
                    )
                }}
            />

            <Tab.Screen
                name="Reels"
                children={() => <ReelsScreen user={user} onViewProfile={onViewProfile} />}
                listeners={{
                    tabPress: () => onTabChange && onTabChange('Reels'),
                }}
                options={{
                    tabBarIcon: ({ color, focused }) => (
                        <View style={styles.iconContainer}>
                            <Clapperboard color={color} size={focused ? 28 : 26} strokeWidth={focused ? 2 : 2} />
                            {focused && <View style={styles.activeDot} />}
                        </View>
                    )
                }}
            />
            <Tab.Screen
                name="Communities"
                children={() => <CommunitiesScreen user={user} onOpenCommunity={onOpenCommunity} onCreateCommunity={onCreateCommunity} />}
                listeners={{
                    tabPress: () => onTabChange && onTabChange('Communities'),
                }}
                options={{
                    tabBarIcon: ({ color, focused }) => (
                        <View style={styles.iconContainer}>
                            <Users color={color} size={focused ? 28 : 26} strokeWidth={focused ? 2 : 2} />
                            {focused && <View style={styles.activeDot} />}
                        </View>
                    )
                }}
            />
            <Tab.Screen
                name="Profile"
                children={() => <ProfileScreen targetUser={user} currentUser={user} onOpenSettings={onOpenSettings} onEditProfile={onEditProfile} onOpenAdManagement={onOpenAdManagement} onViewProfile={onViewProfile} />}
                listeners={{
                    tabPress: () => onTabChange && onTabChange('Profile'),
                }}
                options={{
                    tabBarIcon: ({ color, focused }) => (
                        <View style={styles.iconContainer}>
                            <UserCircle color={color} size={focused ? 28 : 26} strokeWidth={focused ? 2 : 2} />
                            {focused && <View style={styles.activeDot} />}
                        </View>
                    )
                }}
            />
        </Tab.Navigator >
    );
}

const styles = StyleSheet.create({
    tabBar: {
        position: 'absolute',
        bottom: 25, // Floating
        left: 20,
        right: 20,
        height: 64,
        borderRadius: 32, // Pill shape
        borderWidth: 1,
        elevation: 10,
        backgroundColor: 'transparent',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.1,
        shadowRadius: 20,
        overflow: 'hidden',
    },
    iconContainer: {
        alignItems: 'center',
        justifyContent: 'flex-end',
        width: 44,
        height: 44,
    },
    activeDot: {
        position: 'absolute',
        bottom: -6,
        width: 5,
        height: 5,
        borderRadius: 2.5,
        backgroundColor: COLORS.accentPrimary,
    },
});
