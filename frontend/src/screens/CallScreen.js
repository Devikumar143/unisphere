import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions, Alert } from 'react-native';
import { RTCPeerConnection, RTCView, mediaDevices, RTCIceCandidate, RTCSessionDescription } from 'react-native-webrtc';
import { PhoneOff, Mic, MicOff, Video, VideoOff, Camera } from 'lucide-react-native';
import { COLORS } from '../constants/theme';
import { initiateCall, answerCall, sendIceCandidate, endCall, onCallAnswered, onIceCandidate, onCallEnded, offCallAnswered, offIceCandidate, offCallEnded } from '../services/socket';

const { width, height } = Dimensions.get('window');

const configuration = {
    iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
        { urls: 'stun:stun2.l.google.com:19302' }
    ]
};

export default function CallScreen({ user, targetUser, isCaller, offer, isVideoCall, onEndCall }) {
    const [localStream, setLocalStream] = useState(null);
    const [remoteStream, setRemoteStream] = useState(null);
    const [isMuted, setIsMuted] = useState(false);
    const [isCameraOff, setIsCameraOff] = useState(!isVideoCall);
    const [connectionStatus, setConnectionStatus] = useState('Connecting...');

    const peerConnection = useRef(new RTCPeerConnection(configuration));
    const localStreamRef = useRef(null); // Keep ref for immediate access in cleanups

    useEffect(() => {
        let isMounted = true;

        const startCall = async () => {
            try {
                // 1. Get Local Stream
                const stream = await mediaDevices.getUserMedia({
                    audio: true,
                    video: isVideoCall ? { width: 640, height: 480, frameRate: 30, facingMode: 'user' } : false
                });

                if (isMounted) {
                    setLocalStream(stream);
                    localStreamRef.current = stream;
                    stream.getTracks().forEach(track => {
                        peerConnection.current.addTrack(track, stream);
                    });
                }

                if (isCaller) {
                    // 2a. CALLER: Create Offer
                    const offerDescription = await peerConnection.current.createOffer();
                    await peerConnection.current.setLocalDescription(offerDescription);

                    initiateCall({
                        senderId: user.id,
                        recipientId: targetUser.id,
                        offer: offerDescription,
                        isVideo: isVideoCall
                    });
                    setConnectionStatus('Calling...');
                } else {
                    // 2b. CALLEE: Handle Incoming Offer
                    setConnectionStatus('Connecting...');
                    if (offer) {
                        await peerConnection.current.setRemoteDescription(new RTCSessionDescription(offer));
                        const answerDescription = await peerConnection.current.createAnswer();
                        await peerConnection.current.setLocalDescription(answerDescription);

                        answerCall({
                            senderId: user.id,
                            recipientId: targetUser.id,
                            answer: answerDescription
                        });
                    }
                }

            } catch (err) {
                console.error('Error starting call:', err);
                Alert.alert('Error', 'Failed to access camera/microphone');
                onEndCall();
            }
        };

        startCall();

        // 3. Socket Event Listeners
        const handleCallAnswered = async (data) => {
            if (isCaller && data.answer) {
                const remoteDesc = new RTCSessionDescription(data.answer);
                await peerConnection.current.setRemoteDescription(remoteDesc);
                setConnectionStatus('Connected');
            }
        };

        const handleIceCandidate = async (data) => {
            if (data.candidate) {
                try {
                    await peerConnection.current.addIceCandidate(new RTCIceCandidate(data.candidate));
                } catch (e) {
                    console.error('Error adding received ice candidate', e);
                }
            }
        };

        const handleCallEnded = () => {
            Alert.alert('Call Ended', 'The other user ended the call.');
            onEndCall();
        };

        // Register Listeners
        onCallAnswered(handleCallAnswered);
        onIceCandidate(handleIceCandidate);
        onCallEnded(handleCallEnded);

        // 4. Peer Connection Events
        peerConnection.current.onicecandidate = (event) => {
            if (event.candidate) {
                sendIceCandidate({
                    senderId: user.id,
                    recipientId: targetUser.id,
                    candidate: event.candidate
                });
            }
        };

        peerConnection.current.ontrack = (event) => {
            setRemoteStream(event.streams[0]);
            setConnectionStatus('Connected');
        };

        return () => {
            isMounted = false;
            // Cleanup
            offCallAnswered(handleCallAnswered);
            offIceCandidate(handleIceCandidate);
            offCallEnded(handleCallEnded);

            if (localStreamRef.current) {
                localStreamRef.current.getTracks().forEach(track => track.stop());
            }
            peerConnection.current.close();
        };
    }, []);

    const toggleMute = () => {
        if (localStream) {
            localStream.getAudioTracks().forEach(track => {
                track.enabled = !track.enabled;
            });
            setIsMuted(!isMuted);
        }
    };

    const toggleCamera = () => {
        if (localStream) {
            localStream.getVideoTracks().forEach(track => {
                track.enabled = !track.enabled;
            });
            setIsCameraOff(!isCameraOff);
        }
    };

    const switchCamera = () => {
        if (localStream) {
            localStream.getVideoTracks().forEach(track => {
                track._switchCamera();
            });
        }
    };

    const handleHangup = () => {
        endCall({ senderId: user.id, recipientId: targetUser.id });
        onEndCall();
    };

    return (
        <View style={styles.container}>
            {/* Remote Stream (Full Screen) */}
            {remoteStream ? (
                <RTCView
                    streamURL={remoteStream.toURL()}
                    style={styles.remoteVideo}
                    objectFit="cover"
                    mirror={false}
                />
            ) : (
                <View style={styles.remotePlaceholder}>
                    <Text style={styles.statusText}>{connectionStatus}</Text>
                    <Text style={styles.targetName}>{targetUser?.full_name || 'User'}</Text>
                </View>
            )}

            {/* Local Stream (PIP) */}
            {localStream && !isCameraOff && (
                <View style={styles.localVideoContainer}>
                    <RTCView
                        streamURL={localStream.toURL()}
                        style={styles.localVideo}
                        objectFit="cover"
                        mirror={true}
                        zOrder={1}
                    />
                </View>
            )}

            {/* Controls */}
            <View style={styles.controlsContainer}>
                <TouchableOpacity style={[styles.controlBtn, isMuted && styles.controlBtnActive]} onPress={toggleMute}>
                    {isMuted ? <MicOff color="#000" size={24} /> : <Mic color="#FFF" size={24} />}
                </TouchableOpacity>

                <TouchableOpacity style={[styles.controlBtn, styles.endCallBtn]} onPress={handleHangup}>
                    <PhoneOff color="#FFF" size={28} />
                </TouchableOpacity>

                {isVideoCall && (
                    <TouchableOpacity style={[styles.controlBtn, isCameraOff && styles.controlBtnActive]} onPress={toggleCamera}>
                        {isCameraOff ? <VideoOff color="#000" size={24} /> : <Video color="#FFF" size={24} />}
                    </TouchableOpacity>
                )}
                {/* Switch Camera btn if video is on */}
                {isVideoCall && !isCameraOff && (
                    <TouchableOpacity style={styles.controlBtn} onPress={switchCamera}>
                        <Camera color="#FFF" size={24} />
                    </TouchableOpacity>
                )}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#000',
    },
    remoteVideo: {
        width: width,
        height: height,
        backgroundColor: '#000',
    },
    remotePlaceholder: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#1a1a1a',
    },
    statusText: {
        color: '#ccc',
        fontSize: 18,
        marginBottom: 10,
    },
    targetName: {
        color: '#fff',
        fontSize: 28,
        fontWeight: 'bold',
    },
    localVideoContainer: {
        position: 'absolute',
        top: 50,
        right: 20,
        width: 100,
        height: 150,
        backgroundColor: '#333',
        borderRadius: 10,
        overflow: 'hidden',
        borderWidth: 2,
        borderColor: '#fff',
        elevation: 5,
    },
    localVideo: {
        flex: 1,
    },
    controlsContainer: {
        position: 'absolute',
        bottom: 50,
        left: 0,
        right: 0,
        flexDirection: 'row',
        justifyContent: 'space-evenly',
        alignItems: 'center',
    },
    controlBtn: {
        width: 50,
        height: 50,
        borderRadius: 25,
        backgroundColor: 'rgba(255,255,255,0.2)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    controlBtnActive: {
        backgroundColor: '#fff',
    },
    endCallBtn: {
        backgroundColor: '#FF453A', // Red
        width: 60,
        height: 60,
        borderRadius: 30,
    },
});
