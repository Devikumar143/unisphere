import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, FlatList, ActivityIndicator, Alert, Platform } from 'react-native';
import { ArrowLeft, Check, X, User, Calendar, Info, BadgeCheck } from 'lucide-react-native';
import { COLORS, SIZES } from '../constants/theme';
import { useTheme } from '../context/ThemeContext';
import { fetchAdminVerificationRequests, processVerificationAction } from '../services/api';

export default function AdminVerificationScreen({ navigation, route }) {
    const { isDark, themeColors } = useTheme();
    const { currentUser } = route.params;
    const [loading, setLoading] = useState(true);
    const [requests, setRequests] = useState([]);
    const [processing, setProcessing] = useState(null); // requestId of being processed

    useEffect(() => {
        loadRequests();
    }, []);

    const loadRequests = async () => {
        setLoading(true);
        try {
            const data = await fetchAdminVerificationRequests();
            setRequests(data);
        } catch (error) {
            Alert.alert("Error", "Failed to fetch verification requests.");
        } finally {
            setLoading(false);
        }
    };

    const handleAction = async (requestId, action) => {
        setProcessing(requestId);
        try {
            await processVerificationAction(requestId, action, currentUser.id);
            Alert.alert("Success", `Request has been ${action}ed.`);
            // Update local state instead of full reload for smoother experience
            setRequests(prev => prev.filter(r => r.id !== requestId));
        } catch (error) {
            Alert.alert("Error", error.message || `Failed to ${action} request.`);
        } finally {
            setProcessing(null);
        }
    };

    const renderRequest = ({ item }) => (
        <View style={[styles.requestCard, { backgroundColor: isDark ? themeColors.bgCard : themeColors.bgCardLight, borderColor: themeColors.border }]}>
            <View style={styles.cardHeader}>
                <View style={[styles.avatarPlaceholder, { backgroundColor: themeColors.accentPrimary + '20' }]}>
                    <User size={24} color={themeColors.accentPrimary} />
                </View>
                <View style={styles.headerInfo}>
                    <Text style={[styles.userName, { color: isDark ? themeColors.textMain : themeColors.textMainLight }]}>{item.user_display_name}</Text>
                    <Text style={[styles.userHandle, { color: isDark ? themeColors.textMuted : themeColors.textMutedLight }]}>@{item.username}</Text>
                </View>
                <View style={[styles.categoryBadge, { backgroundColor: themeColors.accentPrimary + '20' }]}>
                    <Text style={[styles.categoryText, { color: themeColors.accentPrimary }]}>{item.category}</Text>
                </View>
            </View>

            <View style={styles.cardBody}>
                <View style={styles.infoRow}>
                    <Info size={16} color={themeColors.accentPrimary} />
                    <Text style={[styles.bodyTitle, { color: isDark ? themeColors.textMain : themeColors.textMainLight }]}>Reason / Details:</Text>
                </View>
                <Text style={[styles.description, { color: isDark ? themeColors.textMuted : themeColors.textMutedLight }]}>
                    {item.description || "No description provided."}
                </Text>

                <View style={styles.dateRow}>
                    <Calendar size={14} color={themeColors.textDim} />
                    <Text style={[styles.dateText, { color: themeColors.textDim }]}>
                        Submitted {new Date(item.created_at).toLocaleDateString()}
                    </Text>
                </View>
            </View>

            <View style={styles.cardActions}>
                <TouchableOpacity
                    style={[styles.actionBtn, styles.rejectBtn, { opacity: processing === item.id ? 0.5 : 1 }]}
                    onPress={() => handleAction(item.id, 'reject')}
                    disabled={!!processing}
                >
                    <X size={18} color="#FFF" />
                    <Text style={styles.actionBtnText}>Reject</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={[styles.actionBtn, styles.approveBtn, { opacity: processing === item.id ? 0.5 : 1 }]}
                    onPress={() => handleAction(item.id, 'approve')}
                    disabled={!!processing}
                >
                    <Check size={18} color="#FFF" />
                    <Text style={styles.actionBtnText}>Approve</Text>
                </TouchableOpacity>
            </View>
        </View>
    );

    return (
        <View style={[styles.container, { backgroundColor: isDark ? themeColors.bgDark : themeColors.bgLight }]}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()}>
                    <ArrowLeft size={24} color={isDark ? themeColors.textMain : themeColors.textMainLight} />
                </TouchableOpacity>
                <Text style={[styles.headerTitle, { color: isDark ? themeColors.textMain : themeColors.textMainLight }]}>Verification Requests</Text>
                <TouchableOpacity onPress={loadRequests}>
                    <BadgeCheck size={20} color={themeColors.accentPrimary} />
                </TouchableOpacity>
            </View>

            {loading ? (
                <View style={styles.centerContainer}>
                    <ActivityIndicator size="large" color={themeColors.accentPrimary} />
                </View>
            ) : requests.length === 0 ? (
                <View style={styles.centerContainer}>
                    <Text style={[styles.emptyText, { color: isDark ? themeColors.textMuted : themeColors.textMutedLight }]}>No pending requests found.</Text>
                </View>
            ) : (
                <FlatList
                    data={requests}
                    renderItem={renderRequest}
                    keyExtractor={item => item.id}
                    contentContainerStyle={styles.listContent}
                    showsVerticalScrollIndicator={false}
                />
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingTop: Platform.OS === 'ios' ? 60 : 20,
        paddingBottom: 20,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '700',
    },
    centerContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        padding: 40,
    },
    emptyText: {
        fontSize: 16,
        textAlign: 'center',
    },
    listContent: {
        padding: 20,
        paddingBottom: 40,
    },
    requestCard: {
        borderRadius: 20,
        borderWidth: 1,
        padding: 16,
        marginBottom: 20,
    },
    cardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
    },
    avatarPlaceholder: {
        width: 48,
        height: 48,
        borderRadius: 24,
        alignItems: 'center',
        justifyContent: 'center',
    },
    headerInfo: {
        flex: 1,
        marginLeft: 12,
    },
    userName: {
        fontSize: 16,
        fontWeight: '700',
    },
    userHandle: {
        fontSize: 13,
    },
    categoryBadge: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
    },
    categoryText: {
        fontSize: 11,
        fontWeight: '700',
    },
    cardBody: {
        marginBottom: 20,
    },
    infoRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8,
        gap: 6,
    },
    bodyTitle: {
        fontSize: 14,
        fontWeight: '700',
    },
    description: {
        fontSize: 14,
        lineHeight: 20,
        marginBottom: 12,
    },
    dateRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    dateText: {
        fontSize: 12,
    },
    cardActions: {
        flexDirection: 'row',
        gap: 12,
    },
    actionBtn: {
        flex: 1,
        height: 44,
        borderRadius: 22,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
    },
    approveBtn: {
        backgroundColor: '#10B981', // Emerald
    },
    rejectBtn: {
        backgroundColor: COLORS.accentError,
    },
    actionBtnText: {
        color: '#FFF',
        fontSize: 14,
        fontWeight: '700',
    }
});
