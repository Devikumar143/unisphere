import React, { useEffect, useRef, useState } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, Dimensions, Animated, Easing } from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { X, Circle, Trophy, Star } from 'lucide-react-native';

const { width } = Dimensions.get('window');
const GRID_SIZE = width * 0.8;
const CELL_SIZE = (GRID_SIZE - 40) / 3;

const WinningLine = ({ winnerLine, isDark }) => {
    const lineAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        if (winnerLine) {
            Animated.timing(lineAnim, {
                toValue: 1,
                duration: 600,
                easing: Easing.bezier(0.4, 0, 0.2, 1),
                useNativeDriver: false,
            }).start();
        }
    }, [winnerLine]);

    if (!winnerLine) return null;

    const [a, b, c] = winnerLine;

    // Calculate line position (very simplified for 3x3)
    let style = { position: 'absolute', backgroundColor: '#FBBF24', borderRadius: 4, zIndex: 10 };

    if (a === 0 && c === 2) style = { ...style, top: CELL_SIZE / 2 + 5, left: 10, right: 10, height: 4 }; // Row 0
    else if (a === 3 && c === 5) style = { ...style, top: GRID_SIZE / 2 - 2, left: 10, right: 10, height: 4 }; // Row 1
    else if (a === 6 && c === 8) style = { ...style, bottom: CELL_SIZE / 2 + 5, left: 10, right: 10, height: 4 }; // Row 2
    else if (a === 0 && c === 6) style = { ...style, left: CELL_SIZE / 2 + 5, top: 10, bottom: 10, width: 4 }; // Col 0
    else if (a === 1 && c === 7) style = { ...style, left: GRID_SIZE / 2 - 2, top: 10, bottom: 10, width: 4 }; // Col 1
    else if (a === 2 && c === 8) style = { ...style, right: CELL_SIZE / 2 + 5, top: 10, bottom: 10, width: 4 }; // Col 2
    else if (a === 0 && c === 8) style = { ...style, top: 0, left: 0, width: 4, height: GRID_SIZE * 1.4, transform: [{ rotate: '-45deg' }, { translateX: GRID_SIZE / 2 }, { translateY: -GRID_SIZE / 4 }] }; // Diag 1
    else if (a === 2 && c === 6) style = { ...style, top: 0, right: 0, width: 4, height: GRID_SIZE * 1.4, transform: [{ rotate: '45deg' }, { translateX: -GRID_SIZE / 2 }, { translateY: -GRID_SIZE / 4 }] }; // Diag 2

    const widthHeight = lineAnim.interpolate({
        inputRange: [0, 1],
        outputRange: ['0%', '100%']
    });

    return <Animated.View style={[style, (style.width === 4 ? { height: widthHeight } : { width: widthHeight })]} />;
};

const Cell = ({ value, onPress, disabled, isDark, isWinningCell }) => {
    const scaleAnim = useRef(new Animated.Value(0)).current;
    const pulseAnim = useRef(new Animated.Value(1)).current;

    useEffect(() => {
        if (value) {
            Animated.spring(scaleAnim, {
                toValue: 1,
                friction: 3,
                tension: 40,
                useNativeDriver: true,
            }).start();
        }
    }, [value]);

    useEffect(() => {
        if (isWinningCell) {
            Animated.loop(
                Animated.sequence([
                    Animated.timing(pulseAnim, { toValue: 1.2, duration: 400, useNativeDriver: true }),
                    Animated.timing(pulseAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
                ])
            ).start();
        }
    }, [isWinningCell]);

    return (
        <TouchableOpacity
            onPress={onPress}
            disabled={disabled || !!value}
            activeOpacity={0.7}
            style={styles.cellWrapper}
        >
            <BlurView intensity={isDark ? 30 : 20} tint={isDark ? "dark" : "light"} style={[
                styles.cell,
                { borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(139, 92, 246, 0.2)' },
                isWinningCell && { borderColor: '#FBBF24', borderWidth: 2, backgroundColor: 'rgba(251, 191, 36, 0.1)' }
            ]}>
                {value === 'X' && (
                    <Animated.View style={{ transform: [{ scale: scaleAnim }, { scale: pulseAnim }] }}>
                        <X size={38} color="#A78BFA" strokeWidth={3.5} />
                    </Animated.View>
                )}
                {value === 'O' && (
                    <Animated.View style={{ transform: [{ scale: scaleAnim }, { scale: pulseAnim }] }}>
                        <Circle size={34} color="#F472B6" strokeWidth={3.5} />
                    </Animated.View>
                )}
            </BlurView>
        </TouchableOpacity>
    );
};

const TicTacToe = ({ gameState, onMove, isMyTurn, isDark }) => {
    const { board, turn, winner, status, players } = gameState;
    const [winnerLine, setWinnerLine] = useState(null);

    const checkWinner = (squares) => {
        const lines = [
            [0, 1, 2], [3, 4, 5], [6, 7, 8],
            [0, 3, 6], [1, 4, 7], [2, 5, 8],
            [0, 4, 8], [2, 4, 6]
        ];
        for (let i = 0; i < lines.length; i++) {
            const [a, b, c] = lines[i];
            if (squares[a] && squares[a] === squares[b] && squares[a] === squares[c]) {
                return { winner: squares[a], line: [a, b, c] };
            }
        }
        return squares.includes(null) ? null : { winner: 'Draw', line: null };
    };

    useEffect(() => {
        const result = checkWinner(board);
        if (result && result.winner !== 'Draw' && result.winner) {
            setWinnerLine(result.line);
        }
    }, [board]);

    const handlePress = (index) => {
        if (!isMyTurn || board[index] || winner) return;

        const newBoard = [...board];
        newBoard[index] = turn;

        const result = checkWinner(newBoard);
        const newWinner = result ? result.winner : null;
        const newTurn = turn === 'X' ? 'O' : 'X';
        const newStatus = newWinner ? 'finished' : 'ongoing';

        onMove({
            board: newBoard,
            turn: newTurn,
            winner: newWinner === 'Draw' ? null : newWinner,
            status: newStatus,
            players
        });
    };

    return (
        <View style={styles.outerContainer}>
            <LinearGradient
                colors={isDark ? ['#1A1033', '#0F0B1E'] : ['#FDFCFD', '#F5F3FF']}
                style={styles.container}
            >
                <View style={styles.header}>
                    <View style={styles.badge}>
                        {status === 'finished' ? (
                            <View style={styles.statusRow}>
                                <Trophy size={16} color="#FBBF24" style={{ marginRight: 6 }} />
                                <Text style={styles.statusText}>{winner ? `${winner} Victory!` : "Stalemate"}</Text>
                            </View>
                        ) : (
                            <View style={styles.statusRow}>
                                <View style={[styles.pulseDot, { backgroundColor: isMyTurn ? '#10B981' : '#6B7280' }]} />
                                <Text style={[styles.statusText, { color: isDark ? '#E9D5FF' : '#4C1D95' }]}>
                                    {isMyTurn ? "Your Strategy" : `${turn}'s Thinking...`}
                                </Text>
                            </View>
                        )}
                    </View>
                </View>

                <View style={styles.grid}>
                    <WinningLine winnerLine={winnerLine} isDark={isDark} />
                    {board.map((val, i) => (
                        <Cell
                            key={i}
                            value={val}
                            onPress={() => handlePress(i)}
                            disabled={!isMyTurn || !!winner}
                            isDark={isDark}
                            isWinningCell={winnerLine && winnerLine.includes(i)}
                        />
                    ))}
                </View>

                <View style={styles.scoreBoard}>
                    <View style={[styles.playerTab, turn === 'X' && styles.activeTab]}>
                        <LinearGradient colors={['#8B5CF6', '#7C3AED']} style={styles.tabIcon}>
                            <X size={12} color="#FFF" strokeWidth={3} />
                        </LinearGradient>
                        <Text style={[styles.tabText, isDark && { color: '#FFF' }]}>Challenger</Text>
                    </View>
                    <View style={[styles.playerTab, turn === 'O' && styles.activeTab]}>
                        <LinearGradient colors={['#EC4899', '#DB2777']} style={styles.tabIcon}>
                            <Circle size={10} color="#FFF" strokeWidth={3} />
                        </LinearGradient>
                        <Text style={[styles.tabText, isDark && { color: '#FFF' }]}>Defender</Text>
                    </View>
                </View>
            </LinearGradient>
        </View>
    );
};

const styles = StyleSheet.create({
    outerContainer: {
        width: GRID_SIZE,
        borderRadius: 32,
        padding: 4,
        backgroundColor: 'rgba(255,255,255,0.05)',
    },
    container: {
        borderRadius: 28,
        padding: 20,
        alignItems: 'center',
    },
    header: {
        marginBottom: 20,
        width: '100%',
        alignItems: 'center',
    },
    badge: {
        backgroundColor: 'rgba(139, 92, 246, 0.1)',
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: 'rgba(139, 92, 246, 0.2)',
    },
    statusRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    pulseDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        marginRight: 10,
    },
    statusText: {
        fontSize: 11,
        fontWeight: '900',
        textTransform: 'uppercase',
        letterSpacing: 2,
    },
    grid: {
        width: GRID_SIZE - 40,
        height: GRID_SIZE - 40,
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        alignContent: 'space-between',
        position: 'relative',
    },
    cellWrapper: {
        width: CELL_SIZE,
        height: CELL_SIZE,
        marginBottom: 10,
    },
    cell: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        borderRadius: 20,
        borderWidth: 1.5,
        overflow: 'hidden',
    },
    scoreBoard: {
        flexDirection: 'row',
        marginTop: 24,
        width: '100%',
        justifyContent: 'center',
        gap: 12,
    },
    playerTab: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 14,
        backgroundColor: 'rgba(255,255,255,0.05)',
        opacity: 0.6,
    },
    activeTab: {
        opacity: 1,
        backgroundColor: 'rgba(139, 92, 246, 0.15)',
        borderColor: 'rgba(139, 92, 246, 0.3)',
        borderWidth: 1,
    },
    tabIcon: {
        width: 20,
        height: 20,
        borderRadius: 10,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 8,
    },
    tabText: {
        fontSize: 10,
        fontWeight: '800',
        color: '#6B7280',
    }
});

export default TicTacToe;
