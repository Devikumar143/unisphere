import React, { useState } from 'react';
import { StyleSheet, View, Text, TextInput, TouchableOpacity, ActivityIndicator, Alert, ScrollView, Image } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { ArrowLeft, Save, User, MapPin, BookOpen, Quote, AtSign, Camera } from 'lucide-react-native';
import { COLORS, SIZES, GLASS } from '../constants/theme';
import { useTheme } from '../context/ThemeContext';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { updateUserProfile, uploadUserAvatar } from '../services/api';

export default function EditProfileScreen({ user, onBack, onUpdateSuccess }) {
    const { themeColors, isDark } = useTheme();
    // Initialize form with current user data (passed via props)
    // Note: 'user' prop here might be the full profile object or the basic user object.
    // For MVP, we presume basics. 

    const [formData, setFormData] = useState({
        name: user?.name || user?.full_name || '',
        username: user?.username || '',
        department: user?.department || '',
        location: user?.location || '',
        bio: user?.bio || '',
    });
    const [avatar, setAvatar] = useState(user?.avatar || null);
    const [loading, setLoading] = useState(false);

    const pickImage = async () => {
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.5,
        });

        if (!result.canceled) {
            setAvatar(result.assets[0].uri);
        }
    };

    const handleSave = async () => {
        if (!formData.name) {
            Alert.alert("Error", "Name cannot be empty");
            return;
        }

        setLoading(true);
        try {
            let finalAvatar = user?.avatar;

            // Upload Avatar if changed (local URI)
            if (avatar && avatar !== user?.avatar && !avatar.startsWith('http')) {
                finalAvatar = await uploadUserAvatar(user.id, avatar);
            }

            const updatedUserRes = await updateUserProfile(user.id, formData);

            // Merge avatar into the result
            const finalUser = {
                ...updatedUserRes.user,
                avatar: finalAvatar
            };

            Alert.alert("Success", "Profile updated!");
            onUpdateSuccess(finalUser);
            onBack();
        } catch (error) {
            Alert.alert("Error", error.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <View style={[styles.container, { backgroundColor: themeColors.bgDark }]}>
            <LinearGradient
                colors={[themeColors.bgDark, isDark ? '#0a0d1d' : '#F1F5F9']}
                style={StyleSheet.absoluteFill}
            />

            <SafeAreaView style={styles.safeArea}>
                <View style={styles.header}>
                    <TouchableOpacity onPress={onBack} style={[styles.backBtn, { backgroundColor: themeColors.bgCard }]}>
                        <ArrowLeft color={themeColors.textMain} size={24} />
                    </TouchableOpacity>
                    <Text style={[styles.title, { color: themeColors.textMain }]}>Edit Profile</Text>
                    <View style={{ width: 40 }} />
                </View>

                <ScrollView contentContainerStyle={styles.content}>
                    <View style={{ alignItems: 'center', marginBottom: 24 }}>
                        <TouchableOpacity onPress={pickImage} style={styles.avatarContainer}>
                            {avatar ? (
                                <Image source={{ uri: avatar }} style={styles.avatar} />
                            ) : (
                                <View style={[styles.avatar, { backgroundColor: themeColors.bgCard, justifyContent: 'center', alignItems: 'center' }]}>
                                    <User size={40} color={themeColors.textMuted} />
                                </View>
                            )}
                            <View style={[styles.editBadge, { backgroundColor: themeColors.accentPrimary }]}>
                                <Camera size={14} color="white" />
                            </View>
                        </TouchableOpacity>
                    </View>

                    <BlurView intensity={GLASS.intensity} tint={isDark ? "dark" : "light"} style={[styles.card, { borderColor: themeColors.border, backgroundColor: themeColors.bgCard }]}>

                        <InputGroup
                            label="Full Name"
                            icon={User}
                            value={formData.name}
                            onChangeText={(t) => setFormData({ ...formData, name: t })}
                            themeColors={themeColors}
                        />

                        <InputGroup
                            label="Username"
                            icon={AtSign}
                            value={formData.username}
                            onChangeText={(t) => setFormData({ ...formData, username: t })}
                            themeColors={themeColors}
                        />

                        <InputGroup
                            label="Department"
                            icon={BookOpen}
                            value={formData.department}
                            onChangeText={(t) => setFormData({ ...formData, department: t })}
                            themeColors={themeColors}
                        />

                        <InputGroup
                            label="Location"
                            icon={MapPin}
                            value={formData.location}
                            onChangeText={(t) => setFormData({ ...formData, location: t })}
                            themeColors={themeColors}
                        />

                        <InputGroup
                            label="Bio"
                            icon={Quote}
                            value={formData.bio}
                            onChangeText={(t) => setFormData({ ...formData, bio: t })}
                            multiline
                            themeColors={themeColors}
                        />

                    </BlurView>

                    <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={loading}>
                        <LinearGradient
                            colors={[themeColors.accentPrimary, themeColors.accentSecondary]}
                            style={styles.saveGradient}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 0 }}
                        >
                            {loading ? (
                                <ActivityIndicator color="white" />
                            ) : (
                                <>
                                    <Save color="white" size={20} style={{ marginRight: 8 }} />
                                    <Text style={styles.saveText}>Save Changes</Text>
                                </>
                            )}
                        </LinearGradient>
                    </TouchableOpacity>

                </ScrollView>
            </SafeAreaView>
        </View>
    );
}

const InputGroup = ({ label, icon: Icon, value, onChangeText, multiline, themeColors = COLORS }) => (
    <View style={styles.inputGroup}>
        <Text style={[styles.label, { color: themeColors.textMuted }]}>{label}</Text>
        <View style={[styles.inputContainer, multiline && { height: 100, alignItems: 'flex-start' }, { backgroundColor: themeColors.bgDark, borderColor: themeColors.border }]}>
            <Icon color={themeColors.accentPrimary} size={20} style={{ marginTop: multiline ? 12 : 0 }} />
            <TextInput
                style={[styles.input, multiline && { height: '100%', paddingTop: 12 }, { color: themeColors.textMain }]}
                value={value}
                onChangeText={onChangeText}
                placeholderTextColor={themeColors.textDim}
                placeholder={`Enter ${label}`}
                multiline={multiline}
                textAlignVertical={multiline ? 'top' : 'center'}
            />
        </View>
    </View>
);

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.bgDark },
    safeArea: { flex: 1 },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: SIZES.padding,
        paddingVertical: 16,
    },
    backBtn: {
        width: 40,
        height: 40,
        justifyContent: 'center',
        alignItems: 'center',
        borderRadius: 20,
        backgroundColor: 'rgba(255,255,255,0.05)',
    },
    title: { fontSize: 20, fontWeight: '700', color: COLORS.textMain },
    content: { padding: SIZES.padding },
    card: {
        padding: 24,
        borderRadius: SIZES.radiusMedium,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.08)',
        backgroundColor: 'rgba(255,255,255,0.03)',
        marginBottom: 24,
    },
    inputGroup: { marginBottom: 20 },
    label: { color: COLORS.textMuted, fontSize: 13, fontWeight: '600', marginBottom: 8 },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.05)',
        borderRadius: SIZES.radiusMedium,
        paddingHorizontal: 16,
        height: 56,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
        gap: 12,
    },
    input: {
        flex: 1,
        color: COLORS.textMain,
        fontSize: 16,
    },
    saveBtn: {
        height: 56,
        borderRadius: SIZES.radiusMedium,
        overflow: 'hidden',
    },
    saveGradient: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
    },
    saveText: {
        color: 'white',
        fontSize: 18,
        fontWeight: '700',
    },
    avatarContainer: {
        width: 100,
        height: 100,
        borderRadius: 50,
        marginBottom: 10,
        position: 'relative'
    },
    avatar: {
        width: 100,
        height: 100,
        borderRadius: 50,
    },
    editBadge: {
        position: 'absolute',
        bottom: 0,
        right: 0,
        width: 32,
        height: 32,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: COLORS.bgDark,
    }
});
