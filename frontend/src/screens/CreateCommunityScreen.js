import React, { useState, useRef, useEffect } from 'react';
import { StyleSheet, View, Text, TextInput, TouchableOpacity, ScrollView, Alert, Modal, Animated, Easing } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../context/ThemeContext';
import { COLORS, SIZES } from '../constants/theme';
import { ArrowLeft, Check, CheckCircle } from 'lucide-react-native';
import { createCommunity } from '../services/api';
import { BlurView } from 'expo-blur';

export default function CreateCommunityScreen({ user, onBack }) {
    const { isDark, themeColors } = useTheme();
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [icon, setIcon] = useState('👥');
    const [updating, setUpdating] = useState(false);
    const [showSuccess, setShowSuccess] = useState(false);

    // Animation refs
    const scaleAnim = useRef(new Animated.Value(0)).current;
    const opacityAnim = useRef(new Animated.Value(0)).current;

    const [auraAnim] = useState(new Animated.Value(0));

    useEffect(() => {
        Animated.loop(
            Animated.sequence([
                Animated.timing(auraAnim, {
                    toValue: 1,
                    duration: 4000,
                    useNativeDriver: true,
                }),
                Animated.timing(auraAnim, {
                    toValue: 0,
                    duration: 4000,
                    useNativeDriver: true,
                }),
            ])
        ).start();
    }, []);

    const handleCreate = async () => {
        if (!name.trim()) {
            Alert.alert('Error', 'Community name is required');
            return;
        }

        setUpdating(true);
        try {
            await createCommunity({
                name,
                description,
                icon,
                type: 'Club',
                userId: user.id
            });

            // Trigger Animation
            setShowSuccess(true);
            Animated.parallel([
                Animated.spring(scaleAnim, {
                    toValue: 1,
                    friction: 5,
                    tension: 40,
                    useNativeDriver: true
                }),
                Animated.timing(opacityAnim, {
                    toValue: 1,
                    duration: 200,
                    useNativeDriver: true
                })
            ]).start();

            // Auto close after 2 seconds
            setTimeout(() => {
                onBack && onBack();
            }, 2000);

        } catch (error) {
            Alert.alert('Error', 'Failed to create community');
            setUpdating(false);
        }
    };

    return (
        <LinearGradient
            colors={[themeColors.bgDark, isDark ? '#1f2b29' : '#e5e7eb']}
            style={styles.container}
        >
            <Animated.View style={[
                styles.auraContainer,
                {
                    opacity: auraAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0.3, 0.6]
                    }),
                    transform: [{
                        scale: auraAnim.interpolate({
                            inputRange: [0, 1],
                            outputRange: [1, 1.2]
                        })
                    }]
                }
            ]}>
                <LinearGradient
                    colors={[isDark ? themeColors.accentPrimary + '30' : themeColors.accentPrimary + '15', 'transparent']}
                    style={styles.aura}
                />
            </Animated.View>

            <SafeAreaView style={styles.safeArea}>
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => onBack && onBack()} style={styles.backBtn}>
                        <ArrowLeft color={themeColors.textMain} size={28} />
                    </TouchableOpacity>
                    <Text style={[styles.headerTitle, { color: themeColors.textMain }]}>Create Community</Text>
                    <View style={{ width: 44 }} />
                </View>

                <ScrollView contentContainerStyle={styles.content}>
                    <View style={styles.inputGroup}>
                        <Text style={[styles.label, { color: themeColors.textMain }]}>Community Name</Text>
                        <TextInput
                            style={[styles.input, { color: themeColors.textMain, backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)', borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)', borderWidth: 1 }]}
                            placeholder="e.g., Photography Club"
                            placeholderTextColor={isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.4)'}
                            value={name}
                            onChangeText={setName}
                        />
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={[styles.label, { color: themeColors.textMain }]}>Icon (Emoji)</Text>
                        <TextInput
                            style={[styles.input, { color: themeColors.textMain, backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)', borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)', borderWidth: 1 }]}
                            placeholder="Select an emoji"
                            placeholderTextColor={isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.4)'}
                            value={icon}
                            onChangeText={setIcon}
                            maxLength={2}
                        />
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={[styles.label, { color: themeColors.textMain }]}>Description</Text>
                        <TextInput
                            style={[styles.input, styles.textArea, { color: themeColors.textMain, backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)', borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)', borderWidth: 1 }]}
                            placeholder="What is this community about?"
                            placeholderTextColor={isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.4)'}
                            value={description}
                            onChangeText={setDescription}
                            multiline
                            textAlignVertical="top"
                        />
                    </View>

                    <TouchableOpacity
                        activeOpacity={0.8}
                        onPress={handleCreate}
                        disabled={updating}
                        style={styles.createBtnWrapper}
                    >
                        <LinearGradient
                            colors={[themeColors.accentPrimary, themeColors.terracotta]}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                            style={styles.createBtn}
                        >
                            <Text style={styles.createBtnText}>
                                {updating ? 'Creating...' : 'Create Community'}
                            </Text>
                        </LinearGradient>
                    </TouchableOpacity>
                </ScrollView>

                {/* Success Modal */}
                <Modal visible={showSuccess} transparent animationType="none">
                    <View style={styles.modalOverlay}>
                        <BlurView intensity={20} tint={isDark ? "dark" : "light"} style={StyleSheet.absoluteFill} />
                        <Animated.View style={[
                            styles.successCard,
                            {
                                backgroundColor: isDark ? 'rgba(30, 41, 59, 0.9)' : 'rgba(255, 255, 255, 0.9)',
                                opacity: opacityAnim,
                                transform: [{ scale: scaleAnim }]
                            }
                        ]}>
                            <View style={[styles.iconCircle, { backgroundColor: '#10B981' }]}>
                                <Check size={40} color="#FFF" />
                            </View>
                            <Text style={[styles.successTitle, { color: themeColors.textMain }]}>Success!</Text>
                            <Text style={{ color: themeColors.textDim, textAlign: 'center' }}>Community created successfully</Text>
                        </Animated.View>
                    </View>
                </Modal>
            </SafeAreaView>
        </LinearGradient>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    safeArea: {
        flex: 1,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: SIZES.padding,
        paddingVertical: 16,
    },
    headerTitle: {
        fontSize: 24,
        fontWeight: '800',
        letterSpacing: -0.5,
    },
    backBtn: {
        width: 44,
        height: 44,
        justifyContent: 'center',
        alignItems: 'center',
    },
    content: {
        padding: SIZES.padding,
        paddingBottom: 40,
    },
    inputGroup: {
        marginBottom: 24,
    },
    label: {
        fontSize: 16,
        marginBottom: 10,
        fontWeight: '700',
        letterSpacing: -0.5,
    },
    input: {
        borderRadius: 18,
        paddingHorizontal: 20,
        paddingVertical: 16,
        fontSize: 16,
        fontWeight: '500',
    },
    textArea: {
        height: 150,
    },
    createBtnWrapper: {
        marginTop: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.3,
        shadowRadius: 12,
        elevation: 8,
    },
    createBtn: {
        height: 60,
        borderRadius: 30,
        justifyContent: 'center',
        alignItems: 'center',
    },
    createBtnText: {
        color: 'white',
        fontSize: 18,
        fontWeight: '800',
        letterSpacing: 0.5,
    },
    // Aura Background
    auraContainer: {
        position: 'absolute',
        top: -150,
        right: -100,
        width: 500,
        height: 500,
        zIndex: 0,
    },
    aura: {
        width: '100%',
        height: '100%',
        borderRadius: 250,
    },
    // Modal Styles
    modalOverlay: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    successCard: {
        width: '85%',
        padding: 32,
        borderRadius: 32,
        alignItems: 'center',
        shadowColor: "#000",
        shadowOffset: {
            width: 0,
            height: 12,
        },
        shadowOpacity: 0.4,
        shadowRadius: 24,
        elevation: 12,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
    },
    iconCircle: {
        width: 88,
        height: 88,
        borderRadius: 44,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 20,
        shadowColor: "#10B981",
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.4,
        shadowRadius: 10,
        elevation: 6
    },
    successTitle: {
        fontSize: 26,
        fontWeight: '900',
        marginBottom: 10,
        letterSpacing: -0.5,
    }
});
