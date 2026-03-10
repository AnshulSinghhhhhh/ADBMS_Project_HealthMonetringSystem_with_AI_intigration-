import { useState, useEffect } from 'react';
import api from '../api/axios';
import { FileText, RefreshCw } from 'lucide-react';
import { formatDateTime } from '../utils/dateFormat';

const TREND_ICON = { rising: '↑', falling: '↓', stable: '→' };
const TREND_COLOR = { rising: '#f59e0b', falling: '#10b981', stable: '#94a3b8' };
const METRIC_LABEL = {
    heart_rate: 'Heart Rate', bp_systolic: 'Systolic BP', bp_diastolic: 'Diastolic BP',
    spo2: 'SpO₂', blood_sugar: 'Blood Sugar', temperature: 'Temperature',
};
const RISK_COLOR = { low: '#10b981', moderate: '#f59e0b', high: '#ef4444' };

export default function WeeklyReport() {
    const [report, setReport] = useState(null);
    const [loading, setLoading] = useState(true);
    const [generating, setGenerating] = useState(false);

    const load = async () => {
        try {
            const r = await api.get('/health/weekly-report');
            setReport(r.data);
        } catch { } finally { setLoading(false); }
    };

    const generate = async () => {
        setGenerating(true);
        try {
            const r = await api.get('/health/weekly-report');
            setReport(r.data);
        } finally { setGenerating(false); }
    };

    useEffect(() => { load(); }, []);

    const score = report?.score ?? 0;
    const risk = report?.risk_level ?? 'low';
    const riskColor = RISK_COLOR[risk] || '#60a5fa';

    return (
        <div className="fade-in" style={{ maxWidth: '720px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.75rem' }}>
                <div>
                    <h1 style={{ fontSize: '1.5rem', fontWeight: 800 }}>Weekly Report</h1>
                    <p style={{ color: 'var(--text-muted)', marginTop: '0.25rem' }}>AI-generated health summary.</p>
                </div>
                <button className="btn btn-primary" onClick={generate} disabled={generating}>
                    <RefreshCw size={15} style={{ animation: generating ? 'spin 1s linear infinite' : 'none' }} />
                    {generating ? 'Generating…' : 'Regenerate'}
                </button>
            </div>

            {loading ? <p style={{ color: 'var(--text-muted)' }}>Loading…</p> : !report ? (
                <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
                    <FileText size={48} style={{ margin: '0 auto 1rem', opacity: 0.3 }} />
                    <p style={{ color: 'var(--text-muted)' }}>No report yet. Log 7 days of vitals and click Regenerate.</p>
                </div>
            ) : (
                <>
                    {/* Score Card */}
                    <div className="card" style={{ marginBottom: '1.25rem' }}>
                        <div style={{
                            fontWeight: 700, marginBottom: '1rem', fontSize: '0.9rem', color: 'var(--text-muted)',
                            textTransform: 'uppercase', letterSpacing: '0.06em'
                        }}>Risk Score</div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', marginBottom: '1rem' }}>
                            <div style={{ fontSize: '3rem', fontWeight: 900, color: riskColor, lineHeight: 1 }}>{score}</div>
                            <div>
                                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>out of 100</div>
                                <span className={`badge badge-${risk}`} style={{ fontSize: '0.8rem', padding: '0.3rem 0.875rem', marginTop: '0.25rem' }}>
                                    {risk.toUpperCase()} RISK
                                </span>
                            </div>
                        </div>
                        <div style={{ background: 'var(--bg-card2)', borderRadius: '9999px', height: '10px', overflow: 'hidden' }}>
                            <div style={{
                                height: '100%', width: `${score}%`, borderRadius: '9999px',
                                background: `linear-gradient(90deg, #10b981, ${riskColor})`,
                                transition: 'width 1s ease',
                            }} />
                        </div>
                    </div>

                    {/* Summary */}
                    <div className="card" style={{ marginBottom: '1.25rem', borderColor: 'rgba(37,99,235,0.3)' }}>
                        <div style={{ fontWeight: 700, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <FileText size={18} color="#60a5fa" /> AI Summary
                        </div>
                        <p style={{ color: 'var(--text)', lineHeight: 1.8, fontSize: '0.9rem', whiteSpace: 'pre-line' }}>
                            {report.summary}
                        </p>
                        {report.generated_at && (
                            <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginTop: '1rem' }}>
                                Generated: {formatDateTime(report.generated_at)}
                            </p>
                        )}
                    </div>
                </>
            )}
        </div>
    );
}
