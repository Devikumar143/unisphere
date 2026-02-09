import React, { useState, useRef, useEffect } from 'react';
import { StyleSheet, View, Animated, PanResponder, Dimensions, TouchableOpacity } from 'react-native';
import { RotateCcw } from 'lucide-react-native';
import PostCard from './PostCard';

const SCREEN_WIDTH = Dimensions.get('window').width;
const SWIPE_THRESHOLD = 120;

export default function SwipeDeck({ data, renderItem, onSwipeLeft, onSwipeRight, onSwipeEnd }) {
    const [currentIndex, setCurrentIndex] = useState(0);
    const position = useRef(new Animated.ValueXY()).current;

    const panResponder = useRef(
        PanResponder.create({
            onStartShouldSetPanResponder: () => false,
            onMoveShouldSetPanResponder: (evt, gestureState) => {
                const { dx, dy } = gestureState;
                return Math.abs(dx) > 10 || Math.abs(dy) > 10;
            },
            onPanResponderMove: (evt, gestureState) => {
                position.setValue({ x: gestureState.dx, y: gestureState.dy });
            },
            onPanResponderRelease: (evt, gestureState) => {
                if (gestureState.dx > SWIPE_THRESHOLD) {
                    forceSwipe('right');
                } else if (gestureState.dx < -SWIPE_THRESHOLD) {
                    forceSwipe('left');
                } else {
                    resetPosition();
                }
            }
        })
    ).current;

    const forceSwipe = (direction) => {
        const x = direction === 'right' ? SCREEN_WIDTH + 100 : -SCREEN_WIDTH - 100;
        Animated.timing(position, {
            toValue: { x, y: 0 },
            duration: 250,
            useNativeDriver: false
        }).start(() => onSwipeComplete(direction));
    };

    const onSwipeComplete = (direction) => {
        const item = data[currentIndex];
        direction === 'right' ? onSwipeRight?.(item) : onSwipeLeft?.(item);

        position.setValue({ x: 0, y: 0 });
        setCurrentIndex(prev => prev + 1);

        if (currentIndex + 1 >= data.length) {
            onSwipeEnd?.();
        }
    };

    const resetPosition = () => {
        Animated.spring(position, {
            toValue: { x: 0, y: 0 },
            friction: 4,
            useNativeDriver: false
        }).start();
    };

    const handleUndo = () => {
        if (currentIndex > 0) {
            setCurrentIndex(prev => prev - 1);
            position.setValue({ x: 0, y: 0 }); // Reset position for the returning card
            // Optional: Animate it specifically if needed, but simple re-mount at 0 works for now
        }
    };

    const getCardStyle = () => {
        const rotate = position.x.interpolate({
            inputRange: [-SCREEN_WIDTH * 1.5, 0, SCREEN_WIDTH * 1.5],
            outputRange: ['-30deg', '0deg', '30deg']
        });

        return {
            ...position.getLayout(),
            transform: [{ rotate }]
        };
    };

    const renderCards = () => {
        if (currentIndex >= data.length) {
            return (
                <View style={styles.noMoreCards}>
                    {/* Show undo here too if they want to go back from end */}
                    <TouchableOpacity onPress={handleUndo} style={styles.undoBtnCentered}>
                        <RotateCcw size={24} color="#FFF" />
                    </TouchableOpacity>
                </View>
            );
        }

        return data.map((item, index) => {
            if (index < currentIndex) return null;

            if (index === currentIndex) {
                return (
                    <Animated.View
                        key={item.id}
                        style={[getCardStyle(), styles.cardStyle]}
                    >
                        {renderItem({ item, index, isTop: true })}
                    </Animated.View>
                );
            }

            if (index === currentIndex + 1) {
                const scale = position.x.interpolate({
                    inputRange: [-SCREEN_WIDTH / 2, 0, SCREEN_WIDTH / 2],
                    outputRange: [1, 0.9, 1],
                    extrapolate: 'clamp'
                });

                const opacity = position.x.interpolate({
                    inputRange: [-SCREEN_WIDTH / 2, 0, SCREEN_WIDTH / 2],
                    outputRange: [1, 0.6, 1],
                    extrapolate: 'clamp'
                });

                return (
                    <Animated.View
                        key={item.id}
                        style={[styles.cardStyle, { transform: [{ scale }], opacity }]}
                    >
                        {renderItem({ item, index, isTop: false })}
                    </Animated.View>
                );
            }

            return null;
        }).reverse();
    };

    return (
        <View style={styles.container} {...panResponder.panHandlers}>
            {renderCards()}

            {/* Undo Button Overlay */}
            {currentIndex > 0 && (
                <TouchableOpacity style={styles.undoBtn} onPress={handleUndo} activeOpacity={0.8}>
                    <RotateCcw size={24} color="#FFF" />
                </TouchableOpacity>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        height: SCREEN_WIDTH * 1.6,
        minHeight: 650,
        marginBottom: 20,
        zIndex: 10,
    },
    cardStyle: {
        position: 'absolute',
        width: '100%',
        zIndex: 10,
    },
    noMoreCards: {
        flex: 1,
        height: 300,
        justifyContent: 'center',
        alignItems: 'center'
    },
    undoBtn: {
        position: 'absolute',
        bottom: 110, // Raised to clear the Tab Bar (Profile Icon)
        right: 20,
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: 'rgba(0,0,0,0.6)',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 50,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.2)'
    },
    undoBtnCentered: {
        width: 60,
        height: 60,
        borderRadius: 30,
        backgroundColor: '#333',
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 20
    }
});
