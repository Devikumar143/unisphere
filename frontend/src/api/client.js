import axios from 'axios';
import { Platform } from 'react-native';

// For physical devices, use your computer's local IP address instead of localhost
// Example: 'http://192.168.1.XX:5000/api'
const BASE_URL = Platform.OS === 'android' ? 'http://10.0.2.2:5000/api' : 'http://localhost:5000/api';

const client = axios.create({
    baseURL: BASE_URL,
    timeout: 10000,
    headers: {
        'Content-Type': 'application/json',
    },
});

export default client;
