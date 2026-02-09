import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, Text, StyleSheet, Dimensions, Alert, Image, Switch, TouchableOpacity, FlatList, Animated, Easing } from 'react-native';
import MapView, { Marker, Circle, PROVIDER_GOOGLE } from 'react-native-maps';
import * as Location from 'expo-location';
import { useFocusEffect } from '@react-navigation/native';
import { ArrowLeft, RefreshCw, Settings, Eye, EyeOff, Navigation, User } from 'lucide-react-native';
import axios from 'axios';
import Constants from 'expo-constants';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import soundService from '../services/soundService';

const { width, height } = Dimensions.get('window');
const API_URL = 'http://10.239.73.250:5001';

// Custom Map Style (Dark Mode / Premium)
const mapStyle = [
    { "elementType": "geometry", "stylers": [{ "color": "#1a1a2e" }] },
    { "elementType": "labels.text.stroke", "stylers": [{ "color": "#1a1a2e" }] },
    { "elementType": "labels.text.fill", "stylers": [{ "color": "#4e4e6a" }] },
    { "featureType": "administrative.locality", "elementType": "labels.text.fill", "stylers": [{ "color": "#e94560" }] },
    { "featureType": "poi", "elementType": "labels.text.fill", "stylers": [{ "color": "#e94560" }] },
    { "featureType": "poi.park", "elementType": "geometry", "stylers": [{ "color": "#162447" }] },
    { "featureType": "road", "elementType": "geometry", "stylers": [{ "color": "#0f3460" }] },
    { "featureType": "road", "elementType": "geometry.stroke", "stylers": [{ "color": "#162447" }] },
    { "featureType": "road.highway", "elementType": "geometry", "stylers": [{ "color": "#0f3460" }] },
    { "featureType": "water", "elementType": "geometry", "stylers": [{ "color": "#1a1a2e" }] }
];

const MapScreen = ({ navigation, user }) => {
    const [location, setLocation] = useState(null);
    const [nearbyUsers, setNearbyUsers] = useState([]);
    const [isVisible, setIsVisible] = useState(true);
    const [loading, setLoading] = useState(false);
    const [activeUserIndex, setActiveUserIndex] = useState(0);
    const mapRef = useRef(null);

    useEffect(() => {
        console.log('[MapScreen] User Prop:', user);
    }, [user]);

    useEffect(() => {
        console.log('[MapScreen] Location State:', location);
    }, [location]);

    useEffect(() => {
        console.log('[MapScreen] Nearby Users:', nearbyUsers);
    }, [nearbyUsers]);



    // Get Token Helper
    const getToken = async () => {
        console.log('[MapScreen] Getting token from user prop:', user?.token ? 'Found' : 'Missing');
        if (user?.token) return user.token;

        try {
            const session = await AsyncStorage.getItem('user_session');
            const token = session ? JSON.parse(session).token : null;
            console.log('[MapScreen] Token from AsyncStorage:', token ? 'Found' : 'Missing');
            return token;
        } catch (e) {
            console.log('[MapScreen] Error reading storage:', e);
            return null;
        }
    };

    // Request Permissions & Get Location
    const getLocation = async () => {
        setLoading(true);
        let { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
            Alert.alert('Permission to access location was denied');
            setLoading(false);
            return;
        }

        let currentLocation = await Location.getCurrentPositionAsync({});
        setLocation(currentLocation);

        // Update location in backend
        updateBackendLocation(currentLocation.coords.latitude, currentLocation.coords.longitude);

        // Fetch nearby users
        fetchNearbyUsers(currentLocation.coords.latitude, currentLocation.coords.longitude);
        setLoading(false);
    };

    const updateBackendLocation = async (lat, long) => {
        try {
            const token = await getToken();
            await axios.post(`${API_URL}/api/location/update`, {
                latitude: lat,
                longitude: long,
                isVisible // Update visibility status too
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });
        } catch (error) {
            console.log('Error updating location:', error.response?.status, error.response?.data || error.message);
            if (error.response && error.response.status === 403) {
                Alert.alert("Session Expired", "Please log out and log back in to enable location sharing.");
            }
        }
    };

    const fetchNearbyUsers = async (lat, long) => {
        try {
            const token = await getToken();
            const response = await axios.get(`${API_URL}/api/location/nearby`, {
                params: { lat, long, radius: 20 }, // 20km radius
                headers: { Authorization: `Bearer ${token}` }
            });
            setNearbyUsers(response.data);
        } catch (error) {
            console.log('Error fetching nearby users:', error);
        }
    };

    const toggleVisibility = async () => {
        const newStatus = !isVisible;
        setIsVisible(newStatus);

        // Premium Feedback
        soundService.triggerHaptic(newStatus ? 'success' : 'warning');

        if (location) {
            // Re-send update with new visibility status
            try {
                const token = await getToken();
                await axios.post(`${API_URL}/api/location/update`, {
                    latitude: location.coords.latitude,
                    longitude: location.coords.longitude,
                    isVisible: newStatus
                }, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                Alert.alert(newStatus ? "You are now visible on the map!" : "You are hidden from the map.");
            } catch (error) {
                console.error(error);
                if (error.response && error.response.status === 403) {
                    Alert.alert("Session Expired", "Please log out and log back in to update visibility.");
                }
            }
        }
    };

    useFocusEffect(
        useCallback(() => {
            getLocation();
        }, []) // Re-run when screen is focused
    );

    const onScroll = (event) => {
        const index = Math.round(event.nativeEvent.contentOffset.x / (width * 0.78 + 15));
        if (index !== activeUserIndex && nearbyUsers[index]) {
            setActiveUserIndex(index);

            // Haptic Feedback for selection
            soundService.triggerHaptic('selection');

            mapRef.current?.animateToRegion({
                latitude: nearbyUsers[index].latitude,
                longitude: nearbyUsers[index].longitude,
                latitudeDelta: 0.05,
                longitudeDelta: 0.05,
            }, 600); // Faster, snappier transition
        }
    };

    return (
        <View style={styles.container}>
            {location ? (
                <View style={styles.mapContainer}>
                    <MapView
                        ref={mapRef}
                        style={styles.map}
                        provider={PROVIDER_GOOGLE}
                        customMapStyle={mapStyle}
                        initialRegion={{
                            latitude: location.coords.latitude,
                            longitude: location.coords.longitude,
                            latitudeDelta: 0.05,
                            longitudeDelta: 0.05,
                        }}
                        showsUserLocation={false}
                    >
                        {/* Current User Marker (Static) */}
                        <Marker
                            coordinate={{
                                latitude: location.coords.latitude,
                                longitude: location.coords.longitude,
                            }}
                            zIndex={999}
                        >
                            <View style={styles.markerContainer}>
                                <View style={styles.userMarkerStatic}>
                                    <View style={styles.markerCircleInner}>
                                        <Image
                                            source={{ uri: user?.avatar || user?.profile_image || `https://ui-avatars.com/api/?name=${user?.full_name || 'Me'}&background=random` }}
                                            style={styles.markerImageMain}
                                            resizeMode="cover"
                                        />
                                    </View>
                                </View>
                            </View>
                        </Marker>

                        {nearbyUsers.map((u, index) => (
                            <Marker
                                key={u.id}
                                coordinate={{
                                    latitude: u.latitude,
                                    longitude: u.longitude,
                                }}
                                onPress={() => {
                                    setActiveUserIndex(index);
                                    soundService.triggerHaptic('light');
                                }}
                            >
                                <View style={styles.markerContainer}>
                                    <View style={[
                                        styles.nearbyMarkerStatic,
                                        activeUserIndex === index && styles.activeMarkerStatic
                                    ]}>
                                        <Image
                                            source={{ uri: u.avatar || u.profile_image || `https://ui-avatars.com/api/?name=${u.full_name}&background=random` }}
                                            style={styles.markerImageNearby}
                                            resizeMode="cover"
                                        />
                                    </View>
                                </View>
                            </Marker>
                        ))}
                    </MapView>
                </View>
            ) : (
                <View style={styles.loadingContainer}>
                    <RefreshCw color="#e94560" size={40} />
                    <Text style={styles.loadingText}>INITIALIZING SPHERE...</Text>
                </View>
            )}

            {/* Floating Top Bar Overlays */}
            <View style={styles.topBarContainer}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.circularGlassButton}>
                    <ArrowLeft color="#fff" size={22} />
                </TouchableOpacity>

                <BlurView intensity={70} tint="dark" style={styles.centerStatusPill}>
                    <Text style={styles.headerTitle}>SPHERE NEARBY</Text>
                    <View style={styles.statusBadge}>
                        <View style={[styles.statusDot, { backgroundColor: isVisible ? '#10B981' : '#F87171' }]} />
                        <Text style={styles.headerStatus}>{nearbyUsers.length} MEMBERS IN RANGE</Text>
                    </View>
                </BlurView>

                <TouchableOpacity onPress={getLocation} style={styles.circularGlassButton}>
                    <RefreshCw color="#fff" size={20} />
                </TouchableOpacity>
            </View>

            {/* Unified Bottom HUD Control Hub */}
            <View style={styles.bottomHudContainer}>
                {nearbyUsers.length > 0 && (
                    <View style={styles.carouselWrapper}>
                        <FlatList
                            data={nearbyUsers}
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            snapToInterval={width * 0.78 + 15}
                            decelerationRate="fast"
                            onMomentumScrollEnd={onScroll}
                            keyExtractor={(item) => item.id}
                            contentContainerStyle={{ paddingHorizontal: 0 }}
                            renderItem={({ item, index }) => (
                                <TouchableOpacity
                                    style={[
                                        styles.userCard,
                                        activeUserIndex === index && styles.activeUserCard
                                    ]}
                                    activeOpacity={0.9}
                                    onPress={() => {
                                        setActiveUserIndex(index);
                                        mapRef.current?.animateToRegion({
                                            latitude: item.latitude,
                                            longitude: item.longitude,
                                            latitudeDelta: 0.05,
                                            longitudeDelta: 0.05,
                                        }, 600);
                                    }}
                                >
                                    <BlurView intensity={80} tint="dark" style={styles.cardBlur}>
                                        <View style={styles.cardContent}>
                                            <Image
                                                source={{ uri: item.avatar || item.profile_image || `https://ui-avatars.com/api/?name=${item.full_name}&background=random` }}
                                                style={styles.cardAvatar}
                                                resizeMode="cover"
                                            />
                                            <View style={styles.cardTextContainer}>
                                                <Text style={styles.cardName}>{item.full_name}</Text>
                                                <Text style={styles.cardUsername}>@{item.username}</Text>
                                            </View>
                                            <TouchableOpacity style={styles.chatButton}>
                                                <Navigation size={18} color="#fff" />
                                            </TouchableOpacity>
                                        </View>
                                    </BlurView>
                                </TouchableOpacity>
                            )}
                        />
                    </View>
                )}

                {/* Ghost Mode Toggle (Integrated into HUD) */}
                <TouchableOpacity
                    style={styles.ghostToggle}
                    onPress={toggleVisibility}
                    activeOpacity={0.8}
                >
                    <BlurView intensity={80} tint="dark" style={styles.ghostToggleBlur}>
                        <View style={[styles.toggleIconCircle, { backgroundColor: isVisible ? 'rgba(16, 185, 129, 0.15)' : 'rgba(248, 113, 113, 0.15)' }]}>
                            {isVisible ? <Eye color="#10B981" size={18} /> : <EyeOff color="#F87171" size={18} />}
                        </View>
                        <Text style={[styles.ghostToggleText, { color: isVisible ? "#fff" : "#F87171" }]}>
                            {isVisible ? "YOU ARE VISIBLE ON MAP" : "GHOST MODE (HIDDEN)"}
                        </Text>
                        <View style={[styles.activeIndicator, { backgroundColor: isVisible ? '#10B981' : '#F87171' }]} />
                    </BlurView>
                </TouchableOpacity>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#050510',
    },
    mapContainer: {
        flex: 1,
    },
    map: {
        width: width,
        height: height,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#050510',
    },
    loadingText: {
        color: '#e94560',
        marginTop: 15,
        fontSize: 12,
        fontWeight: '900',
        letterSpacing: 4,
    },
    topBarContainer: {
        position: 'absolute',
        top: 60,
        left: 0,
        right: 0,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        zIndex: 1000,
    },
    centerStatusPill: {
        flexDirection: 'column',
        alignItems: 'center',
        paddingVertical: 10,
        paddingHorizontal: 20,
        borderRadius: 24,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.1)',
        overflow: 'hidden',
    },
    headerTitle: {
        color: '#fff',
        fontSize: 14,
        fontWeight: '900',
        letterSpacing: 2,
    },
    statusBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 4,
    },
    statusDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        marginRight: 6,
    },
    headerStatus: {
        color: 'rgba(255,255,255,0.6)',
        fontSize: 8,
        fontWeight: '900',
        letterSpacing: 0.5,
    },
    circularGlassButton: {
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        width: 48,
        height: 48,
        borderRadius: 24,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.2)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    markerContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'transparent',
        padding: 2, // Extra space to prevent border clipping
    },
    userMarkerStatic: {
        width: 58,
        height: 58,
        borderRadius: 29,
        backgroundColor: 'rgba(233, 69, 96, 0.4)', // Slightly more visible
        borderWidth: 1.5,
        borderColor: '#fff',
        justifyContent: 'center',
        alignItems: 'center',
        overflow: 'hidden', // CRITICAL for Android
    },
    markerCircleInner: {
        width: 52,
        height: 52,
        borderRadius: 26,
        backgroundColor: '#e94560',
        overflow: 'hidden',
    },
    nearbyMarkerStatic: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: 'rgba(255,255,255,0.15)',
        borderWidth: 2,
        borderColor: 'rgba(255,255,255,0.4)',
        justifyContent: 'center',
        alignItems: 'center',
        overflow: 'hidden', // CRITICAL for Android
    },
    activeMarkerStatic: {
        backgroundColor: '#e94560',
        borderColor: '#fff',
        transform: [{ scale: 1.15 }],
        elevation: 10,
    },
    markerImageMain: {
        width: '100%',
        height: '100%',
        borderRadius: 26,
    },
    markerImageNearby: {
        width: '100%',
        height: '100%',
        borderRadius: 24,
    },
    nameLabelContainer: {
        backgroundColor: '#e94560',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
        marginTop: 8,
    },
    nameLabelText: {
        color: '#fff',
        fontSize: 10,
        fontWeight: '900',
    },
    bottomHudContainer: {
        position: 'absolute',
        bottom: 30,
        left: 20,
        right: 20,
        zIndex: 1000,
    },
    carouselWrapper: {
        marginBottom: 16,
    },
    userCard: {
        width: width * 0.78,
        marginRight: 15,
        borderRadius: 24,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.1)',
        opacity: 0.8,
    },
    activeUserCard: {
        opacity: 1,
        borderColor: 'rgba(233, 69, 96, 0.5)',
    },
    cardBlur: {
        padding: 15,
    },
    cardContent: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    cardAvatar: {
        width: 54,
        height: 54,
        borderRadius: 27,
        borderWidth: 2,
        borderColor: 'rgba(255, 255, 255, 0.2)',
        backgroundColor: '#16213e',
    },
    cardTextContainer: {
        flex: 1,
        marginLeft: 15,
    },
    cardName: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '800',
    },
    cardUsername: {
        color: 'rgba(255, 255, 255, 0.5)',
        fontSize: 12,
        fontWeight: '600',
    },
    chatButton: {
        backgroundColor: '#8B5CF6',
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
    },
    ghostToggle: {
        width: '100%',
    },
    ghostToggleBlur: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderRadius: 25,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.15)',
        overflow: 'hidden',
    },
    toggleIconCircle: {
        width: 36,
        height: 36,
        borderRadius: 18,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 14,
    },
    ghostToggleText: {
        fontSize: 11,
        fontWeight: '900',
        letterSpacing: 1,
        flex: 1,
    },
    activeIndicator: {
        width: 8,
        height: 8,
        borderRadius: 4,
        marginLeft: 10,
    },
});

export default MapScreen;
