import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
    LayoutDashboard, Activity, TrendingUp, Pill,
    FileText, Bell, LogOut, Heart, Download, UserCircle
} from 'lucide-react';

const NAV_LINKS = [
    { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/log', icon: Activity, label: 'Log Vitals' },
    { to: '/trends', icon: TrendingUp, label: 'Trends' },
    { to: '/meds', icon: Pill, label: 'Medications' },
    { to: '/report', icon: FileText, label: 'Weekly Report' },
    { to: '/alerts', icon: Bell, label: 'Alerts' },
    { to: '/export', icon: Download, label: 'Export Report' },
];

export default function Navbar() {
    const { user, logout } = useAuth();
    const navigate = useNavigate();

    const handleLogout = () => { logout(); navigate('/'); };

    const initials = (user?.name || 'U').split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);

    return (
        <aside style={{
            width: '240px', minHeight: '100vh', background: 'var(--bg-card)',
            borderRight: '1px solid var(--border)', display: 'flex',
            flexDirection: 'column', padding: '1.5rem 0', flexShrink: 0
        }}>
            {/* Logo */}
            <div style={{ padding: '0 1.25rem 1.5rem', borderBottom: '1px solid var(--border)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
                    <div style={{
                        background: 'linear-gradient(135deg, #2563eb, #06b6d4)',
                        borderRadius: '0.625rem', padding: '0.5rem'
                    }}>
                        <Heart size={20} color="white" fill="white" />
                    </div>
                    <span style={{
                        fontWeight: 800, fontSize: '1.125rem',
                        background: 'linear-gradient(135deg, #60a5fa, #06b6d4)',
                        WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent'
                    }}>
                        HealthAI
                    </span>
                </div>
            </div>

            {/* Nav links */}
            <nav style={{ flex: 1, padding: '1rem 0.75rem', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                {NAV_LINKS.map(({ to, icon: Icon, label }) => (
                    <NavLink key={to} to={to} style={({ isActive }) => ({
                        display: 'flex', alignItems: 'center', gap: '0.75rem',
                        padding: '0.625rem 0.875rem', borderRadius: '0.625rem',
                        textDecoration: 'none', fontSize: '0.875rem', fontWeight: 500,
                        transition: 'all 0.2s',
                        background: isActive ? 'rgba(37,99,235,0.2)' : 'transparent',
                        color: isActive ? '#60a5fa' : 'var(--text-muted)',
                        borderLeft: isActive ? '3px solid #2563eb' : '3px solid transparent',
                    })}>
                        <Icon size={18} />
                        {label}
                    </NavLink>
                ))}
            </nav>

            {/* User profile link + Logout */}
            <div style={{ padding: '1rem 1.25rem', borderTop: '1px solid var(--border)' }}>
                {user && (
                    <NavLink to="/profile" style={({ isActive }) => ({
                        display: 'flex', alignItems: 'center', gap: '0.625rem',
                        textDecoration: 'none', marginBottom: '0.75rem',
                        padding: '0.5rem 0.625rem', borderRadius: '0.625rem',
                        background: isActive ? 'rgba(37,99,235,0.15)' : 'transparent',
                        transition: 'background 0.2s',
                    })}>
                        {/* Avatar circle */}
                        <div style={{
                            width: '34px', height: '34px', borderRadius: '50%', flexShrink: 0,
                            background: 'linear-gradient(135deg,#2563eb,#06b6d4)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: '0.75rem', fontWeight: 800, color: 'white',
                        }}>{initials}</div>
                        <div style={{ overflow: 'hidden' }}>
                            <div style={{
                                fontSize: '0.875rem', fontWeight: 600, color: 'var(--text)',
                                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'
                            }}>{user.name}</div>
                            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>View profile</div>
                        </div>
                    </NavLink>
                )}
                <button className="btn btn-ghost" onClick={handleLogout}
                    style={{ width: '100%', justifyContent: 'flex-start', gap: '0.5rem' }}>
                    <LogOut size={16} /> Logout
                </button>
            </div>
        </aside>
    );
}
