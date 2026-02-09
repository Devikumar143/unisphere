import { Platform } from 'react-native';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';

const isExpoGo = Constants?.appOwnership === 'expo' || Constants?.executionEnvironment === 'store-client';

// Only set the handler if not in Expo Go to avoid the immediate error screen
if (!isExpoGo) {
    try {
        Notifications.setNotificationHandler({
            handleNotification: async () => ({
                shouldShowAlert: true,
                shouldPlaySound: true,
                shouldSetBadge: false,
            }),
        });
    } catch (e) {
        console.warn('NotificationHandler setup failed:', e);
    }
}

export async function registerForPushNotificationsAsync() {
    // Log if in Expo Go, but attempt registration anyway for debugging
    if (isExpoGo) {
        console.log('[Push] Registration: Attempting in Expo Go (might be unreliable in SDK 53+).');
    }

    if (Platform.OS === 'android') {
        try {
            const channel = await Notifications.getNotificationChannelAsync('default');
            if (!channel) {
                await Notifications.setNotificationChannelAsync('default', {
                    name: 'default',
                    importance: Notifications.AndroidImportance.MAX,
                    vibrationPattern: [0, 250, 250, 250],
                    lightColor: '#FF231F7C',
                });
            }
        } catch (e) {
            console.warn('Failed to set notification channel:', e);
        }
    }

    if (!Device.isDevice) {
        console.log('Must use physical device for Push Notifications');
        return null;
    }

    try {
        const { status: existingStatus } = await Notifications.getPermissionsAsync();
        let finalStatus = existingStatus;
        if (existingStatus !== 'granted') {
            const { status } = await Notifications.requestPermissionsAsync();
            finalStatus = status;
        }
        if (finalStatus !== 'granted') {
            console.log('Failed to get push token: Permission not granted');
            return null;
        }

        const projectId = Constants?.expoConfig?.extra?.eas?.projectId ?? Constants?.easConfig?.projectId;
        if (!projectId) {
            console.warn('EAS Project ID not found.');
            return null;
        }

        const token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
        console.log("Expo Push Token:", token);
        return token;
    } catch (e) {
        console.error("Error getting push token:", e);
        return null;
    }
}
