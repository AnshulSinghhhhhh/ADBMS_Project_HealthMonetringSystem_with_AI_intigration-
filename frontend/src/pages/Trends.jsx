import { useState, useEffect } from 'react';
import api from '../api/axios';
import {
    LineChart, Line, AreaChart, Area, XAxis, YAxis,
    CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine
} from 'recharts';
import { TrendingUp } from 'lucide-react';
import { formatChartDate } from '../utils/dateFormat';

function ChartCard({ title, children }) {
    return (
        <div className="card" style={{ marginBottom: '1.25rem' }}>
            <div style={{ fontWeight: 700, marginBottom: '1.25rem', fontSize: '0.95rem' }}>{title}</div>
            <ResponsiveContainer width="100%" height={220}>{children}</ResponsiveContainer>
        </div>
    );
}

const TOOLTIP_STYLE = {
    contentStyle: { background: 'var(--bg-card2)', border: '1px solid var(--border)', borderRadius: '0.5rem', fontSize: '0.8rem' },
    labelStyle: { color: 'var(--text-muted)' },
};

export default function Trends() {
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        api.get('/vitals/weekly').then(r => {
            const sorted = [...r.data].sort((a, b) => new Date(a.recorded_at) - new Date(b.recorded_at));
            setData(sorted.map(v => ({ ...v, date: formatChartDate(v.recorded_at) })));
        }).catch(() => { }).finally(() => setLoading(false));
    }, []);

    if (loading) return <p style={{ color: 'var(--text-muted)' }}>Loading charts…</p>;

    return (
        <div className="fade-in">
            <h1 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '0.25rem' }}>Trends &amp; Charts</h1>
            <p style={{ color: 'var(--text-muted)', marginBottom: '1.75rem' }}>Last 7 days of your health metrics.</p>

            {!data.length && (
                <div className="card" style={{ textAlign: 'center', padding: '3rem', marginBottom: '1.5rem' }}>
                    <TrendingUp size={48} style={{ margin: '0 auto 1rem', opacity: 0.3 }} />
                    <p style={{ color: 'var(--text-muted)' }}>No vitals data for the past 7 days. Log vitals to see trends.</p>
                </div>
            )}

            <ChartCard title="❤️ Heart Rate (bpm)">
                <LineChart data={data}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                    <XAxis dataKey="date" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} />
                    <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 11 }} domain={[40, 140]} />
                    <Tooltip {...TOOLTIP_STYLE} />
                    <Legend />
                    <ReferenceLine y={100} stroke="red" strokeDasharray="3 3" label={{ position: 'top', value: 'Max', fill: 'red', fontSize: 10 }} />
                    <ReferenceLine y={60} stroke="orange" strokeDasharray="3 3" label={{ position: 'bottom', value: 'Min', fill: 'orange', fontSize: 10 }} />
                    <Line type="monotone" dataKey="heart_rate" name="Heart Rate" stroke="#f43f5e" strokeWidth={2.5} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                </LineChart>
            </ChartCard>

            <ChartCard title="🫀 Blood Pressure (mmHg)">
                <LineChart data={data}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                    <XAxis dataKey="date" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} />
                    <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 11 }} domain={[60, 180]} />
                    <Tooltip {...TOOLTIP_STYLE} />
                    <Legend />
                    <ReferenceLine y={120} stroke="red" strokeDasharray="3 3" label={{ position: 'top', value: 'Sys Max', fill: 'red', fontSize: 10 }} />
                    <ReferenceLine y={90} stroke="orange" strokeDasharray="3 3" label={{ position: 'bottom', value: 'Sys Min', fill: 'orange', fontSize: 10 }} />
                    <Line type="monotone" dataKey="bp_systolic" name="Systolic" stroke="#f59e0b" strokeWidth={2.5} dot={{ r: 4 }} />
                    <Line type="monotone" dataKey="bp_diastolic" name="Diastolic" stroke="#f97316" strokeWidth={2.5} dot={{ r: 4 }} strokeDasharray="5 5" />
                </LineChart>
            </ChartCard>

            <ChartCard title="🩸 Blood Sugar (mg/dL)">
                <AreaChart data={data}>
                    <defs>
                        <linearGradient id="bsGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
                            <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                        </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                    <XAxis dataKey="date" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} />
                    <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 11 }} domain={[60, 200]} />
                    <Tooltip {...TOOLTIP_STYLE} />
                    <Legend />
                    <ReferenceLine y={140} stroke="red" strokeDasharray="3 3" label={{ position: 'top', value: 'Max', fill: 'red', fontSize: 10 }} />
                    <ReferenceLine y={70} stroke="orange" strokeDasharray="3 3" label={{ position: 'bottom', value: 'Min', fill: 'orange', fontSize: 10 }} />
                    <Area type="monotone" dataKey="blood_sugar" name="Blood Sugar" stroke="#8b5cf6" fill="url(#bsGrad)" strokeWidth={2.5} dot={{ r: 4 }} />
                </AreaChart>
            </ChartCard>

            <ChartCard title="💨 SpO₂ (%)">
                <LineChart data={data}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                    <XAxis dataKey="date" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} />
                    <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 11 }} domain={[85, 100]} />
                    <Tooltip {...TOOLTIP_STYLE} />
                    <Legend />
                    <ReferenceLine y={95} stroke="orange" strokeDasharray="3 3" label={{ position: 'bottom', value: 'Min', fill: 'orange', fontSize: 10 }} />
                    <Line type="monotone" dataKey="spo2" name="SpO₂" stroke="#06b6d4" strokeWidth={2.5} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                </LineChart>
            </ChartCard>

            <ChartCard title="🌡️ Temperature (°F)">
                <LineChart data={data}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                    <XAxis dataKey="date" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} />
                    <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 11 }} domain={[95, 105]} />
                    <Tooltip {...TOOLTIP_STYLE} />
                    <Legend />
                    <ReferenceLine y={99.0} stroke="red" strokeDasharray="3 3" label={{ position: 'top', value: 'Max', fill: 'red', fontSize: 10 }} />
                    <ReferenceLine y={97.0} stroke="orange" strokeDasharray="3 3" label={{ position: 'bottom', value: 'Min', fill: 'orange', fontSize: 10 }} />
                    <Line type="monotone" dataKey="temperature" name="Temperature (°F)" stroke="#10b981" strokeWidth={2.5} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                </LineChart>
            </ChartCard>
        </div>
    );
}
