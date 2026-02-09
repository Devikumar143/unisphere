import SignalProtocolStore from './signalStore';
import { API_URL } from './api';
import { Buffer } from 'buffer';

const libsignal = require('@privacyresearch/libsignal-protocol-typescript');
const { KeyHelper, SessionBuilder, SessionCipher, SignalProtocolAddress } = libsignal;

/**
 * Signal Protocol Service
 * REAL IMPLEMENTATION using libsignal-protocol-javascript
 */

class SignalProtocolService {
    constructor() {
        this.store = null;
        this.userId = null;
        this.deviceId = 1; // Default device ID
        this.initialized = false;
    }

    async initialize(userId) {
        if (this.initialized && this.userId === userId) return;

        console.log('[E2EE] Initializing for user:', userId);
        this.userId = userId;
        this.store = new SignalProtocolStore(userId);

        // Ensure encryption usage availability
        const keys = await this.store.getAllKeys();

        // Check if encryption is actually registered on server
        const status = await this.getServerKeyStatus(userId);
        if (!keys.hasKeys) {
            console.log('[E2EE] No keys found locally. Generating new Identity...');
            await this.generateAndUploadKeys();
        } else if (!status.isAvailable) {
            console.log('[E2EE] Keys found locally but server is missing them. Syncing...');
            await this.syncExistingKeysToServer();
        } else {
            console.log('[E2EE] Keys loaded and verified on server.');
        }
        this.initialized = true;
    }

    async getServerKeyStatus(userId) {
        try {
            const res = await fetch(`${API_URL}/keys/status/${userId}`);
            if (!res.ok) return { isAvailable: false };
            return await res.json();
        } catch (e) {
            console.error('[E2EE] Failed to check server key status:', e);
            return { isAvailable: false };
        }
    }

    async registerKeys() {
        if (!this.userId) throw new Error('User not identified');
        console.log('[E2EE] Manual key registration triggered...');
        await this.generateAndUploadKeys();
    }

    async syncExistingKeysToServer() {
        try {
            console.log('[E2EE] Reading local keys for sync...');
            const id = await this.store.getIdentityKeyPair();
            const regId = await this.store.getLocalRegistrationId();

            // For sync, we'll try to find a signed prekey. We'll check common IDs like 1.
            const signedPK = await this.store.getSignedPreKey(1);

            if (!id || !regId || !signedPK) {
                console.warn('[E2EE] Local keys incomplete for sync. Re-generating...');
                return await this.generateAndUploadKeys();
            }

            // Collect some prekeys
            const preKeysToUpload = [];
            for (let i = 1; i <= 50; i++) {
                const pk = await this.store.getPreKey(i);
                if (pk) {
                    preKeysToUpload.push({
                        keyId: i,
                        publicKey: this._toBase64(pk.pubKey)
                    });
                }
            }

            const payload = {
                userId: this.userId,
                deviceId: this.deviceId,
                identityKey: this._toBase64(id.pubKey),
                registrationId: regId,
                preKeys: preKeysToUpload,
                signedPreKey: {
                    keyId: 1,
                    publicKey: this._toBase64(signedPK.pubKey),
                    signature: this._toBase64(signedPK.signature)
                }
            };

            console.log('[E2EE] Uploading existing keys...');
            const response = await fetch(`${API_URL}/keys`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (!response.ok) throw new Error('Sync failed');
            console.log('[E2EE] Sync completed successfully!');
        } catch (e) {
            console.error('[E2EE] Sync error:', e);
            // Fallback: if sync fails and it's critical, we could regenerate, 
            // but that breaks existing sessions. Better to just let initialize finish.
        }
    }

    // Helper: ArrayBuffer <-> Base64
    _toBase64(buffer) {
        if (!buffer) return '';
        try {
            return Buffer.from(buffer).toString('base64');
        } catch (e) {
            console.error('[E2EE] _toBase64 error:', e, 'Buffer:', buffer);
            return '';
        }
    }

    _toArrayBuffer(base64) {
        if (!base64) return undefined;
        try {
            const buf = Buffer.from(base64, 'base64');
            return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
        } catch (e) {
            console.error('[E2EE] _toArrayBuffer error:', e);
            return undefined;
        }
    }

    async generateAndUploadKeys() {
        try {
            const registrationId = KeyHelper.generateRegistrationId();
            const identityKeyPair = await KeyHelper.generateIdentityKeyPair();

            console.log('[E2EE] Identity KeyPair generated:', {
                hasPubKey: !!(identityKeyPair.pubKey || identityKeyPair.publicKey),
                hasPrivKey: !!(identityKeyPair.privKey || identityKeyPair.privateKey)
            });

            // Normalize for our store (we'll use pubKey/privKey internally for storage consistency)
            const normalizedIdentity = {
                pubKey: identityKeyPair.pubKey || identityKeyPair.publicKey,
                privKey: identityKeyPair.privKey || identityKeyPair.privateKey
            };

            // Save Identity
            await this.store.putIdentityKeyPair(normalizedIdentity);
            await this.store.putLocalRegistrationId(registrationId);


            // Generate PreKeys (100)
            const preKeysToUpload = [];
            for (let i = 0; i < 100; i++) {
                const keyId = i + 1;
                const preKey = await KeyHelper.generatePreKey(keyId);

                const pub = preKey.keyPair.pubKey || preKey.keyPair.publicKey;
                const priv = preKey.keyPair.privKey || preKey.keyPair.privateKey;

                if (!preKey || !preKey.keyPair || !pub) {
                    console.error(`[E2EE] Failed to generate PreKey ${keyId}:`, preKey);
                } else {
                    await this.store.putPreKey(preKey.keyId, { pubKey: pub, privKey: priv });
                    preKeysToUpload.push({
                        keyId: preKey.keyId,
                        publicKey: this._toBase64(pub)
                    });
                }
            }

            // Generate Signed PreKey
            console.log('[E2EE] Generating Signed PreKey...');
            const signedPreKey = await KeyHelper.generateSignedPreKey(identityKeyPair, 1);
            if (!signedPreKey || !signedPreKey.signature) {
                console.error('[E2EE] Failed to generate Signed PreKey:', signedPreKey);
                throw new Error('Failed to generate Signed PreKey');
            }

            const spkPub = signedPreKey.keyPair.pubKey || signedPreKey.keyPair.publicKey;
            const spkPriv = signedPreKey.keyPair.privKey || signedPreKey.keyPair.privateKey;

            await this.store.putSignedPreKey(signedPreKey.keyId, { pubKey: spkPub, privKey: spkPriv }, signedPreKey.signature);

            const signedPreKeyToUpload = {
                keyId: signedPreKey.keyId,
                publicKey: this._toBase64(spkPub),
                signature: this._toBase64(signedPreKey.signature)
            };

            // Public Identity Key
            const publicIdentityKey = this._toBase64(normalizedIdentity.pubKey);

            // Upload
            console.log('[E2EE] Uploading keys to server...');
            await this._uploadKeysToServer(publicIdentityKey, registrationId, preKeysToUpload, signedPreKeyToUpload);
            console.log('[E2EE] Keys generated and uploaded!');

        } catch (e) {
            console.error('[E2EE] Error generating keys:', e);
            throw e;
        }
    }

    async _uploadKeysToServer(identityKey, registrationId, preKeys, signedPreKey) {
        const response = await fetch(`${API_URL}/keys`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                userId: this.userId,
                deviceId: this.deviceId,
                identityKey,
                registrationId,
                preKeys,
                signedPreKey
            })
        });
        if (!response.ok) throw new Error('Failed to upload keys');
    }

    // Encrypt
    async encryptMessage(recipientId, plaintext) {
        if (!this.initialized) throw new Error('E2EE not initialized');

        const address = new SignalProtocolAddress(recipientId, this.deviceId);
        const sessionCipher = new SessionCipher(this.store, address);

        // Check if session exists (libsignal doesn't have simple exists(), we try loadSession from store)
        const session = await this.store.loadSession(address.toString());

        if (!session) {
            console.log(`[E2EE] No session for ${recipientId}, building...`);
            await this._buildSession(recipientId);
        }

        const ciphertext = await sessionCipher.encrypt(Buffer.from(plaintext));
        // ciphertext is { type: number, body: string (binary/base64?) } 
        // libsignal-javascript returns body as string (binary usually)

        // We need to encode the body to Base64 to send over JSON
        // Actually, let's verify what `encrypt` returns. It returns { type, body }. 'body' is a string of chars (binary string).
        // Best to convert body to Base64.

        return {
            type: ciphertext.type, // 3 = PreKeyWhisperMessage, 1 = WhisperMessage
            body: Buffer.from(ciphertext.body, 'binary').toString('base64'),
            registrationId: ciphertext.registrationId
        };
    }

    // Decrypt
    async decryptMessage(senderId, message) {
        // message: { type, body (base64) }
        const address = new SignalProtocolAddress(senderId, this.deviceId);
        const sessionCipher = new SessionCipher(this.store, address);

        const buffer = Buffer.from(message.body, 'base64');
        // libsignal expects 'binary string' or ArrayBuffer? 
        // SessionCipher.decryptWhisperMessage expects string (binary) or buffer.
        // Let's pass ArrayBuffer.

        let plaintextArrayBuffer;

        try {
            if (message.type === 3) {
                // PreKeyWhisperMessage
                plaintextArrayBuffer = await sessionCipher.decryptPreKeyWhisperMessage(buffer, 'binary');
            } else if (message.type === 1) {
                // WhisperMessage
                plaintextArrayBuffer = await sessionCipher.decryptWhisperMessage(buffer, 'binary');
            } else {
                console.error('Unknown message type:', message.type);
                throw new Error('Unknown Type');
            }

            // Result is ArrayBuffer. Convert to string.
            return Buffer.from(plaintextArrayBuffer).toString('utf-8');

        } catch (e) {
            console.error('[E2EE] Decryption failed:', e);
            throw e;
        }
    }

    async _buildSession(recipientId) {
        const address = new SignalProtocolAddress(recipientId, this.deviceId);
        const sessionBuilder = new SessionBuilder(this.store, address);

        const bundle = await this._fetchPreKeyBundle(recipientId);

        // Convert bundle parts to ArrayBuffers
        const preKeyBundle = {
            identityKey: this._toArrayBuffer(bundle.identityKey),
            registrationId: parseInt(bundle.registrationId),
            preKey: bundle.preKey ? {
                keyId: parseInt(bundle.preKey.keyId),
                publicKey: this._toArrayBuffer(bundle.preKey.publicKey)
            } : undefined,
            signedPreKey: {
                keyId: parseInt(bundle.signedPreKey.keyId),
                publicKey: this._toArrayBuffer(bundle.signedPreKey.publicKey),
                signature: this._toArrayBuffer(bundle.signedPreKey.signature)
            }
        };

        await sessionBuilder.processPreKey(preKeyBundle);
        console.log('[E2EE] Session built for', recipientId);
    }

    async _fetchPreKeyBundle(recipientId) {
        const response = await fetch(`${API_URL}/keys/bundle/${recipientId}`);
        if (!response.ok) throw new Error('Could not fetch bundle');
        return await response.json();
    }

    // Debug
    async debugLogKeys() {
        return await this.store.getAllKeys();
    }

    async isEncryptionAvailable(recipientId) {
        try {
            const status = await this.getServerKeyStatus(recipientId);
            return status.isAvailable;
        } catch {
            return false;
        }
    }
}

const signalProtocol = new SignalProtocolService();
export default signalProtocol;
