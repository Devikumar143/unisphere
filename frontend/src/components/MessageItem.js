import React, { memo, useRef, useEffect } from 'react';
import { StyleSheet, View, Text, Animated, Image, TouchableOpacity, TouchableWithoutFeedback, Linking } from 'react-native';
import { Swipeable } from 'react-native-gesture-handler';
import { ArrowLeft, Check, CheckCheck, Bookmark, BookmarkCheck, Pause, Play, File, Download, User } from 'lucide-react-native';
import LinkPreviewCard from './LinkPreviewCard';
import TicTacToe from './TicTacToe';
import { COLORS } from '../constants/theme';

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
            tension: 200,
            useNativeDriver: true,
        }).start();
    }, []);

    return (
        <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
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

// Static render function for reply action to avoid recreation
const RenderReplyAction = ({ dragX, isMe, isDark, themeColors }) => {
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

const MessageItem = memo(({
    item,
    user,
    chatTarget,
    isDark,
    themeColors,
    onLongPress,
    onSetReply,
    onToggleReaction,
    onPlayVoice,
    playingMessageId,
    isSaved,
    onImagePress,
    onGameMove,
    onViewPost
}) => {

    const getUserColors = (userId) => {
        let hash = 0;
        for (let i = 0; i < userId.length; i++) {
            hash = userId.charCodeAt(i) + ((hash << 5) - hash);
        }
        const h = Math.abs(hash) % 360;
        return [`hsl(${h}, 85%, 65%)`, `hsl(${h + 30}, 85%, 55%)`];
    };

    const [barColor1, barColor2] = getUserColors(item.senderId);
    const isMe = item.senderId === user.id;
    const isMedia = item.messageType === 'image' || item.messageType === 'game' || item.messageType === 'shared_post' || (item.attachmentUrls && item.attachmentUrls.length > 0);
    const hasReactions = item.reactions && Object.keys(item.reactions).length > 0;
    let swipeableRef = null;

    // Use a stable render function for swipe actions
    const renderReply = (progress, dragX) => (
        <RenderReplyAction dragX={dragX} isMe={isMe} isDark={isDark} themeColors={themeColors} />
    );

    return (
        <Swipeable
            ref={ref => swipeableRef = ref}
            renderRightActions={isMe ? null : renderReply}
            renderLeftActions={isMe ? renderReply : null}
            onSwipeableOpen={() => {
                onSetReply(item);
                swipeableRef?.close();
            }}
            overshootRight={false}
            overshootLeft={false}
            friction={2}
        >
            <AnimatedMessageBubble isReceived={!isMe}>
                <InteractableMessage
                    onLongPress={() => onLongPress(item.id)}
                    style={styles.snapContainer}
                >
                    <View style={[styles.snapWrapper, { justifyContent: isMe ? 'flex-end' : 'flex-start', alignItems: 'flex-end' }]}>
                        {!isMe && (
                            <View style={styles.messageAvatarContainer}>
                                {chatTarget.avatar ? (
                                    <Image source={{ uri: chatTarget.avatar }} style={styles.messageAvatar} />
                                ) : (
                                    <View style={[styles.messageAvatar, { backgroundColor: isDark ? themeColors.bgCard : themeColors.bgCardLight, justifyContent: 'center', alignItems: 'center' }]}>
                                        <User size={14} color={isDark ? themeColors.textMuted : themeColors.textMutedLight} />
                                    </View>
                                )}
                            </View>
                        )}
                        <View style={[styles.snapContent, { maxWidth: '82%', alignItems: isMe ? 'flex-end' : 'flex-start' }]}>
                            <View style={[
                                styles.snapBubble,
                                {
                                    backgroundColor: 'transparent',
                                    borderWidth: 1,
                                    borderColor: isMe
                                        ? (isDark ? 'rgba(36, 129, 204, 0.4)' : 'rgba(36, 129, 204, 0.2)')
                                        : (isDark ? 'rgba(255, 255, 255, 0.15)' : 'rgba(0, 0, 0, 0.08)'),
                                    borderRadius: 18,
                                    borderBottomRightRadius: isMe ? 4 : 18,
                                    borderBottomLeftRadius: isMe ? 18 : 4,
                                }
                            ]}>
                                {/* Interaction Trigger Wrap - makes the whole bubble clickable for long press */}
                                <View style={styles.bubbleContent}>
                                    {/* Integrated Reply Context */}
                                    {item.replyToDetails && (
                                        <View style={{
                                            marginBottom: 10,
                                            padding: 10,
                                            backgroundColor: isMe ? 'rgba(255,255,255,0.05)' : (isDark ? 'rgba(139, 92, 246, 0.1)' : 'rgba(139, 92, 246, 0.05)'),
                                            borderRadius: 12,
                                            borderLeftWidth: 3,
                                            borderLeftColor: barColor1
                                        }}>
                                            <Text style={{ fontSize: 10, color: barColor1, fontWeight: '900', textTransform: 'uppercase', marginBottom: 2 }}>
                                                Replying to {item.replyToDetails.senderId === user.id ? 'You' : item.replyToDetails.senderName}
                                            </Text>
                                            <Text numberOfLines={1} style={{ fontSize: 13, color: isDark ? themeColors.textDim : themeColors.textDimLight }}>
                                                {item.replyToDetails.content}
                                            </Text>
                                        </View>
                                    )}

                                    {/* Name label removed in favor of side avatar */}

                                    {item.messageType === 'voice' ? (
                                        <View style={{
                                            flexDirection: 'row',
                                            alignItems: 'center',
                                            paddingVertical: 8,
                                            paddingHorizontal: 12,
                                            gap: 12,
                                            minWidth: 200
                                        }}>
                                            <TouchableOpacity
                                                onPress={() => onPlayVoice(item.voiceUrl, item.id)}
                                                style={{
                                                    width: 40,
                                                    height: 40,
                                                    borderRadius: 20,
                                                    backgroundColor: isMe
                                                        ? (isDark ? themeColors.accentPrimary : '#2481cc')
                                                        : (isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.08)'),
                                                    justifyContent: 'center',
                                                    alignItems: 'center',
                                                    shadowColor: '#000',
                                                    shadowOffset: { width: 0, height: 2 },
                                                    shadowOpacity: 0.1,
                                                    shadowRadius: 4,
                                                    elevation: 2
                                                }}
                                            >
                                                {playingMessageId === item.id ? (
                                                    <Pause size={20} color="#FFF" fill="#FFF" />
                                                ) : (
                                                    <Play size={20} color="#FFF" fill="#FFF" style={{ marginLeft: 2 }} />
                                                )}
                                            </TouchableOpacity>

                                            <View style={{ flex: 1, gap: 4 }}>
                                                {/* Waveform */}
                                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2, height: 24 }}>
                                                    {[...Array(20)].map((_, i) => {
                                                        const heights = [6, 12, 8, 16, 10, 14, 7, 18, 9, 15, 11, 13, 8, 17, 10, 14, 9, 12, 7, 16];
                                                        return (
                                                            <View key={i} style={{
                                                                width: 3,
                                                                height: heights[i],
                                                                backgroundColor: isMe
                                                                    ? (isDark ? themeColors.accentPrimary : '#2481cc')
                                                                    : (isDark ? themeColors.textDim : themeColors.textDimLight),
                                                                borderRadius: 1.5,
                                                                opacity: playingMessageId === item.id ? (i % 3 === 0 ? 1 : 0.6) : 0.4
                                                            }} />
                                                        );
                                                    })}
                                                </View>

                                                {/* Duration */}
                                                <Text style={{
                                                    fontSize: 11,
                                                    fontWeight: '600',
                                                    color: isMe
                                                        ? (isDark ? themeColors.accentPrimary : '#2481cc')
                                                        : (isDark ? themeColors.textDim : themeColors.textDimLight),
                                                    opacity: 0.7
                                                }}>
                                                    {item.voiceDuration ? `${Math.floor(item.voiceDuration / 60)}:${(item.voiceDuration % 60).toString().padStart(2, '0')}` : '0:00'}
                                                </Text>
                                            </View>
                                        </View>
                                    ) : item.messageType === 'file' ? (
                                        <TouchableOpacity
                                            style={{
                                                flexDirection: 'row',
                                                alignItems: 'center',
                                                padding: 12,
                                                backgroundColor: isMe ? 'rgba(255,255,255,0.05)' : (isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)'),
                                                borderRadius: 14,
                                                minWidth: 220,
                                                gap: 12
                                            }}
                                            onPress={() => item.attachmentUrls?.[0] && Linking.openURL(item.attachmentUrls[0]).catch(err => console.error('Could not open file', err))}
                                        >
                                            <View style={{
                                                width: 44,
                                                height: 44,
                                                borderRadius: 12,
                                                backgroundColor: isDark ? 'rgba(139, 92, 246, 0.2)' : 'rgba(139, 92, 246, 0.1)',
                                                justifyContent: 'center',
                                                alignItems: 'center'
                                            }}>
                                                <File size={22} color={isDark ? themeColors.accentPrimary : '#8B5CF6'} />
                                            </View>
                                            <View style={{ flex: 1 }}>
                                                <Text
                                                    numberOfLines={1}
                                                    style={{
                                                        fontSize: 14,
                                                        fontWeight: '600',
                                                        color: isDark ? themeColors.textMain : themeColors.textMainLight,
                                                        marginBottom: 2
                                                    }}
                                                >
                                                    {item.content.replace('Sent a document: ', '')}
                                                </Text>
                                                <Text style={{ fontSize: 11, color: isDark ? themeColors.textMuted : themeColors.textMutedLight }}>
                                                    Document
                                                </Text>
                                            </View>
                                            <Download size={18} color={isDark ? themeColors.textMuted : themeColors.textMutedLight} />
                                        </TouchableOpacity>
                                    ) : item.messageType === 'image' || (item.attachmentUrls && item.attachmentUrls.length > 0) ? (
                                        <View style={styles.mediaMessageContainer}>
                                            {item.attachmentUrls && item.attachmentUrls.map((url, idx) => (
                                                <TouchableOpacity
                                                    key={idx}
                                                    activeOpacity={0.9}
                                                    onPress={() => onImagePress?.(url)}
                                                >
                                                    <Image
                                                        source={{ uri: url }}
                                                        style={styles.messageImage}
                                                        resizeMode="cover"
                                                    />
                                                </TouchableOpacity>
                                            ))}
                                            {item.content && item.content !== 'Sent an image' && (
                                                <Text style={[styles.messageText, { color: isDark ? themeColors.textMain : themeColors.textMainLight, marginTop: 12 }]}>
                                                    {item.content}
                                                </Text>
                                            )}
                                        </View>
                                    ) : item.messageType === 'game' ? (
                                        <View style={{ alignItems: 'center', paddingVertical: 10 }}>
                                            {(() => {
                                                const gameState = typeof item.pollData === 'string' ? JSON.parse(item.pollData) : item.pollData;
                                                if (!gameState) return <Text style={{ color: 'red' }}>Game data missing</Text>;

                                                return (
                                                    <TicTacToe
                                                        gameState={gameState}
                                                        isMyTurn={gameState.turn && gameState.players && gameState.players[gameState.turn] === user.id}
                                                        onMove={(newState) => onGameMove(item.id, newState)}
                                                        themeColors={themeColors}
                                                        isDark={isDark}
                                                    />
                                                );
                                            })()}
                                        </View>
                                    ) : item.messageType === 'shared_post' ? (
                                        <TouchableOpacity
                                            activeOpacity={0.9}
                                            onPress={() => {
                                                const postData = typeof item.pollData === 'string' ? JSON.parse(item.pollData) : item.pollData;
                                                if (postData && onViewPost) {
                                                    onViewPost(postData);
                                                }
                                            }}
                                            style={{ width: 200, borderRadius: 12, overflow: 'hidden', backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)' }}
                                        >
                                            {/* Preview header */}
                                            <View style={{ flexDirection: 'row', alignItems: 'center', padding: 8, gap: 8 }}>
                                                <Image
                                                    source={{ uri: (typeof item.pollData === 'string' ? JSON.parse(item.pollData) : item.pollData)?.user?.profile_picture || 'https://via.placeholder.com/30' }}
                                                    style={{ width: 24, height: 24, borderRadius: 12 }}
                                                />
                                                <Text style={{
                                                    color: isDark ? themeColors.textMain : themeColors.textMainLight,
                                                    fontSize: 12,
                                                    fontWeight: '600'
                                                }}>
                                                    {(typeof item.pollData === 'string' ? JSON.parse(item.pollData) : item.pollData)?.user?.username || 'Unknown'}
                                                </Text>
                                            </View>

                                            {/* Preview content */}
                                            {(() => {
                                                const postData = typeof item.pollData === 'string' ? JSON.parse(item.pollData) : item.pollData;
                                                const mediaUrl = postData?.image || postData?.video || (postData?.media && postData.media[0]);

                                                return mediaUrl ? (
                                                    <Image
                                                        source={{ uri: mediaUrl }}
                                                        style={{ width: '100%', height: 200 }}
                                                        resizeMode="cover"
                                                    />
                                                ) : (
                                                    <View style={{ padding: 12, height: 100, justifyContent: 'center' }}>
                                                        <Text numberOfLines={4} style={{ color: isDark ? themeColors.textMuted : themeColors.textMutedLight }}>
                                                            {postData?.content || 'Shared content'}
                                                        </Text>
                                                    </View>
                                                );
                                            })()}

                                            {/* Footer label */}
                                            <View style={{ padding: 8, backgroundColor: isDark ? 'rgba(0,0,0,0.2)' : 'rgba(0,0,0,0.05)' }}>
                                                <Text style={{ fontSize: 10, color: isDark ? themeColors.textMuted : themeColors.textMutedLight }}>
                                                    Tap to view post
                                                </Text>
                                            </View>
                                        </TouchableOpacity>
                                    ) : (
                                        <View style={[styles.bubbleContent, { marginBottom: 2 }]}>
                                            <Text style={[styles.messageText, {
                                                color: isMe
                                                    ? (isDark ? themeColors.accentPrimary : '#2481cc')
                                                    : (isDark ? themeColors.textMain : themeColors.textMainLight),
                                                fontWeight: isMe ? '500' : '400'
                                            }]}>
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
                                                                    <Text style={{ color: isDark ? themeColors.accentPrimary : '#8B5CF6', fontWeight: 'bold' }}>{mention} </Text>
                                                                    <View style={[styles.mentionTag, { backgroundColor: themeColors.accentPrimary }]}>
                                                                        <Text style={styles.mentionTagText}>{tagName}</Text>
                                                                    </View>
                                                                    {request ? <Text style={{ color: isDark ? themeColors.textDim : themeColors.textDimLight, fontStyle: 'italic' }}> {request} </Text> : ' '}
                                                                </Text>
                                                            );
                                                        } else {
                                                            parts.push(
                                                                <Text key={`mention-${match.index}`} style={{ color: isDark ? themeColors.accentPrimary : '#8B5CF6', fontWeight: 'bold' }}>
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
                                            {!item.isDeleted && (() => {
                                                const urlMatch = item.content?.match(/(https?:\/\/[^\s]+)/);
                                                return urlMatch ? <LinkPreviewCard url={urlMatch[0]} /> : null;
                                            })()}
                                        </View>
                                    )}

                                    <View style={[styles.timestampContainer, { justifyContent: 'flex-end', marginTop: 2 }]}>
                                        <Text style={[styles.timestamp, {
                                            color: isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.25)',
                                            fontSize: 9,
                                            fontWeight: '500'
                                        }]}>
                                            {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </Text>
                                        {isMe && (
                                            <View style={styles.readStatus}>
                                                {item.readAt ? (
                                                    <CheckCheck size={10} color={isDark ? 'rgba(74, 222, 128, 0.5)' : 'rgba(36, 129, 204, 0.5)'} />
                                                ) : (
                                                    <Check size={10} color={isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.15)'} />
                                                )}
                                            </View>
                                        )}
                                    </View>
                                </View>
                            </View>
                        </View>
                    </View>
                </InteractableMessage>

                {/* Reactions - Compact below bubble */}
                {hasReactions && (
                    <View style={[styles.snapReactions, {
                        alignSelf: isMe ? 'flex-end' : 'flex-start',
                        marginTop: -6,
                        marginRight: isMe ? 12 : 0,
                        marginLeft: isMe ? 0 : 12,
                        zIndex: 10
                    }]}>
                        <View style={[styles.reactionsGlass, {
                            backgroundColor: isDark ? 'rgba(255,255,255,0.12)' : '#f0f0f0',
                            borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
                        }]}>
                            {Object.keys(item.reactions).map((emoji, index) => (
                                <AnimatedReaction key={emoji} index={index}>
                                    <TouchableOpacity
                                        onPress={() => onToggleReaction(item.id, emoji)}
                                        style={styles.reactionTag}
                                    >
                                        <Text style={styles.reactionEmojiText}>{emoji}</Text>
                                        <Text style={[styles.reactionCountText, { color: isMe && !isDark ? '#2481cc' : (isDark ? '#FFF' : '#333') }]}>
                                            {item.reactions[emoji].length}
                                        </Text>
                                    </TouchableOpacity>
                                </AnimatedReaction>
                            ))}
                        </View>
                    </View>
                )}
            </AnimatedMessageBubble>
        </Swipeable >
    );
}, (prevProps, nextProps) => {
    // Custom comparison for performance
    return (
        prevProps.item === nextProps.item &&
        prevProps.playingMessageId === nextProps.playingMessageId &&
        prevProps.isSaved === nextProps.isSaved &&
        prevProps.isDark === nextProps.isDark
    );
});

const styles = StyleSheet.create({
    snapContainer: {
        marginBottom: 20,
    },
    snapWrapper: {
        flexDirection: 'row',
        paddingHorizontal: 12,
        marginVertical: 1,
    },
    snapContent: {
        position: 'relative',
    },
    snapBubble: {
        paddingHorizontal: 4,
        paddingVertical: 2,
        minWidth: 40,
    },
    timestampContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: -4,
        alignSelf: 'flex-end',
        paddingLeft: 10,
    },
    bubbleContent: {
        backgroundColor: 'transparent',
    },
    senderLabel: {
        fontSize: 10,
        fontWeight: '900',
        letterSpacing: 0.5,
        textTransform: 'uppercase',
        marginBottom: 4,
        opacity: 0.8,
    },
    messageText: {
        fontSize: 15,
        lineHeight: 20,
        fontWeight: '400',
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
        marginLeft: 4,
    },
    snapReactions: {
        flexDirection: 'row',
    },
    reactionsGlass: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 8,
        paddingVertical: 4,
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
    mediaMessageContainer: {
        marginTop: 4,
        marginBottom: 8,
        borderRadius: 18,
        overflow: 'hidden',
    },
    messageImage: {
        width: 280,
        height: 280,
        borderRadius: 18,
    },
    mentionTag: {
        paddingHorizontal: 6,
        paddingVertical: 1,
        borderRadius: 4,
        alignSelf: 'center',
        marginHorizontal: 2,
    },
    mentionTagText: {
        color: 'white',
        fontSize: 10,
        fontWeight: '900',
        textTransform: 'uppercase',
    },
    messageAvatarContainer: {
        marginRight: 8,
        marginBottom: 2,
    },
    messageAvatar: {
        width: 28,
        height: 28,
        borderRadius: 14,
        overflow: 'hidden',
    },
});


export default MessageItem;
