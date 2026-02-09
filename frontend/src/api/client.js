import axios from 'axios';
import { Platform } from 'react-native';

// For physical devices, use your computer's local IP address instead of localhost
// Example: 'http://192.168.1.XX:5000/api'
const PRODUCTION_URL = 'https://unisphere-api.onrender.com/api';
const DEVELOPMENT_URL = Platform.OS === 'android' ? 'http://10.188.11.250:5001/api' : 'http://localhost:5001/api';

const BASE_URL = __DEV__ ? DEVELOPMENT_URL : PRODUCTION_URL;

const client = axios.create({
    baseURL: BASE_URL,
    timeout: 10000,
    headers: {
        'Content-Type': 'application/json',
    },
});

export default client;
