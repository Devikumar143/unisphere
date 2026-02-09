const TextEncodingPolyfill = require('text-encoding');

// Aggressively overwrite native TextDecoder
// Hermes includes a partial TextDecoder implementation that doesn't support utf-16le
// We must replace it with the polyfill.

try {
    // Attempt to delete first
    delete global.TextEncoder;
    delete global.TextDecoder;
} catch (e) {
    console.log('[Polyfills] Failed to delete native TextDecoder:', e);
}

Object.defineProperties(global, {
    TextEncoder: {
        value: TextEncodingPolyfill.TextEncoder,
        writable: true,
        enumerable: false,
        configurable: true,
    },
    TextDecoder: {
        value: TextEncodingPolyfill.TextDecoder,
        writable: true,
        enumerable: false,
        configurable: true,
    },
});

console.log('[Polyfills] Applied TextEncoding polyfill.');
import 'react-native-get-random-values';
import { Buffer } from 'buffer';
global.Buffer = Buffer;
