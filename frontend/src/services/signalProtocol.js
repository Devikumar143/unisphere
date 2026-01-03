import SignalProtocolStore from './signalStore';
import { API_URL } from './api';

/**
 * Signal Protocol Service
 * Handles end-to-end encryption using Signal Protocol
 * 
 * Note: This is a simplified implementation for demonstration.
 * For production, consider using @signalapp/libsignal-client directly
 * with proper key generation and session management.
 */

class SignalProtocolService {
    constructor() {
        this.store = null;
        this.userId = null;
        this.initialized = false;
    }

    /**
     * Initialize the encryption service for a user
     */
    async initialize(userId) {
        if (this.initialized && this.userId === userId) {
            return;
        }

        this.userId = userId;
        this.store = new SignalProtocolStore(userId);

        try {
            // Check if keys already exist
            const keys = await this.store.getAllKeys();

            if (!keys.hasKeys) {
                console.log('No encryption keys found. Generating new keys...');
                await this.generateAndUploadKeys();
            } else {
                console.log('Encryption keys loaded from secure storage');
            }

            this.initialized = true;
        } catch (error) {
            console.error('[E2EE] Failed to initialize encryption:', error);
            if (error.message.includes('Network request failed')) {
                console.error('[E2EE] NETWORK ERROR: Please check your API_URL in api.js and ensure backend is reachable.');
                console.error('[E2EE] If using emulator, use http://10.0.2.2:5001/api');
                console.error('[E2EE] If using physical device, ensure device is on same Wi-Fi and IP is correct.');
            }
        }
    }

    /**
     * Generate identity key, prekeys, and signed prekey
     * Then upload them to the server
     */
    async generateAndUploadKeys() {
        try {
            // Generate registration ID (random number)
            const registrationId = Math.floor(Math.random() * 16380) + 1;

            // For this simplified version, we'll use random strings as keys
            // In production, use @signalapp/libsignal-client for proper key generation
            const identityKey = this._generateRandomKey();

            // Save locally
            await this.store.saveIdentityKey(identityKey);
            await this.store.saveRegistrationId(registrationId);

            // Generate prekeys (100 one-time use keys)
            const prekeys = [];
            for (let i = 1; i <= 100; i++) {
                const prekey = {
                    keyId: i,
                    publicKey: this._generateRandomKey()
                };
                prekeys.push(prekey);
                await this.store.savePreKey(i, prekey);
            }

            // Generate signed prekey
            const signedPreKey = {
                keyId: 1,
                publicKey: this._generateRandomKey(),
                signature: this._generateRandomKey()
            };
            await this.store.saveSignedPreKey(1, signedPreKey);

            // Upload to server
            await this._uploadKeysToServer(identityKey, registrationId, prekeys, signedPreKey);

            console.log('✅ Encryption keys generated and uploaded successfully');
        } catch (error) {
            console.error('Error generating keys:', error);
            throw error;
        }
    }

    /**
     * Upload keys to the backend
     */
    async _uploadKeysToServer(identityKey, registrationId, prekeys, signedPreKey) {
        try {
            // Upload identity key
            await fetch(`${API_URL}/keys/identity`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userId: this.userId,
                    identityKey,
                    registrationId
                })
            });

            // Upload prekeys
            await fetch(`${API_URL}/keys/prekeys`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userId: this.userId,
                    prekeys
                })
            });

            // Upload signed prekey
            await fetch(`${API_URL}/keys/signed-prekey`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userId: this.userId,
                    keyId: signedPreKey.keyId,
                    publicKey: signedPreKey.publicKey,
                    signature: signedPreKey.signature
                })
            });
        } catch (error) {
            console.error('Error uploading keys to server:', error);
            throw error;
        }
    }

    /**
     * Encrypt a message for a recipient
     */
    async encryptMessage(recipientId, plaintext) {
        if (!this.initialized) {
            throw new Error('Encryption service not initialized');
        }

        try {
            // Check if we have a session with this recipient
            const hasSession = await this.store.sessionExists(recipientId);

            if (!hasSession) {
                // Build new session
                await this._buildSession(recipientId);
            }

            // For this simplified version, we'll use basic encryption
            // In production, use SessionCipher from libsignal-client
            const encrypted = this._simpleEncrypt(plaintext);

            return {
                ciphertext: encrypted,
                type: hasSession ? 'message' : 'prekey_message'
            };
        } catch (error) {
            console.error('Error encrypting message:', error);
            throw error;
        }
    }

    /**
     * Decrypt a message from a sender
     */
    async decryptMessage(senderId, ciphertext, type) {
        if (!this.initialized) {
            throw new Error('Encryption service not initialized');
        }

        try {
            // For this simplified version, we'll use basic decryption
            // In production, use SessionCipher from libsignal-client
            const plaintext = this._simpleDecrypt(ciphertext);

            // Save session if it's a new prekey message
            if (type === 'prekey_message') {
                await this.store.saveSession(senderId, { established: true });
            }

            return plaintext;
        } catch (error) {
            console.error('Error decrypting message:', error);
            throw error;
        }
    }

    /**
     * Build a session with a recipient by fetching their prekey bundle
     */
    async _buildSession(recipientId) {
        try {
            const response = await fetch(`${API_URL}/keys/bundle/${recipientId}`);
            const bundle = await response.json();

            if (!bundle || !bundle.identityKey) {
                throw new Error('Recipient has not set up encryption');
            }

            // In production, use SessionBuilder from libsignal-client
            // For now, just mark session as established
            await this.store.saveSession(recipientId, {
                established: true,
                recipientIdentityKey: bundle.identityKey
            });

            console.log(`Session established with user ${recipientId}`);
        } catch (error) {
            console.error('Error building session:', error);
            throw error;
        }
    }

    /**
     * Helper: Generate a random key (simplified)
     * In production, use proper cryptographic key generation
     */
    _generateRandomKey() {
        return Array.from({ length: 32 }, () =>
            Math.floor(Math.random() * 256).toString(16).padStart(2, '0')
        ).join('');
    }

    /**
     * Helper: Simple encryption (for demonstration only!)
     * In production, use SessionCipher from libsignal-client
     */
    _simpleEncrypt(plaintext) {
        // This is NOT secure! Just for demonstration
        return Buffer.from(plaintext).toString('base64');
    }

    /**
     * Helper: Simple decryption (for demonstration only!)
     * In production, use SessionCipher from libsignal-client
     */
    _simpleDecrypt(ciphertext) {
        // This is NOT secure! Just for demonstration
        return Buffer.from(ciphertext, 'base64').toString('utf-8');
    }

    /**
     * Check if encryption is available for a recipient
     */
    async isEncryptionAvailable(recipientId) {
        try {
            const response = await fetch(`${API_URL}/keys/bundle/${recipientId}`);
            return response.ok;
        } catch (error) {
            return false;
        }
    }

    /**
     * Get encryption status
     */
    getStatus() {
        return {
            initialized: this.initialized,
            userId: this.userId
        };
    }
}

// Export singleton instance
const signalProtocolService = new SignalProtocolService();
export default signalProtocolService;
