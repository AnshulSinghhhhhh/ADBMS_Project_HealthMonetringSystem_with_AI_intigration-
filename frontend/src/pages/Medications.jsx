import { useState, useEffect } from 'react';
import api from '../api/axios';
import { Pill, Plus, CheckCircle, XCircle } from 'lucide-react';
import { formatDate } from '../utils/dateFormat';

const EMPTY_FORM = { medicine_name: '', dosage: '', doses_per_day: 1, dose_times: ['08:00'], notes: '', date: '' };
const QUICK_NOTES = ["After food", "Before food", "With water", "Empty stomach", "Before sleep"];

export default function Medications() {
    const [meds, setMeds] = useState([]);
    const [form, setForm] = useState(EMPTY_FORM);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [showForm, setShowForm] = useState(false);

    const load = () => api.get('/medications/today').then(r => setMeds(r.data)).finally(() => setLoading(false));
    useEffect(() => { load(); }, []);

    const updateDoseStatus = async (med, doseIndex, newStatus) => {
        try {
            const currentStatuses = JSON.parse(med.status);
            currentStatuses[doseIndex] = newStatus;
            const updatedStatusString = JSON.stringify(currentStatuses);
            await api.put(`/medications/update/${med.med_id}`, { status: updatedStatusString });
            setMeds(prev => prev.map(m => m.med_id === med.med_id ? { ...m, status: updatedStatusString } : m));
        } catch (e) {
            console.error("Failed to update status");
        }
    };

    const handleAdd = async e => {
        e.preventDefault();
        setSaving(true);
        try {
            await api.post('/medications/add', { ...form, status: 'pending' });
            setForm(EMPTY_FORM); setShowForm(false);
            load();
        } finally { setSaving(false); }
    };

    const setField = k => e => setForm({ ...form, [k]: e.target.value });

    const setDoseCount = e => {
        const count = parseInt(e.target.value);
        let newTimes = [...form.dose_times];
        if (count > newTimes.length) {
            newTimes = [...newTimes, ...Array(count - newTimes.length).fill('12:00')];
        } else {
            newTimes = newTimes.slice(0, count);
        }
        setForm({ ...form, doses_per_day: count, dose_times: newTimes });
    };

    const setDoseTime = (index, value) => {
        const newTimes = [...form.dose_times];
        newTimes[index] = value;
        setForm({ ...form, dose_times: newTimes });
    };

    return (
        <div className="fade-in" style={{ maxWidth: '750px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.75rem' }}>
                <div>
                    <h1 style={{ fontSize: '1.5rem', fontWeight: 800 }}>Medications</h1>
                    <p style={{ color: 'var(--text-muted)', marginTop: '0.25rem' }}>Today's medication schedule.</p>
                </div>
                <button className="btn btn-primary" onClick={() => setShowForm(!showForm)}>
                    <Plus size={16} /> Add Medication
                </button>
            </div>

            {showForm && (
                <form onSubmit={handleAdd} className="card" style={{ marginBottom: '1.25rem', borderColor: 'rgba(37,99,235,0.4)', padding: '1.5rem' }}>
                    <h3 style={{ fontWeight: 700, marginBottom: '1.25rem', fontSize: '1.1rem' }}>New Medication</h3>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem', marginBottom: '1.25rem' }}>
                        <div>
                            <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.3rem' }}>Medicine Name *</label>
                            <input className="input" placeholder="Metformin" value={form.medicine_name} onChange={setField('medicine_name')} required style={{ width: '100%' }} />
                        </div>
                        <div>
                            <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.3rem' }}>Dosage</label>
                            <input className="input" placeholder="500mg" value={form.dosage} onChange={setField('dosage')} style={{ width: '100%' }} />
                        </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem', marginBottom: '1.25rem' }}>
                        <div>
                            <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.3rem' }}>Doses per day *</label>
                            <select className="input" value={form.doses_per_day} onChange={setDoseCount} style={{ width: '100%' }}>
                                <option value={1}>1</option><option value={2}>2</option><option value={3}>3</option><option value={4}>4</option>
                            </select>
                        </div>
                        <div>
                            <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.3rem' }}>Date *</label>
                            <input className="input" type="date" value={form.date} onChange={setField('date')} required style={{ width: '100%' }} />
                        </div>
                    </div>

                    <div style={{ marginBottom: '1.25rem' }}>
                        <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.5rem' }}>Dose Times *</label>
                        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                            {form.dose_times.map((t, i) => (
                                <input key={i} className="input" type="time" value={t} onChange={e => setDoseTime(i, e.target.value)} required style={{ width: '140px' }} />
                            ))}
                        </div>
                    </div>

                    <div style={{ marginBottom: '1.5rem' }}>
                        <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.3rem' }}>Instructions / Notes</label>
                        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.5rem' }}>
                            {QUICK_NOTES.map(qn => (
                                <button key={qn} type="button" className="badge"
                                    onClick={() => setForm(f => ({ ...f, notes: qn }))}
                                    style={{ cursor: 'pointer', background: form.notes === qn ? 'rgba(37,99,235,0.2)' : '', color: form.notes === qn ? '#3b82f6' : 'var(--text-muted)' }}>
                                    {qn}
                                </button>
                            ))}
                        </div>
                        <input className="input" placeholder="Custom note..." value={form.notes} onChange={setField('notes')} style={{ width: '100%' }} />
                    </div>

                    <div style={{ display: 'flex', gap: '0.75rem' }}>
                        <button className="btn btn-primary" type="submit" disabled={saving}>{saving ? 'Saving…' : 'Add Medication'}</button>
                        <button className="btn btn-ghost" type="button" onClick={() => setShowForm(false)}>Cancel</button>
                    </div>
                </form>
            )}

            {loading ? <p style={{ color: 'var(--text-muted)' }}>Loading…</p> :
                meds.length === 0 ? (
                    <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
                        <Pill size={40} style={{ margin: '0 auto 1rem', opacity: 0.3 }} />
                        <p style={{ color: 'var(--text-muted)' }}>No medications scheduled for today.</p>
                    </div>
                ) : meds.map(m => {
                    let statuses = [];
                    let times = [];
                    try { statuses = JSON.parse(m.status); } catch { statuses = [m.status]; }
                    try { times = JSON.parse(m.dose_times); } catch { times = [m.schedule_time || 'Dose 1']; }

                    return (
                        <div key={m.med_id} className="card" style={{ marginBottom: '1rem', padding: '1.25rem' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem', borderBottom: '1px solid var(--border)', paddingBottom: '1rem' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                    <div style={{ background: 'rgba(139,92,246,0.2)', padding: '0.75rem', borderRadius: '0.75rem' }}>
                                        <Pill size={24} color="#8b5cf6" />
                                    </div>
                                    <div>
                                        <div style={{ fontWeight: 800, fontSize: '1.1rem' }}>{m.medicine_name}</div>
                                        <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: '0.2rem' }}>
                                            {m.dosage} <span style={{ margin: '0 0.5rem' }}>•</span> {formatDate(m.date)}
                                        </div>
                                        {m.notes && <div style={{ fontSize: '0.8rem', marginTop: '0.35rem', fontStyle: 'italic', color: '#6366f1' }}>{m.notes}</div>}
                                    </div>
                                </div>
                                <div className="badge badge-info" style={{ fontWeight: 600 }}>{m.doses_per_day}x a day</div>
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                {times.map((t, i) => (
                                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem 0.75rem', background: 'var(--bg-card2)', borderRadius: '0.5rem' }}>
                                        <div style={{ fontWeight: 600, color: 'var(--text)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Dose {i + 1}:</span> {t}
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                            <span className={`badge badge-${statuses[i] === 'taken' ? 'low' : statuses[i] === 'missed' ? 'high' : 'moderate'}`}>
                                                {statuses[i] || 'pending'}
                                            </span>
                                            {statuses[i] === 'pending' && (
                                                <div style={{ display: 'flex', gap: '0.3rem' }}>
                                                    <button className="btn btn-success" style={{ padding: '0.3rem 0.5rem', fontSize: '0.75rem' }}
                                                        onClick={() => updateDoseStatus(m, i, 'taken')} title="Mark Taken">
                                                        <CheckCircle size={14} />
                                                    </button>
                                                    <button className="btn btn-danger" style={{ padding: '0.3rem 0.5rem', fontSize: '0.75rem' }}
                                                        onClick={() => updateDoseStatus(m, i, 'missed')} title="Mark Missed">
                                                        <XCircle size={14} />
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    );
                })}
        </div>
    );
}
