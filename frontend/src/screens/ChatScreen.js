import React, { useState, useEffect, useRef, useCallback } from 'react';
import { StyleSheet, View, Text, TextInput, TouchableOpacity, FlatList, KeyboardAvoidingView, Platform, Modal, Pressable, Animated, Keyboard, Clipboard, Alert, Image } from 'react-native';
import { Swipeable, GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system/legacy';
import { ArrowLeft, Send, Camera, Plus, Check, CheckCheck, Copy, Trash2, Forward, Bookmark, BookmarkCheck, X, Mic, Play, Pause, Edit3, Lock, User } from 'lucide-react-native';
import { COLORS, SIZES, GLASS } from '../constants/theme';
import { useTheme } from '../context/ThemeContext';
import { fetchMessages, saveMessage, unsaveMessage, forwardMessage, uploadFile } from '../services/api';
import signalProtocol from '../services/signalProtocol';
import {
    sendMessage,
    onReceiveMessage,
    onMessageSent,
    offReceiveMessage,
    reactToMessage,
    onMessageReactionUpdated,
    offMessageReactionUpdated,
    getSocket,
    onUserOnline,
    onUserOffline,
    offUserOnline,
    offUserOffline,
    emitTypingStart,
    emitTypingStop,
    onTypingStart,
    onTypingStop,
    offTypingStart,
    offTypingStop,
    markMessageAsRead,
    onMessageRead,
    offMessageRead,
    deleteMessage,
    onMessageDeleted,
    offMessageDeleted,
    editMessage,
    onMessageUpdated,
    offMessageUpdated
} from '../services/socket';

const AnimatedMessageBubble = ({ children, isReceived }) => {
    const slideAnim = useRef(new Animated.Value(50)).current;
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const scaleAnim = useRef(new Animated.Value(0.9)).current;

    useEffect(() => {
        Animated.parallel([
            Animated.spring(slideAnim, {
                toValue: 0,
                friction: 8,
                tension: 40,
                useNativeDriver: true,
            }),
            Animated.timing(fadeAnim, {
                toValue: 1,
                duration: 250,
                useNativeDriver: true,
            }),
            Animated.spring(scaleAnim, {
                toValue: 1,
                friction: 8,
                useNativeDriver: true,
            })
        ]).start();
    }, []);

    return (
        <Animated.View style={{
            opacity: fadeAnim,
            transform: [
                { translateY: slideAnim },
                { scale: scaleAnim }
            ]
        }}>
            {children}
        </Animated.View>
    );
};

export default function ChatScreen({ user, chatTarget, onBack, onOpenSavedMessages }) {
    const { themeColors, isDark } = useTheme();
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const [reactionPickerVisible, setReactionPickerVisible] = useState(false);
    const [selectedMessageId, setSelectedMessageId] = useState(null);
    const [isTargetOnline, setIsTargetOnline] = useState(chatTarget.isOnline);
    const [isTargetTyping, setIsTargetTyping] = useState(false);
    const [actionMenuVisible, setActionMenuVisible] = useState(false);
    const [actionMenuMessage, setActionMenuMessage] = useState(null);
    const [savedMessageIds, setSavedMessageIds] = useState(new Set());
    const [replyToMessage, setReplyToMessage] = useState(null);
    const [recording, setRecording] = useState(null);
    const [isRecording, setIsRecording] = useState(false);
    const [recordingDuration, setRecordingDuration] = useState(0);
    const [playingMessageId, setPlayingMessageId] = useState(null);
    const [sound, setSound] = useState(null);
    const [editingMessage, setEditingMessage] = useState(null);

    // E2EE State
    const [encryptionEnabled, setEncryptionEnabled] = useState(false);
    const [encryptionInitialized, setEncryptionInitialized] = useState(false);

    const flatListRef = useRef(null);
    const typingTimeoutRef = useRef(null);
    const recordingIntervalRef = useRef(null);

    const emojis = ['👍', '❤️', '😂', '😮', '😢', '🔥'];

    const toggleReaction = (messageId, emoji) => {
        reactToMessage(messageId, user.id, emoji, chatTarget.id);

        // Optimistic update
        setMessages(prev => prev.map(msg => {
            if (msg.id === messageId) {
                const reactions = { ...msg.reactions };
                if (!reactions[emoji]) {
                    reactions[emoji] = [user.id];
                } else {
                    const userList = [...reactions[emoji]];
                    const index = userList.indexOf(user.id);
                    if (index === -1) {
                        userList.push(user.id);
                    } else {
                        userList.splice(index, 1);
                    }

                    if (userList.length === 0) {
                        delete reactions[emoji];
                    } else {
                        reactions[emoji] = userList;
                    }
                }
                return { ...msg, reactions };
            }
            return msg;
        }));
    };

    const handleReaction = (emoji) => {
        if (selectedMessageId) {
            toggleReaction(selectedMessageId, emoji);
            setReactionPickerVisible(false);
            setSelectedMessageId(null);
        }
    };

    const onLongPressMessage = (messageId) => {
        const message = messages.find(m => m.id === messageId);
        setActionMenuMessage(message);
        setActionMenuVisible(true);
    };

    // Typing indicator handlers
    const handleTextChange = useCallback((text) => {
        setNewMessage(text);

        // Emit typing start
        if (text.length > 0 && !typingTimeoutRef.current) {
            emitTypingStart(user.id, chatTarget.id);
        }

        // Clear existing timeout
        if (typingTimeoutRef.current) {
            clearTimeout(typingTimeoutRef.current);
        }

        // Set timeout to emit typing stop
        typingTimeoutRef.current = setTimeout(() => {
            emitTypingStop(user.id, chatTarget.id);
            typingTimeoutRef.current = null;
        }, 1000);
    }, [user.id, chatTarget.id]);

    // Message action handlers
    const handleCopyMessage = () => {
        if (actionMenuMessage) {
            Clipboard.setString(actionMenuMessage.content);
            setActionMenuVisible(false);
            Alert.alert('Copied', 'Message copied to clipboard');
        }
    };

    const handleDeleteMessage = () => {
        if (actionMenuMessage && actionMenuMessage.senderId === user.id) {
            deleteMessage(actionMenuMessage.id, user.id, chatTarget.id);
            setMessages(prev => prev.filter(m => m.id !== actionMenuMessage.id));
            setActionMenuVisible(false);
        }
    };

    const handleSaveMessage = async () => {
        if (actionMenuMessage) {
            try {
                if (savedMessageIds.has(actionMenuMessage.id)) {
                    await unsaveMessage(actionMenuMessage.id, user.id);
                    setSavedMessageIds(prev => {
                        const newSet = new Set(prev);
                        newSet.delete(actionMenuMessage.id);
                        return newSet;
                    });
                } else {
                    await saveMessage(actionMenuMessage.id, user.id);
                    setSavedMessageIds(prev => new Set(prev).add(actionMenuMessage.id));
                }
                setActionMenuVisible(false);
            } catch (error) {
                Alert.alert('Error', 'Failed to save message');
            }
        }
    };

    const handleForwardMessage = () => {
        // TODO: Implement forward UI (select recipient)
        setActionMenuVisible(false);
        Alert.alert('Forward', 'Forward feature coming soon!');
    };

    useEffect(() => {
        console.log('[ChatScreen] Initializing chat. Socket connected:', getSocket()?.connected);
        loadMessages();

        const handleReceive = async (message) => {
            if (message.senderId === chatTarget.id) {
                // Decrypt message if it's encrypted
                if (message.encrypted && encryptionEnabled) {
                    try {
                        console.log('[E2EE] Decrypting incoming message...');
                        const decrypted = await signalProtocol.decryptMessage(
                            message.senderId,
                            message.content,
                            message.type || 'message'
                        );
                        message.content = decrypted;
                        console.log('[E2EE] Message decrypted successfully');
                    } catch (error) {
                        console.error('[E2EE] Decryption failed:', error);
                        message.content = '[Encrypted message - decryption failed]';
                    }
                }

                setMessages(prev => [...prev, message]);
                scrollToBottom();
                // Mark as read immediately
                markMessageAsRead(message.id, user.id, chatTarget.id);
            }
        };

        const handleReactionUpdate = ({ messageId, reactions }) => {
            setMessages(prev => prev.map(msg =>
                msg.id === messageId ? { ...msg, reactions } : msg
            ));
        };

        const handleOnline = (userId) => {
            if (userId === chatTarget.id) setIsTargetOnline(true);
        };
        const handleOffline = (userId) => {
            if (userId === chatTarget.id) setIsTargetOnline(false);
        };

        const handleTypingStart = ({ userId }) => {
            if (userId === chatTarget.id) setIsTargetTyping(true);
        };

        const handleTypingStop = ({ userId }) => {
            if (userId === chatTarget.id) setIsTargetTyping(false);
        };

        const handleMessageRead = ({ messageId, readAt }) => {
            setMessages(prev => prev.map(msg =>
                msg.id === messageId ? { ...msg, readAt } : msg
            ));
        };

        const handleMessageDeleted = ({ messageId }) => {
            setMessages(prev => prev.filter(msg => msg.id !== messageId));
        };

        const handleMessageUpdated = ({ messageId, content }) => {
            setMessages(prev => prev.map(msg =>
                msg.id === messageId
                    ? { ...msg, content, isEdited: true }
                    : msg
            ));
        };

        const keyboardShowListener = Keyboard.addListener(
            Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
            () => setTimeout(scrollToBottom, 50)
        );

        // Listen for incoming messages
        onReceiveMessage(handleReceive);
        onMessageReactionUpdated(handleReactionUpdate);
        onUserOnline(handleOnline);
        onUserOffline(handleOffline);
        onTypingStart(handleTypingStart);
        onTypingStop(handleTypingStop);
        onMessageRead(handleMessageRead);
        onMessageDeleted(handleMessageDeleted);
        onMessageUpdated(handleMessageUpdated);

        return () => {
            keyboardShowListener.remove();
            offReceiveMessage(handleReceive);
            offMessageReactionUpdated(handleReactionUpdate);
            offUserOnline(handleOnline);
            offUserOffline(handleOffline);
            offTypingStart(handleTypingStart);
            offTypingStop(handleTypingStop);
            offMessageRead(handleMessageRead);
            offMessageDeleted(handleMessageDeleted);
            offMessageUpdated(handleMessageUpdated);
        };
    }, [chatTarget.id]);

    // Initialize encryption
    useEffect(() => {
        const initEncryption = async () => {
            try {
                console.log('[E2EE] Initializing encryption for user:', user.id);
                await signalProtocol.initialize(user.id);
                const available = await signalProtocol.isEncryptionAvailable(chatTarget.id);
                setEncryptionEnabled(available);
                setEncryptionInitialized(true);
                console.log('[E2EE] Encryption initialized. Available:', available);
            } catch (error) {
                console.error('[E2EE] Failed to initialize encryption:', error);
                setEncryptionInitialized(true);
            }
        };

        initEncryption();
    }, [user.id, chatTarget.id]);

    const loadMessages = async () => {
        console.log('Loading messages between:', user.id, 'and', chatTarget.id);
        try {
            const data = await fetchMessages(user.id, chatTarget.id);
            console.log('Loaded messages:', data.length, 'messages');
            setMessages(data);
            setTimeout(scrollToBottom, 100);
        } catch (error) {
            console.error('Error loading messages:', error);
        }
    };

    const handleSend = async () => {
        if (!newMessage.trim() && !recording) return;

        if (editingMessage) {
            editMessage(editingMessage.id, user.id, chatTarget.id, newMessage.trim());

            // Optimistic update
            setMessages(prev => prev.map(msg =>
                msg.id === editingMessage.id
                    ? { ...msg, content: newMessage.trim(), isEdited: true }
                    : msg
            ));

            setNewMessage('');
            setEditingMessage(null);
            return;
        }

        let messageContent = newMessage.trim();
        let encrypted = false;

        // Encrypt message if encryption is enabled
        if (encryptionEnabled && encryptionInitialized) {
            try {
                console.log('[E2EE] Encrypting message...');
                const encryptedData = await signalProtocol.encryptMessage(
                    chatTarget.id,
                    messageContent
                );
                messageContent = encryptedData.ciphertext;
                encrypted = true;
                console.log('[E2EE] Message encrypted successfully');
            } catch (error) {
                console.error('[E2EE] Encryption failed, sending unencrypted:', error);
                // Fallback to unencrypted
            }
        }

        // Optimistically add message to UI (display original text)
        const tempMessage = {
            id: Date.now().toString(), // Temporary ID
            senderId: user.id,
            recipientId: chatTarget.id,
            content: newMessage.trim(), // Display original text
            timestamp: new Date().toISOString(),
            replyTo: replyToMessage?.id,
            replyToDetails: replyToMessage, // For immediate display
            encrypted: encrypted
        };

        setMessages(prev => [...prev, tempMessage]);

        // Send encrypted or plain message
        sendMessage(
            user.id,
            chatTarget.id,
            messageContent, // Send encrypted content
            replyToMessage?.id, // Pass reply ID
            encrypted // Pass encryption flag
        );

        setNewMessage('');
        setReplyToMessage(null); // Clear reply state

        // Stop typing indicator
        emitTypingStop(user.id, chatTarget.id);
        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);

        setTimeout(scrollToBottom, 100);
    };

    const scrollToBottom = () => {
        if (flatListRef.current && messages.length > 0) {
            flatListRef.current.scrollToEnd({ animated: true });
        }
    };

    // Voice Message Handlers
    const startRecording = async () => {
        try {
            console.log('Requesting permissions..');
            const permission = await Audio.requestPermissionsAsync();
            if (permission.status === 'granted') {
                await Audio.setAudioModeAsync({
                    allowsRecordingIOS: true,
                    playsInSilentModeIOS: true,
                });
                console.log('Starting recording..');
                const { recording } = await Audio.Recording.createAsync(
                    Audio.RecordingOptionsPresets.HIGH_QUALITY
                );
                setRecording(recording);
                setIsRecording(true);

                // Start timer
                setRecordingDuration(0);
                recordingIntervalRef.current = setInterval(() => {
                    setRecordingDuration(prev => prev + 1);
                }, 1000);
            }
        } catch (err) {
            console.error('Failed to start recording', err);
            Alert.alert('Error', 'Failed to start recording');
        }
    };

    const stopRecording = async (send = true) => {
        console.log('Stopping recording..');
        setRecording(undefined);
        setIsRecording(false);
        if (recordingIntervalRef.current) clearInterval(recordingIntervalRef.current);

        await recording.stopAndUnloadAsync();
        const uri = recording.getURI();
        console.log('Recording stopped and stored at', uri);

        if (send && uri) {
            try {
                // Upload to server for persistence
                const voiceUrl = await uploadFile(uri);
                const duration = recordingDuration;

                // Optimistic update
                const tempMsg = {
                    id: Date.now().toString(),
                    senderId: user.id,
                    recipientId: chatTarget.id,
                    content: 'Voice Message',
                    timestamp: new Date().toISOString(),
                    messageType: 'voice',
                    voiceUrl: voiceUrl,
                    voiceDuration: duration,
                    replyTo: replyToMessage?.id,
                    replyToDetails: replyToMessage
                };

                setMessages(prev => [...prev, tempMsg]);

                sendMessage(
                    user.id,
                    chatTarget.id,
                    'Voice Message',
                    replyToMessage?.id,
                    'voice',
                    voiceUrl,
                    duration
                );

                setReplyToMessage(null);
                setTimeout(scrollToBottom, 100);
            } catch (error) {
                console.error('Error preparing voice message:', error);
                Alert.alert('Error', 'Failed to send voice message');
            }
        }
    };

    const playVoiceMessage = async (voiceUrl, messageId) => {
        try {
            if (sound) {
                await sound.unloadAsync();
                setSound(null);
                setPlayingMessageId(null);

                // If clicking same message, just stop
                if (playingMessageId === messageId) return;
            }

            const { sound: newSound } = await Audio.Sound.createAsync(
                { uri: voiceUrl },
                { shouldPlay: true }
            );

            setSound(newSound);
            setPlayingMessageId(messageId);

            newSound.setOnPlaybackStatusUpdate((status) => {
                if (status.didJustFinish) {
                    setPlayingMessageId(null);
                    setSound(null);
                }
            });
        } catch (error) {
            console.error('Error playing sound', error);
            Alert.alert('Error', 'Could not play audio');
        }
    };

    // Cleanup sound on unmount
    useEffect(() => {
        return () => {
            if (sound) {
                sound.unloadAsync();
            }
        };
    }, [sound]);

    const getUserColors = (userId) => {
        if (userId === user.id) return [themeColors.accentPrimary, themeColors.accentSecondary];
        let hash = 0;
        for (let i = 0; i < userId.length; i++) {
            hash = userId.charCodeAt(i) + ((hash << 5) - hash);
        }
        const h = Math.abs(hash) % 360;
        return [`hsl(${h}, 85%, 65%)`, `hsl(${h + 30}, 85%, 55%)`];
    };

    const renderMessage = ({ item }) => {
        const [barColor1, barColor2] = getUserColors(item.senderId);

        const isMe = item.senderId === user.id;
        const hasReactions = item.reactions && Object.keys(item.reactions).length > 0;
        let swipeableRef = null;

        const renderReplyAction = (progress, dragX) => {
            const trans = dragX.interpolate({
                inputRange: [0, 50, 100],
                outputRange: [isMe ? 20 : -20, 0, 0],
            });
            return (
                <View style={{ justifyContent: 'center', alignItems: 'center', width: 60 }}>
                    <Animated.View style={{ transform: [{ translateX: trans }] }}>
                        <BlurView intensity={30} tint={isDark ? "dark" : "light"} style={{ width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center' }}>
                            <ArrowLeft size={16} color={themeColors.textMain} />
                        </BlurView>
                    </Animated.View>
                </View>
            );
        };

        return (
            <Swipeable
                ref={ref => swipeableRef = ref}
                renderRightActions={isMe ? null : renderReplyAction}
                renderLeftActions={isMe ? renderReplyAction : null}
                onSwipeableOpen={() => {
                    setReplyToMessage(item);
                    swipeableRef?.close();
                }}
            >
                <AnimatedMessageBubble isReceived={!isMe}>
                    <TouchableOpacity
                        activeOpacity={0.9}
                        onLongPress={() => onLongPressMessage(item.id)}
                        style={styles.snapContainer}
                    >
                        <View style={styles.snapWrapper}>
                            {/* VERTICAL ACCENT STREAK - High Fidelity */}
                            <LinearGradient
                                colors={[barColor1, barColor2]}
                                style={styles.snapStreak}
                            />

                            <View style={styles.snapContent}>
                                {/* Integrated Reply Context */}
                                {item.replyToDetails && (
                                    <View style={{
                                        marginBottom: 8,
                                        padding: 10,
                                        backgroundColor: 'rgba(255,255,255,0.03)',
                                        borderRadius: 12,
                                        borderLeftWidth: 2,
                                        borderLeftColor: 'rgba(255,255,255,0.2)'
                                    }}>
                                        <Text style={{ fontSize: 10, color: themeColors.textDim, fontWeight: '900', textTransform: 'uppercase', marginBottom: 2 }}>
                                            Replying to {item.replyToDetails.senderId === user.id ? 'You' : chatTarget.name}
                                        </Text>
                                        <Text numberOfLines={1} style={{ fontSize: 13, color: themeColors.textDim }}>
                                            {item.replyToDetails.content}
                                        </Text>
                                    </View>
                                )}

                                <Text style={[styles.senderLabel, { color: barColor1 }]}>
                                    {isMe ? 'You' : chatTarget.name}
                                </Text>

                                {item.messageType === 'voice' ? (
                                    <BlurView intensity={10} tint={isDark ? "dark" : "light"} style={{
                                        flexDirection: 'row',
                                        alignItems: 'center',
                                        marginTop: 4,
                                        paddingHorizontal: 12,
                                        paddingVertical: 10,
                                        borderRadius: 20,
                                        backgroundColor: 'rgba(255,255,255,0.02)',
                                        borderWidth: 1,
                                        borderColor: 'rgba(255,255,255,0.05)'
                                    }}>
                                        <TouchableOpacity
                                            onPress={() => playVoiceMessage(item.voiceUrl, item.id)}
                                            style={{
                                                width: 36,
                                                height: 36,
                                                borderRadius: 18,
                                                backgroundColor: isMe ? themeColors.accentPrimary : 'rgba(99, 102, 241, 0.4)',
                                                justifyContent: 'center',
                                                alignItems: 'center',
                                                marginRight: 10
                                            }}
                                        >
                                            {playingMessageId === item.id ? (
                                                <Pause size={18} color="#FFF" fill="#FFF" />
                                            ) : (
                                                <Play size={18} color="#FFF" fill="#FFF" />
                                            )}
                                        </TouchableOpacity>

                                        <View style={{ flex: 1, height: 20, justifyContent: 'center' }}>
                                            {/* Micro-waveform representation */}
                                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
                                                {[...Array(15)].map((_, i) => (
                                                    <View key={i} style={{
                                                        width: 2,
                                                        height: 4 + Math.random() * 12,
                                                        backgroundColor: themeColors.textDim,
                                                        borderRadius: 1,
                                                        opacity: 0.3
                                                    }} />
                                                ))}
                                            </View>
                                        </View>

                                        <Text style={{ marginLeft: 10, fontSize: 12, fontWeight: '800', color: themeColors.textMain }}>
                                            {item.voiceDuration ? `${Math.floor(item.voiceDuration / 60)}:${(item.voiceDuration % 60).toString().padStart(2, '0')}` : '0:00'}
                                        </Text>
                                    </BlurView>
                                ) : (
                                    <Text style={[styles.messageText, { color: themeColors.textMain }]}>
                                        {item.content}
                                    </Text>
                                )}

                                <View style={styles.timestampRow}>
                                    <Text style={[styles.timestamp, { color: themeColors.textDim }]}>
                                        {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        {item.isEdited && <Text style={{ fontSize: 9, fontStyle: 'italic', opacity: 0.6 }}> • EDITED</Text>}
                                    </Text>
                                    {isMe && (
                                        <View style={styles.readStatus}>
                                            {item.readAt ? (
                                                <CheckCheck size={14} color={themeColors.accentPrimary} />
                                            ) : (
                                                <Check size={14} color={themeColors.textDim} opacity={0.5} />
                                            )}
                                        </View>
                                    )}
                                    {savedMessageIds.has(item.id) && (
                                        <BookmarkCheck size={12} color={themeColors.accentPrimary} style={{ marginLeft: 6 }} />
                                    )}
                                </View>
                            </View>

                            {hasReactions && (
                                <View style={styles.snapReactions}>
                                    <BlurView intensity={20} tint={isDark ? "dark" : "light"} style={[styles.reactionsGlass, { borderColor: 'rgba(255,255,255,0.05)' }]}>
                                        {Object.keys(item.reactions).map((emoji, index) => (
                                            <TouchableOpacity
                                                key={emoji}
                                                onPress={() => toggleReaction(item.id, emoji)}
                                                style={[styles.reactionTag, index > 0 && { marginLeft: 8 }]}
                                            >
                                                <Text style={styles.reactionEmojiText}>{emoji}</Text>
                                                <Text style={[styles.reactionCountText, { color: themeColors.textMain }]}>
                                                    {item.reactions[emoji].length}
                                                </Text>
                                            </TouchableOpacity>
                                        ))}
                                    </BlurView>
                                </View>
                            )}
                        </View>
                    </TouchableOpacity>
                </AnimatedMessageBubble>
            </Swipeable>
        );
    };

    return (
        <View style={[styles.container, { backgroundColor: themeColors.bgDark }]}>
            <LinearGradient
                colors={isDark ? ['#050810', '#000000'] : ['#F8FAFC', '#FFFFFF']}
                style={StyleSheet.absoluteFill}
            />

            {/* Background Aura Glows */}
            <View style={StyleSheet.absoluteFill}>
                <View style={[styles.glowCircle, { top: -100, left: -200, backgroundColor: isDark ? '#3CB2E212' : '#3CB2E205' }]} />
                <View style={[styles.glowCircle, { bottom: -100, right: -200, backgroundColor: isDark ? '#9C27B010' : '#9C27B003' }]} />
            </View>

            {/* Floating Glass Header */}
            <View style={styles.headerWrapper}>
                <BlurView intensity={45} tint={isDark ? "dark" : "light"} style={styles.headerGlass}>
                    <SafeAreaView edges={['top']}>
                        <View style={styles.header}>
                            <TouchableOpacity onPress={onBack} activeOpacity={0.7} style={styles.backBtn}>
                                <ArrowLeft color={themeColors.textMain} size={22} />
                                <View style={[styles.btnHighlight, { borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' }]} />
                            </TouchableOpacity>

                            <View style={styles.headerInfo}>
                                <View style={styles.headerAvatarContainer}>
                                    <LinearGradient
                                        colors={isTargetOnline ? [themeColors.accentPrimary, themeColors.accentSecondary] : ['rgba(255,255,255,0.1)', 'rgba(255,255,255,0.05)']}
                                        style={styles.headerAvatarGlow}
                                    >
                                        {chatTarget.avatar ? (
                                            <Image source={{ uri: chatTarget.avatar }} style={styles.headerAvatar} />
                                        ) : (
                                            <View style={[styles.headerAvatar, { backgroundColor: themeColors.bgCard, justifyContent: 'center', alignItems: 'center' }]}>
                                                <User size={24} color={themeColors.textDim} />
                                            </View>
                                        )}
                                    </LinearGradient>
                                    {isTargetOnline && <View style={styles.headerOnlineBadge} />}
                                </View>

                                <View style={styles.headerTextContent}>
                                    <Text style={[styles.headerName, { color: themeColors.textMain }]} numberOfLines={1}>{chatTarget.name}</Text>
                                    <View style={styles.statusRow}>
                                        <Text style={[styles.headerStatusText, { color: isTargetOnline ? themeColors.accentPrimary : themeColors.textDim }]}>
                                            {isTargetOnline ? 'ONLINE NOW' : 'OFFLINE'}
                                        </Text>
                                        {isTargetOnline && (
                                            <LinearGradient
                                                colors={[themeColors.accentPrimary, themeColors.accentSecondary]}
                                                style={styles.statusPulse}
                                            />
                                        )}
                                    </View>
                                    {/* Encryption Indicator */}
                                    {encryptionEnabled && (
                                        <View style={styles.encryptionBadge}>
                                            <Lock size={10} color={themeColors.accentSuccess} />
                                            <Text style={[styles.encryptionText, { color: themeColors.textDim }]}>
                                                End-to-end encrypted
                                            </Text>
                                        </View>
                                    )}
                                </View>
                            </View>

                            <TouchableOpacity onPress={onOpenSavedMessages} activeOpacity={0.7} style={styles.headerAction}>
                                <Bookmark color={themeColors.textMain} size={22} />
                                <View style={[styles.btnHighlight, { borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' }]} />
                            </TouchableOpacity>
                        </View>
                    </SafeAreaView>
                </BlurView>
            </View>

            <KeyboardAvoidingView
                behavior={Platform.OS === "ios" ? "padding" : "height"}
                style={{ flex: 1 }}
                keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 0}
            >
                {/* Messages List */}
                <FlatList
                    ref={flatListRef}
                    data={messages}
                    keyExtractor={item => item.id}
                    renderItem={renderMessage}
                    contentContainerStyle={styles.messagesList}
                    showsVerticalScrollIndicator={false}
                    ListEmptyComponent={
                        <View style={{ marginTop: 100, alignItems: 'center' }}>
                            <Text style={{ color: themeColors.textDim, fontSize: 16, fontWeight: '600' }}>Say hello to {chatTarget.name}!</Text>
                        </View>
                    }
                />

                {/* Typing Indicator (Floating) */}
                {isTargetTyping && (
                    <BlurView intensity={20} tint={isDark ? "dark" : "light"} style={styles.typingIndicator}>
                        <Text style={[styles.typingText, { color: themeColors.textMain }]}>TYPING</Text>
                        <View style={styles.typingDots}>
                            {[1, 2, 3].map(i => (
                                <View key={i} style={[styles.typingDot, { backgroundColor: themeColors.accentPrimary }]} />
                            ))}
                        </View>
                    </BlurView>
                )}

                {/* Input Section */}
                <View style={styles.inputWrapper}>
                    {/* Reply/Edit Context */}
                    {(replyToMessage || editingMessage) && (
                        <BlurView intensity={40} tint={isDark ? "dark" : "light"} style={styles.replyBar}>
                            <View style={[styles.replyContent, { borderLeftColor: themeColors.accentPrimary }]}>
                                <Text style={[styles.replySender, { color: themeColors.accentPrimary }]}>
                                    {editingMessage ? 'EDITING CHAT' : `REPLYING TO ${replyToMessage.senderId === user.id ? 'YOU' : chatTarget.name.toUpperCase()}`}
                                </Text>
                                <Text numberOfLines={1} style={[styles.replyText, { color: themeColors.textDim }]}>
                                    {editingMessage ? editingMessage.content : replyToMessage.content}
                                </Text>
                            </View>
                            <TouchableOpacity onPress={() => editingMessage ? setEditingMessage(null) : setReplyToMessage(null)}>
                                <X size={18} color={themeColors.textDim} />
                            </TouchableOpacity>
                        </BlurView>
                    )}

                    <BlurView intensity={isDark ? 40 : 80} tint={isDark ? "dark" : "light"} style={[styles.inputIsland, { borderColor: 'rgba(255,255,255,0.1)' }]}>
                        {isRecording ? (
                            <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12 }}>
                                <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#EF4444', marginRight: 10 }} />
                                <Text style={{ color: themeColors.textMain, fontWeight: '800', fontSize: 16 }}>
                                    {Math.floor(recordingDuration / 60)}:{(recordingDuration % 60).toString().padStart(2, '0')}
                                </Text>
                                <Text style={{ marginLeft: 12, color: themeColors.textDim, fontSize: 13, fontWeight: '600' }}>Release to send voice chat</Text>
                            </View>
                        ) : (
                            <>
                                <TouchableOpacity style={styles.inputAction}>
                                    <Camera color={themeColors.textMain} size={22} />
                                </TouchableOpacity>

                                <TextInput
                                    style={[styles.inputMain, { color: themeColors.textMain }]}
                                    placeholder="Message..."
                                    placeholderTextColor={themeColors.textDim}
                                    value={newMessage}
                                    onChangeText={handleTextChange}
                                    multiline
                                />
                            </>
                        )}

                        <TouchableOpacity
                            onPress={newMessage.trim() ? handleSend : undefined}
                            onLongPress={!newMessage.trim() ? startRecording : undefined}
                            onPressOut={isRecording ? () => stopRecording(true) : undefined}
                            delayLongPress={200}
                        >
                            <LinearGradient
                                colors={(newMessage.trim() || isRecording)
                                    ? [themeColors.accentPrimary, themeColors.accentSecondary]
                                    : ['transparent', 'transparent']}
                                style={styles.sendBtn}
                            >
                                {newMessage.trim() ? (
                                    <Send color="#FFF" size={20} fill="#FFF" />
                                ) : (
                                    <Mic color={isRecording ? "#FFF" : themeColors.textDim} size={22} />
                                )}
                            </LinearGradient>
                        </TouchableOpacity>
                    </BlurView>
                </View>
            </KeyboardAvoidingView>

            {/* Popups & Menus */}
            <Modal visible={actionMenuVisible} transparent animationType="fade">
                <Pressable style={styles.modalOverlay} onPress={() => setActionMenuVisible(false)}>
                    <BlurView intensity={80} tint={isDark ? "dark" : "light"} style={styles.actionMenu}>
                        {/* Reaction Picker Integration */}
                        <View style={[styles.reactionPickerBar, { borderBottomColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)' }]}>
                            <FlatList
                                data={emojis}
                                horizontal
                                showsHorizontalScrollIndicator={false}
                                keyExtractor={item => item}
                                contentContainerStyle={styles.reactionPickerContent}
                                renderItem={({ item: emoji }) => (
                                    <TouchableOpacity
                                        onPress={() => {
                                            toggleReaction(actionMenuMessage?.id, emoji);
                                            setActionMenuVisible(false);
                                        }}
                                        style={styles.reactionPickerItem}
                                    >
                                        <Text style={styles.reactionPickerEmoji}>{emoji}</Text>
                                    </TouchableOpacity>
                                )}
                            />
                        </View>

                        <TouchableOpacity style={styles.actionItem} onPress={() => { setReplyToMessage(actionMenuMessage); setActionMenuVisible(false); }}>
                            <View style={styles.actionIconContainer}><ArrowLeft size={20} color={themeColors.textMain} /></View>
                            <Text style={[styles.actionText, { color: themeColors.textMain }]}>Reply</Text>
                        </TouchableOpacity>

                        {actionMenuMessage?.senderId === user.id && (
                            <TouchableOpacity style={styles.actionItem} onPress={() => { setEditingMessage(actionMenuMessage); setNewMessage(actionMenuMessage.content); setActionMenuVisible(false); }}>
                                <View style={styles.actionIconContainer}><Edit3 size={18} color={themeColors.textMain} /></View>
                                <Text style={[styles.actionText, { color: themeColors.textMain }]}>Edit Chat</Text>
                            </TouchableOpacity>
                        )}

                        <TouchableOpacity style={styles.actionItem} onPress={handleCopyMessage}>
                            <View style={styles.actionIconContainer}><Copy size={18} color={themeColors.textMain} /></View>
                            <Text style={[styles.actionText, { color: themeColors.textMain }]}>Copy Text</Text>
                        </TouchableOpacity>

                        <TouchableOpacity style={styles.actionItem} onPress={handleSaveMessage}>
                            <View style={styles.actionIconContainer}>
                                {savedMessageIds.has(actionMenuMessage?.id)
                                    ? <BookmarkCheck size={20} color={themeColors.accentPrimary} />
                                    : <Bookmark size={20} color={themeColors.textMain} />}
                            </View>
                            <Text style={[styles.actionText, { color: themeColors.textMain }]}>
                                {savedMessageIds.has(actionMenuMessage?.id) ? 'Remove Bookmark' : 'Bookmark'}
                            </Text>
                        </TouchableOpacity>

                        {actionMenuMessage?.senderId === user.id && (
                            <TouchableOpacity style={[styles.actionItem, { borderBottomWidth: 0 }]} onPress={handleDeleteMessage}>
                                <View style={styles.actionIconContainer}><Trash2 size={20} color="#FF4B4B" /></View>
                                <Text style={[styles.actionText, { color: '#FF4B4B' }]}>Delete for everyone</Text>
                            </TouchableOpacity>
                        )}
                    </BlurView>
                </Pressable>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    glowCircle: {
        position: 'absolute',
        width: 400,
        height: 400,
        borderRadius: 200,
        opacity: 0.6,
    },
    headerWrapper: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 100,
    },
    headerGlass: {
        borderBottomWidth: 0.5,
        borderBottomColor: 'rgba(255,255,255,0.1)',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingBottom: 14,
        paddingTop: 6,
    },
    backBtn: {
        width: 42,
        height: 42,
        borderRadius: 21,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.08)',
        overflow: 'hidden',
    },
    btnHighlight: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        borderRadius: 21,
        borderWidth: 1,
        pointerEvents: 'none',
    },
    headerInfo: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        marginLeft: 14,
    },
    headerAvatarContainer: {
        position: 'relative',
    },
    headerAvatarGlow: {
        width: 46,
        height: 46,
        borderRadius: 23,
        padding: 2,
        justifyContent: 'center',
        alignItems: 'center',
    },
    headerAvatar: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#1A1A1A',
    },
    headerOnlineBadge: {
        position: 'absolute',
        bottom: 1,
        right: 1,
        width: 12,
        height: 12,
        borderRadius: 6,
        backgroundColor: '#10B981',
        borderWidth: 2,
        borderColor: '#050810',
    },
    headerTextContent: {
        marginLeft: 12,
        flex: 1,
    },
    headerName: {
        fontSize: 18,
        fontWeight: '900',
        letterSpacing: -0.5,
    },
    statusRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 2,
    },
    headerStatusText: {
        fontSize: 10,
        fontWeight: '900',
        letterSpacing: 1,
    },
    statusPulse: {
        width: 4,
        height: 4,
        borderRadius: 2,
        marginLeft: 6,
    },
    headerAction: {
        width: 42,
        height: 42,
        borderRadius: 21,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.08)',
        marginLeft: 10,
        overflow: 'hidden',
    },
    messagesList: {
        paddingHorizontal: 20,
        paddingTop: 120, // Space for floating header
        paddingBottom: 40,
    },
    snapContainer: {
        marginBottom: 20,
    },
    snapWrapper: {
        flexDirection: 'row',
        alignItems: 'stretch',
    },
    snapStreak: {
        width: 3,
        borderRadius: 1.5,
        marginRight: 16,
    },
    snapContent: {
        flex: 1,
    },
    senderLabel: {
        fontSize: 11,
        fontWeight: '900',
        letterSpacing: 1,
        textTransform: 'uppercase',
        marginBottom: 4,
    },
    messageText: {
        fontSize: 16,
        lineHeight: 22,
        fontWeight: '500',
    },
    timestampRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 6,
    },
    timestamp: {
        fontSize: 10,
        fontWeight: '700',
    },
    readStatus: {
        marginLeft: 6,
    },
    snapReactions: {
        marginTop: 8,
        flexDirection: 'row',
    },
    reactionsGlass: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 8,
        paddingVertical: 5,
        borderRadius: 14,
        borderWidth: 1,
        overflow: 'hidden',
    },
    reactionTag: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    reactionEmojiText: {
        fontSize: 14,
    },
    reactionCountText: {
        fontSize: 12,
        marginLeft: 3,
        fontWeight: '800',
    },
    inputWrapper: {
        paddingHorizontal: 16,
        paddingBottom: Platform.OS === 'ios' ? 20 : 16,
    },
    inputIsland: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 6,
        borderRadius: 30,
        borderWidth: 1,
        overflow: 'hidden',
        elevation: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 5 },
        shadowOpacity: 0.15,
        shadowRadius: 10,
    },
    inputAction: {
        width: 44,
        height: 44,
        borderRadius: 22,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.05)',
    },
    inputMain: {
        flex: 1,
        paddingHorizontal: 12,
        paddingVertical: 10,
        fontSize: 16,
        fontWeight: '500',
        maxHeight: 120,
    },
    sendBtn: {
        width: 44,
        height: 44,
        borderRadius: 22, // Always round
        justifyContent: 'center',
        alignItems: 'center',
    },
    typingIndicator: {
        position: 'absolute',
        bottom: 100,
        left: 20,
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 15,
        backgroundColor: 'rgba(0,0,0,0.3)',
    },
    typingText: {
        fontSize: 11,
        fontWeight: '700',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    typingDots: {
        flexDirection: 'row',
        marginLeft: 6,
    },
    typingDot: {
        width: 3,
        height: 3,
        borderRadius: 1.5,
        marginHorizontal: 1.5,
    },
    replyBar: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 10,
        paddingHorizontal: 14,
        borderRadius: 18,
        marginBottom: 10,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.05)',
    },
    replyContent: {
        flex: 1,
        borderLeftWidth: 3,
        paddingLeft: 10,
    },
    replySender: {
        fontSize: 11,
        fontWeight: '900',
        textTransform: 'uppercase',
        marginBottom: 2,
    },
    replyText: {
        fontSize: 13,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.4)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    actionMenu: {
        width: '75%',
        borderRadius: 24,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.08)',
    },
    actionItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 18,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255,255,255,0.05)',
    },
    actionIconContainer: {
        width: 32,
        alignItems: 'center',
        marginRight: 14,
    },
    actionText: {
        fontSize: 16,
        fontWeight: '600',
    },
    reactionPickerBar: {
        paddingVertical: 18,
        paddingHorizontal: 8,
        borderBottomWidth: 1,
    },
    reactionPickerContent: {
        paddingHorizontal: 10,
        gap: 15,
    },
    reactionPickerItem: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: 'rgba(255,255,255,0.08)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    reactionPickerEmoji: {
        fontSize: 22,
    },
    encryptionBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        marginTop: 2,
    },
    encryptionText: {
        fontSize: 10,
        fontWeight: '600',
        letterSpacing: -0.2,
    },
});
