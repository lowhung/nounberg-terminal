import axios from 'axios';

const apiClient = axios.create({
    baseURL: process.env.REACT_APP_API_URL || 'http://localhost:3000',
    headers: {
        'Content-Type': 'application/json',
    },
});

apiClient.interceptors.request.use(
    (config) => {
        return config;
    },
    (error) => {
        console.error('API Request Error:', error);
        return Promise.reject(error);
    }
);

apiClient.interceptors.response.use(
    (response) => {
        return response;
    },
    (error) => {
        if (error.response) {
            console.error(`API Error: ${error.response.status} ${error.response.statusText}`);
            console.error('Error data:', error.response.data);
        } else if (error.request) {
            console.error('Network Error:', error.message);
        } else {
            console.error('Request Error:', error.message);
        }
        return Promise.reject(error);
    }
);

export default apiClient;
