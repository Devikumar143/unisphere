import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, Image, Alert } from 'react-native';
import { Phone, Video, X } from 'lucide-react-native';
import { BlurView } from 'expo-blur';
import { onIncomingCall, offIncomingCall, rejectCall } from '../services/socket'; // Fixed imports
import { useTheme } from '../context/ThemeContext'; // Assuming ThemeContext exists
import api from '../services/api'; // To fetch user details if needed

export default function IncomingCallModal({ currentUser, onAccept }) {
    const [callData, setCallData] = useState(null); // { senderId, offer, isVideo }
    const [caller, setCaller] = useState(null); // { id, full_name, avatar_url }
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        const handleIncoming = async (data) => {
            console.log('Incoming Call:', data);
            setCallData(data);
            setIsVisible(true);

            // Fetch Caller Details
            try {
                const user = await api.fetchUserProfile(data.senderId);
                setCaller(user);
            } catch (err) {
                console.error('Error fetching caller info:', err);
                setCaller({ full_name: 'Unknown User' });
            }
        };

        onIncomingCall(handleIncoming);

        return () => {
            offIncomingCall(handleIncoming);
        };
    }, []);

    const handleDecline = () => {
        if (callData) {
            rejectCall({ senderId: callData.senderId, recipientId: currentUser.id }); // Logic might be reversed in socket helper?
            // rejectCall(data) sends to server. Server expects { senderId, recipientId } where recipientId is original caller.
            // Wait, socket.js rejectCall sends 'call:reject'.
            // Server: socket.on('call:reject', (data) => { senderId, recipientId } -> notify recipientId (caller)).
            // So recipientId here MUST be the original caller (callData.senderId).
            // senderId is me (currentUser.id).
            rejectCall({ senderId: currentUser.id, recipientId: callData.senderId });
        }
        setIsVisible(false);
        setCallData(null);
        setCaller(null);
    };

    const handleAccept = () => {
        setIsVisible(false);
        if (callData && onAccept) {
            onAccept({
                callerId: callData.senderId,
                offer: callData.offer,
                isVideo: callData.isVideo,
                callerName: caller?.full_name
            });
        }
    };

    if (!isVisible || !callData) return null;

    return (
        <Modal transparent animationType="slide" visible={isVisible}>
            <View style={styles.container}>
                <BlurView intensity={90} tint="dark" style={styles.content}>
                    <View style={styles.avatarContainer}>
                        {caller?.profile_image_url ? (
                            <Image source={{ uri: caller.profile_image_url }} style={styles.avatar} />
                        ) : (
                            <View style={[styles.avatar, styles.avatarPlaceholder]}>
                                <Text style={styles.initials}>{caller?.full_name?.[0] || '?'}</Text>
                            </View>
                        )}
                    </View>

                    <Text style={styles.callerName}>{caller?.full_name || 'Incoming Call...'}</Text>
                    <Text style={styles.callType}>
                        {callData.isVideo ? 'Incoming Video Call' : 'Incoming Audio Call'}
                    </Text>

                    <View style={styles.actions}>
                        {/* Decline */}
                        <TouchableOpacity style={[styles.btn, styles.declineBtn]} onPress={handleDecline}>
                            <X color="#FFF" size={32} />
                            <Text style={styles.btnText}>Decline</Text>
                        </TouchableOpacity>

                        {/* Accept */}
                        <TouchableOpacity style={[styles.btn, styles.acceptBtn]} onPress={handleAccept}>
                            {callData.isVideo ? <Video color="#FFF" size={32} /> : <Phone color="#FFF" size={32} />}
                            <Text style={styles.btnText}>Accept</Text>
                        </TouchableOpacity>
                    </View>
                </BlurView>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'flex-end',
        backgroundColor: 'rgba(0,0,0,0.5)',
    },
    content: {
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        padding: 40,
        alignItems: 'center',
        overflow: 'hidden',
    },
    avatarContainer: {
        marginBottom: 20,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.3,
        shadowRadius: 10,
        elevation: 10,
    },
    avatar: {
        width: 100,
        height: 100,
        borderRadius: 50,
    },
    avatarPlaceholder: {
        backgroundColor: '#333',
        justifyContent: 'center',
        alignItems: 'center',
    },
    initials: {
        fontSize: 40,
        color: '#FFF',
        fontWeight: 'bold',
    },
    callerName: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#FFF',
        marginBottom: 8,
    },
    callType: {
        fontSize: 16,
        color: 'rgba(255,255,255,0.7)',
        marginBottom: 40,
    },
    actions: {
        flexDirection: 'row',
        width: '100%',
        justifyContent: 'space-around',
    },
    btn: {
        flexDirection: 'column',
        alignItems: 'center',
        gap: 8,
    },
    declineBtn: {
        backgroundColor: '#FF453A',
        width: 70,
        height: 70,
        borderRadius: 35,
        justifyContent: 'center',
        alignItems: 'center',
    },
    acceptBtn: {
        backgroundColor: '#30D158',
        width: 70,
        height: 70,
        borderRadius: 35,
        justifyContent: 'center',
        alignItems: 'center',
    },
    btnText: {
        color: '#FFF',
        fontSize: 12,
        fontWeight: '600',
        marginTop: 8,
    }
});
