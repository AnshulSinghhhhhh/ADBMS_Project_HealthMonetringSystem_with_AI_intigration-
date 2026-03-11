import { useState, useEffect } from 'react';
import api from '../api/axios';
import { FileText, RefreshCw, Activity, Pill, AlertTriangle } from 'lucide-react';
import { formatDateTime } from '../utils/dateFormat';

const RISK_COLOR = { low: '#10b981', moderate: '#f59e0b', high: '#ef4444' };
const TREND_ICON = { rising: '↑', falling: '↓', stable: '→' };
const TREND_COLOR = { rising: '#ef4444', falling: '#3b82f6', stable: '#10b981' };
const TREND_LABEL = { rising: 'Rising', falling: 'Falling', stable: 'Stable' };

const METRIC_LABEL = {
    heart_rate: 'Heart Rate',
    bp_systolic: 'Systolic BP',
    bp_diastolic: 'Diastolic BP',
    spo2: 'SpO₂',
    blood_sugar: 'Blood Sugar',
    temperature: 'Temperature',
};

const VITAL_KEYS = ['heart_rate', 'bp_systolic', 'bp_diastolic', 'spo2', 'blood_sugar', 'temperature'];

// Calculate trends from raw vitals array (from /vitals/weekly)
function calcTrends(vitalsList) {
    if (!vitalsList || vitalsList.length < 2) return null;
    const result = {};
    for (const key of VITAL_KEYS) {
        const values = vitalsList.map(v => v[key]).filter(v => v != null);
        if (values.length < 2) continue;
        const first = values[0];
        const last = values[values.length - 1];
        const delta = last - first;
        const threshold = Math.abs(first) * 0.03; // 3% change = trend
        if (delta > threshold) result[key] = 'rising';
        else if (delta < -threshold) result[key] = 'falling';
        else result[key] = 'stable';
    }
    return Object.keys(result).length > 0 ? result : null;
}

// Parse numbered sections from AI report text
function parseSections(text) {
    if (!text) return null;
    try {
        const sectionPattern = /(\d+)\.\s+(OVERALL ASSESSMENT|CRITICAL FINDINGS|WEEKLY TRENDS|MEDICATION ADHERENCE|ACTION PLAN)/gi;
        const matches = [...text.matchAll(sectionPattern)];
        if (matches.length < 2) return null;
        const sections = [];
        for (let i = 0; i < matches.length; i++) {
            const start = matches[i].index + matches[i][0].length;
            const end = i + 1 < matches.length ? matches[i + 1].index : text.length;
            sections.push({
                num: matches[i][1],
                title: matches[i][2].toUpperCase(),
                body: text.slice(start, end).trim(),
            });
        }
        return sections.length >= 2 ? sections : null;
    } catch {
        return null;
    }
}

function SectionIcon({ title }) {
    const t = title || '';
    if (t.includes('ASSESSMENT')) return <Activity size={15} color="#60a5fa" />;
    if (t.includes('FINDINGS')) return <AlertTriangle size={15} color="#f59e0b" />;
    if (t.includes('TRENDS')) return <Activity size={15} color="#a78bfa" />;
    if (t.includes('MEDICATION')) return <Pill size={15} color="#34d399" />;
    if (t.includes('ACTION')) return <FileText size={15} color="#fb923c" />;
    return <FileText size={15} color="#60a5fa" />;
}

// Extract adherence pct from AI text (e.g. "adherence: 85%")
function extractAdherence(text) {
    if (!text) return null;
    const m = text.match(/(\d{1,3})%/g);
    // Find first percentage that could plausibly be adherence (search near the word "adherence")
    const idx = text.toLowerCase().indexOf('adherence');
    if (idx === -1) return null;
    const snippet = text.slice(Math.max(0, idx - 20), idx + 80);
    const pctMatch = snippet.match(/(\d{1,3})%/);
    return pctMatch ? parseInt(pctMatch[1]) : null;
}

export default function WeeklyReport() {
    const [report, setReport] = useState(null);
    const [trendsData, setTrendsData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [generating, setGenerating] = useState(false);

    const loadTrends = async () => {
        try {
            const r = await api.get('/vitals/weekly');
            if (Array.isArray(r.data) && r.data.length >= 2) {
                setTrendsData(calcTrends(r.data));
            }
        } catch { /* vitals/weekly may fail; skip gracefully */ }
    };

    const fetchReport = async () => {
        setGenerating(true);
        try {
            const [reportRes] = await Promise.all([
                api.get('/health/weekly-report'),
                loadTrends(),
            ]);
            setReport(reportRes.data);
        } catch (err) {
            console.error(err);
        } finally {
            setGenerating(false);
            setLoading(false);
        }
    };

    useEffect(() => {
        setLoading(true);
        fetchReport();
    }, []);

    const score = report?.score ?? 0;
    const risk = report?.risk_level ?? 'low';
    const riskColor = RISK_COLOR[risk] || '#60a5fa';
    const sections = parseSections(report?.ai_summary);
    const adherencePct = report?.adherence_pct ?? extractAdherence(report?.ai_summary);
    const adherenceColor = adherencePct == null ? '#94a3b8'
        : adherencePct >= 80 ? '#10b981'
            : adherencePct >= 60 ? '#f59e0b' : '#ef4444';
    const trendsObj = report?.trends || trendsData;

    return (
        <div className="fade-in" style={{ maxWidth: '720px' }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.75rem' }}>
                <div>
                    <h1 style={{ fontSize: '1.5rem', fontWeight: 800 }}>Weekly Report</h1>
                    <p style={{ color: 'var(--text-muted)', marginTop: '0.25rem' }}>AI-powered clinical health analysis.</p>
                </div>
                <button className="btn btn-primary" onClick={fetchReport} disabled={generating}>
                    <RefreshCw size={15} style={{ animation: generating ? 'spin 1s linear infinite' : 'none' }} />
                    {generating ? 'Generating…' : 'Regenerate'}
                </button>
            </div>

            {loading ? <p style={{ color: 'var(--text-muted)' }}>Loading…</p> : !report ? (
                <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
                    <FileText size={48} style={{ margin: '0 auto 1rem', opacity: 0.3 }} />
                    <p style={{ color: 'var(--text-muted)' }}>No report yet. Log some vitals and click Regenerate.</p>
                </div>
            ) : (
                <>
                    {/* ── Card 1: Risk Score ── */}
                    <div className="card" style={{ marginBottom: '1.25rem' }}>
                        <div style={{ fontWeight: 700, marginBottom: '1rem', fontSize: '0.85rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                            Risk Score
                        </div>
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
                                height: '100%', width: `${score}%`, borderRadius: '9999px', transition: 'width 1s ease',
                                background: 'linear-gradient(90deg, #10b981 0%, #f59e0b 50%, #ef4444 100%)',
                            }} />
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.65rem', color: 'var(--text-muted)', marginTop: '0.3rem' }}>
                            <span>Safe</span><span>Moderate</span><span>High Risk</span>
                        </div>
                    </div>

                    {/* ── Card 2: Vital Trends ── */}
                    {trendsObj && Object.keys(trendsObj).length > 0 && (
                        <div className="card" style={{ marginBottom: '1.25rem' }}>
                            <div style={{ fontWeight: 700, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <Activity size={18} color="#a78bfa" /> 📊 Vital Trends This Week
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                                {Object.entries(trendsObj).map(([metric, trend]) => (
                                    <div key={metric} style={{
                                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                        padding: '0.6rem 0.875rem', background: 'var(--bg-card2)', borderRadius: '0.5rem',
                                    }}>
                                        <span style={{ fontSize: '0.83rem', color: 'var(--text-muted)' }}>
                                            {METRIC_LABEL[metric] || metric}
                                        </span>
                                        <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontWeight: 700, color: TREND_COLOR[trend] || '#94a3b8', fontSize: '0.83rem' }}>
                                            {TREND_ICON[trend] || '?'} {TREND_LABEL[trend] || trend}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* ── Card 3: Medication Adherence ── */}
                    {adherencePct !== null && (
                        <div className="card" style={{ marginBottom: '1.25rem' }}>
                            <div style={{ fontWeight: 700, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <Pill size={18} color="#34d399" /> 💊 Medication Adherence
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.75rem' }}>
                                <div style={{ flex: 1, background: 'var(--bg-card2)', borderRadius: '9999px', height: '12px', overflow: 'hidden' }}>
                                    <div style={{
                                        height: '100%', width: `${adherencePct}%`, borderRadius: '9999px',
                                        background: adherenceColor, transition: 'width 1s ease',
                                    }} />
                                </div>
                                <span style={{ fontWeight: 800, color: adherenceColor, fontSize: '1.1rem', minWidth: '3rem', textAlign: 'right' }}>
                                    {adherencePct}%
                                </span>
                            </div>
                            {adherencePct < 80 && (
                                <div style={{ fontSize: '0.8rem', color: '#f87171', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                    <AlertTriangle size={13} /> Adherence below 80% — please take your medications as prescribed.
                                </div>
                            )}
                            {adherencePct >= 80 && (
                                <div style={{ fontSize: '0.8rem', color: '#34d399' }}>✓ Good adherence this week.</div>
                            )}
                        </div>
                    )}

                    {/* ── Card 4: AI Health Analysis ── */}
                    <div className="card" style={{ borderColor: 'rgba(37,99,235,0.3)' }}>
                        <div style={{ fontWeight: 700, marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <FileText size={18} color="#60a5fa" /> 🤖 AI Health Analysis
                        </div>

                        {sections && sections.length >= 2 ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>
                                {sections.map(s => (
                                    <div key={s.num} style={{ borderLeft: '3px solid rgba(99,102,241,0.4)', paddingLeft: '1rem' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 700, fontSize: '0.78rem', color: '#818cf8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.4rem' }}>
                                            <SectionIcon title={s.title} />
                                            {s.num}. {s.title}
                                        </div>
                                        <p style={{ color: 'var(--text)', lineHeight: 1.75, fontSize: '0.875rem', whiteSpace: 'pre-line', margin: 0 }}>
                                            {s.body}
                                        </p>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p style={{ color: 'var(--text)', lineHeight: 1.8, fontSize: '0.9rem', whiteSpace: 'pre-line' }}>
                                {report?.ai_summary}
                            </p>
                        )}

                        {report?.generated_at && (
                            <p style={{ color: 'var(--text-muted)', fontSize: '0.73rem', marginTop: '1.25rem', borderTop: '1px solid var(--border)', paddingTop: '0.75rem' }}>
                                Generated: {formatDateTime(report.generated_at)}
                            </p>
                        )}
                    </div>
                </>
            )}
        </div>
    );
}
