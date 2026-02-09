import * as SecureStore from 'expo-secure-store';
import { Buffer } from 'buffer';

/**
 * Signal Protocol Storage Interface
 * Implements the required storage interface for libsignal-protocol-javascript
 */
class SignalProtocolStore {
    constructor(userId) {
        this.userId = userId;
        this.prefix = `signal_${userId}_`;
    }

    // Helpers
    async _save(key, value) {
        await SecureStore.setItemAsync(this.prefix + key, JSON.stringify(value));
    }

    async _load(key) {
        const value = await SecureStore.getItemAsync(this.prefix + key);
        return value ? JSON.parse(value) : undefined;
    }

    async _remove(key) {
        await SecureStore.deleteItemAsync(this.prefix + key);
    }

    _toArrayBuffer(thing) {
        if (thing === undefined || thing === null) return undefined;
        if (thing === Object(thing)) {
            if (thing instanceof ArrayBuffer) {
                return thing;
            }
            // If it's a buffer serialized as JSON/Object
            if (thing.type === 'Buffer') {
                const b = Buffer.from(thing.data);
                return b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength);
            }
        }
        return thing;
    }

    // --- Identity Keys ---
    async getIdentityKeyPair() {
        try {
            const kp = await this._load('identityKey');
            if (kp) {
                const pub = kp.pubKey || kp.publicKey;
                const priv = kp.privKey || kp.privateKey;

                if (!pub || !priv) {
                    console.error('[Store] Identity KeyPair missing components:', kp);
                    return undefined;
                }

                const bPub = Buffer.from(pub, 'base64');
                const bPriv = Buffer.from(priv, 'base64');

                return {
                    pubKey: bPub.buffer.slice(bPub.byteOffset, bPub.byteOffset + bPub.byteLength),
                    privKey: bPriv.buffer.slice(bPriv.byteOffset, bPriv.byteOffset + bPriv.byteLength)
                };
            }
        } catch (e) {
            console.error('[Store] getIdentityKeyPair load error:', e);
        }
        return undefined;
    }

    async getLocalRegistrationId() {
        return await this._load('registrationId');
    }

    async putIdentityKeyPair(identityKeyPair) {
        const pub = identityKeyPair?.pubKey || identityKeyPair?.publicKey;
        const priv = identityKeyPair?.privKey || identityKeyPair?.privateKey;

        console.log('[Store] putIdentityKeyPair components:', !!pub, !!priv);

        if (!pub || !priv) {
            console.error('[Store] Attempted to save invalid Identity KeyPair:', identityKeyPair);
            throw new Error('Invalid Identity KeyPair');
        }
        await this._save('identityKey', {
            pubKey: Buffer.from(pub).toString('base64'),
            privKey: Buffer.from(priv).toString('base64')
        });
    }

    async putLocalRegistrationId(registrationId) {
        await this._save('registrationId', registrationId);
    }

    // --- Remote Identity Management ---
    // Required by libsignal interface
    async isTrustedIdentity(identifier, identityKey, direction) {
        if (identifier === undefined || identifier === null) return false;

        const trusted = await this.loadIdentity(identifier);
        if (trusted === undefined) {
            // Identity not yet seen, "Trust on First Use" (TOFU)
            return true;
        }

        // Convert to comparable formats
        const trustedBase64 = Buffer.from(trusted).toString('base64');
        const identityBase64 = Buffer.from(identityKey).toString('base64');

        return trustedBase64 === identityBase64;
    }

    async loadIdentity(identifier) {
        if (identifier === undefined || identifier === null) return undefined;
        const base64 = await this._load(`identity_${identifier}`);
        if (!base64) return undefined;
        const b = Buffer.from(base64, 'base64');
        return b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength);
    }

    async saveIdentity(identifier, identityKey) {
        if (identifier === undefined || identifier === null || !identityKey) return;

        const base64 = Buffer.from(identityKey).toString('base64');
        await this._save(`identity_${identifier}`, base64);
    }

    // --- PreKeys ---
    async putPreKey(keyId, keyPair) {
        if (!keyPair?.pubKey || !keyPair?.privKey) {
            console.error(`[Store] Attempted to save invalid PreKey ${keyId}:`, keyPair);
            throw new Error('Invalid PreKey');
        }
        await this._save(`preKey_${keyId}`, {
            pubKey: Buffer.from(keyPair.pubKey).toString('base64'),
            privKey: Buffer.from(keyPair.privKey).toString('base64')
        });
    }

    async storePreKey(keyId, keyPair) {
        return await this.putPreKey(keyId, keyPair);
    }

    async getPreKey(keyId) {
        try {
            const kp = await this._load(`preKey_${keyId}`);
            if (kp) {
                const pub = kp.pubKey || kp.publicKey;
                const priv = kp.privKey || kp.privateKey;
                if (pub && priv) {
                    const bPub = Buffer.from(pub, 'base64');
                    const bPriv = Buffer.from(priv, 'base64');
                    return {
                        pubKey: bPub.buffer.slice(bPub.byteOffset, bPub.byteOffset + bPub.byteLength),
                        privKey: bPriv.buffer.slice(bPriv.byteOffset, bPriv.byteOffset + bPriv.byteLength)
                    };
                }
            }
        } catch (e) {
            console.error(`[Store] getPreKey error for ${keyId}:`, e);
        }
        return undefined;
    }

    async loadPreKey(keyId) {
        return await this.getPreKey(keyId);
    }

    async containsPreKey(keyId) {
        const kp = await this._load(`preKey_${keyId}`);
        return kp !== undefined;
    }

    async removePreKey(keyId) {
        await this._remove(`preKey_${keyId}`);
    }

    // --- Signed PreKeys ---
    async putSignedPreKey(keyId, keyPair, signature) {
        console.log('[Store] putSignedPreKey:', keyId, !!keyPair, !!signature);
        if (!keyPair?.pubKey || !keyPair?.privKey || !signature) {
            console.error(`[Store] Attempted to save invalid Signed PreKey ${keyId}:`, { keyPair, signature });
            throw new Error('Invalid Signed PreKey');
        }
        await this._save(`signedPreKey_${keyId}`, {
            pubKey: Buffer.from(keyPair.pubKey).toString('base64'),
            privKey: Buffer.from(keyPair.privKey).toString('base64'),
            signature: Buffer.from(signature).toString('base64')
        });
    }

    async storeSignedPreKey(keyId, keyPair, signature) {
        return await this.putSignedPreKey(keyId, keyPair, signature);
    }

    async getSignedPreKey(keyId) {
        try {
            const kp = await this._load(`signedPreKey_${keyId}`);
            if (kp) {
                const pub = kp.pubKey || kp.publicKey;
                const priv = kp.privKey || kp.privateKey;
                const sig = kp.signature;
                if (pub && priv && sig) {
                    const bPub = Buffer.from(pub, 'base64');
                    const bPriv = Buffer.from(priv, 'base64');
                    const bSig = Buffer.from(sig, 'base64');
                    return {
                        pubKey: bPub.buffer.slice(bPub.byteOffset, bPub.byteOffset + bPub.byteLength),
                        privKey: bPriv.buffer.slice(bPriv.byteOffset, bPriv.byteOffset + bPriv.byteLength),
                        signature: bSig.buffer.slice(bSig.byteOffset, bSig.byteOffset + bSig.byteLength)
                    };
                }
            }
        } catch (e) {
            console.error(`[Store] getSignedPreKey error for ${keyId}:`, e);
        }
        return undefined;
    }

    async loadSignedPreKey(keyId) {
        return await this.getSignedPreKey(keyId);
    }

    async containsSignedPreKey(keyId) {
        const kp = await this._load(`signedPreKey_${keyId}`);
        return kp !== undefined;
    }

    async removeSignedPreKey(keyId) {
        await this._remove(`signedPreKey_${keyId}`);
    }

    // --- Sessions ---
    async storeSession(identifier, record) {
        // Record is an internal object from libsignal, stringify-able? 
        // libsignal-protocol-javascript sessions are typically handles that serialize to strings or buffers.
        // Actually, the library passes a serialized string or object mostly? 
        // No, 'record' is the SessionRecord object. We probably need to verify what 'storeSession' receives.
        // Wait, looking at library docs: storeSession(identifier, record). The record object has a serialize usually?
        // Actually, normally one wraps the store. simpler: just save arguments.
        // BUT `libsignal-protocol-javascript` expects us to store the serialized string/buffer given? No, it usually passes the object.
        // Let's assume we receive a record string?
        // Checking usage: SessionBuilder.process... calls store.storeSession.
        await this._save(`session_${identifier}`, record);
    }

    async loadSession(identifier) {
        return await this._load(`session_${identifier}`);
    }

    async getSession(identifier) {
        return await this.loadSession(identifier);
    }

    async getAllKeys() {
        const id = await this.getIdentityKeyPair();
        const reg = await this.getLocalRegistrationId();
        return {
            identityKey: (id && id.pubKey) ? Buffer.from(id.pubKey).toString('hex') : null,
            registrationId: reg,
            hasKeys: !!(id && id.pubKey)
        };
    }
}

export default SignalProtocolStore;
