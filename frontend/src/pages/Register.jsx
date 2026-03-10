import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../api/axios';
import { Heart, User, Mail, Lock } from 'lucide-react';

export default function Register() {
    const navigate = useNavigate();

    // ── Individual state per field ────────────────────────────────────────────────
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [age, setAge] = useState('');
    const [gender, setGender] = useState('');

    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setSuccess('');
        setLoading(true);
        try {
            await api.post('/auth/register', {
                name,
                email,
                password,
                age: age ? parseInt(age, 10) : null,
                gender: gender || null,
            });
            setSuccess('Account created! Redirecting to login…');
            setTimeout(() => navigate('/'), 1500);
        } catch (err) {
            setError(err.response?.data?.detail || 'Registration failed. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    // ── Shared label style ────────────────────────────────────────────────────────
    const labelStyle = {
        fontSize: '0.8rem', color: 'var(--text-muted)',
        display: 'block', marginBottom: '0.375rem',
    };
    const iconStyle = {
        position: 'absolute', left: '0.875rem', top: '50%',
        transform: 'translateY(-50%)', color: 'var(--text-muted)',
        pointerEvents: 'none',
    };

    return (
        <div style={{
            minHeight: '100vh', display: 'flex', alignItems: 'center',
            justifyContent: 'center', background: 'var(--bg)',
            backgroundImage: 'radial-gradient(ellipse at 80% 50%, rgba(6,182,212,0.1) 0%, transparent 60%)',
        }}>
            <div className="card fade-in" style={{ width: '100%', maxWidth: '440px', padding: '2.5rem' }}>

                {/* Logo */}
                <div style={{ textAlign: 'center', marginBottom: '1.75rem' }}>
                    <div style={{
                        display: 'inline-flex', background: 'linear-gradient(135deg,#2563eb,#06b6d4)',
                        borderRadius: '1rem', padding: '0.875rem', marginBottom: '1rem',
                    }}>
                        <Heart size={28} color="white" fill="white" />
                    </div>
                    <h1 style={{
                        fontSize: '1.5rem', fontWeight: 800,
                        background: 'linear-gradient(135deg,#60a5fa,#06b6d4)',
                        WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                    }}>Create Account</h1>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Start tracking your health today</p>
                </div>

                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>

                    {/* Full Name */}
                    <div>
                        <label htmlFor="reg-name" style={labelStyle}>Full Name</label>
                        <div style={{ position: 'relative' }}>
                            <User size={16} style={iconStyle} />
                            <input
                                id="reg-name"
                                className="input"
                                type="text"
                                autoComplete="name"
                                placeholder="Anshuman Sharma"
                                style={{ paddingLeft: '2.5rem' }}
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                required
                            />
                        </div>
                    </div>

                    {/* Email */}
                    <div>
                        <label htmlFor="reg-email" style={labelStyle}>Email Address</label>
                        <div style={{ position: 'relative' }}>
                            <Mail size={16} style={iconStyle} />
                            <input
                                id="reg-email"
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
                        <label htmlFor="reg-password" style={labelStyle}>Password</label>
                        <div style={{ position: 'relative' }}>
                            <Lock size={16} style={iconStyle} />
                            <input
                                id="reg-password"
                                className="input"
                                type="password"
                                autoComplete="new-password"
                                placeholder="Min 8 characters"
                                style={{ paddingLeft: '2.5rem' }}
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                            />
                        </div>
                    </div>

                    {/* Age + Gender row */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                        <div>
                            <label htmlFor="reg-age" style={labelStyle}>Age (optional)</label>
                            <input
                                id="reg-age"
                                className="input"
                                type="number"
                                placeholder="27"
                                min="1"
                                max="120"
                                value={age}
                                onChange={(e) => setAge(e.target.value)}
                            />
                        </div>
                        <div>
                            <label htmlFor="reg-gender" style={labelStyle}>Gender</label>
                            <select
                                id="reg-gender"
                                className="input"
                                value={gender}
                                onChange={(e) => setGender(e.target.value)}
                            >
                                <option value="">Select…</option>
                                <option value="Male">Male</option>
                                <option value="Female">Female</option>
                                <option value="Other">Other</option>
                            </select>
                        </div>
                    </div>

                    {/* Error / Success */}
                    {error && (
                        <div style={{
                            background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)',
                            borderRadius: '0.5rem', padding: '0.75rem', color: '#f87171', fontSize: '0.85rem',
                        }}>
                            {error}
                        </div>
                    )}
                    {success && (
                        <div style={{
                            background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.3)',
                            borderRadius: '0.5rem', padding: '0.75rem', color: '#34d399', fontSize: '0.85rem',
                        }}>
                            {success}
                        </div>
                    )}

                    {/* Submit */}
                    <button
                        className="btn btn-primary"
                        type="submit"
                        disabled={loading}
                        style={{ marginTop: '0.5rem', width: '100%', opacity: loading ? 0.7 : 1 }}
                    >
                        {loading ? 'Creating Account…' : 'Create Account'}
                    </button>
                </form>

                <p style={{ textAlign: 'center', marginTop: '1.5rem', fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                    Already have an account?{' '}
                    <Link to="/" style={{ color: '#60a5fa', textDecoration: 'none', fontWeight: 600 }}>
                        Sign In
                    </Link>
                </p>
            </div>
        </div>
    );
}
