import { useState, useEffect } from 'react';
import api from '../api/axios';
import { Bell } from 'lucide-react';
import { formatDateTime } from '../utils/dateFormat';

const SEV_ORDER = { critical: 0, high: 1, moderate: 2, low: 3 };

export default function Alerts() {
    const [alerts, setAlerts] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        api.get('/alerts/all')
            .then(r => setAlerts([...r.data].sort((a, b) => SEV_ORDER[a.severity] - SEV_ORDER[b.severity])))
            .finally(() => setLoading(false));
    }, []);

    return (
        <div className="fade-in" style={{ maxWidth: '720px' }}>
            <div style={{ marginBottom: '1.75rem' }}>
                <h1 style={{ fontSize: '1.5rem', fontWeight: 800 }}>Health Alerts</h1>
                <p style={{ color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                    {alerts.length} alert{alerts.length !== 1 ? 's' : ''} total, sorted by severity.
                </p>
            </div>

            {loading ? <p style={{ color: 'var(--text-muted)' }}>Loading…</p> :
                alerts.length === 0 ? (
                    <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
                        <Bell size={48} style={{ margin: '0 auto 1rem', opacity: 0.3 }} />
                        <p style={{ color: 'var(--text-muted)' }}>No alerts. Your vitals are looking great! 🎉</p>
                    </div>
                ) : alerts.map(a => (
                    <div key={a.alert_id} className="card" style={{
                        marginBottom: '0.75rem', padding: '1rem 1.25rem',
                        borderLeft: `4px solid ${a.severity === 'critical' ? 'var(--critical)' :
                            a.severity === 'high' ? 'var(--danger)' :
                                a.severity === 'moderate' ? 'var(--warning)' : 'var(--accent)'}`,
                    }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem' }}>
                            <div style={{ flex: 1 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', marginBottom: '0.375rem' }}>
                                    <span style={{ fontWeight: 700, fontSize: '0.95rem' }}>{a.alert_type}</span>
                                    <span className={`badge badge-${a.severity}`}>{a.severity}</span>
                                </div>
                                <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', lineHeight: 1.5 }}>{a.message}</p>
                            </div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', whiteSpace: 'nowrap', flexShrink: 0 }}>
                                {formatDateTime(a.created_at)}
                            </div>
                        </div>
                    </div>
                ))}
        </div>
    );
}
