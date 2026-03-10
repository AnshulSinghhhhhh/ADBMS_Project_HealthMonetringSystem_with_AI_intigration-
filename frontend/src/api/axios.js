import axios from 'axios';

const api = axios.create({
    baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8000',
    headers: { 'Content-Type': 'application/json' },
});

// Module-level token store — set by AuthContext on login/logout
// This bridges the gap between React context (no module access) and axios
let _inMemoryToken = null;

export function setApiToken(token) {
    _inMemoryToken = token;
}

// Attach Bearer token (in-memory first, localStorage fallback for RememberMe)
api.interceptors.request.use((config) => {
    const token = _inMemoryToken || localStorage.getItem('healthai_token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

// On 401 clear tokens
api.interceptors.response.use(
    (res) => res,
    (err) => {
        if (err.response?.status === 401) {
            _inMemoryToken = null;
            localStorage.removeItem('healthai_token');
            localStorage.removeItem('healthai_user');
        }
        return Promise.reject(err);
    }
);

export default api;
