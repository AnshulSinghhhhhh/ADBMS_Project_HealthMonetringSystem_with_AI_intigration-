import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';
import { User, Lock, Mail, Calendar, Activity, Save, Eye, EyeOff, ShieldAlert } from 'lucide-react';
import { formatDate } from '../utils/dateFormat';

// ── BMI helpers ────────────────────────────────────────────────────────────────
function getBmiCategory(bmi) {
    if (bmi === null || bmi === undefined) return null;
    if (bmi < 18.5) return { label: 'Underweight', color: '#06b6d4' };
    if (bmi < 25) return { label: 'Normal', color: '#10b981' };
    if (bmi < 30) return { label: 'Overweight', color: '#f59e0b' };
    return { label: 'Obese', color: '#ef4444' };
}

// ── Tiny toast component ───────────────────────────────────────────────────────
function Toast({ msg, type }) {
    if (!msg) return null;
    const bg = type === 'success' ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)';
    const bc = type === 'success' ? 'rgba(16,185,129,0.4)' : 'rgba(239,68,68,0.4)';
    const cl = type === 'success' ? '#34d399' : '#f87171';
    return (
        <div style={{
            background: bg, border: `1px solid ${bc}`, borderRadius: '0.5rem',
            padding: '0.75rem 1rem', color: cl, fontSize: '0.875rem',
            marginTop: '1rem',
        }}>{msg}</div>
    );
}

// ── Tab button ─────────────────────────────────────────────────────────────────
function TabBtn({ label, icon: Icon, active, onClick }) {
    return (
        <button onClick={onClick} style={{
            display: 'flex', alignItems: 'center', gap: '0.5rem',
            padding: '0.625rem 1.25rem', borderRadius: '0.5rem', border: 'none',
            cursor: 'pointer', fontSize: '0.875rem', fontWeight: 600,
            background: active ? 'rgba(37,99,235,0.2)' : 'transparent',
            color: active ? '#60a5fa' : 'var(--text-muted)',
            borderBottom: active ? '2px solid #2563eb' : '2px solid transparent',
            transition: 'all 0.2s',
        }}>
            <Icon size={16} /> {label}
        </button>
    );
}

// ── Field row helper ───────────────────────────────────────────────────────────
function Field({ label, id, children }) {
    return (
        <div>
            <label htmlFor={id} style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.375rem' }}>
                {label}
            </label>
            {children}
        </div>
    );
}

export default function Profile() {
    const { user: authUser, login } = useAuth();
    const [tab, setTab] = useState('profile');

    // ── Profile state ────────────────────────────────────────────────────────────
    const [profile, setProfile] = useState(null);
    const [profileLoading, setProfileLoading] = useState(true);
    const [name, setName] = useState('');
    const [age, setAge] = useState('');
    const [gender, setGender] = useState('');
    const [weight, setWeight] = useState('');
    const [height, setHeight] = useState('');
    const [profileMsg, setProfileMsg] = useState({ text: '', type: '' });
    const [saving, setSaving] = useState(false);

    // ── Password state ───────────────────────────────────────────────────────────
    const [currentPw, setCurrentPw] = useState('');
    const [newPw, setNewPw] = useState('');
    const [confirmPw, setConfirmPw] = useState('');
    const [showCurrent, setShowCurrent] = useState(false);
    const [showNew, setShowNew] = useState(false);
    const [pwMsg, setPwMsg] = useState({ text: '', type: '' });
    const [pwSaving, setPwSaving] = useState(false);

    // ── Load profile ──────────────────────────────────────────────────────────────
    useEffect(() => {
        api.get('/profile/me').then(res => {
            const p = res.data;
            setProfile(p);
            setName(p.name || '');
            setAge(p.age || '');
            setGender(p.gender || '');
            setWeight(p.weight || '');
            setHeight(p.height || '');
        }).catch(() => { }).finally(() => setProfileLoading(false));
    }, []);

    // ── Save profile ──────────────────────────────────────────────────────────────
    const saveProfile = async (e) => {
        e.preventDefault();
        setSaving(true);
        setProfileMsg({ text: '', type: '' });
        try {
            const res = await api.put('/profile/update', {
                name: name || null,
                age: age ? parseInt(age) : null,
                gender: gender || null,
                weight: weight ? parseFloat(weight) : null,
                height: height ? parseFloat(height) : null,
            });
            setProfile(res.data);
            setProfileMsg({ text: '✅ Profile saved successfully!', type: 'success' });
            setTimeout(() => setProfileMsg({ text: '', type: '' }), 4000);
        } catch (err) {
            setProfileMsg({ text: err.response?.data?.detail || 'Failed to save profile.', type: 'error' });
        } finally {
            setSaving(false);
        }
    };

    // ── Change password ───────────────────────────────────────────────────────────
    const changePassword = async (e) => {
        e.preventDefault();
        if (newPw !== confirmPw) {
            setPwMsg({ text: 'New passwords do not match.', type: 'error' });
            return;
        }
        if (newPw.length < 6) {
            setPwMsg({ text: 'Password must be at least 6 characters.', type: 'error' });
            return;
        }
        setPwSaving(true);
        setPwMsg({ text: '', type: '' });
        try {
            await api.put('/profile/change-password', {
                current_password: currentPw,
                new_password: newPw,
            });
            setPwMsg({ text: '✅ Password updated! Use it on your next login.', type: 'success' });
            setCurrentPw(''); setNewPw(''); setConfirmPw('');
            setTimeout(() => setPwMsg({ text: '', type: '' }), 5000);
        } catch (err) {
            setPwMsg({ text: err.response?.data?.detail || 'Failed to change password.', type: 'error' });
        } finally {
            setPwSaving(false);
        }
    };

    const bmiCat = getBmiCategory(profile?.bmi);
    const initials = (profile?.name || authUser?.name || 'U').split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);

    const inputStyle = { width: '100%' };

    if (profileLoading) return (
        <div style={{ color: 'var(--text-muted)', padding: '2rem' }}>Loading profile…</div>
    );

    return (
        <div className="fade-in" style={{ maxWidth: '700px' }}>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '0.25rem' }}>Profile & Settings</h1>
            <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem' }}>Manage your account details and preferences</p>

            {/* Tabs */}
            <div style={{ display: 'flex', gap: '0.25rem', marginBottom: '1.5rem', borderBottom: '1px solid var(--border)', paddingBottom: '0' }}>
                <TabBtn label="My Profile" icon={User} active={tab === 'profile'} onClick={() => setTab('profile')} />
                <TabBtn label="Settings" icon={Lock} active={tab === 'settings'} onClick={() => setTab('settings')} />
            </div>

            {/* ── TAB 1: PROFILE ─────────────────────────────────────────────────────── */}
            {tab === 'profile' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

                    {/* Avatar + meta */}
                    <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', padding: '1.5rem' }}>
                        <div style={{
                            width: '72px', height: '72px', borderRadius: '50%', flexShrink: 0,
                            background: 'linear-gradient(135deg,#2563eb,#06b6d4)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: '1.5rem', fontWeight: 800, color: 'white',
                        }}>{initials}</div>
                        <div style={{ flex: 1 }}>
                            <div style={{ fontSize: '1.1rem', fontWeight: 700 }}>{profile?.name}</div>
                            <div style={{ color: 'var(--text-muted)', fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                                <Mail size={13} /> {profile?.email}
                            </div>
                            <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginTop: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                                <Calendar size={13} /> Member since {profile?.created_at ? formatDate(profile.created_at) : ''}
                            </div>
                        </div>

                        {/* BMI badge */}
                        {profile?.bmi && bmiCat && (
                            <div style={{
                                background: `${bmiCat.color}18`, border: `1px solid ${bmiCat.color}50`,
                                borderRadius: '0.75rem', padding: '0.75rem 1rem', textAlign: 'center', minWidth: '90px',
                            }}>
                                <div style={{ fontSize: '1.5rem', fontWeight: 800, color: bmiCat.color }}>{profile.bmi}</div>
                                <div style={{ fontSize: '0.7rem', fontWeight: 600, color: bmiCat.color }}>BMI</div>
                                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.125rem' }}>{bmiCat.label}</div>
                            </div>
                        )}
                    </div>

                    {/* Editable fields */}
                    <div className="card" style={{ padding: '1.5rem' }}>
                        <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '1rem' }}>Edit Profile</h3>
                        <form onSubmit={saveProfile} style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
                            <Field label="Full Name" id="p-name">
                                <input id="p-name" className="input" type="text" value={name} onChange={e => setName(e.target.value)} style={inputStyle} />
                            </Field>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                                <Field label="Age" id="p-age">
                                    <input id="p-age" className="input" type="number" min="1" max="120" value={age} onChange={e => setAge(e.target.value)} style={inputStyle} />
                                </Field>
                                <Field label="Gender" id="p-gender">
                                    <select id="p-gender" className="input" value={gender} onChange={e => setGender(e.target.value)} style={inputStyle}>
                                        <option value="">Select…</option>
                                        <option>Male</option><option>Female</option><option>Other</option>
                                    </select>
                                </Field>
                                <Field label="Weight (kg)" id="p-weight">
                                    <input id="p-weight" className="input" type="number" step="0.1" min="20" max="300" placeholder="70" value={weight} onChange={e => setWeight(e.target.value)} style={inputStyle} />
                                </Field>
                                <Field label="Height (cm)" id="p-height">
                                    <input id="p-height" className="input" type="number" step="0.1" min="50" max="250" placeholder="175" value={height} onChange={e => setHeight(e.target.value)} style={inputStyle} />
                                </Field>
                            </div>

                            {weight && height && (
                                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                                    Estimated BMI: <strong style={{ color: getBmiCategory(weight / (height / 100) ** 2)?.color }}>
                                        {(weight / (height / 100) ** 2).toFixed(1)} — {getBmiCategory(weight / (height / 100) ** 2)?.label}
                                    </strong>
                                </div>
                            )}

                            <Toast msg={profileMsg.text} type={profileMsg.type} />

                            <button className="btn btn-primary" type="submit" disabled={saving}
                                style={{ alignSelf: 'flex-start', gap: '0.5rem', opacity: saving ? 0.7 : 1 }}>
                                <Save size={16} /> {saving ? 'Saving…' : 'Save Changes'}
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {/* ── TAB 2: SETTINGS ────────────────────────────────────────────────────── */}
            {tab === 'settings' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

                    {/* Change Password */}
                    <div className="card" style={{ padding: '1.5rem' }}>
                        <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <Lock size={16} /> Change Password
                        </h3>
                        <form onSubmit={changePassword} style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
                            {[
                                { id: 'pw-cur', label: 'Current Password', val: currentPw, set: setCurrentPw, show: showCurrent, toggle: () => setShowCurrent(v => !v) },
                                { id: 'pw-new', label: 'New Password', val: newPw, set: setNewPw, show: showNew, toggle: () => setShowNew(v => !v) },
                                { id: 'pw-conf', label: 'Confirm New Password', val: confirmPw, set: setConfirmPw, show: showNew, toggle: () => setShowNew(v => !v) },
                            ].map(({ id, label, val, set, show, toggle }) => (
                                <Field key={id} label={label} id={id}>
                                    <div style={{ position: 'relative' }}>
                                        <input id={id} className="input" type={show ? 'text' : 'password'}
                                            value={val} onChange={e => set(e.target.value)}
                                            style={{ width: '100%', paddingRight: '2.75rem' }} required />
                                        <button type="button" onClick={toggle} style={{
                                            position: 'absolute', right: '0.875rem', top: '50%',
                                            transform: 'translateY(-50%)', background: 'none', border: 'none',
                                            cursor: 'pointer', color: 'var(--text-muted)', display: 'flex', padding: 0,
                                        }}>
                                            {show ? <EyeOff size={15} /> : <Eye size={15} />}
                                        </button>
                                    </div>
                                </Field>
                            ))}

                            <Toast msg={pwMsg.text} type={pwMsg.type} />

                            <button className="btn btn-primary" type="submit" disabled={pwSaving}
                                style={{ alignSelf: 'flex-start', gap: '0.5rem', opacity: pwSaving ? 0.7 : 1 }}>
                                <Lock size={16} /> {pwSaving ? 'Updating…' : 'Update Password'}
                            </button>
                        </form>
                    </div>

                    {/* Account Info */}
                    <div className="card" style={{ padding: '1.5rem' }}>
                        <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <Activity size={16} /> Account Info
                        </h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
                            {[
                                { label: 'Email', val: profile?.email },
                                { label: 'Member Since', val: profile?.created_at ? formatDate(profile.created_at) : '' },
                                { label: 'Account Status', val: 'Active' },
                            ].map(({ label, val }) => (
                                <div key={label} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0', borderBottom: '1px solid var(--border)' }}>
                                    <span style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>{label}</span>
                                    <span style={{ fontSize: '0.875rem', fontWeight: 500 }}>{val || '—'}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Danger Zone */}
                    <div style={{ border: '1px solid rgba(239,68,68,0.4)', borderRadius: '0.75rem', padding: '1.5rem' }}>
                        <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#f87171', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <ShieldAlert size={16} /> Danger Zone
                        </h3>
                        <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: '1rem' }}>
                            Once you delete your account, all health data will be permanently removed.
                        </p>
                        <div style={{ position: 'relative', display: 'inline-block' }}>
                            <button
                                className="btn"
                                disabled
                                title="Coming Soon"
                                style={{
                                    background: 'rgba(239,68,68,0.1)', color: '#f87171',
                                    border: '1px solid rgba(239,68,68,0.4)', cursor: 'not-allowed', opacity: 0.6,
                                }}>
                                Delete Account — Coming Soon
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
