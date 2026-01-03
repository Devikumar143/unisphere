export const DARK_COLORS = {
    // Primary Palette (Peaceful Dark)
    bgDark: '#0f172a', // Deep Slate instead of pure black
    bgCard: 'rgba(30, 41, 59, 0.7)', // Frosted Slate


    // Accents (Serene/Muted)
    accentPrimary: '#818cf8', // Soft Indigo
    accentSecondary: '#c084fc', // Soft Purple
    accentSuccess: '#34d399',
    accentError: '#f87171',

    // Text
    textMain: '#f8fafc', // Cloud White
    textMuted: '#94a3b8', // Slate 400
    textDim: '#64748b', // Slate 500

    // Semantic
    border: 'rgba(255, 255, 255, 0.08)',
    shadow: 'rgba(0, 0, 0, 0.4)',
};

export const LIGHT_COLORS = {
    // Primary Palette (Zen Peace)
    bgDark: '#f8fafc', // Alice Blue / Pure Peace
    bgCard: '#ffffff', // Clean White

    // Accents (Nature/Sky)
    accentPrimary: '#6366f1', // Indigo
    accentSecondary: '#a855f7', // Purple
    accentSuccess: '#10b981',
    accentError: '#ef4444',

    // Text
    textMain: '#1e293b', // Deep Slate (Softer than black)
    textMuted: '#64748b', // Slate 500
    textDim: '#94a3b8', // Slate 400

    // Semantic
    border: 'rgba(0, 0, 0, 0.05)',
    shadow: 'rgba(0, 0, 0, 0.04)',
};

export const COLORS = DARK_COLORS; // Default for compat

export const SIZES = {
    padding: 24,
    radiusSmall: 12,
    radiusMedium: 20,
    radiusLarge: 32,
    radiusFull: 99,
};

export const GLASS = {
    intensity: 40,
    tint: 'dark', // We'll handle this dynamically in components
    borderColor: 'rgba(255, 255, 255, 0.15)',
    borderWidth: 1,
};
