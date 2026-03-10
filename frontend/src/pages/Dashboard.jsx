import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';
import { Heart, Thermometer, Droplets, Activity, Wind, AlertTriangle, Pill, RefreshCw } from 'lucide-react';
import { formatDate } from '../utils/dateFormat';

const RISK_COLOR = { low: '#10b981', moderate: '#f59e0b', high: '#ef4444' };
const RISK_BG = { low: 'rgba(16,185,129,0.15)', moderate: 'rgba(245,158,11,0.15)', high: 'rgba(239,68,68,0.15)' };

function ScoreRing({ score, risk }) {
    const r = 72, c = 2 * Math.PI * r, pct = (score || 0) / 100;
    const color = RISK_COLOR[risk] || '#60a5fa';
    return (
        <svg width="180" height="180" viewBox="0 0 180 180">
            <circle cx="90" cy="90" r={r} fill="none" stroke="var(--border)" strokeWidth="10" />
            <circle cx="90" cy="90" r={r} fill="none" stroke={color} strokeWidth="10"
                strokeDasharray={c} strokeDashoffset={c - pct * c}
                strokeLinecap="round" transform="rotate(-90 90 90)"
                style={{ transition: 'stroke-dashoffset 1s ease, stroke 0.5s' }} />
            <text x="90" y="85" textAnchor="middle" fill={color} fontSize="28" fontWeight="800">{score ?? '--'}</text>
            <text x="90" y="108" textAnchor="middle" fill="var(--text-muted)" fontSize="12">{(risk || 'N/A').toUpperCase()}</text>
        </svg>
    );
}

const VITAL_META = [
    { key: 'heart_rate', label: 'Heart Rate', unit: 'bpm', icon: Heart, color: '#f43f5e' },
    { key: 'bp_systolic', label: 'Systolic BP', unit: 'mmHg', icon: Activity, color: '#f59e0b' },
    { key: 'bp_diastolic', label: 'Diastolic BP', unit: 'mmHg', icon: Activity, color: '#f97316' },
    { key: 'spo2', label: 'SpO₂', unit: '%', icon: Wind, color: '#06b6d4' },
    { key: 'blood_sugar', label: 'Blood Sugar', unit: 'mg/dL', icon: Droplets, color: '#8b5cf6' },
    { key: 'temperature', label: 'Temperature', unit: '°F', icon: Thermometer, color: '#10b981' },
];

export default function Dashboard() {
    const { user } = useAuth();
    const [score, setScore] = useState(null);
    const [vitals, setVitals] = useState(null);
    const [alerts, setAlerts] = useState([]);
    const [meds, setMeds] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const fetchDashboardData = async () => {
        setRefreshing(true);
        try {
            const [s, v, a, m] = await Promise.allSettled([
                api.get('/health/score'),
                api.get('/vitals/history'),
                api.get('/alerts/recent'),
                api.get('/medications/today'),
            ]);
            if (s.status === 'fulfilled') setScore(s.value.data);
            if (v.status === 'fulfilled') setVitals(v.value.data[0] || null);
            if (a.status === 'fulfilled') setAlerts(a.value.data.slice(0, 3));
            if (m.status === 'fulfilled') {
                // Determine pending doses for the dashboard snippet
                const pendingMeds = [];
                m.value.data.forEach(med => {
                    let statuses = [];
                    let times = [];
                    try { statuses = JSON.parse(med.status); } catch { }
                    try { times = JSON.parse(med.dose_times); } catch { }

                    const pendingTimes = [];
                    statuses.forEach((st, i) => {
                        if (st === 'pending') pendingTimes.push(times[i] || `Dose ${i + 1}`);
                    });

                    if (pendingTimes.length > 0) {
                        pendingMeds.push({
                            ...med,
                            pendingTimesStr: pendingTimes.join(', ')
                        });
                    }
                });
                setMeds(pendingMeds);
            }
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        fetchDashboardData();
    }, []);

    if (loading) return (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh' }}>
            <div style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
                <Activity size={40} style={{ margin: '0 auto 1rem', animation: 'spin 1s linear infinite' }} />
                <p>Loading dashboard…</p>
            </div>
        </div>
    );

    return (
        <div className="fade-in">
            <div style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                    <h1 style={{ fontSize: '1.75rem', fontWeight: 800 }}>
                        Good {new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 17 ? 'afternoon' : 'evening'},{' '}
                        <span style={{
                            background: 'linear-gradient(135deg,#60a5fa,#06b6d4)',
                            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent'
                        }}>
                            {user?.name?.split(' ')[0] || 'there'}
                        </span> 👋
                    </h1>
                    <p style={{ color: 'var(--text-muted)', marginTop: '0.25rem' }}>Here's your health overview for today.</p>
                </div>
                <button
                    className="btn btn-secondary"
                    onClick={fetchDashboardData}
                    disabled={refreshing}
                    style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 1rem' }}
                >
                    <RefreshCw size={16} className={refreshing ? "spin-icon" : ""} />
                    Refresh
                </button>
            </div>

            {/* Top row: Score + Vitals */}
            <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: '1.25rem', marginBottom: '1.25rem' }}>
                {/* Health Score Card */}
                <div className="card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '0.75rem' }}>
                    <div style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>Health Score</div>
                    <ScoreRing score={score?.score} risk={score?.risk_level} />
                    <div style={{ textAlign: 'center' }}>
                        <span className={`badge badge-${score?.risk_level || 'low'}`} style={{ fontSize: '0.8rem', padding: '0.3rem 0.875rem' }}>
                            {(score?.risk_level || 'N/A').toUpperCase()} RISK
                        </span>
                    </div>
                    {!score && <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textAlign: 'center' }}>Log vitals to see your score</p>}
                </div>

                {/* Latest Vitals */}
                <div className="card">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                        <div style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>Latest Vitals</div>
                        {vitals?.recorded_at && (
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                Recorded: {formatDate(vitals.recorded_at)}
                            </div>
                        )}
                    </div>
                    {vitals ? (
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '0.875rem' }}>
                            {VITAL_META.map(({ key, label, unit, icon: Icon, color }) => (
                                <div key={key} style={{
                                    background: 'var(--bg-card2)', borderRadius: '0.75rem', padding: '0.875rem',
                                    border: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: '0.375rem'
                                }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                                        <Icon size={13} color={color} /> {label}
                                    </div>
                                    <div style={{ fontSize: '1.5rem', fontWeight: 800, color }}>
                                        {vitals[key] ?? '—'}
                                    </div>
                                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{unit}</div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '2rem' }}>
                            <Activity size={32} style={{ margin: '0 auto 0.75rem', opacity: 0.5 }} />
                            <p>No vitals recorded yet.</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Bottom row: Alerts + Meds */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
                {/* Recent Alerts */}
                <div className="card">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                        <AlertTriangle size={18} color="#f59e0b" />
                        <span style={{ fontWeight: 700, fontSize: '0.9rem' }}>Recent Alerts</span>
                    </div>
                    {alerts.length === 0 ? (
                        <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>No alerts. You're looking healthy! 🎉</p>
                    ) : alerts.map(a => (
                        <div key={a.alert_id} style={{ padding: '0.75rem 0', borderBottom: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span style={{ fontWeight: 600, fontSize: '0.875rem' }}>{a.alert_type}</span>
                                <span className={`badge badge-${a.severity}`}>{a.severity}</span>
                            </div>
                            <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', lineHeight: 1.4 }}>{a.message}</p>
                            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{formatDate(a.created_at)}</span>
                        </div>
                    ))}
                </div>

                {/* Medication Reminders */}
                <div className="card">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                        <Pill size={18} color="#8b5cf6" />
                        <span style={{ fontWeight: 700, fontSize: '0.9rem' }}>Today's Pending Medications</span>
                    </div>
                    {meds.length === 0 ? (
                        <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>No pending medications. ✅</p>
                    ) : meds.map(m => (
                        <div key={m.med_id} style={{ padding: '0.75rem 0', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                                <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>{m.medicine_name}</div>
                                <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>{m.dosage} · {m.pendingTimesStr}</div>
                            </div>
                            <span className="badge badge-pending">Pending</span>
                        </div>
                    ))}
                </div>
            </div>
            {/* Quick spin animation style hook */}
            <style>{`
                .spin-icon { animation: spin 1s linear infinite; }
            `}</style>
        </div>
    );
}
