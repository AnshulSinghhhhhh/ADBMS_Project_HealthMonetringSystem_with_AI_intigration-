import { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { setApiToken } from '../api/axios';

const AuthContext = createContext(null);

function parseJwt(token) {
    try {
        return JSON.parse(atob(token.split('.')[1]));
    } catch {
        return null;
    }
}

export function AuthProvider({ children }) {
    const [token, setToken] = useState(null);
    const [user, setUser] = useState(null);
    const logoutTimerRef = useRef(null);

    // Restore persisted session on mount
    useEffect(() => {
        const saved = localStorage.getItem('healthai_token');
        const savedUser = localStorage.getItem('healthai_user');
        if (saved && savedUser) {
            const payload = parseJwt(saved);
            if (payload && payload.exp * 1000 > Date.now()) {
                setToken(saved);
                setApiToken(saved);                   // ← sync axios
                setUser(JSON.parse(savedUser));
                scheduleAutoLogout(payload.exp);
            } else {
                localStorage.removeItem('healthai_token');
                localStorage.removeItem('healthai_user');
            }
        }
    }, []);

    const scheduleAutoLogout = useCallback((expEpochSeconds) => {
        if (logoutTimerRef.current) clearTimeout(logoutTimerRef.current);
        const ms = expEpochSeconds * 1000 - Date.now();
        if (ms > 0) logoutTimerRef.current = setTimeout(() => logout(), ms);
    }, []);

    const login = useCallback((tokenStr, userData, rememberMe = false) => {
        setToken(tokenStr);
        setUser(userData);
        setApiToken(tokenStr);                    // ← sync axios immediately

        if (rememberMe) {
            localStorage.setItem('healthai_token', tokenStr);
            localStorage.setItem('healthai_user', JSON.stringify(userData));
        }

        const payload = parseJwt(tokenStr);
        if (payload?.exp) scheduleAutoLogout(payload.exp);
    }, [scheduleAutoLogout]);

    const logout = useCallback(() => {
        if (logoutTimerRef.current) clearTimeout(logoutTimerRef.current);
        setToken(null);
        setUser(null);
        setApiToken(null);                        // ← clear axios token
        localStorage.removeItem('healthai_token');
        localStorage.removeItem('healthai_user');
    }, []);

    return (
        <AuthContext.Provider value={{ user, token, login, logout }}>
            {children}
        </AuthContext.Provider>
    );
}

export const useAuth = () => useContext(AuthContext);
