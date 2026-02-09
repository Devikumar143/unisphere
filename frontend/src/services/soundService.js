import { Audio } from 'expo-av';
import * as Haptics from 'expo-haptics';

/**
 * SoundService
 * Manages premium HUD audio and haptic feedback.
 */
class SoundService {
    constructor() {
        this.sounds = {};
        this.isMuted = false;
    }

    /**
     * Initialize SoundService by pre-loading core HUD sounds.
     */
    async init() {
        try {
            // SILENT INIT: Attempt to load sounds but never throw warnings to UX

            // 1. Clink (Mixkit Stable CDN)
            try {
                const clinkUrl = 'https://assets.mixkit.co/active_storage/sfx/2358/2358-preview.mp3';
                const { sound: clinkSound } = await Audio.Sound.createAsync({ uri: clinkUrl });
                this.sounds['clink'] = clinkSound;
            } catch (e) {
                // Fail silently
            }

            // 2. Sent (Mixkit Stable CDN)
            try {
                const sentUrl = 'https://assets.mixkit.co/active_storage/sfx/2354/2354-preview.mp3';
                const { sound: sentSound } = await Audio.Sound.createAsync({ uri: sentUrl });
                this.sounds['sent'] = sentSound;
            } catch (e) {
                // Fail silently
            }
        } catch (error) {
            // Fail silently
        }
    }

    /**
     * Play a high-quality haptic feedback based on interaction type.
     * @param {string} type - 'light', 'medium', 'heavy', 'success', 'warning', 'error'
     */
    async triggerHaptic(type = 'light') {
        try {
            switch (type) {
                case 'light':
                    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    break;
                case 'medium':
                    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                    break;
                case 'heavy':
                    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
                    break;
                case 'success':
                    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                    break;
                case 'warning':
                    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
                    break;
                case 'error':
                    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
                    break;
                case 'selection':
                    await Haptics.selectionAsync();
                    break;
            }
        } catch (e) {
            // Silently fail if haptics not supported
        }
    }

    /**
     * Play the signature "Glass Clink" sound for HUD notifications.
     */
    async playClink() {
        try {
            this.triggerHaptic('light');
            if (this.sounds['clink']) {
                await this.sounds['clink'].replayAsync();
            }
        } catch (e) {
            console.warn('[SoundService] Clink playback failed:', e);
        }
    }

    /**
     * Play the "Sent" swish sound for messages.
     */
    async playSent() {
        try {
            this.triggerHaptic('medium');
            if (this.sounds['sent']) {
                await this.sounds['sent'].replayAsync();
            }
        } catch (e) {
            console.warn('[SoundService] Sent playback failed:', e);
        }
    }

    /**
     * Trigger the "Haptic Proximity" hum when near another Sphere member.
     */
    async triggerProximityHum() {
        // Soft series of haptics to simulate a proximity hum
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setTimeout(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light), 100);
    }
}

const soundService = new SoundService();
export default soundService;
