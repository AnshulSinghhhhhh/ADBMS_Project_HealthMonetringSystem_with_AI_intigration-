import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';
import { Heart, Mail, Lock, Eye, EyeOff } from 'lucide-react';

export default function Login() {
    const { login } = useAuth();
    const navigate = useNavigate();

    // ── Individual state per field (avoids closure/stale-state issues) ──────────
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [rememberMe, setRememberMe] = useState(false);
    const [showPw, setShowPw] = useState(false);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            const res = await api.post('/auth/login', { email, password });
            login(res.data.access_token, res.data.user, rememberMe);
            navigate('/dashboard');
        } catch (err) {
            setError(err.response?.data?.detail || 'Login failed. Check your credentials.');
        } finally {
            setLoading(false);
        }
    };

    // ── Styles ───────────────────────────────────────────────────────────────────
    const inputWrap = { position: 'relative' };
    const iconStyle = {
        position: 'absolute', left: '0.875rem', top: '50%',
        transform: 'translateY(-50%)', color: 'var(--text-muted)',
        pointerEvents: 'none',
    };

    return (
        <div style={{
            minHeight: '100vh', display: 'flex', alignItems: 'center',
            justifyContent: 'center', background: 'var(--bg)',
            backgroundImage: 'radial-gradient(ellipse at 20% 50%, rgba(37,99,235,0.15) 0%, transparent 60%)',
        }}>
            <div className="card fade-in" style={{ width: '100%', maxWidth: '420px', padding: '2.5rem' }}>

                {/* Logo */}
                <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
                    <div style={{
                        display: 'inline-flex', background: 'linear-gradient(135deg,#2563eb,#06b6d4)',
                        borderRadius: '1rem', padding: '0.875rem', marginBottom: '1rem',
                    }} className="pulse-glow">
                        <Heart size={32} color="white" fill="white" />
                    </div>
                    <h1 style={{
                        fontSize: '1.75rem', fontWeight: 800, marginBottom: '0.25rem',
                        background: 'linear-gradient(135deg,#60a5fa,#06b6d4)',
                        WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                    }}>HealthAI</h1>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>AI-Powered Health Monitoring</p>
                </div>

                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>

                    {/* Email */}
                    <div>
                        <label htmlFor="login-email" style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.375rem' }}>
                            Email Address
                        </label>
                        <div style={inputWrap}>
                            <Mail size={16} style={iconStyle} />
                            <input
                                id="login-email"
                                className="input"
                                type="email"
                                autoComplete="email"
                                placeholder="you@example.com"
                                style={{ paddingLeft: '2.5rem' }}
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                            />
                        </div>
                    </div>

                    {/* Password */}
                    <div>
                        <label htmlFor="login-password" style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.375rem' }}>
                            Password
                        </label>
                        <div style={inputWrap}>
                            <Lock size={16} style={iconStyle} />
                            <input
                                id="login-password"
                                className="input"
                                type={showPw ? 'text' : 'password'}
                                autoComplete="current-password"
                                placeholder="••••••••"
                                style={{ paddingLeft: '2.5rem', paddingRight: '2.75rem' }}
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                            />
                            <button
                                type="button"
                                onClick={() => setShowPw((v) => !v)}
                                style={{
                                    position: 'absolute', right: '0.875rem', top: '50%',
                                    transform: 'translateY(-50%)', background: 'none',
                                    border: 'none', cursor: 'pointer', color: 'var(--text-muted)',
                                    padding: '0', display: 'flex', alignItems: 'center',
                                }}>
                                {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                            </button>
                        </div>
                    </div>

                    {/* Remember me */}
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', color: 'var(--text-muted)', cursor: 'pointer' }}>
                        <input
                            type="checkbox"
                            checked={rememberMe}
                            onChange={(e) => setRememberMe(e.target.checked)}
                            style={{ accentColor: '#2563eb', width: '15px', height: '15px' }}
                        />
                        Remember me (persist session across browser restarts)
                    </label>

                    {/* Error */}
                    {error && (
                        <div style={{
                            background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)',
                            borderRadius: '0.5rem', padding: '0.75rem', color: '#f87171', fontSize: '0.85rem',
                        }}>
                            {error}
                        </div>
                    )}

                    {/* Submit */}
                    <button
                        className="btn btn-primary"
                        type="submit"
                        disabled={loading}
                        style={{ marginTop: '0.5rem', width: '100%', opacity: loading ? 0.7 : 1 }}
                    >
                        {loading ? 'Signing in…' : 'Sign In'}
                    </button>
                </form>

                <p style={{ textAlign: 'center', marginTop: '1.5rem', fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                    Don't have an account?{' '}
                    <Link to="/register" style={{ color: '#60a5fa', textDecoration: 'none', fontWeight: 600 }}>
                        Register
                    </Link>
                </p>
            </div>
        </div>
    );
}
