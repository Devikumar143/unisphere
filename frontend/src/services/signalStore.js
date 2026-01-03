import * as SecureStore from 'expo-secure-store';

/**
 * Signal Protocol Storage Interface
 * Implements the required storage interface for libsignal-client
 * Uses expo-secure-store for secure key storage
 */

class SignalProtocolStore {
    constructor(userId) {
        this.userId = userId;
        this.prefix = `signal_${userId}_`;
    }

    // Helper methods for secure storage
    async _save(key, value) {
        try {
            await SecureStore.setItemAsync(this.prefix + key, JSON.stringify(value));
        } catch (error) {
            console.error('Error saving to secure store:', error);
            throw error;
        }
    }

    async _load(key) {
        try {
            const value = await SecureStore.getItemAsync(this.prefix + key);
            return value ? JSON.parse(value) : null;
        } catch (error) {
            console.error('Error loading from secure store:', error);
            return null;
        }
    }

    async _remove(key) {
        try {
            await SecureStore.deleteItemAsync(this.prefix + key);
        } catch (error) {
            console.error('Error removing from secure store:', error);
        }
    }

    // Identity Key Store
    async saveIdentityKey(identityKey) {
        await this._save('identityKey', identityKey);
    }

    async loadIdentityKey() {
        return await this._load('identityKey');
    }

    async saveRegistrationId(registrationId) {
        await this._save('registrationId', registrationId);
    }

    async loadRegistrationId() {
        return await this._load('registrationId');
    }

    // PreKey Store
    async savePreKey(keyId, preKey) {
        await this._save(`prekey_${keyId}`, preKey);
    }

    async loadPreKey(keyId) {
        return await this._load(`prekey_${keyId}`);
    }

    async removePreKey(keyId) {
        await this._remove(`prekey_${keyId}`);
    }

    // Signed PreKey Store
    async saveSignedPreKey(keyId, signedPreKey) {
        await this._save(`signed_prekey_${keyId}`, signedPreKey);
    }

    async loadSignedPreKey(keyId) {
        return await this._load(`signed_prekey_${keyId}`);
    }

    // Session Store
    async saveSession(recipientId, session) {
        await this._save(`session_${recipientId}`, session);
    }

    async loadSession(recipientId) {
        return await this._load(`session_${recipientId}`);
    }

    async sessionExists(recipientId) {
        const session = await this.loadSession(recipientId);
        return session !== null;
    }

    async deleteSession(recipientId) {
        await this._remove(`session_${recipientId}`);
    }

    // Get all stored keys for backup/debugging
    async getAllKeys() {
        const identityKey = await this.loadIdentityKey();
        const registrationId = await this.loadRegistrationId();

        return {
            identityKey,
            registrationId,
            hasKeys: identityKey !== null && registrationId !== null
        };
    }

    // Clear all encryption data (use with caution!)
    async clearAll() {
        // This would require enumerating all keys, which SecureStore doesn't support directly
        // For now, we'll clear the main keys
        await this._remove('identityKey');
        await this._remove('registrationId');
        console.warn('Cleared identity keys. Sessions and prekeys may still exist.');
    }
}

export default SignalProtocolStore;
