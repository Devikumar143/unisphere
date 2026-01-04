import React, { useState, useEffect, useRef, useCallback } from 'react';
import { StyleSheet, View, Text, TextInput, TouchableOpacity, FlatList, KeyboardAvoidingView, Platform, Modal, Pressable, Animated, Keyboard, Clipboard, Alert, Image, TouchableWithoutFeedback } from 'react-native';
import { Swipeable, GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system/legacy';
import * as ImagePicker from 'expo-image-picker';
import { ArrowLeft, Send, Camera, Plus, Check, CheckCheck, Copy, Trash2, Forward, Bookmark, BookmarkCheck, X, Mic, Play, Pause, Edit3, Lock, User, Search, Image as ImageIcon, Gift } from 'lucide-react-native';
import LinkPreviewCard from '../components/LinkPreviewCard';
import GifPicker from '../components/GifPicker';
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
    const slideAnim = useRef(new Animated.Value(isReceived ? 20 : 50)).current; // Less movement for received
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const scaleAnim = useRef(new Animated.Value(0.9)).current;

    useEffect(() => {
        Animated.parallel([
            Animated.spring(slideAnim, {
                toValue: 0,
                friction: 7,
                tension: 40,
                useNativeDriver: true,
            }),
            Animated.timing(fadeAnim, {
                toValue: 1,
                duration: 200,
                useNativeDriver: true,
            }),
            Animated.spring(scaleAnim, {
                toValue: 1,
                friction: 6,
                tension: 45,
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

const AnimatedReaction = ({ children }) => {
    const scaleAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        Animated.spring(scaleAnim, {
            toValue: 1,
            friction: 5,
            tension: 200, // High tension for "Pop"
            useNativeDriver: true,
        }).start();
    }, []);

    return (
        <Animated.View style={{
            transform: [{ scale: scaleAnim }]
        }}>
            {children}
        </Animated.View>
    );
};

const InteractableMessage = ({ children, onLongPress, style }) => {
    const scaleAnim = useRef(new Animated.Value(1)).current;

    const handlePressIn = () => {
        Animated.spring(scaleAnim, {
            toValue: 0.96,
            friction: 7,
            useNativeDriver: true,
        }).start();
    };

    const handlePressOut = () => {
        Animated.spring(scaleAnim, {
            toValue: 1,
            friction: 7,
            useNativeDriver: true,
        }).start();
    };

    return (
        <TouchableWithoutFeedback
            onPressIn={handlePressIn}
            onPressOut={handlePressOut}
            onLongPress={onLongPress}
            delayLongPress={200}
        >
            <Animated.View style={[style, { transform: [{ scale: scaleAnim }] }]}>
                {children}
            </Animated.View>
        </TouchableWithoutFeedback>
    );
};

const TypingDot = ({ delay, color }) => {
    const translateY = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        Animated.loop(
            Animated.sequence([
                Animated.timing(translateY, { toValue: -5, duration: 400, delay: delay, useNativeDriver: true }),
                Animated.timing(translateY, { toValue: 0, duration: 400, useNativeDriver: true }),
            ])
        ).start();
    }, []);

    return <Animated.View style={[styles.typingDot, { backgroundColor: color, transform: [{ translateY }] }]} />;
};

const AnimatedTypingIndicator = ({ themeColors, isDark }) => {
    const opacityAnim = useRef(new Animated.Value(0.4)).current;

    useEffect(() => {
        Animated.loop(
            Animated.sequence([
                Animated.timing(opacityAnim, {
                    toValue: 1,
                    duration: 800,
                    useNativeDriver: true,
                }),
                Animated.timing(opacityAnim, {
                    toValue: 0.4,
                    duration: 800,
                    useNativeDriver: true,
                }),
            ])
        ).start();
    }, []);

    return (
        <BlurView intensity={20} tint={isDark ? "dark" : "light"} style={styles.typingIndicator}>
            <Animated.View style={{ opacity: opacityAnim, flexDirection: 'row', alignItems: 'center' }}>
                <Text style={[styles.typingText, { color: isDark ? themeColors.textMain : themeColors.textMainLight }]}>TYPING</Text>
                <View style={styles.typingDots}>
                    {[0, 150, 300].map((delay, i) => (
                        <TypingDot key={i} delay={delay} color={themeColors.accentPrimary} />
                    ))}
                </View>
            </Animated.View>
        </BlurView>
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
    const [searchQuery, setSearchQuery] = useState('');
    const [isSearching, setIsSearching] = useState(false);
    const [uploadingMedia, setUploadingMedia] = useState(false);
    const [forwardModalVisible, setForwardModalVisible] = useState(false);
    const [conversations, setConversations] = useState([]);
    const [gifPickerVisible, setGifPickerVisible] = useState(false);

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

    const handlePickMedia = async () => {
        try {
            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.All,
                allowsEditing: true,
                aspect: [4, 3],
                quality: 0.8,
            });

            if (!result.canceled) {
                sendMediaMessage(result.assets[0].uri, result.assets[0].type);
            }
        } catch (error) {
            console.error('Error picking media:', error);
            Alert.alert('Error', 'Failed to pick media');
        }
    };

    const handleTakePhoto = async () => {
        try {
            const { status } = await ImagePicker.requestCameraPermissionsAsync();
            if (status !== 'granted') {
                Alert.alert('Permission Denied', 'Camera permission is required to take photos.');
                return;
            }

            const result = await ImagePicker.launchCameraAsync({
                allowsEditing: true,
                aspect: [4, 3],
                quality: 0.8,
            });

            if (!result.canceled) {
                sendMediaMessage(result.assets[0].uri, 'image');
            }
        } catch (error) {
            console.error('Error taking photo:', error);
            Alert.alert('Error', 'Failed to take photo');
        }
    };

    const sendMediaMessage = async (uri, type) => {
        setUploadingMedia(true);
        try {
            const mediaUrl = await uploadFile(uri);
            const messageType = type.includes('video') ? 'video' : 'image';

            const tempMessage = {
                id: Date.now().toString(),
                senderId: user.id,
                recipientId: chatTarget.id,
                content: messageType === 'image' ? 'Sent an image' : 'Sent a video',
                timestamp: new Date().toISOString(),
                messageType: messageType,
                attachmentUrls: [mediaUrl],
                replyTo: replyToMessage?.id,
                replyToDetails: replyToMessage
            };

            setMessages(prev => [...prev, tempMessage]);

            sendMessage(
                user.id,
                chatTarget.id,
                messageType === 'image' ? 'Sent an image' : 'Sent a video',
                replyToMessage?.id,
                false, // encrypted
                messageType,
                null, // voiceUrl
                null, // voiceDuration
                [mediaUrl]
            );

            setReplyToMessage(null);
            setTimeout(scrollToBottom, 500);
        } catch (error) {
            console.error('Error uploading media:', error);
            Alert.alert('Upload Failed', 'Failed to send media.');
        } finally {
            setUploadingMedia(false);
        }
    };

    const handleSendGif = async (url) => {
        const tempMessage = {
            id: Date.now().toString(),
            senderId: user.id,
            recipientId: chatTarget.id,
            content: 'Sent a GIF',
            timestamp: new Date().toISOString(),
            messageType: 'image',
            attachmentUrls: [url],
            replyTo: replyToMessage?.id,
            replyToDetails: replyToMessage
        };

        setMessages(prev => [...prev, tempMessage]);

        sendMessage(
            user.id,
            chatTarget.id,
            'Sent a GIF',
            replyToMessage?.id,
            false,
            'image',
            null,
            null,
            [url]
        );

        setReplyToMessage(null);
        setTimeout(scrollToBottom, 500);
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

    const handleForwardMessage = async () => {
        setActionMenuVisible(false);
        try {
            const data = await fetchConversations(user.id);
            setConversations(data.filter(c => c.id !== chatTarget.id));
            setForwardModalVisible(true);
        } catch (error) {
            console.error('Error fetching conversations for forward:', error);
            Alert.alert('Error', 'Failed to load conversations');
        }
    };

    const confirmForward = (targetConversation) => {
        if (actionMenuMessage) {
            sendMessage(
                user.id,
                targetConversation.id,
                actionMenuMessage.content,
                null, // replyTo
                false, // encrypted
                actionMenuMessage.messageType || 'text',
                actionMenuMessage.voiceUrl,
                actionMenuMessage.voiceDuration,
                actionMenuMessage.attachmentUrls
            );
            setForwardModalVisible(false);
            setActionMenuMessage(null);
            Alert.alert('Success', `Message forwarded to ${targetConversation.name}`);
        }
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
                        <View style={{
                            width: 36,
                            height: 36,
                            borderRadius: 18,
                            justifyContent: 'center',
                            alignItems: 'center',
                            backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)'
                        }}>
                            <ArrowLeft size={16} color={isDark ? themeColors.textMain : themeColors.textMainLight} />
                        </View>
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
                    <InteractableMessage
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
                                        <Text style={{ fontSize: 10, color: isDark ? themeColors.textDim : themeColors.textDimLight, fontWeight: '900', textTransform: 'uppercase', marginBottom: 2 }}>
                                            Replying to {item.replyToDetails.senderId === user.id ? 'You' : chatTarget.name}
                                        </Text>
                                        <Text numberOfLines={1} style={{ fontSize: 13, color: isDark ? themeColors.textDim : themeColors.textDimLight }}>
                                            {item.replyToDetails.content}
                                        </Text>
                                    </View>
                                )}

                                <Text style={[styles.senderLabel, { color: barColor1 }]}>
                                    {isMe ? 'You' : chatTarget.name}
                                </Text>

                                {item.messageType === 'voice' ? (
                                    <View style={{
                                        flexDirection: 'row',
                                        alignItems: 'center',
                                        marginTop: 4,
                                        paddingHorizontal: 12,
                                        paddingVertical: 10,
                                        borderRadius: 20,
                                        backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)',
                                        borderWidth: 1,
                                        borderColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'
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
                                                        backgroundColor: isDark ? themeColors.textDim : themeColors.textDimLight,
                                                        borderRadius: 1,
                                                        opacity: 0.3
                                                    }} />
                                                ))}
                                            </View>
                                        </View>

                                        <Text style={{ marginLeft: 10, fontSize: 12, fontWeight: '800', color: isDark ? themeColors.textMain : themeColors.textMainLight }}>
                                            {item.voiceDuration ? `${Math.floor(item.voiceDuration / 60)}:${(item.voiceDuration % 60).toString().padStart(2, '0')}` : '0:00'}
                                        </Text>
                                    </View>
                                ) : item.messageType === 'image' || (item.attachmentUrls && item.attachmentUrls.length > 0) ? (
                                    <View style={styles.mediaMessageContainer}>
                                        {item.attachmentUrls && item.attachmentUrls.map((url, idx) => (
                                            <Image
                                                key={idx}
                                                source={{ uri: url }}
                                                style={styles.messageImage}
                                                resizeMode="cover"
                                            />
                                        ))}
                                        {item.content && item.content !== 'Sent an image' && (
                                            <Text style={[styles.messageText, { color: isDark ? themeColors.textMain : themeColors.textMainLight, marginTop: 8 }]}>
                                                {item.content}
                                            </Text>
                                        )}
                                    </View>
                                ) : (
                                    <View>
                                        <Text style={[styles.messageText, { color: isDark ? themeColors.textMain : themeColors.textMainLight }]}>
                                            {item.content}
                                        </Text>
                                        {!item.isDeleted && (() => {
                                            const urlMatch = item.content?.match(/(https?:\/\/[^\s]+)/);
                                            return urlMatch ? <LinkPreviewCard url={urlMatch[0]} /> : null;
                                        })()}
                                    </View>
                                )}

                                <View style={styles.timestampRow}>
                                    <Text style={[styles.timestamp, { color: isDark ? themeColors.textDim : themeColors.textDimLight }]}>
                                        {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        {item.isEdited && <Text style={{ fontSize: 9, fontStyle: 'italic', opacity: 0.6 }}> • EDITED</Text>}
                                    </Text>
                                    {isMe && (
                                        <View style={styles.readStatus}>
                                            {item.readAt ? (
                                                <CheckCheck size={14} color={themeColors.accentPrimary} />
                                            ) : (
                                                <Check size={14} color={isDark ? themeColors.textDim : themeColors.textDimLight} />
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
                                    <View style={[styles.reactionsGlass, {
                                        backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)',
                                        borderColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'
                                    }]}>
                                        {Object.keys(item.reactions).map((emoji, index) => (
                                            <AnimatedReaction key={emoji}>
                                                <TouchableOpacity
                                                    onPress={() => toggleReaction(item.id, emoji)}
                                                    style={[styles.reactionTag, index > 0 && { marginLeft: 8 }]}
                                                >
                                                    <Text style={styles.reactionEmojiText}>{emoji}</Text>
                                                    <Text style={[styles.reactionCountText, { color: isDark ? themeColors.textMain : themeColors.textMainLight }]}>
                                                        {item.reactions[emoji].length}
                                                    </Text>
                                                </TouchableOpacity>
                                            </AnimatedReaction>
                                        ))}
                                    </View>
                                </View>
                            )}
                        </View>
                    </InteractableMessage>
                </AnimatedMessageBubble>
            </Swipeable>
        );
    };

    return (
        <View style={[styles.container, { backgroundColor: isDark ? themeColors.bgDark : themeColors.bgLight }]}>
            {/* Background Aura Glows removed for Organic Earth style */}

            {/* Floating Header */}
            <View style={styles.headerWrapper}>
                <View style={[styles.headerGlass, { backgroundColor: isDark ? themeColors.bgDark : themeColors.bgLight }]}>
                    <SafeAreaView edges={['top']}>
                        <View style={styles.header}>
                            <TouchableOpacity
                                onPress={isSearching ? () => { setIsSearching(false); setSearchQuery(''); } : onBack}
                                activeOpacity={0.7}
                                style={[styles.backBtn, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)' }]}
                            >
                                <ArrowLeft color={isDark ? themeColors.textMain : themeColors.textMainLight} size={22} />
                            </TouchableOpacity>

                            {isSearching ? (
                                <View style={styles.searchHeaderContainer}>
                                    <TextInput
                                        autoFocus
                                        style={[styles.searchInput, { color: isDark ? themeColors.textMain : themeColors.textMainLight }]}
                                        placeholder="Search messages..."
                                        placeholderTextColor={isDark ? themeColors.textDim : themeColors.textDimLight}
                                        value={searchQuery}
                                        onChangeText={setSearchQuery}
                                    />
                                    {searchQuery.length > 0 && (
                                        <TouchableOpacity onPress={() => setSearchQuery('')}>
                                            <X size={18} color={isDark ? themeColors.textDim : themeColors.textDimLight} />
                                        </TouchableOpacity>
                                    )}
                                </View>
                            ) : (
                                <>
                                    <View style={styles.headerInfo}>
                                        <View style={styles.headerAvatarContainer}>
                                            <View
                                                style={[styles.headerAvatarGlow, { backgroundColor: isTargetOnline ? themeColors.accentPrimary : (isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)') }]}
                                            >
                                                {chatTarget.avatar ? (
                                                    <Image source={{ uri: chatTarget.avatar }} style={styles.headerAvatar} />
                                                ) : (
                                                    <View style={[styles.headerAvatar, { backgroundColor: isDark ? themeColors.bgCard : themeColors.bgCardLight, justifyContent: 'center', alignItems: 'center' }]}>
                                                        <User size={24} color={isDark ? themeColors.textMuted : themeColors.textMutedLight} />
                                                    </View>
                                                )}
                                            </View>
                                            {isTargetOnline && <View style={[styles.headerOnlineBadge, { borderColor: isDark ? themeColors.bgDark : themeColors.bgLight }]} />}
                                        </View>

                                        <View style={styles.headerTextContent}>
                                            <Text style={[styles.headerName, {
                                                color: isDark ? themeColors.textMain : themeColors.textMainLight,
                                                fontFamily: 'PlayfairDisplay-Bold'
                                            }]} numberOfLines={1}>{chatTarget.name}</Text>
                                            <View style={styles.statusRow}>
                                                <Text style={[styles.headerStatusText, { color: isTargetOnline ? themeColors.accentPrimary : (isDark ? themeColors.textMuted : themeColors.textMutedLight) }]}>
                                                    {isTargetOnline ? 'ONLINE NOW' : 'OFFLINE'}
                                                </Text>
                                                {isTargetOnline && (
                                                    <View
                                                        style={[styles.statusPulse, { backgroundColor: themeColors.accentPrimary }]}
                                                    />
                                                )}
                                            </View>
                                            {/* Encryption Indicator */}
                                            {encryptionEnabled && (
                                                <View style={styles.encryptionBadge}>
                                                    <Lock size={10} color={themeColors.success} />
                                                    <Text style={[styles.encryptionText, { color: isDark ? themeColors.textDim : themeColors.textDimLight }]}>
                                                        End-to-end encrypted
                                                    </Text>
                                                </View>
                                            )}
                                        </View>
                                    </View>

                                    <View style={styles.headerActions}>
                                        <TouchableOpacity
                                            onPress={() => setIsSearching(true)}
                                            activeOpacity={0.7}
                                            style={[styles.headerAction, { marginRight: 8, backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)' }]}
                                        >
                                            <Search color={isDark ? themeColors.textMain : themeColors.textMainLight} size={20} />
                                        </TouchableOpacity>

                                        <TouchableOpacity
                                            onPress={onOpenSavedMessages}
                                            activeOpacity={0.7}
                                            style={[styles.headerAction, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)' }]}
                                        >
                                            <Bookmark color={isDark ? themeColors.textMain : themeColors.textMainLight} size={22} />
                                        </TouchableOpacity>
                                    </View>
                                </>
                            )}
                        </View>
                    </SafeAreaView>
                </View>
            </View>

            <KeyboardAvoidingView
                behavior={Platform.OS === "ios" ? "padding" : "height"}
                style={{ flex: 1 }}
                keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 0}
            >
                {/* Messages List */}
                <FlatList
                    ref={flatListRef}
                    data={messages.filter(m => m.content?.toLowerCase().includes(searchQuery.toLowerCase()))}
                    keyExtractor={item => item.id}
                    renderItem={renderMessage}
                    contentContainerStyle={styles.messagesList}
                    showsVerticalScrollIndicator={false}
                    ListEmptyComponent={
                        <View style={{ marginTop: 100, alignItems: 'center' }}>
                            <Text style={{ color: isDark ? themeColors.textDim : themeColors.textDimLight, fontSize: 16, fontWeight: '600' }}>Say hello to {chatTarget.name}!</Text>
                        </View>
                    }
                />

                {/* Typing Indicator (Floating) */}
                {isTargetTyping && (
                    <AnimatedTypingIndicator themeColors={themeColors} isDark={isDark} />
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
                                <Text numberOfLines={1} style={[styles.replyText, { color: isDark ? themeColors.textDim : themeColors.textDimLight }]}>
                                    {editingMessage ? editingMessage.content : replyToMessage.content}
                                </Text>
                            </View>
                            <TouchableOpacity onPress={() => editingMessage ? setEditingMessage(null) : setReplyToMessage(null)}>
                                <X size={18} color={isDark ? themeColors.textDim : themeColors.textDimLight} />
                            </TouchableOpacity>
                        </BlurView>
                    )}

                    <BlurView intensity={isDark ? 40 : 80} tint={isDark ? "dark" : "light"} style={[styles.inputIsland, { borderColor: 'rgba(255,255,255,0.1)' }]}>
                        {isRecording ? (
                            <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12 }}>
                                <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#EF4444', marginRight: 10 }} />
                                <Text style={{ color: isDark ? themeColors.textMain : themeColors.textMainLight, fontWeight: '800', fontSize: 16 }}>
                                    {Math.floor(recordingDuration / 60)}:{(recordingDuration % 60).toString().padStart(2, '0')}
                                </Text>
                                <Text style={{ marginLeft: 12, color: isDark ? themeColors.textDim : themeColors.textDimLight, fontSize: 13, fontWeight: '600' }}>Release to send voice chat</Text>
                            </View>
                        ) : (
                            <>
                                <TouchableOpacity style={styles.inputAction} onPress={handleTakePhoto}>
                                    <Camera color={isDark ? themeColors.textMain : themeColors.textMainLight} size={22} />
                                </TouchableOpacity>

                                <TouchableOpacity style={styles.inputAction} onPress={handlePickMedia}>
                                    <ImageIcon color={isDark ? themeColors.textMain : themeColors.textMainLight} size={22} />
                                </TouchableOpacity>

                                <TouchableOpacity style={styles.inputAction} onPress={() => setGifPickerVisible(true)}>
                                    <Gift color={isDark ? themeColors.textMain : themeColors.textMainLight} size={22} />
                                </TouchableOpacity>

                                <TextInput
                                    style={[styles.inputMain, { color: isDark ? themeColors.textMain : themeColors.textMainLight }]}
                                    placeholder="Message..."
                                    placeholderTextColor={isDark ? themeColors.textDim : themeColors.textDimLight}
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
                                    <Mic color={isRecording ? "#FFF" : (isDark ? themeColors.textDim : themeColors.textDimLight)} size={22} />
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
                            <View style={styles.actionIconContainer}><ArrowLeft size={20} color={isDark ? themeColors.textMain : themeColors.textMainLight} /></View>
                            <Text style={[styles.actionText, { color: isDark ? themeColors.textMain : themeColors.textMainLight }]}>Reply</Text>
                        </TouchableOpacity>

                        {actionMenuMessage?.senderId === user.id && (
                            <TouchableOpacity style={styles.actionItem} onPress={() => { setEditingMessage(actionMenuMessage); setNewMessage(actionMenuMessage.content); setActionMenuVisible(false); }}>
                                <View style={styles.actionIconContainer}><Edit3 size={18} color={isDark ? themeColors.textMain : themeColors.textMainLight} /></View>
                                <Text style={[styles.actionText, { color: isDark ? themeColors.textMain : themeColors.textMainLight }]}>Edit Chat</Text>
                            </TouchableOpacity>
                        )}

                        <TouchableOpacity style={styles.actionItem} onPress={handleCopyMessage}>
                            <View style={styles.actionIconContainer}><Copy size={18} color={isDark ? themeColors.textMain : themeColors.textMainLight} /></View>
                            <Text style={[styles.actionText, { color: isDark ? themeColors.textMain : themeColors.textMainLight }]}>Copy Text</Text>
                        </TouchableOpacity>

                        <TouchableOpacity style={styles.actionItem} onPress={handleForwardMessage}>
                            <View style={styles.actionIconContainer}><Forward size={20} color={isDark ? themeColors.textMain : themeColors.textMainLight} /></View>
                            <Text style={[styles.actionText, { color: isDark ? themeColors.textMain : themeColors.textMainLight }]}>Forward</Text>
                        </TouchableOpacity>

                        <TouchableOpacity style={styles.actionItem} onPress={handleSaveMessage}>
                            <View style={styles.actionIconContainer}>
                                {savedMessageIds.has(actionMenuMessage?.id)
                                    ? <BookmarkCheck size={20} color={themeColors.accentPrimary} />
                                    : <Bookmark size={20} color={isDark ? themeColors.textMain : themeColors.textMainLight} />}
                            </View>
                            <Text style={[styles.actionText, { color: isDark ? themeColors.textMain : themeColors.textMainLight }]}>
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

            {/* Forward Modal */}
            <Modal visible={forwardModalVisible} transparent animationType="slide">
                <Pressable style={styles.modalOverlay} onPress={() => setForwardModalVisible(false)}>
                    <View style={[styles.forwardMenu, { backgroundColor: isDark ? themeColors.bgDark : themeColors.bgLight }]}>
                        <View style={styles.forwardHeader}>
                            <Text style={[styles.forwardTitle, { color: isDark ? themeColors.textMain : themeColors.textMainLight }]}>Forward To</Text>
                            <TouchableOpacity onPress={() => setForwardModalVisible(false)}>
                                <X size={24} color={isDark ? themeColors.textDim : themeColors.textDimLight} />
                            </TouchableOpacity>
                        </View>

                        <FlatList
                            data={conversations}
                            keyExtractor={item => item.id}
                            renderItem={({ item }) => (
                                <TouchableOpacity
                                    style={styles.forwardUserItem}
                                    onPress={() => confirmForward(item)}
                                >
                                    <View style={styles.forwardAvatar}>
                                        {item.avatar ? (
                                            <Image source={{ uri: item.avatar }} style={styles.forwardAvatarImg} />
                                        ) : (
                                            <User size={20} color={isDark ? themeColors.textMuted : themeColors.textMutedLight} />
                                        )}
                                    </View>
                                    <View style={styles.forwardUserInfo}>
                                        <Text style={[styles.forwardUserName, { color: isDark ? themeColors.textMain : themeColors.textMainLight }]}>{item.name}</Text>
                                        <Text style={[styles.forwardUserRole, { color: isDark ? themeColors.textDim : themeColors.textDimLight }]}>{item.role}</Text>
                                    </View>
                                    <Send size={18} color={themeColors.accentPrimary} />
                                </TouchableOpacity>
                            )}
                            ListEmptyComponent={
                                <View style={{ padding: 40, alignItems: 'center' }}>
                                    <Text style={{ color: isDark ? themeColors.textDim : themeColors.textDimLight }}>No other conversations found</Text>
                                </View>
                            }
                        />
                    </View>
                </Pressable>
            </Modal>
            {/* Gif Picker */}
            <GifPicker
                visible={gifPickerVisible}
                onClose={() => setGifPickerVisible(false)}
                onSelect={handleSendGif}
            />
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
    headerActions: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    searchHeaderContainer: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        backgroundColor: 'rgba(255,255,255,0.05)',
        borderRadius: 20,
        marginHorizontal: 12,
        height: 40,
    },
    searchInput: {
        flex: 1,
        fontSize: 14,
        fontWeight: '500',
    },
    mediaMessageContainer: {
        marginTop: 4,
        borderRadius: 12,
        overflow: 'hidden',
    },
    messageImage: {
        width: 240,
        height: 180,
        borderRadius: 12,
    },
    forwardMenu: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        borderTopLeftRadius: 30,
        borderTopRightRadius: 30,
        paddingBottom: 40,
        maxHeight: '80%',
    },
    forwardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 24,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255,255,255,0.05)',
    },
    forwardTitle: {
        fontSize: 20,
        fontFamily: 'PlayfairDisplay-Bold',
    },
    forwardUserItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        marginHorizontal: 16,
        borderRadius: 16,
    },
    forwardAvatar: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: 'rgba(255,255,255,0.05)',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 14,
        overflow: 'hidden',
    },
    forwardAvatarImg: {
        width: '100%',
        height: '100%',
    },
    forwardUserInfo: {
        flex: 1,
    },
    forwardUserName: {
        fontSize: 16,
        fontWeight: '700',
    },
    forwardUserRole: {
        fontSize: 12,
        fontWeight: '500',
    },
});
