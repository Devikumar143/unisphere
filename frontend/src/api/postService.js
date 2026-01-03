import client from './client';

export const getFeedPosts = async () => {
    try {
        const response = await client.get('/posts');
        return response.data;
    } catch (error) {
        throw error.response?.data || { message: 'Could not fetch feed' };
    }
};
