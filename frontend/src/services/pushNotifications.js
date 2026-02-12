import { Platform } from 'react-native';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';

const isExpoGo = Constants?.appOwnership === 'expo' || Constants?.executionEnvironment === 'store-client';

// Enable the handler even in Expo Go for testing visibility
try {
    Notifications.setNotificationHandler({
        handleNotification: async () => ({
            shouldShowAlert: true,
            shouldPlaySound: true,
            shouldSetBadge: false,
        }),
    });
    console.log('[Push] Notification handler set successfully.');
} catch (error) {
    console.error('[Push] Failed to set notification handler:', error);
}

export async function registerForPushNotificationsAsync() {
    let token;

    if (Platform.OS === 'android') {
        try {
            await Notifications.setNotificationChannelAsync('default', {
                name: 'default',
                importance: Notifications.AndroidImportance.MAX,
                vibrationPattern: [0, 250, 250, 250],
                lightColor: '#8B5CF6',
            });
            console.log('[Push] Android notification channel set.');
        } catch (error) {
            console.error('[Push] Error setting Android channel:', error);
        }
    }

    if (Device.isDevice) {
        const { status: existingStatus } = await Notifications.getPermissionsAsync();
        let finalStatus = existingStatus;
        if (existingStatus !== 'granted') {
            const { status } = await Notifications.requestPermissionsAsync();
            finalStatus = status;
        }
        if (finalStatus !== 'granted') {
            console.warn('[Push] Failed to get push token: permission not granted.');
            return;
        }

        try {
            const projectId = Constants?.expoConfig?.extra?.eas?.projectId ||
                Constants?.easConfig?.projectId ||
                'f07ecfd4-560b-4690-8f40-3d56298ab784';

            if (!projectId) {
                console.warn('[Push] EAS Project ID not found. Registration might fail.');
            }

            console.log('[Push] Requesting token with Project ID:', projectId);

            // Get Expo token
            token = (await Notifications.getExpoPushTokenAsync({
                projectId: projectId
            })).data;

            console.log('[Push] Expo Token generated successfully.');
            return token;
        } catch (error) {
            console.error('[Push] Fatal Error getting push token:', error.message);
            if (error.message.includes('Network request failed')) {
                console.error('[Push] Network Error: Please check your internet connection on the device.');
            }
        }
    } else {
        console.log('[Push] Must use physical device for Push Notifications');
    }

    return token;
}
