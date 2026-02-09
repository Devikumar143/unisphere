import React, { createContext, useState, useContext, useEffect } from 'react';
import { EARTH_COLORS } from '../constants/theme';
import AsyncStorage from '@react-native-async-storage/async-storage';

const ThemeContext = createContext();

export const ThemeProvider = ({ children }) => {
    const [isDark, setIsDark] = useState(false); // Default to light mode for Organic Earth

    useEffect(() => {
        loadTheme();
    }, []);

    const loadTheme = async () => {
        try {
            const savedTheme = await AsyncStorage.getItem('user_theme');
            if (savedTheme !== null) {
                setIsDark(savedTheme === 'dark');
            }
        } catch (e) {
            console.error('Failed to load theme', e);
        }
    };

    const toggleTheme = async () => {
        const newMode = !isDark;
        setIsDark(newMode);
        try {
            await AsyncStorage.setItem('user_theme', newMode ? 'dark' : 'light');
        } catch (e) {
            console.error('Failed to save theme', e);
        }
    };

    const themeColors = {
        ...EARTH_COLORS,
        // Override standard colors based on mode
        bgDark: isDark ? EARTH_COLORS.bgDark : EARTH_COLORS.bgLight,
        bgCard: isDark ? EARTH_COLORS.bgCard : EARTH_COLORS.bgCardLight,
        textMain: isDark ? EARTH_COLORS.textMain : EARTH_COLORS.textMainLight,
        textMuted: isDark ? EARTH_COLORS.textMuted : EARTH_COLORS.textMutedLight,
        textDim: isDark ? EARTH_COLORS.textDim : EARTH_COLORS.textDimLight,
    };

    return (
        <ThemeContext.Provider value={{ isDark, toggleTheme, themeColors }}>
            {children}
        </ThemeContext.Provider>
    );
};

export const useTheme = () => useContext(ThemeContext);
