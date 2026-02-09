import React, { useState, useEffect, useRef, useCallback } from 'react';
import { StyleSheet, View, Text, TextInput, TouchableOpacity, FlatList, KeyboardAvoidingView, Platform, Animated, Keyboard, Alert, Image, ActivityIndicator, Modal, Pressable, TouchableWithoutFeedback, Dimensions, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { ArrowLeft, Send, Users, Info, Camera, Mic, Image as ImageIcon, Smile, ChevronRight, Sparkles, Zap, X, CornerDownRight, Trash2, Heart, MessageCircle, Save as SaveIcon, BarChart2, Plus, Pin, File, Download, Play, Pause } from 'lucide-react-native';
import { SIZES } from '../constants/theme';
import { useTheme } from '../context/ThemeContext';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { fetchGroupMessages, saveMessage, uploadFile, pinMessage, unpinMessage, fetchCommunityMembers } from '../services/api';
import LinkPreviewCard from '../components/LinkPreviewCard';
import GlobalImageViewer from '../components/GlobalImageViewer';
import { getSocket } from '../services/socket';
import soundService from '../services/soundService';

const SNAP_COLORS = ['#FF1D58', '#6AC47E', '#3CB2E2', '#FBC02D', '#9C27B0', '#FF6D00'];
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
            Animated.spring(slideAnim, { toValue: 0, friction: 7, tension: 40, useNativeDriver: true }),
            Animated.timing(fadeAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
            Animated.spring(scaleAnim, { toValue: 1, friction: 6, tension: 45, useNativeDriver: true })
        ]).start();
    }, []);

    return (
        <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }, { scale: scaleAnim }] }}>
            {children}
        </Animated.View>
    );
};

const AnimatedReaction = ({ children }) => {
    const scaleAnim = useRef(new Animated.Value(0)).current;
    useEffect(() => {
        Animated.spring(scaleAnim, { toValue: 1, friction: 5, tension: 200, useNativeDriver: true }).start();
    }, []);
    return <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>{children}</Animated.View>;
};

const InteractableMessage = ({ children, onLongPress, style }) => {
    const scaleAnim = useRef(new Animated.Value(1)).current;
    const handlePressIn = () => Animated.spring(scaleAnim, { toValue: 0.96, friction: 7, useNativeDriver: true }).start();
    const handlePressOut = () => Animated.spring(scaleAnim, { toValue: 1, friction: 7, useNativeDriver: true }).start();
    return (
        <TouchableWithoutFeedback onPressIn={handlePressIn} onPressOut={handlePressOut} onLongPress={onLongPress} delayLongPress={200}>
            <Animated.View style={[style, { transform: [{ scale: scaleAnim }] }]}>{children}</Animated.View>
        </TouchableWithoutFeedback>
    );
};

export default function LoungeScreen({ user, community, onBack }) {
    const { themeColors, isDark } = useTheme();
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const [loading, setLoading] = useState(true);
    const [replyTo, setReplyTo] = useState(null);
    const [selectedMessage, setSelectedMessage] = useState(null);
    const [showActions, setShowActions] = useState(false);
    const [uploadingMedia, setUploadingMedia] = useState(false);
    const [showPollCreator, setShowPollCreator] = useState(false);
    const [pollQuestion, setPollQuestion] = useState('');
    const [pollOptions, setPollOptions] = useState(['', '']);
    const [pinnedMessage, setPinnedMessage] = useState(null);
    const [communityMembers, setCommunityMembers] = useState([]);
    const [mentionQuery, setMentionQuery] = useState(null);
    const [filteredMembers, setFilteredMembers] = useState([]);
    const [viewerVisible, setViewerVisible] = useState(false);
    const [viewerImageUrl, setViewerImageUrl] = useState(null);

    const flatListRef = useRef(null);
    const socket = getSocket();

    useEffect(() => {
        loadMessages();
        loadMembers();
        if (socket) {
            socket.emit('join_community', community.id);
            socket.on('receive_group_message', msg => {
                if (msg.communityId === community.id) {
                    setMessages(prev => prev.some(m => m.id === msg.id) ? prev : [...prev, msg]);
                    setTimeout(scrollToBottom, 200);
                }
            });
            socket.on('update_poll_results', ({ messageId, pollData }) => {
                setMessages(prev => prev.map(m => m.id === messageId ? { ...m, pollData } : m));
            });
            socket.on('community_pinned_message_updated', ({ communityId: cId, pinnedMessage: pm }) => {
                if (cId === community.id) setPinnedMessage(pm);
            });
            return () => {
                socket.emit('leave_community', community.id);
                socket.off('receive_group_message');
                socket.off('update_poll_results');
                socket.off('community_pinned_message_updated');
            };
        }
    }, [community.id]);

    const loadMessages = async () => {
        try {
            const data = await fetchGroupMessages(community.id);
            setMessages(data);
            setLoading(false);
            if (data.length > 0) setTimeout(scrollToBottom, 400);
        } catch (error) {
            console.error(error);
            setLoading(false);
        }
    };

    const loadMembers = async () => {
        try {
            const members = await fetchCommunityMembers(community.id);
            setCommunityMembers(members);
        } catch (error) {
            console.error(error);
        }
    };

    const getDateLabel = (timestamp) => {
        const date = new Date(timestamp);
        const today = new Date();
        const yesterday = new Date();
        yesterday.setDate(today.getDate() - 1);

        if (date.toDateString() === today.toDateString()) {
            return 'TODAY';
        } else if (date.toDateString() === yesterday.toDateString()) {
            return 'YESTERDAY';
        } else {
            return date.toLocaleDateString([], { day: 'numeric', month: 'short', year: 'numeric' }).toUpperCase();
        }
    };

    const DateSeparator = ({ date }) => (
        <View style={styles.dateSeparatorContainer}>
            <View style={[styles.dateSeparatorLine, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }]} />
            <Text style={[styles.dateSeparatorText, { color: isDark ? themeColors.textDim : themeColors.textDimLight }]}>
                {getDateLabel(date)}
            </Text>
            <View style={[styles.dateSeparatorLine, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }]} />
        </View>
    );

    const getProcessedMessages = () => {
        // Newest-first for Inverted List
        const reversed = [...messages].reverse();
        const processed = [];

        reversed.forEach((msg, index) => {
            processed.push(msg);

            const msgDate = new Date(msg.timestamp).toDateString();
            const nextMsg = reversed[index + 1];
            const nextMsgDate = nextMsg ? new Date(nextMsg.timestamp).toDateString() : null;

            if (msgDate !== nextMsgDate) {
                processed.push({
                    id: `divider-${msg.timestamp}-${index}`,
                    type: 'divider',
                    date: msg.timestamp
                });
            }
        });
        return processed;
    };

    const handleTextChange = (text) => {
        setNewMessage(text);
        const words = text.split(/\s/);
        const lastWord = words[words.length - 1];

        if (lastWord.startsWith('@')) {
            const query = lastWord.substring(1).toLowerCase();
            setMentionQuery(query);
            const filtered = communityMembers.filter(m =>
                (m.name || m.full_name)?.toLowerCase().includes(query) ||
                m.username?.toLowerCase().includes(query)
            );
            setFilteredMembers(filtered);
        } else {
            setMentionQuery(null);
        }
    };

    const handleSelectMention = (member) => {
        const words = newMessage.split(/\s/);
        words[words.length - 1] = `@${member.username} `;
        setNewMessage(words.join(' '));
        setMentionQuery(null);
    };

    const handleSend = () => {
        if (!newMessage.trim() || !socket) return;
        socket.emit('send_group_message', {
            senderId: user.id,
            communityId: community.id,
            content: newMessage.trim(),
            replyTo: replyTo?.id
        });
        soundService.playSent();
        setNewMessage('');
        setReplyTo(null);
    };

    const handleVote = (messageId, optionIndex) => {
        if (socket) socket.emit('vote_poll', { messageId, communityId: community.id, userId: user.id, optionIndex });
    };

    const handleAddOption = () => {
        if (pollOptions.length < 5) setPollOptions([...pollOptions, '']);
    };

    const handlePollSubmit = () => {
        const filtered = pollOptions.filter(o => o.trim());
        if (!pollQuestion.trim() || filtered.length < 2) {
            Alert.alert('Error', 'Need question and at least 2 options');
            return;
        }
        socket.emit('create_poll', { senderId: user.id, communityId: community.id, question: pollQuestion.trim(), options: filtered });
        soundService.playSent();
        setShowPollCreator(false);
        setPollQuestion('');
        setPollOptions(['', '']);
    };

    const handlePickImage = async () => {
        try {
            const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
            if (status !== 'granted') {
                Alert.alert('Permission denied', 'We need camera roll permissions to share images.');
                return;
            }

            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                allowsEditing: false,
                quality: 0.8,
            });

            if (!result.canceled) {
                setUploadingMedia(true);
                const url = await uploadFile(result.assets[0].uri);
                socket.emit('send_group_message', {
                    senderId: user.id,
                    communityId: community.id,
                    content: 'Sent an image',
                    messageType: 'image',
                    attachmentUrls: [url]
                });
                soundService.playSent();
                setUploadingMedia(false);
            }
        } catch (error) {
            console.error('Pick Image Error:', error);
            setUploadingMedia(false);
        }
    };

    const handlePickDocument = async () => {
        try {
            const res = await DocumentPicker.getDocumentAsync({ type: '*/*', copyToCacheDirectory: true });
            if (!res.canceled) {
                setUploadingMedia(true);
                const url = await uploadFile(res.assets[0].uri);
                socket.emit('send_group_message', {
                    senderId: user.id,
                    communityId: community.id,
                    content: `Sent a document: ${res.assets[0].name}`,
                    messageType: 'file',
                    attachmentUrls: [url]
                });
                soundService.playSent();
                setUploadingMedia(false);
            }
        } catch (error) {
            console.error(error);
            setUploadingMedia(false);
        }
    };

    const scrollToBottom = () => flatListRef.current?.scrollToOffset({ offset: 0, animated: true });

    const renderMessage = ({ item, index }) => {
        if (item.type === 'divider') {
            return <DateSeparator date={item.date} />;
        }

        const isMe = item.senderId === user.id;

        // In Inverted list, 'previous' (older) is index + 1
        const nextMessage = messages[index + 1];
        const showSender = !nextMessage || nextMessage.senderId !== item.senderId || !!item.replyTo;
        const senderColor = getSenderColor(item.senderId);

        return (
            <AnimatedMessageBubble isReceived={!isMe}>
                <InteractableMessage
                    onLongPress={() => { setSelectedMessage(item); setShowActions(true); }}
                    style={[styles.bubbleContainer, isMe ? styles.myBubble : styles.theirBubble, showSender && { marginTop: 12 }]}
                >
                    <View style={[styles.bubbleWrapper, { backgroundColor: isMe ? '#8B5CF6' : (isDark ? '#1E1B4B' : '#F5F3FF') }]}>
                        <View style={styles.bubbleContent}>
                            {!isMe && showSender && <Text style={[styles.senderName, { color: senderColor }]}>{item.senderName || 'Member'}</Text>}

                            {item.messageType === 'poll' && item.pollData ? (
                                <View style={styles.pollContainer}>
                                    <Text style={[styles.pollQuestionText, { color: isMe ? '#FFF' : (isDark ? '#FFF' : '#1E293B') }]}>{item.pollData.question}</Text>
                                    {item.pollData.options.map((opt, idx) => {
                                        const total = item.pollData.voters?.length || 0;
                                        const votes = opt.votes?.length || 0;
                                        const percent = total > 0 ? (votes / total) * 100 : 0;
                                        const hasVoted = item.pollData.voters?.includes(user.id);
                                        return (
                                            <TouchableOpacity key={idx} style={styles.pollOptionBtn} onPress={() => !hasVoted && handleVote(item.id, idx)}>
                                                <View style={[styles.pollProgress, { width: `${percent}%` }]} />
                                                <Text style={[styles.pollOptionText, { color: isMe ? '#FFF' : (isDark ? '#FFF' : '#1E293B') }]}>{opt.text}</Text>
                                                {hasVoted && <Text style={styles.pollPercentText}>{Math.round(percent)}%</Text>}
                                            </TouchableOpacity>
                                        );
                                    })}
                                </View>
                            ) : item.messageType === 'image' ? (
                                <TouchableOpacity
                                    style={styles.imageMessageContainer}
                                    onPress={() => {
                                        setViewerImageUrl(item.attachmentUrls?.[0]);
                                        setViewerVisible(true);
                                    }}
                                >
                                    <Image
                                        source={{ uri: item.attachmentUrls?.[0] }}
                                        style={styles.messageImage}
                                        resizeMode="cover"
                                    />
                                </TouchableOpacity>
                            ) : item.messageType === 'file' ? (
                                <TouchableOpacity
                                    style={[styles.fileCard, { backgroundColor: isMe ? 'rgba(255,255,255,0.15)' : (isDark ? 'rgba(139, 92, 246, 0.1)' : '#F3F4F6') }]}
                                    onPress={() => item.attachmentUrls?.[0] && Linking.openURL(item.attachmentUrls[0]).catch(err => Alert.alert('Error', 'Could not open file'))}
                                >
                                    <View style={[styles.fileIconWrapper, { backgroundColor: isMe ? '#FFF' : '#8B5CF6' }]}>
                                        <File size={20} color={isMe ? '#8B5CF6' : '#FFF'} />
                                    </View>
                                    <View style={styles.fileInfo}>
                                        <Text numberOfLines={1} style={[styles.fileName, { color: isMe ? '#FFF' : (isDark ? '#FFF' : '#1E293B') }]}>
                                            {item.content.replace('Sent a document: ', '')}
                                        </Text>
                                        <Text style={[styles.fileSize, { color: isMe ? 'rgba(255,255,255,0.7)' : '#94A3B8' }]}>Document</Text>
                                    </View>
                                </TouchableOpacity>
                            ) : (
                                <Text style={[styles.messageText, { color: isMe ? '#FFF' : (isDark ? '#FFF' : '#1E293B') }]}>
                                    {(() => {
                                        const content = item.content || '';
                                        const mentionRegex = /(@[a-zA-Z0-9_.]+)(\s*\[([^\]]+)\])?/g;
                                        const parts = [];
                                        let lastIndex = 0;
                                        let match;

                                        while ((match = mentionRegex.exec(content)) !== null) {
                                            if (match.index > lastIndex) {
                                                parts.push(<Text key={`text-${lastIndex}`}>{content.substring(lastIndex, match.index)}</Text>);
                                            }

                                            const mention = match[1];
                                            const tagInfo = match[3];

                                            if (tagInfo) {
                                                const [tagName, ...reqParts] = tagInfo.split(':');
                                                const request = reqParts.join(':').trim();
                                                parts.push(
                                                    <Text key={`mention-${match.index}`}>
                                                        <Text style={{ color: isMe ? '#FFF' : (isDark ? themeColors.accentPrimary : '#8B5CF6'), fontWeight: 'bold' }}>{mention} </Text>
                                                        <View style={[styles.mentionTag, { backgroundColor: isMe ? 'rgba(255,255,255,0.2)' : themeColors.accentPrimary }]}>
                                                            <Text style={styles.mentionTagText}>{tagName}</Text>
                                                        </View>
                                                        {request ? <Text style={{ color: isMe ? 'rgba(255,255,255,0.7)' : (isDark ? themeColors.textDim : themeColors.textDimLight), fontStyle: 'italic' }}> {request} </Text> : ' '}
                                                    </Text>
                                                );
                                            } else {
                                                parts.push(
                                                    <Text key={`mention-${match.index}`} style={{ color: isMe ? '#FFF' : (isDark ? themeColors.accentPrimary : '#8B5CF6'), fontWeight: 'bold' }}>
                                                        {mention}
                                                    </Text>
                                                );
                                            }
                                            lastIndex = mentionRegex.lastIndex;
                                        }

                                        if (lastIndex < content.length) {
                                            parts.push(<Text key={`text-${lastIndex}`}>{content.substring(lastIndex)}</Text>);
                                        }

                                        return parts.length > 0 ? parts : content;
                                    })()}
                                </Text>
                            )}
                        </View>
                    </View>
                </InteractableMessage>
            </AnimatedMessageBubble>
        );
    };

    return (
        <View style={[styles.container, { backgroundColor: isDark ? '#0F0B1E' : '#FFFFFF' }]}>
            <SafeAreaView style={{ flex: 1 }} edges={['top', 'bottom']}>
                <View style={styles.header}>
                    <TouchableOpacity onPress={onBack}><ArrowLeft color={isDark ? "#FFF" : "#000"} /></TouchableOpacity>
                    <Text style={[styles.headerTitle, { color: isDark ? "#FFF" : "#000" }]}>{community.name}</Text>
                    <View style={{ width: 24 }} />
                </View>

                {pinnedMessage && (
                    <View style={styles.pinnedBar}>
                        <Pin size={14} color="#8B5CF6" />
                        <Text numberOfLines={1} style={styles.pinnedText}>{pinnedMessage.content}</Text>
                    </View>
                )}

                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                    style={{ flex: 1 }}
                    keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
                >
                    <FlatList
                        ref={flatListRef}
                        data={getProcessedMessages()}
                        renderItem={renderMessage}
                        keyExtractor={item => item.id}
                        contentContainerStyle={{ padding: 15, paddingTop: 20 }}
                        inverted
                    />

                    {mentionQuery !== null && filteredMembers.length > 0 && (
                        <View style={[styles.mentionSuggestions, { backgroundColor: isDark ? '#1E1B4B' : '#FFF', borderColor: isDark ? 'rgba(255,255,255,0.1)' : '#EEE' }]}>
                            <FlatList
                                data={filteredMembers}
                                keyExtractor={item => item.id}
                                renderItem={({ item }) => (
                                    <TouchableOpacity style={styles.suggestionItem} onPress={() => handleSelectMention(item)}>
                                        <View style={[styles.suggestionAvatar, { backgroundColor: getSenderColor(item.id) }]}>
                                            {item.avatar ? (
                                                <Image source={{ uri: item.avatar }} style={styles.suggestionAvatarImg} />
                                            ) : (
                                                <Text style={styles.suggestionAvatarText}>{(item.name || item.full_name)?.charAt(0)}</Text>
                                            )}
                                        </View>
                                        <View>
                                            <Text style={[styles.suggestionName, { color: isDark ? '#FFF' : '#1E293B' }]}>{item.name || item.full_name}</Text>
                                            <Text style={styles.suggestionHandle}>@{item.username}</Text>
                                        </View>
                                    </TouchableOpacity>
                                )}
                                style={{ maxHeight: 200 }}
                            />
                        </View>
                    )}

                    <View style={[styles.inputBar, { borderTopColor: isDark ? 'rgba(255,255,255,0.1)' : '#EEE' }]}>
                        <TouchableOpacity onPress={handlePickImage} style={styles.inputAction}><ImageIcon color="#8B5CF6" size={22} /></TouchableOpacity>
                        <TouchableOpacity onPress={() => setShowPollCreator(true)} style={styles.inputAction}><BarChart2 color="#8B5CF6" size={22} /></TouchableOpacity>
                        <TouchableOpacity onPress={handlePickDocument} style={styles.inputAction}><File color="#8B5CF6" size={22} /></TouchableOpacity>
                        <TextInput
                            style={[styles.input, { color: isDark ? "#FFF" : "#000", backgroundColor: isDark ? "#1E1B4B" : "#F3F4F6" }]}
                            value={newMessage}
                            onChangeText={handleTextChange}
                            placeholder="Type a message..."
                            placeholderTextColor={isDark ? "#94A3B8" : "#94A3B8"}
                        />
                        <TouchableOpacity onPress={handleSend} style={[styles.sendBtn, { opacity: newMessage.trim() ? 1 : 0.6 }]} disabled={!newMessage.trim()}>
                            <Send color="#FFF" size={20} />
                        </TouchableOpacity>
                    </View>
                </KeyboardAvoidingView>

                <Modal visible={showPollCreator} animationType="slide" transparent={true}>
                    <View style={styles.modalOverlay}>
                        <View style={[styles.pollModal, { backgroundColor: isDark ? "#1E1B4B" : "#FFF" }]}>
                            <Text style={styles.modalTitle}>Create Poll</Text>
                            <TextInput style={styles.modalInput} placeholder="Question" value={pollQuestion} onChangeText={setPollQuestion} />
                            {pollOptions.map((opt, i) => (
                                <TextInput key={i} style={styles.modalInput} placeholder={`Option ${i + 1}`} value={opt} onChangeText={t => {
                                    const next = [...pollOptions]; next[i] = t; setPollOptions(next);
                                }} />
                            ))}
                            <TouchableOpacity onPress={handleAddOption}><Text style={{ color: "#8B5CF6", marginVertical: 10 }}>+ Add Option</Text></TouchableOpacity>
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                                <TouchableOpacity onPress={() => setShowPollCreator(false)}><Text>Cancel</Text></TouchableOpacity>
                                <TouchableOpacity onPress={handlePollSubmit}><Text style={{ fontWeight: 'bold', color: "#8B5CF6" }}>Create</Text></TouchableOpacity>
                            </View>
                        </View>
                    </View>
                </Modal>

                <GlobalImageViewer
                    visible={viewerVisible}
                    imageUrl={viewerImageUrl}
                    onClose={() => setViewerVisible(false)}
                />
            </SafeAreaView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 10 },
    headerTitle: { fontSize: 18, fontWeight: 'bold' },
    pinnedBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(139, 92, 246, 0.1)', padding: 8, marginHorizontal: 15, borderRadius: 8 },
    pinnedText: { marginLeft: 8, fontSize: 12, color: '#8B5CF6', flex: 1 },
    bubbleContainer: { maxWidth: '85%', marginBottom: 4 },
    myBubble: { alignSelf: 'flex-end' },
    theirBubble: { alignSelf: 'flex-start' },
    bubbleWrapper: { borderRadius: 16, padding: 12 },
    senderName: { fontSize: 12, fontWeight: 'bold', marginBottom: 4 },
    messageText: { fontSize: 15 },
    inputBar: { flexDirection: 'row', alignItems: 'center', padding: 12, borderTopWidth: 1, backgroundColor: 'transparent' },
    inputAction: { padding: 8 },
    input: { flex: 1, height: 44, borderRadius: 22, paddingHorizontal: 16, marginHorizontal: 4, fontSize: 15 },
    sendBtn: { backgroundColor: '#8B5CF6', width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center', marginLeft: 4 },
    mentionSuggestions: { position: 'absolute', bottom: 65, left: 15, right: 15, borderRadius: 15, borderWidth: 1, elevation: 5, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 8, zIndex: 1000 },
    suggestionItem: { flexDirection: 'row', alignItems: 'center', padding: 12, borderBottomWidth: 0.5, borderBottomColor: 'rgba(0,0,0,0.05)' },
    suggestionAvatar: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center', marginRight: 12, overflow: 'hidden' },
    suggestionAvatarImg: { width: '100%', height: '100%', borderRadius: 18 },
    suggestionAvatarText: { color: '#FFF', fontWeight: 'bold' },
    suggestionName: { fontSize: 14, fontWeight: '700' },
    suggestionHandle: { fontSize: 12, color: '#94A3B8', marginTop: 1 },
    mentionTag: { paddingHorizontal: 6, paddingVertical: 1, borderRadius: 4, alignSelf: 'center', marginHorizontal: 2 },
    mentionTagText: { color: 'white', fontSize: 10, fontWeight: '900', textTransform: 'uppercase' },
    pollContainer: { minWidth: 200 },
    pollQuestionText: { fontWeight: 'bold', marginBottom: 10 },
    pollOptionBtn: { height: 40, borderRadius: 8, borderWidth: 1, borderColor: 'rgba(0,0,0,0.1)', marginBottom: 8, justifyContent: 'center', paddingHorizontal: 10, overflow: 'hidden' },
    pollProgress: { position: 'absolute', left: 0, top: 0, bottom: 0, backgroundColor: 'rgba(139, 92, 246, 0.2)' },
    pollOptionText: { fontSize: 13 },
    pollPercentText: { position: 'absolute', right: 10, fontSize: 12, fontWeight: 'bold' },
    imageMessageContainer: { marginTop: 4, borderRadius: 12, overflow: 'hidden' },
    messageImage: { width: 240, height: 180, borderRadius: 12 },
    fileCard: { flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 12, marginTop: 4, minWidth: 200 },
    fileIconWrapper: { width: 40, height: 40, borderRadius: 10, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
    fileInfo: { flex: 1 },
    fileName: { fontSize: 14, fontWeight: '600' },
    fileSize: { fontSize: 12, marginTop: 2 },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
    pollModal: { width: '85%', borderRadius: 20, padding: 20 },
    modalTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 15 },
    modalInput: { borderWidth: 1, borderColor: '#EEE', borderRadius: 8, padding: 10, marginBottom: 10 },
    dateSeparatorContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
        marginVertical: 24,
        transform: [{ scaleY: -1 }] // Important to flip back in inverted list
    },
    dateSeparatorLine: {
        flex: 1,
        height: 1,
    },
    dateSeparatorText: {
        fontSize: 10,
        fontWeight: '900',
        marginHorizontal: 16,
        letterSpacing: 1,
        textTransform: 'uppercase',
        opacity: 0.6,
    },
});
