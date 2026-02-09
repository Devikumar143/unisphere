import React from 'react';
import { Modal, View, TouchableOpacity, Image, StyleSheet, Dimensions, Platform } from 'react-native';
import { BlurView } from 'expo-blur';
import { X } from 'lucide-react-native';

const { width, height } = Dimensions.get('window');

const GlobalImageViewer = ({ visible, imageUrl, onClose }) => {
    if (!imageUrl) return null;

    return (
        <Modal
            visible={visible}
            transparent={true}
            animationType="fade"
            onRequestClose={onClose}
        >
            <View style={styles.container}>
                <BlurView intensity={100} tint="dark" style={StyleSheet.absoluteFill} />
                <TouchableOpacity
                    style={styles.closeButton}
                    onPress={onClose}
                    activeOpacity={0.7}
                >
                    <X color="#FFF" size={28} />
                </TouchableOpacity>
                <Image
                    source={{ uri: imageUrl }}
                    style={styles.image}
                    resizeMode="contain"
                />
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#000',
    },
    closeButton: {
        position: 'absolute',
        top: Platform.OS === 'ios' ? 60 : 40,
        right: 20,
        zIndex: 100,
        padding: 10,
        backgroundColor: 'rgba(0,0,0,0.5)',
        borderRadius: 25,
    },
    image: {
        width: width,
        height: height * 0.85,
    },
});

export default GlobalImageViewer;
