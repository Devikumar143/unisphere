import React, { useState, useEffect } from 'react';
console.log('--- APP.JS INITIALIZING ---');
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, View, Text, TouchableOpacity, ActivityIndicator, Platform } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { NavigationContainer } from '@react-navigation/native';
import LoginScreen from './src/screens/LoginScreen';
import RegisterScreen from './src/screens/RegisterScreen';
import MainTabs from './src/navigation/MainTabs';
import SettingsScreen from './src/screens/SettingsScreen';
import EditProfileScreen from './src/screens/EditProfileScreen';
import ChatScreen from './src/screens/ChatScreen';
import SavedMessagesScreen from './src/screens/SavedMessagesScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import NotificationsScreen from './src/screens/NotificationsScreen';
import CommunitiesScreen from './src/screens/CommunitiesScreen';
import CreateCommunityScreen from './src/screens/CreateCommunityScreen';
import CommunityDetailScreen from './src/screens/CommunityDetailScreen';
import CreatePostScreen from './src/screens/CreatePostScreen';
import AdManagementScreen from './src/screens/AdManagementScreen';
import LoungeScreen from './src/screens/LoungeScreen';
import { COLORS } from './src/constants/theme';
import { fetchUserProfile, remoteLog, updatePushToken } from './src/services/api';
import { registerForPushNotificationsAsync } from './src/services/pushNotifications';

import AsyncStorage from '@react-native-async-storage/async-storage';
import { connectSocket, disconnectSocket } from './src/services/socket';
import { ThemeProvider, useTheme } from './src/context/ThemeContext';
import * as SplashScreen from 'expo-splash-screen';
import SplashScreenComponent from './src/screens/SplashScreen';

// Keep the splash screen visible while we fetch resources
SplashScreen.preventAutoHideAsync();

function AppContent() {
  const { isDark, themeColors } = useTheme();
  const [user, setUser] = useState(null);
  const [currentScreen, setCurrentScreen] = useState('LOGIN'); // LOGIN, REGISTER, SETTINGS, EDIT_PROFILE, CHAT, VIEW_PROFILE, NOTIFICATIONS, AD_MANAGEMENT
  const [chatTarget, setChatTarget] = useState(null); // User we are chatting with
  const [profileTarget, setProfileTarget] = useState(null); // User profile we are viewing
  const [communityTarget, setCommunityTarget] = useState(null); // Community we are viewing

  const [isLoading, setIsLoading] = useState(true);
  const [postContext, setPostContext] = useState(null); // { communityId, communityName }
  const [lastTab, setLastTab] = useState('Home');
  const [expoPushToken, setExpoPushToken] = useState('');

  useEffect(() => {
    checkUserSession();

    // FALLBACK: If checkUserSession hangs, force start after 5 seconds
    const failsafe = setTimeout(() => {
      if (isLoading) {
        console.warn('[App] Failsafe: Forcing splash hide.');
        setIsLoading(false);
        SplashScreen.hideAsync().catch(() => { });
      }
    }, 5000);

    return () => clearTimeout(failsafe);
  }, []);

  useEffect(() => {
    if (user && user.id) {
      registerForPushNotificationsAsync().then(token => {
        if (token) {
          setExpoPushToken(token);
          updatePushToken(user.id, token);
        }
      });
    }
  }, [user?.id]);

  const checkUserSession = async () => {
    try {
      console.log('[App] Checking for existing session...');
      const jsonValue = await AsyncStorage.getItem('user_session');
      if (jsonValue != null) {
        const userData = JSON.parse(jsonValue);
        console.log('[App] Session found for user:', userData.id);

        // CRITICAL: Verify user still exists in DB (especially after DB reset)
        try {
          const freshUser = await fetchUserProfile(userData.id);
          console.log('[App] Session verified with DB, Role:', freshUser.role);
          // Merge fresh data (role, name, etc) with session data (token)
          const updatedUser = { ...userData, ...freshUser };
          setUser(updatedUser);
          // Update storage with fresh data
          await AsyncStorage.setItem('user_session', JSON.stringify(updatedUser));
          connectSocket(userData.id);
        } catch (dbError) {
          console.warn('[App] Session stale or user deleted. Clearing...', dbError);
          await AsyncStorage.removeItem('user_session');
          setUser(null);
        }
      }
    } catch (e) {
      console.error('Failed to load session', e);
      remoteLog('error', 'App Startup - Session Check Failed', { error: e.toString() });
      // If session is corrupted, clear it
      await AsyncStorage.removeItem('user_session');
    } finally {
      setIsLoading(false);
      // Artificial delay for splash effect
      setTimeout(async () => {
        await SplashScreen.hideAsync();
      }, 1000);
    }
  };

  const handleLogin = async (userData) => {
    setUser(userData);
    try {
      await AsyncStorage.setItem('user_session', JSON.stringify(userData));
      // Connect socket for real-time messaging
      connectSocket(userData.id);
    } catch (e) {
      console.error('Failed to save session', e);
    }
  };

  const handleUpdateUser = async (updatedUser) => {
    const newUser = { ...user, ...updatedUser };
    setUser(newUser);
    try {
      await AsyncStorage.setItem('user_session', JSON.stringify(newUser));
    } catch (e) {
      console.error('Failed to update session', e);
    }
  };

  const handleLogout = async () => {
    disconnectSocket();
    setUser(null);
    setCurrentScreen('LOGIN');
    try {
      await AsyncStorage.removeItem('user_session');
    } catch (e) {
      console.error('Failed to clear session', e);
    }
  };

  if (isLoading) {
    return <SplashScreenComponent />;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <NavigationContainer theme={{
          dark: isDark,
          colors: {
            background: themeColors.bgDark,
            card: themeColors.bgCard,
            text: themeColors.textMain,
            border: themeColors.border,
            notification: themeColors.accentPrimary,
          }
        }}>
          <View style={[styles.container, { backgroundColor: themeColors.bgDark }]}>
            <StatusBar style={isDark ? "light" : "dark"} />
            {!user ? (
              currentScreen === 'REGISTER' ? (
                <RegisterScreen
                  onRegister={handleLogin}
                  onBackToLogin={() => setCurrentScreen('LOGIN')}
                />
              ) : (
                <LoginScreen
                  onLogin={handleLogin}
                  onGoToRegister={() => setCurrentScreen('REGISTER')}
                />
              )
            ) : (
              currentScreen === 'SETTINGS' ? (
                <SettingsScreen
                  onBack={() => setCurrentScreen('MAIN')}
                  onLogout={handleLogout}
                  onEditProfile={() => setCurrentScreen('EDIT_PROFILE')}
                />
              ) : currentScreen === 'EDIT_PROFILE' ? (
                <EditProfileScreen
                  user={user}
                  onBack={() => setCurrentScreen('MAIN')}
                  onUpdateSuccess={handleUpdateUser}
                />
              ) : currentScreen === 'CHAT' ? (
                <ChatScreen
                  user={user}
                  chatTarget={chatTarget}
                  onBack={() => {
                    setChatTarget(null);
                    setCurrentScreen('MAIN');
                  }}
                  onOpenSavedMessages={() => setCurrentScreen('SAVED_MESSAGES')}
                />
              ) : currentScreen === 'SAVED_MESSAGES' ? (
                <SavedMessagesScreen
                  user={user}
                  onBack={() => setCurrentScreen('MAIN')}
                />
              ) : currentScreen === 'VIEW_PROFILE' ? (
                <ProfileScreen
                  targetUser={profileTarget}
                  currentUser={user}
                  onBack={() => {
                    setProfileTarget(null);
                    setCurrentScreen('MAIN');
                  }}
                  onOpenChat={(target) => {
                    setChatTarget(target);
                    setCurrentScreen('CHAT');
                  }}
                />

              ) : currentScreen === 'NOTIFICATIONS' ? (
                <NotificationsScreen
                  user={user}
                  onBack={() => setCurrentScreen('MAIN')}
                  onViewProfile={(target) => {
                    setProfileTarget(target);
                    setCurrentScreen('VIEW_PROFILE');
                  }}
                />
              ) : currentScreen === 'CREATE_COMMUNITY' ? (
                <CreateCommunityScreen
                  user={user}
                  onBack={() => setCurrentScreen('MAIN')}
                />
              ) : currentScreen === 'COMMUNITY_DETAIL' ? (
                <CommunityDetailScreen
                  user={user}
                  route={{ params: { communityId: communityTarget?.id, name: communityTarget?.name } }}
                  onBack={() => setCurrentScreen('MAIN')}
                  onViewProfile={(target) => {
                    setProfileTarget(target);
                    setCurrentScreen('VIEW_PROFILE');
                  }}
                  onCreatePost={(context) => {
                    setPostContext(context);
                    setCurrentScreen('CREATE_POST');
                  }}
                  onOpenLounge={() => setCurrentScreen('LOUNGE')}
                />
              ) : currentScreen === 'AD_MANAGEMENT' ? (
                <AdManagementScreen onBack={() => setCurrentScreen('MAIN')} />
              ) : currentScreen === 'CREATE_POST' ? (
                <CreatePostScreen
                  user={user}
                  communityContext={postContext}
                  onBack={() => {
                    setPostContext(null);
                    setCurrentScreen('MAIN');
                  }}
                />
              ) : currentScreen === 'LOUNGE' ? (
                <LoungeScreen
                  user={user}
                  community={communityTarget}
                  onBack={() => setCurrentScreen('COMMUNITY_DETAIL')}
                />
              ) : (
                <MainTabs
                  user={user}
                  onOpenSettings={() => setCurrentScreen('SETTINGS')}
                  onEditProfile={() => setCurrentScreen('EDIT_PROFILE')}
                  onOpenNotifications={() => setCurrentScreen('NOTIFICATIONS')}
                  onOpenAdManagement={() => setCurrentScreen('AD_MANAGEMENT')}
                  onOpenChat={(target) => {
                    setChatTarget(target);
                    setCurrentScreen('CHAT');
                  }}
                  onViewProfile={(target) => {
                    setProfileTarget(target);
                    setCurrentScreen('VIEW_PROFILE');
                  }}
                  onOpenCommunity={(community) => {
                    setCommunityTarget(community);
                    setCurrentScreen('COMMUNITY_DETAIL');
                  }}
                  onCreateCommunity={() => setCurrentScreen('CREATE_COMMUNITY')}
                  onCreatePost={(context = null) => {
                    setPostContext(context);
                    setCurrentScreen('CREATE_POST');
                  }}
                  initialTab={lastTab}
                  onTabChange={setLastTab}
                />
              )
            )}
          </View>
        </NavigationContainer>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Child component crash:', error, errorInfo);
    remoteLog('error', 'Native Component Crash', {
      error: error.toString(),
      componentStack: errorInfo.componentStack
    });
  }

  render() {
    if (this.state.hasError) {
      return (
        <View style={{ flex: 1, backgroundColor: '#050511', justifyContent: 'center', alignItems: 'center', padding: 20 }}>
          <View style={{ backgroundColor: 'rgba(255, 0, 0, 0.1)', padding: 20, borderRadius: 12, borderWidth: 1, borderColor: 'red', width: '100%' }}>
            <Text style={{ color: 'red', fontSize: 22, fontWeight: 'bold', marginBottom: 10 }}>Native Crash Detected</Text>
            <Text style={{ color: '#fff', fontSize: 14, fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace', marginBottom: 20 }}>
              {this.state.error?.toString()}
            </Text>

            <View style={{ gap: 10 }}>
              <TouchableOpacity
                onPress={() => this.setState({ hasError: false, error: null })}
                style={{ backgroundColor: 'red', padding: 15, borderRadius: 8, alignItems: 'center' }}
              >
                <Text style={{ color: '#fff', fontWeight: 'bold' }}>Try Again</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={async () => {
                  await AsyncStorage.removeItem('user_session');
                  this.setState({ hasError: false, error: null });
                  // We might need a full reload here, but clearing session + Try Again usually works
                }}
                style={{ borderWeight: 1, borderColor: '#fff', borderStyle: 'dashed', padding: 15, borderRadius: 8, alignItems: 'center', borderWidth: 1 }}
              >
                <Text style={{ color: '#fff', fontWeight: '600' }}>Reset Session (Fixed DB error)</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      );
    }
    return this.props.children;
  }
}

export default function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <AppContent />
      </ThemeProvider>
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  }
});
