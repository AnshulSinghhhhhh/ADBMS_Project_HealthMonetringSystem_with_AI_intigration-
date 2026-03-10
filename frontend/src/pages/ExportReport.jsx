import { useState } from 'react';
import api from '../api/axios';
import { FileDown, CheckCircle, AlertCircle, Loader } from 'lucide-react';

export default function ExportReport() {
    const [status, setStatus] = useState('idle'); // idle | loading | success | error
    const [errorMsg, setErrorMsg] = useState('');

    const handleDownload = async () => {
        setStatus('loading');
        setErrorMsg('');
        try {
            // Use axios instance — it automatically attaches the Bearer token
            // via the interceptor (works for both in-memory and localStorage sessions)
            const res = await api.get('/reports/export', {
                responseType: 'blob',
            });

            const blob = new Blob([res.data], { type: 'application/pdf' });
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', 'healthai_report.pdf');
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(url);

            setStatus('success');
            setTimeout(() => setStatus('idle'), 5000);
        } catch (err) {
            const msg = err.response?.status === 401
                ? 'Authentication error — please log out and log in again.'
                : (err.message || 'Failed to generate report. Please try again.');
            setErrorMsg(msg);
            setStatus('error');
        }
    };

    return (
        <div className="fade-in" style={{ maxWidth: '520px' }}>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '0.25rem' }}>Export Health Report</h1>
            <p style={{ color: 'var(--text-muted)', marginBottom: '2rem' }}>
                Download your last 7 days of health data as a professionally formatted PDF.
            </p>

            <div className="card" style={{ textAlign: 'center', padding: '3rem 2rem' }}>
                {/* Icon */}
                <div style={{
                    display: 'inline-flex', background: 'linear-gradient(135deg,#2563eb,#06b6d4)',
                    borderRadius: '1.25rem', padding: '1.25rem', marginBottom: '1.5rem',
                }}>
                    <FileDown size={40} color="white" />
                </div>

                <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '0.5rem' }}>Personal Health Report</h2>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: '2rem', lineHeight: 1.6 }}>
                    Your report will include:<br />
                    <span style={{ color: 'var(--text)' }}>
                        Health Score · Vitals Table · AI Summary<br />
                        Alerts · Medication Adherence
                    </span>
                </p>

                {/* Download button */}
                <button
                    className="btn btn-primary"
                    onClick={handleDownload}
                    disabled={status === 'loading'}
                    style={{
                        width: '100%', maxWidth: '280px', padding: '0.875rem 1.5rem',
                        fontSize: '1rem', opacity: status === 'loading' ? 0.7 : 1,
                        gap: '0.625rem',
                    }}
                >
                    {status === 'loading'
                        ? <><Loader size={18} style={{ animation: 'spin 1s linear infinite' }} /> Generating PDF…</>
                        : <><FileDown size={18} /> Download PDF</>
                    }
                </button>

                {/* Status messages */}
                {status === 'success' && (
                    <div style={{
                        marginTop: '1.25rem', display: 'flex', alignItems: 'center',
                        justifyContent: 'center', gap: '0.5rem',
                        color: '#34d399', fontSize: '0.9rem',
                    }}>
                        <CheckCircle size={18} /> Report downloaded successfully!
                    </div>
                )}
                {status === 'error' && (
                    <div style={{
                        marginTop: '1.25rem', background: 'rgba(239,68,68,0.1)',
                        border: '1px solid rgba(239,68,68,0.3)', borderRadius: '0.5rem',
                        padding: '0.75rem 1rem', color: '#f87171', fontSize: '0.875rem',
                        display: 'flex', alignItems: 'flex-start', gap: '0.5rem', textAlign: 'left',
                    }}>
                        <AlertCircle size={16} style={{ flexShrink: 0, marginTop: '1px' }} /> {errorMsg}
                    </div>
                )}
            </div>

            {/* Info cards */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginTop: '1.25rem' }}>
                {[
                    { emoji: '📊', label: 'Health Score & AI Summary' },
                    { emoji: '🩺', label: '7-Day Vitals Table' },
                    { emoji: '🚨', label: 'Recent Alerts' },
                    { emoji: '💊', label: 'Medication Adherence' },
                ].map(({ emoji, label }) => (
                    <div key={label} className="card" style={{ padding: '0.875rem', display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
                        <span style={{ fontSize: '1.25rem' }}>{emoji}</span>
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 500 }}>{label}</span>
                    </div>
                ))}
            </div>
        </div>
    );
}
