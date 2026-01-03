import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { COLORS } from '../constants/theme';
import { SafeAreaView } from 'react-native-safe-area-context';

const PlaceholderScreen = ({ name }) => (
    <SafeAreaView style={styles.container}>
        <Text style={styles.text}>{name} Screen</Text>
    </SafeAreaView>
);

export const ExploreScreen = () => <PlaceholderScreen name="Explore" />;
export const CreateScreen = () => <PlaceholderScreen name="Create" />;
export const MessagesScreen = () => <PlaceholderScreen name="Messages" />;
export const ProfileScreen = () => <PlaceholderScreen name="Profile" />;

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.bgDark,
        justifyContent: 'center',
        alignItems: 'center',
    },
    text: {
        color: '#fff',
        fontSize: 24,
        fontWeight: '600',
    }
});
