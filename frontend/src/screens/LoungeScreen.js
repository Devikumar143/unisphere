import React, { useState, useEffect, useRef, useCallback } from 'react';
import { StyleSheet, View, Text, TextInput, TouchableOpacity, FlatList, KeyboardAvoidingView, Platform, Animated, Keyboard, Alert, Image, ActivityIndicator, Modal, Pressable, TouchableWithoutFeedback } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { ArrowLeft, Send, Users, Info, Camera, Mic, Image as ImageIcon, Smile, ChevronRight, Sparkles, Zap, X, CornerDownRight, Trash2, Heart, MessageCircle, Save as SaveIcon, BarChart2, Plus } from 'lucide-react-native';
import { COLORS, SIZES, GLASS } from '../constants/theme';
import { useTheme } from '../context/ThemeContext';
import * as ImagePicker from 'expo-image-picker';
import { fetchGroupMessages, saveMessage, uploadFile, pinMessage, unpinMessage } from '../services/api';
import LinkPreviewCard from '../components/LinkPreviewCard';
import {
    getSocket,
} from '../services/socket';

const SNAP_COLORS = [
    '#FF1D58', // Red
    '#6AC47E', // Green
    '#3CB2E2', // Blue
    '#FBC02D', // Yellow
    '#9C27B0', // Purple
    '#FF6D00', // Orange,
];

const REACTION_EMOJIS = ['❤️', '😂', '😮', '😢', '🔥', '👍'];

const getSenderColor = (seed) => {
    if (!seed) return SNAP_COLORS[0];
    let hash = 0;
    for (let i = 0; i < seed.length; i++) {
        hash = seed.charCodeAt(i) + ((hash << 5) - hash);
    }
    return SNAP_COLORS[Math.abs(hash) % SNAP_COLORS.length];
};

const AnimatedMessageBubble = ({ children, isReceived }) => {
    const slideAnim = useRef(new Animated.Value(isReceived ? 20 : 50)).current;
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

const AnimatedTypingIndicator = ({ isDark, text }) => {
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
        <View style={styles.typingContainer}>
            <Animated.View style={{ opacity: opacityAnim, flexDirection: 'row', alignItems: 'center' }}>
                <Text style={styles.typingText}>{text}</Text>
                <View style={[styles.typingDots, { marginLeft: 8, flexDirection: 'row', alignItems: 'center', gap: 4 }]}>
                    {[0, 150, 300].map((delay, i) => (
                        <TypingDot key={i} delay={delay} color={isDark ? '#FFF' : '#333'} />
                    ))}
                </View>
            </Animated.View>
        </View>
    );
};

export default function LoungeScreen({ user, community, onBack }) {
    const { themeColors, isDark } = useTheme();
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const [loading, setLoading] = useState(true);
    const [typingUsers, setTypingUsers] = useState({});
    const [replyTo, setReplyTo] = useState(null);
    const [selectedMessage, setSelectedMessage] = useState(null);
    const [showActions, setShowActions] = useState(false);
    const [uploadingMedia, setUploadingMedia] = useState(false);

    // Mention state
    const [mentionQuery, setMentionQuery] = useState(null);
    const [filteredMembers, setFilteredMembers] = useState([]);

    // Pinned Message State
    const [pinnedMessage, setPinnedMessage] = useState(null);

    // Poll state
    const [showPollCreator, setShowPollCreator] = useState(false);
    const [pollQuestion, setPollQuestion] = useState('');
    const [pollOptions, setPollOptions] = useState(['', '']);

    const flatListRef = useRef(null);
    const typingTimeout = useRef(null);
    const socket = getSocket();

    useEffect(() => {
        loadMessages();

        if (socket) {
            socket.emit('join_community', community.id);

            const handleReceiveGroupMessage = (message) => {
                if (message.communityId === community.id) {
                    setMessages(prev => {
                        // Check if message already exists (optimistic)
                        if (prev.some(m => m.id === message.id)) return prev;
                        return [...prev, message];
                    });
                    setTimeout(scrollToBottom, 200);
                }
            };

            const handleTyping = ({ userId, userName }) => {
                if (userId !== user.id) {
                    setTypingUsers(prev => ({ ...prev, [userId]: userName }));
                }
            };

            const handleStopTyping = ({ userId }) => {
                setTypingUsers(prev => {
                    const next = { ...prev };
                    delete next[userId];
                    return next;
                });
            };

            const handleReactionUpdate = ({ messageId, reactions }) => {
                setMessages(prev => prev.map(m => m.id === messageId ? { ...m, reactions } : m));
            };

            const handleMessageDeleted = ({ messageId }) => {
                setMessages(prev => prev.map(m => m.id === messageId ? { ...m, isDeleted: true, content: 'This message was deleted' } : m));
            };

            const handlePollUpdate = ({ messageId, pollData }) => {
                setMessages(prev => prev.map(m => m.id === messageId ? { ...m, pollData } : m));
            };

            socket.on('receive_group_message', handleReceiveGroupMessage);
            socket.on('user_typing_community', handleTyping);
            socket.on('user_stop_typing_community', handleStopTyping);
            socket.on('update_group_message_reactions', handleReactionUpdate);
            socket.on('group_message_deleted', handleMessageDeleted);
            socket.on('update_poll_results', handlePollUpdate);

            socket.on('community_pinned_message_updated', ({ communityId: cId, pinnedMessage: pm }) => {
                if (cId === community.id) {
                    setPinnedMessage(pm);
                }
            });

            return () => {
                socket.emit('leave_community', community.id);
                socket.off('receive_group_message', handleReceiveGroupMessage);
                socket.off('user_typing_community', handleTyping);
                socket.off('user_stop_typing_community', handleStopTyping);
                socket.off('update_group_message_reactions', handleReactionUpdate);
                socket.off('group_message_deleted', handleMessageDeleted);
                socket.off('update_poll_results', handlePollUpdate);
                socket.off('community_pinned_message_updated');
            };
        }
    }, [community?.id]);

    const loadMessages = async () => {
        try {
            const data = await fetchGroupMessages(community.id);
            setMessages(data);
            setLoading(false);
            setTimeout(scrollToBottom, 400);
        } catch (error) {
            console.error('Error loading group messages:', error);
            setLoading(false);
        }
    };

    const handleTextChange = (text) => {
        setNewMessage(text);
        if (socket) {
            socket.emit('typing_community', { communityId: community.id, userId: user.id, userName: user.full_name });
            if (typingTimeout.current) clearTimeout(typingTimeout.current);
            typingTimeout.current = setTimeout(() => {
                socket.emit('stop_typing_community', { communityId: community.id, userId: user.id });
            }, 3000);
        }

        // Mention Detection
        const lastWord = text.split(' ').pop();
        if (lastWord && lastWord.startsWith('@')) {
            const query = lastWord.slice(1).toLowerCase();
            setMentionQuery(query);

            // Filter members (using typing users as mock if community.members is missing)
            const mockMembers = Object.values(typingUsers).length > 0
                ? Object.entries(typingUsers).map(([id, name]) => ({ id, name, username: name.replace(/\s/g, '').toLowerCase() }))
                : [{ name: 'Test User', username: 'test' }, { name: 'Admin', username: 'admin' }];

            const members = community.members || mockMembers;

            const filtered = members.filter(m =>
                (m.name || m.username || '').toLowerCase().includes(query)
            );
            setFilteredMembers(filtered);
        } else {
            setMentionQuery(null);
        }
    };

    const handleMentionSelect = (memberName) => {
        const words = newMessage.split(' ');
        words.pop(); // Remove the partial @mention
        const text = words.join(' ') + (words.length > 0 ? ' ' : '') + `@${memberName} `;
        setNewMessage(text);
        setMentionQuery(null);
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

            const messageData = {
                senderId: user.id,
                communityId: community.id,
                content: messageType === 'image' ? 'Sent an image' : 'Sent a video',
                messageType: messageType,
                attachmentUrls: [mediaUrl],
                replyTo: replyTo?.id
            };

            socket.emit('send_group_message', messageData);
            setReplyTo(null);
            setTimeout(scrollToBottom, 500);
        } catch (error) {
            console.error('Error uploading media:', error);
            Alert.alert('Upload Failed', 'Failed to send media.');
        } finally {
            setUploadingMedia(false);
        }
    };

    const handleSend = () => {
        if (!newMessage.trim() || !socket) return;

        const messageData = {
            senderId: user.id,
            communityId: community.id,
            content: newMessage.trim(),
            replyTo: replyTo?.id
        };

        socket.emit('send_group_message', messageData);
        setNewMessage('');
        setReplyTo(null);
        socket.emit('stop_typing_community', { communityId: community.id, userId: user.id });
    };

    const handleCreatePoll = () => {
        const filteredOptions = pollOptions.filter(opt => opt.trim());
        if (!pollQuestion.trim() || filteredOptions.length < 2) {
            Alert.alert('Incomplete Poll', 'Please provide a question and at least 2 options.');
            return;
        }

        socket.emit('create_poll', {
            senderId: user.id,
            communityId: community.id,
            question: pollQuestion.trim(),
            options: filteredOptions
        });

        setShowPollCreator(false);
        setPollQuestion('');
        setPollOptions(['', '']);
    };

    const handleVote = (messageId, optionIndex) => {
        if (!socket) return;
        socket.emit('vote_poll', {
            messageId,
            communityId: community.id,
            userId: user.id,
            optionIndex
        });
    };

    const handleReact = (messageId, emoji) => {
        if (!socket) return;
        socket.emit('react_group_message', {
            messageId,
            communityId: community.id,
            userId: user.id,
            reaction: emoji
        });
        setShowActions(false);
    };

    const handleDelete = (messageId) => {
        if (!socket) return;
        Alert.alert('Delete Message', 'Are you sure?', [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Delete',
                style: 'destructive',
                onPress: () => {
                    socket.emit('delete_group_message', { messageId, communityId: community.id, userId: user.id });
                    setShowActions(false);
                }
            }
        ]);
    };

    const handleSave = async (messageId) => {
        try {
            await saveMessage(user.id, messageId);
            Alert.alert('Saved', 'Message saved to your collection.');
            setShowActions(false);
        } catch (error) {
            console.error(error);
        }
    };

    const scrollToBottom = () => {
        if (flatListRef.current && messages.length > 0) {
            flatListRef.current.scrollToEnd({ animated: true });
        }
    };

    const renderMessage = ({ item, index }) => {
        const isMe = item.senderId === user.id;
        const prevMessage = messages[index - 1];
        const nextMessage = messages[index + 1];
        const showSender = !prevMessage || prevMessage.senderId !== item.senderId || !!item.replyTo;
        const senderColor = getSenderColor(item.senderId);

        return (
            <AnimatedMessageBubble isReceived={!isMe}>
                <InteractableMessage
                    onLongPress={() => {
                        setSelectedMessage(item);
                        setShowActions(true);
                    }}
                    style={[
                        styles.messageContainer,
                        showSender && styles.messageWithSpacing
                    ]}
                >
                    <View style={styles.messageRow}>
                        <View style={[
                            styles.statusPipe,
                            { backgroundColor: isMe ? '#3CB2E2' : senderColor }
                        ]} />

                        <View style={styles.contentContainer}>
                            {showSender && (
                                <Text style={[styles.senderName, { color: isMe ? '#3CB2E2' : senderColor }]}>
                                    {isMe ? 'Me' : (item.senderName || 'Member')}
                                </Text>
                            )}

                            {item.replyTo && (
                                <View style={[styles.replySnippet, { borderLeftColor: senderColor + '40' }]}>
                                    <Text style={styles.replySender} numberOfLines={1}>{item.replyToSenderName || 'Member'}</Text>
                                    <Text style={styles.replyContent} numberOfLines={1}>{item.replyToContent}</Text>
                                </View>
                            )}

                            {item.messageType === 'poll' && item.pollData ? (
                                <View style={[styles.pollBubble, { borderColor: isMe ? '#3CB2E2' : senderColor }]}>
                                    <Text style={[styles.pollQuestion, { color: isDark ? themeColors.textMain : themeColors.textMainLight }]}>{item.pollData.question}</Text>
                                    {item.pollData.options.map((opt, idx) => {
                                        const totalVotes = item.pollData.voters?.length || 0;
                                        const percentage = totalVotes > 0 ? ((opt.votes?.length || 0) / totalVotes) * 100 : 0;
                                        const isSelected = opt.votes?.includes(user.id);
                                        const hasVoted = item.pollData.voters?.includes(user.id);

                                        return (
                                            <TouchableOpacity
                                                key={idx}
                                                style={[styles.pollOption, { backgroundColor: isDark ? '#1A1A1A' : '#F2F2F2' }]}
                                                onPress={() => !hasVoted && handleVote(item.id, idx)}
                                                activeOpacity={hasVoted ? 1 : 0.7}
                                            >
                                                <View style={[styles.pollProgress, { width: `${percentage}%`, backgroundColor: isSelected ? '#3CB2E2' : (isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)') }]} />
                                                <View style={styles.pollOptionContent}>
                                                    <Text style={[styles.pollOptionText, { color: isDark ? themeColors.textMain : themeColors.textMainLight }]}>{opt.text}</Text>
                                                    {hasVoted && <Text style={styles.pollOptionPercent}>{Math.round(percentage)}%</Text>}
                                                </View>
                                            </TouchableOpacity>
                                        );
                                    })}
                                    <Text style={styles.pollFooter}>{item.pollData.voters?.length || 0} {item.pollData.voters?.length === 1 ? 'vote' : 'votes'}</Text>
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
                                <View style={styles.textWrapper}>
                                    <Text style={[
                                        styles.messageText,
                                        { color: isDark ? themeColors.textMain : themeColors.textMainLight, opacity: item.isDeleted ? 0.5 : 1, fontStyle: item.isDeleted ? 'italic' : 'normal' }
                                    ]}>
                                        {item.content.split(' ').map((word, i) => {
                                            if (word.startsWith('@')) {
                                                return <Text key={i} style={{ color: themeColors.accentPrimary, fontWeight: 'bold' }}>{word} </Text>;
                                            }
                                            return <Text key={i}>{word} </Text>;
                                        })}
                                    </Text>
                                    {!item.isDeleted && (() => {
                                        const urlMatch = item.content?.match(/(https?:\/\/[^\s]+)/);
                                        return urlMatch ? <LinkPreviewCard url={urlMatch[0]} /> : null;
                                    })()}
                                </View>
                            )}

                            {/* Reactions Row */}
                            {item.reactions && Object.keys(item.reactions).length > 0 && (
                                <View style={styles.reactionsRow}>
                                    {Object.entries(item.reactions).map(([emoji, users]) => users.length > 0 ? (
                                        <AnimatedReaction key={emoji}>
                                            <View style={[styles.reactionBadge, { backgroundColor: isDark ? '#1A1A1A' : '#F2F2F2' }]}>
                                                <Text style={styles.reactionEmoji}>{emoji}</Text>
                                                <Text style={[styles.reactionCount, { color: isDark ? '#FFF' : '#666' }]}>{users.length}</Text>
                                            </View>
                                        </AnimatedReaction>
                                    ) : null)}
                                </View>
                            )}
                        </View>
                    </View>
                </InteractableMessage>
            </AnimatedMessageBubble>
        );
    };

    const handlePinMessage = async (msg) => {
        try {
            await pinMessage(community.id, msg.id, user.id);
            Alert.alert('Success', 'Message pinned to top');
            setShowActions(false);
        } catch (error) {
            Alert.alert('Error', 'Failed to pin message');
        }
    };

    const handleUnpinMessage = async () => {
        try {
            await unpinMessage(community.id, user.id);
            // setPinnedMessage(null); // Socket will handle this
        } catch (error) {
            Alert.alert('Error', 'Failed to unpin message');
        }
    };

    const typingList = Object.values(typingUsers);

    // Initial load of pinned message from community prop or fetch usually happens in useEffect
    // For now we assume community object has it if passed fresh, otherwise we might need to fetch it separately or update `loadMessages`
    useEffect(() => {
        if (community.pinned_message) {
            setPinnedMessage(community.pinned_message);
        }
    }, [community]);

    return (
        <View style={[styles.container, { backgroundColor: isDark ? themeColors.bgDark : themeColors.bgLight }]}>
            {/* Background elements removed for Organic Earth style */}
            <SafeAreaView edges={['top']} style={styles.headerContainer}>
                <View style={[styles.header, { borderBottomColor: isDark ? '#1A1A1A' : '#F2F2F2' }]}>
                    <TouchableOpacity onPress={onBack} style={styles.backBtn}>
                        <ChevronRight color={isDark ? "#FFF" : "#000"} size={28} style={{ transform: [{ rotate: '180deg' }] }} />
                    </TouchableOpacity>
                    <View style={styles.headerInfo}>
                        <Text style={[styles.headerTitle, {
                            color: isDark ? themeColors.textMain : themeColors.textMainLight,
                            fontFamily: 'PlayfairDisplay-Bold'
                        }]}>{community.name}</Text>
                        <Text style={[styles.headerSubtitle, { color: themeColors.accentPrimary }]}>Community Lounge</Text>
                    </View>
                    <TouchableOpacity style={styles.headerAction}>
                        <Users color={isDark ? "#FFF" : "#000"} size={22} />
                    </TouchableOpacity>
                </View>

                {/* Pinned Message Header */}
                {pinnedMessage && (
                    <View style={[styles.pinnedContainer, { backgroundColor: isDark ? 'rgba(60, 178, 226, 0.15)' : 'rgba(60, 178, 226, 0.1)' }]}>
                        <Pin size={14} color={themeColors.accentPrimary} style={{ marginRight: 8 }} />
                        <View style={{ flex: 1 }}>
                            <Text numberOfLines={1} style={{ fontSize: 12, fontWeight: 'bold', color: themeColors.accentPrimary }}>
                                Pinned Message
                            </Text>
                            <Text numberOfLines={1} style={{ fontSize: 12, color: isDark ? themeColors.textMain : themeColors.textMainLight, opacity: 0.8 }}>
                                {pinnedMessage.senderName}: {pinnedMessage.content}
                            </Text>
                        </View>
                        {user.role === 'admin' /* simplified check */ && ( // In real app check community_members role
                            <TouchableOpacity onPress={handleUnpinMessage} style={{ padding: 4 }}>
                                <X size={14} color={isDark ? themeColors.textDim : themeColors.textDimLight} />
                            </TouchableOpacity>
                        )}
                    </View>
                )}
            </SafeAreaView>

            <KeyboardAvoidingView
                behavior={Platform.OS === "ios" ? "padding" : "height"}
                style={{ flex: 1 }}
                keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}
            >
                <FlatList
                    ref={flatListRef}
                    data={messages}
                    keyExtractor={(item, index) => item.id || index.toString()}
                    renderItem={renderMessage}
                    contentContainerStyle={styles.messagesList}
                    ListEmptyComponent={
                        loading ? (
                            <ActivityIndicator size="small" color="#3CB2E2" style={{ marginTop: 20 }} />
                        ) : (
                            <View style={styles.emptyContainer}>
                                <Text style={[styles.emptyText, { color: isDark ? themeColors.textDim : themeColors.textDimLight }]}>Tap to chat with the community</Text>
                            </View>
                        )
                    }
                />

                {/* Typing Indicator */}
                {typingList.length > 0 && (
                    <AnimatedTypingIndicator
                        isDark={isDark}
                        text={typingList.length === 1
                            ? `${typingList[0]} is typing...`
                            : `${typingList[0]} and ${typingList.length - 1} others are typing...`}
                    />
                )}

                {/* Mention List Popup */}
                {mentionQuery !== null && filteredMembers.length > 0 && (
                    <View style={[styles.mentionList, { backgroundColor: isDark ? 'rgba(30,30,30,0.95)' : 'rgba(255,255,255,0.95)' }]}>
                        <FlatList
                            data={filteredMembers}
                            keyExtractor={(item, index) => index.toString()}
                            renderItem={({ item }) => (
                                <TouchableOpacity
                                    style={[styles.mentionItem, { borderBottomColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' }]}
                                    onPress={() => handleMentionSelect(item.name || item.username)}
                                >
                                    <Text style={[styles.mentionText, { color: isDark ? themeColors.textMain : themeColors.textMainLight }]}>@{item.name || item.username}</Text>
                                </TouchableOpacity>
                            )}
                        />
                    </View>
                )}

                {/* Mention List Popup */}
                {mentionQuery !== null && filteredMembers.length > 0 && (
                    <View style={[styles.mentionList, { backgroundColor: isDark ? 'rgba(30,30,30,0.95)' : 'rgba(255,255,255,0.95)' }]}>
                        <FlatList
                            data={filteredMembers}
                            keyExtractor={(item, index) => index.toString()}
                            renderItem={({ item }) => (
                                <TouchableOpacity
                                    style={[styles.mentionItem, { borderBottomColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' }]}
                                    onPress={() => handleMentionSelect(item.name || item.username)}
                                >
                                    <Text style={[styles.mentionText, { color: isDark ? themeColors.textMain : themeColors.textMainLight }]}>@{item.name || item.username}</Text>
                                </TouchableOpacity>
                            )}
                        />
                    </View>
                )}

                {/* Reply Indicator */}
                {replyTo && (
                    <View style={[styles.replyBar, { backgroundColor: isDark ? '#1A1A1A' : '#F2F2F2' }]}>
                        <CornerDownRight size={16} color="#3CB2E2" />
                        <View style={styles.replyBarContent}>
                            <Text style={styles.replyBarName} numberOfLines={1}>{replyTo.senderName}</Text>
                            <Text style={styles.replyBarText} numberOfLines={1}>{replyTo.content}</Text>
                        </View>
                        <TouchableOpacity onPress={() => setReplyTo(null)}>
                            <X size={20} color={isDark ? "#666" : "#999"} />
                        </TouchableOpacity>
                    </View>
                )}

                <View style={styles.footer}>
                    <View style={[styles.inputContainer, { backgroundColor: isDark ? themeColors.bgCard : themeColors.bgCardLight }]}>
                        <TouchableOpacity style={styles.utilityBtn} onPress={() => setShowPollCreator(true)}>
                            <BarChart2 color={themeColors.accentPrimary} size={24} />
                        </TouchableOpacity>

                        <TouchableOpacity style={styles.utilityBtn} onPress={handleTakePhoto}>
                            <Camera color={isDark ? themeColors.textMuted : themeColors.textMutedLight} size={24} />
                        </TouchableOpacity>

                        <TouchableOpacity style={styles.utilityBtn} onPress={handlePickMedia}>
                            <ImageIcon color={isDark ? themeColors.textMuted : themeColors.textMutedLight} size={24} />
                        </TouchableOpacity>

                        <TextInput
                            style={[styles.input, { color: isDark ? themeColors.textMain : themeColors.textMainLight }]}
                            placeholder="Send a Chat"
                            placeholderTextColor={isDark ? themeColors.textMuted : themeColors.textMutedLight}
                            value={newMessage}
                            onChangeText={handleTextChange}
                            multiline
                        />

                        <View style={styles.rightActions}>
                            {newMessage.trim() ? (
                                <TouchableOpacity onPress={handleSend} style={styles.sendBtn}>
                                    <View style={[styles.sendCircle, { backgroundColor: themeColors.accentPrimary }]}>
                                        <Send color="#FFF" size={16} />
                                    </View>
                                </TouchableOpacity>
                            ) : (
                                <>
                                    <TouchableOpacity style={styles.utilityBtn}>
                                        <Mic color={isDark ? themeColors.textMuted : themeColors.textMutedLight} size={24} />
                                    </TouchableOpacity>
                                    <TouchableOpacity style={styles.utilityBtn}>
                                        <ImageIcon color={isDark ? themeColors.textMuted : themeColors.textMutedLight} size={24} />
                                    </TouchableOpacity>
                                </>
                            )}
                        </View>
                    </View>
                </View>
            </KeyboardAvoidingView>

            {/* Poll Creator Modal */}
            <Modal
                visible={showPollCreator}
                transparent
                animationType="slide"
                onRequestClose={() => setShowPollCreator(false)}
            >
                <Pressable
                    style={styles.modalOverlay}
                    onPress={() => setShowPollCreator(false)}
                >
                    <KeyboardAvoidingView
                        behavior={Platform.OS === "ios" ? "padding" : "height"}
                        style={{ flex: 1, justifyContent: 'flex-end' }}
                    >
                        <Pressable
                            style={[styles.modalContent, { backgroundColor: isDark ? '#121212' : '#FFF' }]}
                            onPress={(e) => e.stopPropagation()}
                        >
                            <View style={styles.modalHeader}>
                                <Text style={[styles.modalTitle, { color: isDark ? '#FFF' : '#333' }]}>Create Poll</Text>
                                <TouchableOpacity onPress={() => setShowPollCreator(false)}>
                                    <X size={24} color={isDark ? "#666" : "#999"} />
                                </TouchableOpacity>
                            </View>

                            <TextInput
                                style={[styles.pollInput, { color: isDark ? '#FFF' : '#000', backgroundColor: isDark ? '#1A1A1A' : '#F2F2F2' }]}
                                placeholder="What's on your mind?"
                                placeholderTextColor={isDark ? "#666" : "#999"}
                                value={pollQuestion}
                                onChangeText={setPollQuestion}
                                multiline
                            />

                            {pollOptions.map((opt, idx) => (
                                <View key={idx} style={styles.optionRow}>
                                    <TextInput
                                        style={[styles.optionInput, { color: isDark ? '#FFF' : '#000', backgroundColor: isDark ? '#1A1A1A' : '#F2F2F2' }]}
                                        placeholder={`Option ${idx + 1}`}
                                        placeholderTextColor={isDark ? "#666" : "#999"}
                                        value={opt}
                                        onChangeText={(text) => {
                                            const newOpts = [...pollOptions];
                                            newOpts[idx] = text;
                                            setPollOptions(newOpts);
                                        }}
                                    />
                                    {pollOptions.length > 2 && (
                                        <TouchableOpacity
                                            onPress={() => setPollOptions(pollOptions.filter((_, i) => i !== idx))}
                                            style={styles.removeOption}
                                        >
                                            <X size={16} color="#F44336" />
                                        </TouchableOpacity>
                                    )}
                                </View>
                            ))}

                            {pollOptions.length < 5 && (
                                <TouchableOpacity
                                    style={styles.addOptionBtn}
                                    onPress={() => setPollOptions([...pollOptions, ''])}
                                >
                                    <Plus size={20} color="#3CB2E2" />
                                    <Text style={styles.addOptionText}>Add Option</Text>
                                </TouchableOpacity>
                            )}

                            <TouchableOpacity
                                style={[styles.createPollSubmit, { backgroundColor: pollQuestion.trim() && pollOptions.filter(o => o.trim()).length >= 2 ? '#3CB2E2' : '#666' }]}
                                onPress={handleCreatePoll}
                                disabled={!pollQuestion.trim() || pollOptions.filter(o => o.trim()).length < 2}
                            >
                                <Text style={styles.createPollSubmitText}>Post to Lounge</Text>
                            </TouchableOpacity>
                        </Pressable>
                    </KeyboardAvoidingView>
                </Pressable>
            </Modal>

            {/* Actions Modal */}
            <Modal
                visible={showActions}
                transparent
                animationType="fade"
                onRequestClose={() => setShowActions(false)}
            >
                <Pressable
                    style={styles.modalOverlay}
                    onPress={() => setShowActions(false)}
                >
                    <View style={[styles.modalContent, { backgroundColor: isDark ? '#121212' : '#FFF' }]}>
                        {/* Reaction Picker */}
                        <View style={[styles.reactionPicker, { borderBottomColor: isDark ? '#222' : '#EEE' }]}>
                            {REACTION_EMOJIS.map(emoji => (
                                <TouchableOpacity
                                    key={emoji}
                                    style={styles.reactionItem}
                                    onPress={() => handleReact(selectedMessage.id, emoji)}
                                >
                                    <Text style={styles.reactionItemEmoji}>{emoji}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>

                        <View style={styles.modalMenu}>
                            <TouchableOpacity
                                style={styles.menuItem}
                                onPress={() => {
                                    setReplyTo(selectedMessage);
                                    setShowActions(false);
                                }}
                            >
                                <MessageCircle size={22} color="#3CB2E2" />
                                <Text style={[styles.menuItemText, { color: isDark ? '#FFF' : '#333' }]}>Reply</Text>
                            </TouchableOpacity>

                            <TouchableOpacity style={styles.menuItem} onPress={() => handleSave(selectedMessage.id)}>
                                <SaveIcon size={22} color="#4CAF50" />
                                <Text style={[styles.menuItemText, { color: isDark ? '#FFF' : '#333' }]}>Save to Collection</Text>
                            </TouchableOpacity>

                            {(user.role === 'Chat Moderator' || community.created_by === user.id || user.role === 'admin' /* fallback */) && (
                                <TouchableOpacity style={styles.menuItem} onPress={() => handlePinMessage(selectedMessage)}>
                                    <Pin size={22} color="#FFA000" />
                                    <Text style={[styles.menuItemText, { color: isDark ? '#FFF' : '#333' }]}>Pin Message</Text>
                                </TouchableOpacity>
                            )}
                            {selectedMessage?.senderId === user.id && (
                                <TouchableOpacity style={styles.menuItem} onPress={() => handleDelete(selectedMessage.id)}>
                                    <Trash2 size={22} color="#F44336" />
                                    <Text style={[styles.menuItemText, { color: '#F44336' }]}>Delete Message</Text>
                                </TouchableOpacity>
                            )}
                        </View>
                    </View>
                </Pressable>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    headerContainer: {
        zIndex: 10,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 10,
        borderBottomWidth: 1,
    },
    backBtn: {
        padding: 4,
    },
    headerInfo: {
        flex: 1,
        marginLeft: 10,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '900',
        letterSpacing: -0.5,
    },
    headerSubtitle: {
        fontSize: 11,
        color: '#3CB2E2',
        fontWeight: '700',
        textTransform: 'uppercase',
        marginTop: -2,
    },
    headerAction: {
        padding: 8,
    },
    messagesList: {
        paddingVertical: 10,
    },
    messageContainer: {
        paddingHorizontal: 12,
        marginVertical: 1,
    },
    messageWithSpacing: {
        marginTop: 12,
    },
    messageRow: {
        flexDirection: 'row',
    },
    statusPipe: {
        width: 3,
        borderRadius: 2,
        marginRight: 12,
        minHeight: 20,
    },
    contentContainer: {
        flex: 1,
    },
    senderName: {
        fontSize: 12,
        fontWeight: '900',
        marginBottom: 2,
        textTransform: 'uppercase',
    },
    textWrapper: {
        maxWidth: '90%',
    },
    messageText: {
        fontSize: 16,
        fontWeight: '500',
        lineHeight: 20,
    },
    footer: {
        padding: 8,
        paddingBottom: Platform.OS === 'ios' ? 30 : 12,
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: 25,
        paddingHorizontal: 8,
        minHeight: 50,
    },
    input: {
        flex: 1,
        fontSize: 16,
        fontWeight: '500',
        paddingHorizontal: 10,
        paddingVertical: 8,
        maxHeight: 100,
    },
    utilityBtn: {
        padding: 8,
    },
    rightActions: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    sendBtn: {
        padding: 4,
    },
    sendCircle: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: '#3CB2E2',
        justifyContent: 'center',
        alignItems: 'center',
    },
    emptyContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 100,
    },
    emptyText: {
        fontSize: 14,
        color: '#999',
        fontWeight: '600',
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.6)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        padding: 20,
        paddingBottom: 40,
    },
    reactionPicker: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingBottom: 20,
        borderBottomWidth: 1,
        marginBottom: 10,
    },
    reactionItem: {
        width: 44,
        height: 44,
        justifyContent: 'center',
        alignItems: 'center',
    },
    reactionItemEmoji: {
        fontSize: 28,
    },
    modalMenu: {
        marginTop: 10,
    },
    menuItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 16,
    },
    menuItemText: {
        fontSize: 17,
        fontWeight: '600',
        marginLeft: 15,
    },
    reactionsRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        marginTop: 6,
        gap: 6,
    },
    reactionBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: 'rgba(0,0,0,0.05)',
    },
    reactionEmoji: {
        fontSize: 12,
    },
    reactionCount: {
        fontSize: 12,
        fontWeight: '700',
        marginLeft: 4,
    },
    typingContainer: {
        paddingHorizontal: 20,
        paddingVertical: 4,
    },
    typingText: {
        fontSize: 11,
        fontWeight: '700',
        color: '#3CB2E2',
        fontStyle: 'italic',
    },
    replyBar: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderTopWidth: 1,
        borderTopColor: 'rgba(0,0,0,0.05)',
    },
    replyBarContent: {
        flex: 1,
        marginLeft: 12,
    },
    replyBarName: {
        fontSize: 13,
        fontWeight: '800',
        color: '#3CB2E2',
    },
    replyBarText: {
        fontSize: 13,
        color: '#666',
    },
    replySnippet: {
        paddingLeft: 8,
        borderLeftWidth: 2,
        marginBottom: 4,
        opacity: 0.7,
    },
    replySender: {
        fontSize: 11,
        fontWeight: '700',
        color: '#666',
    },
    replyContent: {
        fontSize: 13,
        color: '#999',
    },
    // Poll Styles
    pollBubble: {
        backgroundColor: 'transparent',
        borderRadius: 12,
        padding: 12,
        marginTop: 8,
        borderWidth: 1,
        maxWidth: '90%',
    },
    pollQuestion: {
        fontSize: 16,
        fontWeight: '800',
        marginBottom: 12,
    },
    pollOption: {
        height: 40,
        borderRadius: 8,
        marginBottom: 8,
        overflow: 'hidden',
        justifyContent: 'center',
    },
    pollProgress: {
        position: 'absolute',
        top: 0,
        left: 0,
        bottom: 0,
        opacity: 0.2,
    },
    pollOptionContent: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingHorizontal: 12,
        alignItems: 'center',
    },
    pollOptionText: {
        fontSize: 14,
        fontWeight: '600',
    },
    pollOptionPercent: {
        fontSize: 12,
        fontWeight: '700',
        color: '#3CB2E2',
    },
    pollFooter: {
        fontSize: 11,
        color: '#666',
        fontWeight: '700',
        marginTop: 4,
    },
    // Poll Creator Styles
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: '900',
    },
    pollInput: {
        borderRadius: 12,
        padding: 15,
        fontSize: 16,
        fontWeight: '600',
        marginBottom: 15,
        minHeight: 80,
    },
    optionRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 10,
    },
    optionInput: {
        flex: 1,
        height: 45,
        borderRadius: 12,
        paddingHorizontal: 15,
        fontSize: 15,
        fontWeight: '600',
    },
    removeOption: {
        padding: 10,
    },
    pollFooter: {
        marginTop: 10,
        fontSize: 12,
        color: '#999',
        textAlign: 'right',
    },
    mentionList: {
        position: 'absolute',
        bottom: 80,
        left: 20,
        right: 20,
        backgroundColor: 'rgba(255,255,255,0.95)',
        borderRadius: 12,
        maxHeight: 150,
        padding: 5,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 5 },
        shadowOpacity: 0.15,
        shadowRadius: 10,
        elevation: 10,
        zIndex: 1000,
    },
    mentionItem: {
        padding: 12,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(0,0,0,0.05)',
    },
    mentionText: {
        fontSize: 14,
        fontWeight: '600',
    },
    pinnedContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(0,0,0,0.05)',
    },
    addOptionText: {
        fontSize: 14,
        fontWeight: '800',
        marginLeft: 8,
    },
    createPollSubmit: {
        height: 55,
        borderRadius: 28,
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 10,
    },
    createPollSubmitText: {
        color: '#FFF',
        fontSize: 17,
        fontWeight: '800',
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
});
