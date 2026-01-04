/**
 * UniSphere V2 DESIGN SYSTEM - "Organic Earth" Style 🌿
 * A calming, grounded, and humane aesthetic for campus life.
 */

export const EARTH_COLORS = {
    // Primary Palette (Natural Grounding)
    sage: '#7D8E74',      // Soft muted green (Backgrounds)
    terracotta: '#BC7C6C', // Warm clay (Accents/Actions)
    sand: '#EAE0D5',      // Light papyrus (Cards/Surfaces in Light Mode)
    slate: '#22333B',     // Deep charcoal (Text/Main Dark Background)
    cream: '#F5EBE0',     // Soft ivory

    // Functional Palette
    bgDark: '#1A2321',    // Deep Forest/Midnight for Dark Mode
    bgCard: '#242F2D',    // Deep Moss for Cards in Dark Mode
    bgLight: '#F5EBE0',   // Cream for Light Mode
    bgCardLight: '#FFFFFF',

    // Accents
    accentPrimary: '#BC7C6C',   // Terracotta
    accentSecondary: '#7D8E74', // Sage
    accentTertiary: '#AB947E',  // Warm Bark

    // Status
    success: '#6B8E23', // Olive Drab
    error: '#C2410C',   // Deep Burnt Orange
    warning: '#D97706', // Amber

    // Text
    textMain: '#FDFCFB',    // Soft White for Dark Mode
    textMuted: '#9BA3A0',   // Muted Moss for Dark Mode
    textDim: '#6A7B76',     // Muted sage-grey for Dark Mode
    textMainLight: '#22333B', // Deep Slate for Light Mode
    textMutedLight: '#5C677D', // Storm Blue for Light Mode
    textDimLight: '#8E9CA3',   // Slate-grey for Light Mode
};

export const COLORS = EARTH_COLORS;

export const SIZES = {
    padding: 20,
    margin: 16,
    radiusSmall: 8,
    radiusMedium: 16,
    radiusLarge: 28, // More fluid, rounded shapes
    radiusExtraLarge: 40,
    radiusFull: 99,
};

export const FONTS = {
    // Note: Use Serif fonts (like Playfair Display/Georgia) for Headers if possible
    header: 'PlayfairDisplay-Bold',
    subHeader: 'PlayfairDisplay-SemiBold',
    body: 'Inter-Regular',
    bodyBold: 'Inter-Bold',
};

export const SHADOWS = {
    soft: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 10,
        elevation: 3,
    },
    deep: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.15,
        shadowRadius: 20,
        elevation: 8,
    }
};

// Legacy Compatibility for V2 transition
export const GLASS = {
    intensity: 20,
    tint: 'dark',
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderWidth: 1,
};
