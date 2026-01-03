import React, { useState, useRef, useEffect } from 'react';
import { StyleSheet, View, Text, TextInput, TouchableOpacity, ScrollView, Alert, Modal, Animated, Easing } from 'react-native';
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
        <View style={[styles.container, { backgroundColor: themeColors.bgDark }]}>
            <SafeAreaView style={styles.safeArea}>
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => onBack && onBack()} style={styles.backBtn}>
                        <ArrowLeft color={themeColors.textMain} size={24} />
                    </TouchableOpacity>
                    <Text style={[styles.headerTitle, { color: themeColors.textMain }]}>Create Community</Text>
                    <View style={{ width: 24 }} />
                </View>

                <ScrollView contentContainerStyle={styles.content}>
                    <View style={styles.inputGroup}>
                        <Text style={[styles.label, { color: themeColors.textDim }]}>Community Name</Text>
                        <TextInput
                            style={[styles.input, { color: themeColors.textMain, backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#F1F5F9' }]}
                            placeholder="e.g., Photography Club"
                            placeholderTextColor={themeColors.textDim}
                            value={name}
                            onChangeText={setName}
                        />
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={[styles.label, { color: themeColors.textDim }]}>Icon (Emoji)</Text>
                        <TextInput
                            style={[styles.input, { color: themeColors.textMain, backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#F1F5F9' }]}
                            placeholder="Select an emoji"
                            placeholderTextColor={themeColors.textDim}
                            value={icon}
                            onChangeText={setIcon}
                            maxLength={2}
                        />
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={[styles.label, { color: themeColors.textDim }]}>Description</Text>
                        <TextInput
                            style={[styles.input, styles.textArea, { color: themeColors.textMain, backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#F1F5F9' }]}
                            placeholder="What is this community about?"
                            placeholderTextColor={themeColors.textDim}
                            value={description}
                            onChangeText={setDescription}
                            multiline
                            textAlignVertical="top"
                        />
                    </View>

                    <TouchableOpacity
                        style={[styles.createBtn, { backgroundColor: themeColors.accentPrimary }]}
                        onPress={handleCreate}
                        disabled={updating}
                    >
                        <Text style={styles.createBtnText}>{updating ? 'Creating...' : 'Create Community'}</Text>
                    </TouchableOpacity>
                </ScrollView>

                {/* Success Modal */}
                <Modal visible={showSuccess} transparent animationType="none">
                    <View style={styles.modalOverlay}>
                        <BlurView intensity={20} tint="dark" style={StyleSheet.absoluteFill} />
                        <Animated.View style={[
                            styles.successCard,
                            {
                                backgroundColor: isDark ? '#1E293B' : '#FFF',
                                opacity: opacityAnim,
                                transform: [{ scale: scaleAnim }]
                            }
                        ]}>
                            <View style={[styles.iconCircle, { backgroundColor: '#10B981' }]}>
                                <Check size={40} color="#FFF" />
                            </View>
                            <Text style={[styles.successTitle, { color: isDark ? '#FFF' : '#000' }]}>Success!</Text>
                            <Text style={{ color: themeColors.textDim, textAlign: 'center' }}>Community created successfully</Text>
                        </Animated.View>
                    </View>
                </Modal>
            </SafeAreaView>
        </View>
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
        paddingVertical: 10,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255,255,255,0.05)',
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: 'bold',
    },
    content: {
        padding: 20,
    },
    inputGroup: {
        marginBottom: 20,
    },
    label: {
        fontSize: 14,
        marginBottom: 8,
        fontWeight: '600',
    },
    input: {
        borderRadius: 12,
        paddingHorizontal: 16,
        paddingVertical: 12,
        fontSize: 16,
    },
    textArea: {
        height: 120,
    },
    createBtn: {
        height: 50,
        borderRadius: 25,
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 20,
    },
    createBtnText: {
        color: 'white',
        fontSize: 16,
        fontWeight: 'bold',
    },
    // Modal Styles
    modalOverlay: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.5)'
    },
    successCard: {
        width: '80%',
        padding: 30,
        borderRadius: 24,
        alignItems: 'center',
        shadowColor: "#000",
        shadowOffset: {
            width: 0,
            height: 10,
        },
        shadowOpacity: 0.3,
        shadowRadius: 20,
        elevation: 10,
    },
    iconCircle: {
        width: 80,
        height: 80,
        borderRadius: 40,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 16,
        shadowColor: "#10B981",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 5
    },
    successTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        marginBottom: 8
    }
});
