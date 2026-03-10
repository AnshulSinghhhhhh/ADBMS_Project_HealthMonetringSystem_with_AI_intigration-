import { useState } from 'react';
import api from '../api/axios';
import { Activity, CheckCircle, AlertTriangle } from 'lucide-react';

const FIELDS = [
    { key: 'heart_rate', label: 'Heart Rate', unit: 'bpm', type: 'number', placeholder: '72' },
    { key: 'bp_systolic', label: 'Systolic BP', unit: 'mmHg', type: 'number', placeholder: '120' },
    { key: 'bp_diastolic', label: 'Diastolic BP', unit: 'mmHg', type: 'number', placeholder: '80' },
    { key: 'spo2', label: 'SpO₂', unit: '%', type: 'number', placeholder: '98', step: '0.1' },
    { key: 'blood_sugar', label: 'Blood Sugar', unit: 'mg/dL', type: 'number', placeholder: '100', step: '0.1' },
    { key: 'temperature', label: 'Temperature', unit: '°F', type: 'number', placeholder: '98.6', step: '0.1', helper: 'Normal: 97.0 - 99.0 °F' },
];

export default function LogVitals() {
    const init = Object.fromEntries(FIELDS.map(f => [f.key, '']));
    const [form, setForm] = useState(init);
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const [anomalies, setAnomalies] = useState([]);
    const [error, setError] = useState('');

    const set = k => e => setForm({ ...form, [k]: e.target.value });

    const handleSubmit = async e => {
        e.preventDefault();
        setError(''); setSuccess(false); setAnomalies([]);
        setLoading(true);
        const payload = {};
        FIELDS.forEach(({ key }) => { if (form[key] !== '') payload[key] = parseFloat(form[key]); });
        try {
            await api.post('/vitals/add', payload);
            setSuccess(true);
            setForm(init);
            // Fetch alerts to see if anomalies were triggered
            const r = await api.get('/alerts/recent');
            const fresh = r.data.filter(a => ['high', 'critical', 'moderate'].includes(a.severity)).slice(0, 5);
            setAnomalies(fresh);
        } catch (err) {
            setError(err.response?.data?.detail || 'Failed to save vitals.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fade-in" style={{ maxWidth: '680px' }}>
            <div style={{ marginBottom: '1.75rem' }}>
                <h1 style={{ fontSize: '1.5rem', fontWeight: 800 }}>Log Vitals</h1>
                <p style={{ color: 'var(--text-muted)', marginTop: '0.25rem' }}>Record your daily health metrics for AI analysis.</p>
            </div>

            <form onSubmit={handleSubmit} className="card">
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem', marginBottom: '1.5rem' }}>
                    {FIELDS.map(({ key, label, unit, type, placeholder, step }) => (
                        <div key={key}>
                            <label style={{
                                display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem',
                                color: 'var(--text-muted)', marginBottom: '0.125rem'
                            }}>
                                <span>{label}</span>
                                <span style={{ color: 'var(--border)', fontWeight: 500 }}>{unit}</span>
                            </label>
                            {helper && <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>{helper}</div>}
                            <input className="input" type={type} step={step || '1'} placeholder={placeholder}
                                value={form[key]} onChange={set(key)} />
                        </div>
                    ))}
                </div>

                {error && (
                    <div style={{
                        background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)',
                        borderRadius: '0.5rem', padding: '0.875rem', color: '#f87171', marginBottom: '1rem', fontSize: '0.875rem'
                    }}>
                        {error}
                    </div>
                )}
                {success && (
                    <div style={{
                        background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.3)',
                        borderRadius: '0.5rem', padding: '0.875rem', color: '#34d399', marginBottom: '1rem',
                        display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem'
                    }}>
                        <CheckCircle size={16} /> Vitals saved successfully! AI anomaly detection ran automatically.
                    </div>
                )}

                <button className="btn btn-primary" type="submit" disabled={loading} style={{ width: '100%' }}>
                    <Activity size={16} />
                    {loading ? 'Saving…' : 'Save Vitals'}
                </button>
            </form>

            {anomalies.length > 0 && (
                <div className="card" style={{ marginTop: '1.25rem', borderColor: 'rgba(239,68,68,0.3)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                        <AlertTriangle size={18} color="#f59e0b" />
                        <span style={{ fontWeight: 700 }}>Anomaly Alerts Triggered</span>
                    </div>
                    {anomalies.map(a => (
                        <div key={a.alert_id} style={{ padding: '0.75rem 0', borderBottom: '1px solid var(--border)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
                                <span style={{ fontWeight: 600, fontSize: '0.875rem' }}>{a.alert_type}</span>
                                <span className={`badge badge-${a.severity}`}>{a.severity}</span>
                            </div>
                            <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>{a.message}</p>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
