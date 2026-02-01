import { useState, useEffect } from 'react'
import { X, Target, Building2, Calendar } from 'lucide-react'
import { motion } from 'framer-motion'
import { supabase } from '../lib/supabaseClient'
import type { BranchTarget } from '../types'

interface TargetEntryProps {
    year: number
    existingTargets: BranchTarget[]
    onSave: () => void
    onClose: () => void
}

const MONTHS = ['Styczeń', 'Luty', 'Marzec', 'Kwiecień', 'Maj', 'Czerwiec',
    'Lipiec', 'Sierpień', 'Wrzesień', 'Październik', 'Listopad', 'Grudzień']

const BRANCHES = ['Kraków', 'Warszawa', 'Olsztyn']

const TargetEntry = ({ year, existingTargets, onSave, onClose }: TargetEntryProps) => {
    const [targets, setTargets] = useState<Record<string, Record<number, number>>>({})
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [selectedBranch, setSelectedBranch] = useState('Warszawa')

    // Initialize targets from existing data
    useEffect(() => {
        const initial: Record<string, Record<number, number>> = {}
        BRANCHES.forEach(branch => {
            initial[branch] = {}
            for (let m = 1; m <= 12; m++) {
                const existing = existingTargets.find(t => t.oddzial === branch && t.miesiac === m)
                initial[branch][m] = existing?.plan_kwota || 0
            }
        })
        setTargets(initial)
    }, [existingTargets])

    const handleChange = (branch: string, month: number, value: string) => {
        setTargets(prev => ({
            ...prev,
            [branch]: {
                ...prev[branch],
                [month]: parseFloat(value) || 0
            }
        }))
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setError(null)

        const toUpsert: Partial<BranchTarget>[] = []

        BRANCHES.forEach(branch => {
            for (let m = 1; m <= 12; m++) {
                const plan = targets[branch]?.[m] || 0
                if (plan > 0) {
                    toUpsert.push({
                        oddzial: branch,
                        rok: year,
                        miesiac: m,
                        plan_kwota: plan,
                        wykonanie_kwota: 0 // Wykonanie jest obliczane z transakcji
                    })
                }
            }
        })

        if (toUpsert.length > 0) {
            const { error: upsertError } = await supabase
                .from('branch_targets')
                .upsert(toUpsert, {
                    onConflict: 'oddzial,rok,miesiac'
                })

            if (upsertError) {
                setError(upsertError.message)
                setLoading(false)
                return
            }
        }

        setLoading(false)
        onSave()
        onClose()
    }

    const getTotalForBranch = (branch: string) => {
        let total = 0
        for (let m = 1; m <= 12; m++) {
            total += targets[branch]?.[m] || 0
        }
        return total
    }

    const formatCurrency = (val: number) => {
        return val.toLocaleString('pl-PL', { minimumFractionDigits: 0, maximumFractionDigits: 0 }) + ' zł'
    }

    return (
        <div className="modal-overlay" onClick={onClose}>
            <motion.div
                className="glass-card modal-card"
                style={{ maxWidth: '600px', width: '100%', maxHeight: '90vh', overflow: 'auto' }}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                onClick={e => e.stopPropagation()}
            >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                    <h2 className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <Target size={28} color="var(--accent-pink)" />
                        Plany sprzedażowe {year}
                    </h2>
                    <button
                        onClick={onClose}
                        className="btn"
                        style={{ padding: '0.5rem', background: 'rgba(255,255,255,0.1)' }}
                    >
                        <X size={20} />
                    </button>
                </div>

                <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem', fontSize: '0.875rem' }}>
                    Wprowadź miesięczne cele prowizji dla każdego oddziału. Wykonanie jest automatycznie pobierane z transakcji.
                </p>

                {error && (
                    <div style={{
                        background: 'rgba(236, 72, 153, 0.1)',
                        border: '1px solid var(--accent-pink)',
                        borderRadius: '8px',
                        padding: '1rem',
                        marginBottom: '1.5rem',
                        color: 'var(--accent-pink)'
                    }}>
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit}>
                    {/* Branch selector tabs */}
                    <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem' }}>
                        {BRANCHES.map(branch => (
                            <button
                                key={branch}
                                type="button"
                                className="btn"
                                style={{
                                    padding: '0.75rem 1.5rem',
                                    background: selectedBranch === branch ? 'var(--primary)' : 'rgba(255,255,255,0.05)',
                                    fontWeight: selectedBranch === branch ? 700 : 400,
                                    flex: 1
                                }}
                                onClick={() => setSelectedBranch(branch)}
                            >
                                <Building2 size={16} style={{ marginRight: '0.5rem' }} />
                                {branch}
                            </button>
                        ))}
                    </div>

                    {/* Summary for selected branch */}
                    <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginBottom: '1.5rem',
                        padding: '1rem',
                        background: 'rgba(99, 102, 241, 0.1)',
                        borderRadius: '12px'
                    }}>
                        <div>
                            <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Suma planu rocznego</p>
                            <p style={{ fontWeight: 700, fontSize: '1.5rem' }}>{formatCurrency(getTotalForBranch(selectedBranch))}</p>
                        </div>
                        <Target size={32} color="var(--primary)" style={{ opacity: 0.5 }} />
                    </div>

                    {/* Monthly inputs */}
                    <div className="table-container" style={{ marginBottom: '2rem' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead>
                                <tr style={{ borderBottom: '1px solid var(--border)' }}>
                                    <th style={{ textAlign: 'left', padding: '0.75rem', color: 'var(--text-muted)', fontWeight: 500 }}>
                                        <Calendar size={14} style={{ marginRight: '0.5rem' }} />
                                        Miesiąc
                                    </th>
                                    <th style={{ textAlign: 'right', padding: '0.75rem', color: 'var(--text-muted)', fontWeight: 500 }}>
                                        Plan prowizji (zł)
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                {MONTHS.map((month, i) => {
                                    const m = i + 1
                                    const plan = targets[selectedBranch]?.[m] || 0

                                    return (
                                        <tr key={m} style={{ borderBottom: '1px solid var(--border)' }}>
                                            <td style={{ padding: '0.5rem 0.75rem', fontWeight: 500 }}>{month}</td>
                                            <td style={{ padding: '0.5rem 0.75rem' }}>
                                                <input
                                                    type="number"
                                                    className="input-field"
                                                    style={{ margin: 0, padding: '0.5rem 1rem', textAlign: 'right', width: '100%' }}
                                                    value={plan || ''}
                                                    onChange={e => handleChange(selectedBranch, m, e.target.value)}
                                                    placeholder="0"
                                                    step="500"
                                                    min="0"
                                                />
                                            </td>
                                        </tr>
                                    )
                                })}
                            </tbody>
                        </table>
                    </div>

                    <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
                        <button
                            type="button"
                            onClick={onClose}
                            className="btn"
                            style={{ background: 'rgba(255,255,255,0.1)' }}
                        >
                            Anuluj
                        </button>
                        <button
                            type="submit"
                            className="btn btn-primary"
                            disabled={loading}
                        >
                            {loading ? 'Zapisywanie...' : 'Zapisz Plany'}
                        </button>
                    </div>
                </form>
            </motion.div>
        </div>
    )
}

export default TargetEntry
