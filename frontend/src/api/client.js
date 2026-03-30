import axios from 'axios';
import { Platform } from 'react-native';
import Constants from 'expo-constants';

// For physical devices, use your computer's local IP address instead of localhost
const PRODUCTION_URL = 'https://unisphere-6t8k.onrender.com/api';

const getDevUrl = () => {
    if (Platform.OS === 'web') return 'http://localhost:5001/api';
    const debuggerHost = Constants.expoConfig?.hostUri || Constants.manifest2?.extra?.expoGo?.debuggerHost;
    const localhost = debuggerHost?.split(':')[0] || '10.213.145.250';
    return `http://${localhost}:5001/api`;
};

const BASE_URL = __DEV__ ? getDevUrl() : PRODUCTION_URL;

const client = axios.create({
    baseURL: BASE_URL,
    timeout: 10000,
    headers: {
        'Content-Type': 'application/json',
    },
});

export default client;
