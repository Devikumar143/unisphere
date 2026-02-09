import React, { useState, useEffect } from 'react';
console.log('--- APP.JS INITIALIZING ---');
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, View, Text, TouchableOpacity, ActivityIndicator, Platform } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { NavigationContainer } from '@react-navigation/native';
import LoginScreen from './src/screens/LoginScreen';
import RegisterScreen from './src/screens/RegisterScreen';
import MessagesScreen from './src/screens/MessagesScreen';
import MainTabs from './src/navigation/MainTabs';
import SettingsScreen from './src/screens/SettingsScreen';
import EditProfileScreen from './src/screens/EditProfileScreen';
import ChatScreen from './src/screens/ChatScreen';
import ChatInfoScreen from './src/screens/ChatInfoScreen';
import SavedMessagesScreen from './src/screens/SavedMessagesScreen';
import SharedMediaScreen from './src/screens/SharedMediaScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import NotificationsScreen from './src/screens/NotificationsScreen';
import CommunitiesScreen from './src/screens/CommunitiesScreen';
import CreateCommunityScreen from './src/screens/CreateCommunityScreen';
import CommunityDetailScreen from './src/screens/CommunityDetailScreen';
import CreatePostScreen from './src/screens/CreatePostScreen';
import AdManagementScreen from './src/screens/AdManagementScreen';
import VerificationApplyScreen from './src/screens/VerificationApplyScreen';
import AdminVerificationScreen from './src/screens/AdminVerificationScreen';
import SubscriptionScreen from './src/screens/SubscriptionScreen';
import AdInfoScreen from './src/screens/AdInfoScreen';
import LoungeScreen from './src/screens/LoungeScreen';
import MapScreen from './src/screens/MapScreen';
import ContactDeveloperScreen from './src/screens/ContactDeveloperScreen';
import SinglePostScreen from './src/screens/SinglePostScreen';
import soundService from './src/services/soundService';

import { COLORS } from './src/constants/theme';
import { fetchUserProfile, remoteLog, updatePushToken, blockUser, unblockUser, reportUser, muteChat, unmuteChat, fetchRelationship } from './src/services/api';
import { registerForPushNotificationsAsync } from './src/services/pushNotifications';

import AsyncStorage from '@react-native-async-storage/async-storage';
import { connectSocket, disconnectSocket, getSocket } from './src/services/socket';
import { ThemeProvider, useTheme } from './src/context/ThemeContext';

import * as SplashScreen from 'expo-splash-screen';
import SplashScreenComponent from './src/screens/SplashScreen';

// Keep the splash screen visible while we fetch resources
// SplashScreen.preventAutoHideAsync();

function AppContent() {
  const { isDark, themeColors } = useTheme();
  const [user, setUser] = useState(null);
  const [currentScreen, setCurrentScreen] = useState('LOGIN'); // LOGIN, REGISTER, SETTINGS, EDIT_PROFILE, CHAT, CHAT_INFO, VIEW_PROFILE, NOTIFICATIONS, AD_MANAGEMENT, SHARED_MEDIA, AD_INFO
  const [chatTarget, setChatTarget] = useState(null); // User we are chatting with
  const [profileTarget, setProfileTarget] = useState(null); // User profile we are viewing
  const [communityTarget, setCommunityTarget] = useState(null); // Community we are viewing
  const [currentPost, setCurrentPost] = useState(null); // Post we are viewing

  const [isLoading, setIsLoading] = useState(false);
  const [postContext, setPostContext] = useState(null); // { communityId, communityName }
  const [lastTab, setLastTab] = useState('Home');
  const [expoPushToken, setExpoPushToken] = useState('');
  const [toastNotification, setToastNotification] = useState(null);



  const [savedAccounts, setSavedAccounts] = useState([]);

  const [chatRelationship, setChatRelationship] = useState({ isBlocked: false, isMuted: false });

  // Fetch relationship when chat opens
  useEffect(() => {
    if (user && chatTarget) {
      fetchRelationship(chatTarget.id, user.id).then(rel => setChatRelationship(rel));
    }
  }, [user, chatTarget]);

  const handleToggleMute = async () => {
    if (!user || !chatTarget) return;
    try {
      if (chatRelationship.isMuted) {
        await unmuteChat(chatTarget.id, user.id);
        setChatRelationship(prev => ({ ...prev, isMuted: false }));
      } else {
        await muteChat(chatTarget.id, user.id);
        setChatRelationship(prev => ({ ...prev, isMuted: true }));
      }
    } catch (e) {
      console.error("Failed to toggle mute", e);
    }
  };

  const handleBlockUser = async () => {
    if (!user || !chatTarget) return;
    try {
      await blockUser(chatTarget.id, user.id);
      setChatRelationship(prev => ({ ...prev, isBlocked: true }));
      // Optionally navigate back or show alert
      setChatTarget(null);
      setCurrentScreen('MAIN');
      alert(`Blocked ${chatTarget.name}`);
    } catch (e) {
      console.error("Failed to block user", e);
    }
  };

  const handleReportUser = async () => {
    if (!user || !chatTarget) return;
    try {
      // For now using a generic reason, user input could be added
      await reportUser(chatTarget.id, user.id, 'INAPPROPRIATE_CONTENT', 'Reported from chat info');
      alert(`Reported ${chatTarget.name}. We will review this shortly.`);
    } catch (e) {
      console.error("Failed to report user", e);
    }
  };



  useEffect(() => {
    soundService.init();
    checkUserSession();
    loadSavedAccounts();

    // FALLBACK: If checkUserSession hangs, force start after 5 seconds
    const failsafe = setTimeout(() => {
      if (isLoading) {
        console.warn('[App] Failsafe: Forcing splash hide.');
        setIsLoading(false);
        SplashScreen.hideAsync().catch(() => { });
      }
    }, 5000);

    SplashScreen.hideAsync().catch(() => { });

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

  useEffect(() => {
    if (!user?.id) return;

    const socket = getSocket();
    if (!socket) return;

    const handleNotification = (data) => {
      console.log('[App] Notification received:', data);
      if (data.type === 'MENTION') {
        setToastNotification({
          title: 'You were mentioned!',
          message: `${data.senderName} tagged you in a message.`,
          data: data
        });

        // Auto-hide after 5 seconds
        setTimeout(() => setToastNotification(null), 5000);
      }
    };

    socket.on('notification_received', handleNotification);
    return () => {
      socket.off('notification_received', handleNotification);
    };
  }, [user?.id]);


  const loadSavedAccounts = async () => {
    try {
      const jsonValue = await AsyncStorage.getItem('saved_accounts');
      if (jsonValue != null) {
        setSavedAccounts(JSON.parse(jsonValue));
      }
    } catch (e) {
      console.error('Failed to load saved accounts', e);
    }
  };

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

      // Update saved accounts list
      const newAccounts = [...savedAccounts];
      const index = newAccounts.findIndex(a => a.id === userData.id);
      if (index !== -1) {
        newAccounts[index] = userData;
      } else {
        newAccounts.push(userData);
      }
      setSavedAccounts(newAccounts);
      await AsyncStorage.setItem('saved_accounts', JSON.stringify(newAccounts));

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

      // Update in saved list too
      const newAccounts = savedAccounts.map(acc => acc.id === newUser.id ? newUser : acc);
      setSavedAccounts(newAccounts);
      await AsyncStorage.setItem('saved_accounts', JSON.stringify(newAccounts));
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

  const handleSwitchAccount = async (targetUser) => {
    // 1. Disconnect current socket
    disconnectSocket();

    // 2. Set new user state
    setUser(targetUser);
    setCurrentScreen('MAIN'); // Ensure we go to main screen

    // 3. Persist new session
    try {
      await AsyncStorage.setItem('user_session', JSON.stringify(targetUser));
      connectSocket(targetUser.id);
    } catch (e) {
      console.error('Failed to switch session', e);
    }
  };

  const handleAddAccount = async () => {
    // Just clear current user state to show Login screen, but don't remove session from storage yet necessary? 
    // Actually standard flow: Clear active user state -> Login Screen. 
    // We do NOT clear 'user_session' implies auto-login on restart. 
    // So we SHOULD clear 'user_session' so next app start doesn't auto-login the old user if they didn't finish adding new one.
    disconnectSocket();
    setUser(null);
    setCurrentScreen('LOGIN');
    await AsyncStorage.removeItem('user_session');
  };

  const handleRemoveSavedAccount = async (accountId) => {
    const newAccounts = savedAccounts.filter(a => a.id !== accountId);
    setSavedAccounts(newAccounts);
    try {
      await AsyncStorage.setItem('saved_accounts', JSON.stringify(newAccounts));
      // If removing current user, logout
      if (user?.id === accountId) {
        handleLogout();
      }
    } catch (e) {
      console.error('Failed to remove account', e);
    }
  };

  if (isLoading) {
    return <SplashScreenComponent />;
  }

  const renderContent = () => {
    if (!user && currentScreen !== 'REGISTER') {
      return (
        <LoginScreen
          onLogin={handleLogin}
          onGoToRegister={() => setCurrentScreen('REGISTER')}
          savedAccounts={savedAccounts}
          onQuickLogin={handleSwitchAccount}
          onRemoveAccount={handleRemoveSavedAccount}
        />
      );
    }

    switch (currentScreen) {
      case 'REGISTER':
        return <RegisterScreen onBackToLogin={() => setCurrentScreen('LOGIN')} onRegister={handleLogin} />;
      case 'SETTINGS':
        return (
          <SettingsScreen
            onBack={() => setCurrentScreen('MAIN')}
            onLogout={handleLogout}
            onEditProfile={() => setCurrentScreen('EDIT_PROFILE')}
            savedAccounts={savedAccounts}
            currentUser={user}
            onSwitchAccount={handleSwitchAccount}
            onAddAccount={handleAddAccount}
            onRemoveAccount={handleRemoveSavedAccount}
            onOpenAdManagement={() => setCurrentScreen('AD_MANAGEMENT')}
            onApplyVerification={() => setCurrentScreen('VERIFY_APPLY')}
            onOpenAdminVerify={() => setCurrentScreen('ADMIN_VERIFY')}
            onOpenSubscription={() => setCurrentScreen('SUBSCRIPTION')}
            onOpenAdInfo={() => setCurrentScreen('AD_INFO')}
          />
        );
      case 'VERIFY_APPLY':
        return <VerificationApplyScreen route={{ params: { currentUser: user } }} navigation={{ goBack: () => setCurrentScreen('SETTINGS') }} />;
      case 'ADMIN_VERIFY':
        return <AdminVerificationScreen route={{ params: { currentUser: user } }} navigation={{ goBack: () => setCurrentScreen('SETTINGS') }} />;
      case 'SUBSCRIPTION':
        return <SubscriptionScreen route={{ params: { currentUser: user } }} navigation={{ goBack: () => setCurrentScreen('SETTINGS'), navigate: (screen) => setCurrentScreen(screen) }} onUpdateUser={handleUpdateUser} />;
      case 'CONTACT_DEVELOPER':
        return <ContactDeveloperScreen navigation={{ goBack: () => setCurrentScreen('SUBSCRIPTION') }} />;
      case 'EDIT_PROFILE':
        return <EditProfileScreen user={user} onBack={() => setCurrentScreen('MAIN')} onUpdateSuccess={handleUpdateUser} />;
      case 'MESSAGES':
        return <MessagesScreen user={user} onOpenChat={(target) => {
          setChatTarget(target);
          setCurrentScreen('CHAT');
        }} onBack={() => setCurrentScreen('MAIN')} />;
      case 'CHAT':
        return (
          <ChatScreen
            user={user}
            chatTarget={chatTarget}
            onBack={() => {
              setChatTarget(null);
              setCurrentScreen('MAIN');
            }}
            onOpenSavedMessages={() => setCurrentScreen('SAVED_MESSAGES')}
            onOpenSharedMedia={() => setCurrentScreen('SHARED_MEDIA')}
            onOpenChatInfo={() => setCurrentScreen('CHAT_INFO')}
            onViewPost={(post) => {
              setCurrentPost(post);
              setCurrentScreen('VIEW_POST');
            }}
          />
        );

      case 'SAVED_MESSAGES':
        return <SavedMessagesScreen user={user} onBack={() => setCurrentScreen('CHAT')} />;
      case 'SHARED_MEDIA':
        return <SharedMediaScreen user={user} chatTarget={chatTarget} onBack={() => setCurrentScreen('CHAT')} />;
      case 'CHAT_INFO':
        return (
          <ChatInfoScreen
            user={user}
            chatTarget={chatTarget}
            onBack={() => setCurrentScreen('CHAT')}
            onOpenSharedMedia={() => setCurrentScreen('SHARED_MEDIA')}
            onOpenSavedMessages={() => setCurrentScreen('SAVED_MESSAGES')}
            isMuted={chatRelationship.isMuted}
            onToggleMute={handleToggleMute}
            encryptionEnabled={false}
            onToggleEncryption={() => { }}
            onClearChat={() => { }}
            onBlockUser={handleBlockUser}
            onReportUser={handleReportUser}
          />
        );
      case 'VIEW_POST':
        return (
          <SinglePostScreen
            post={currentPost}
            onBack={() => setCurrentScreen('CHAT')}
          />
        );
      case 'VIEW_PROFILE':
        return (
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
            onViewProfile={(target) => {
              setProfileTarget(target);
              setCurrentScreen('VIEW_PROFILE');
            }}
          />
        );
      case 'NOTIFICATIONS':
        return (
          <NotificationsScreen
            user={user}
            onBack={() => setCurrentScreen('MAIN')}
            onViewProfile={(target) => {
              setProfileTarget(target);
              setCurrentScreen('VIEW_PROFILE');
            }}
          />
        );
      case 'CREATE_COMMUNITY':
        return <CreateCommunityScreen user={user} onBack={() => setCurrentScreen('MAIN')} />;
      case 'COMMUNITY_DETAIL':
        return (
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
        );
      case 'AD_MANAGEMENT':
        return <AdManagementScreen onBack={() => setCurrentScreen('MAIN')} />;
      case 'AD_INFO':
        return <AdInfoScreen onBack={() => setCurrentScreen('SETTINGS')} />;
      case 'CREATE_POST':
        return (
          <CreatePostScreen
            user={user}
            communityContext={postContext}
            onBack={() => {
              setPostContext(null);
              setCurrentScreen('MAIN');
            }}
          />
        );
      case 'LOUNGE':
        return (
          <LoungeScreen
            user={user}
            community={communityTarget}
            onBack={() => setCurrentScreen('COMMUNITY_DETAIL')}
          />
        );
      case 'MAP':
        return <MapScreen user={user} navigation={{ goBack: () => setCurrentScreen('MAIN') }} />;
      default:
        return (
          <MainTabs
            user={user}
            onOpenSettings={() => setCurrentScreen('SETTINGS')}
            onEditProfile={() => setCurrentScreen('EDIT_PROFILE')}
            onOpenNotifications={() => setCurrentScreen('NOTIFICATIONS')}
            onOpenMessages={() => setCurrentScreen('MESSAGES')}
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
            onOpenMap={() => setCurrentScreen('MAP')}
            initialTab={lastTab}
            onTabChange={setLastTab}
          />
        );
    }
  };

  return (
    <ThemeProvider>
      <SafeAreaProvider>
        <GestureHandlerRootView style={{ flex: 1 }}>
          <NavigationContainer theme={{
            dark: isDark,
            colors: {
              background: isDark ? themeColors.bgDark : themeColors.bgLight,
              card: themeColors.bgCard,
              text: themeColors.textMain,
              border: themeColors.border,
              notification: themeColors.accentPrimary,
            }
          }}>
            <View style={[styles.container, { backgroundColor: isDark ? themeColors.bgDark : themeColors.bgLight }]}>
              <StatusBar style={isDark ? "light" : "dark"} backgroundColor={isDark ? themeColors.bgDark : themeColors.bgLight} />

              {renderContent()}

              {/* Global Toast Notification */}
              {toastNotification && (
                <TouchableOpacity
                  activeOpacity={0.9}
                  onPress={() => setToastNotification(null)}
                  style={{
                    position: 'absolute',
                    top: Platform.OS === 'ios' ? 60 : 40,
                    left: 20,
                    right: 20,
                    backgroundColor: isDark ? 'rgba(30, 27, 75, 0.95)' : 'rgba(255, 255, 255, 0.95)',
                    padding: 16,
                    borderRadius: 20,
                    borderWidth: 1.5,
                    borderColor: themeColors.accentPrimary,
                    flexDirection: 'row',
                    alignItems: 'center',
                    zIndex: 9999,
                    elevation: 10,
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: 10 },
                    shadowOpacity: 0.3,
                    shadowRadius: 15,
                  }}
                >
                  <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: themeColors.accentPrimary + '20', justifyContent: 'center', alignItems: 'center', marginRight: 12 }}>
                    <Text style={{ fontSize: 20 }}>🔔</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: isDark ? themeColors.textMain : themeColors.textMainLight, fontWeight: '900', fontSize: 14 }}>{toastNotification.title}</Text>
                    <Text style={{ color: isDark ? themeColors.textDim : themeColors.textDimLight, fontSize: 12, marginTop: 2 }}>{toastNotification.message}</Text>
                  </View>
                  <TouchableOpacity onPress={() => setToastNotification(null)} style={{ padding: 4 }}>
                    <Text style={{ color: isDark ? themeColors.textDim : themeColors.textDimLight, fontWeight: 'bold' }}>✕</Text>
                  </TouchableOpacity>
                </TouchableOpacity>
              )}

              {/* Global Modals */}


            </View>
          </NavigationContainer>
        </GestureHandlerRootView>
      </SafeAreaProvider>
    </ThemeProvider>
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
