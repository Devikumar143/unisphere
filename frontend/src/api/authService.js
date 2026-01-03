import client from './client';

export const verifyUniversityEmail = async (email) => {
    try {
        const response = await client.post('/auth/verify', { email });
        return response.data;
    } catch (error) {
        throw error.response?.data || { message: 'Network error occurred' };
    }
};
