import React, { useMemo, useState } from 'react'
import { Trophy, Target, Users, TrendingUp, Calendar, Building2, PlusCircle, Edit3, X, Save } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, LineChart, Line, Legend } from 'recharts'
import { AnimatePresence, motion } from 'framer-motion'
import { usePerformanceData } from '../hooks/usePerformanceData'
import { supabase } from '../lib/supabaseClient'
import PerformanceEntry from './PerformanceEntry'
import TargetEntry from './TargetEntry'
import type { AgentPerformance } from '../types'

// Agent Edit Modal Component
interface AgentEditModalProps {
    agent: AgentPerformance
    onSave: () => void
    onClose: () => void
}

const AgentEditModal = ({ agent, onSave, onClose }: AgentEditModalProps) => {
    const [formData, setFormData] = useState({
        spotkania_pozyskowe: agent.spotkania_pozyskowe || 0,
        nowe_umowy: agent.nowe_umowy || 0,
        prezentacje: agent.prezentacje || 0,
        mieszkania: agent.mieszkania || 0,
        domy: agent.domy || 0,
        dzialki: agent.dzialki || 0,
        inne: agent.inne || 0
    })
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const handleChange = (field: string, value: string) => {
        setFormData(prev => ({
            ...prev,
            [field]: parseInt(value) || 0
        }))
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setError(null)

        const suma = formData.mieszkania + formData.domy + formData.dzialki + formData.inne

        const dataToSave = {
            spotkania_pozyskowe: formData.spotkania_pozyskowe,
            nowe_umowy: formData.nowe_umowy,
            prezentacje: formData.prezentacje,
            mieszkania: formData.mieszkania,
            domy: formData.domy,
            dzialki: formData.dzialki,
            inne: formData.inne,
            suma_nieruchomosci: suma
        }

        let saveError

        if (agent.id) {
            // Update existing record
            const { error } = await supabase
                .from('agent_performance')
                .update(dataToSave)
                .eq('id', agent.id)
            saveError = error
        } else {
            // Create new record for agent from transactions
            const { error } = await supabase
                .from('agent_performance')
                .insert({
                    ...dataToSave,
                    agent_name: agent.agent_name,
                    oddzial: agent.oddzial,
                    rok: agent.rok,
                    miesiac: null,
                    prowizja_netto_kredyt: 0 // prowizja is calculated from transactions
                })
            saveError = error
        }

        if (saveError) {
            setError(saveError.message)
            setLoading(false)
            return
        }

        setLoading(false)
        onSave()
        onClose()
    }

    const formatCurrency = (val: number) => {
        return val.toLocaleString('pl-PL', { minimumFractionDigits: 0, maximumFractionDigits: 0 }) + ' zł'
    }

    return (
        <div className="modal-overlay" onClick={onClose}>
            <motion.div
                className="glass-card modal-card"
                style={{ maxWidth: '500px', width: '100%' }}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                onClick={e => e.stopPropagation()}
            >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                    <h2 className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <Edit3 size={24} color={agent.id ? "var(--primary)" : "var(--accent-green)"} />
                        {agent.id ? 'Edytuj wydajność' : 'Dodaj dane wydajności'}
                    </h2>
                    <button
                        onClick={onClose}
                        className="btn"
                        style={{ padding: '0.5rem', background: 'rgba(255,255,255,0.1)' }}
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Agent info */}
                <div style={{
                    background: 'rgba(99, 102, 241, 0.1)',
                    borderRadius: '12px',
                    padding: '1rem',
                    marginBottom: '1.5rem'
                }}>
                    <p style={{ fontWeight: 700, fontSize: '1.1rem', marginBottom: '0.25rem' }}>{agent.agent_name}</p>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>{agent.oddzial} • {agent.rok}</p>
                </div>

                {/* Prowizja - read only */}
                <div style={{
                    background: 'rgba(16, 185, 129, 0.1)',
                    borderRadius: '12px',
                    padding: '1rem',
                    marginBottom: '1.5rem',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                }}>
                    <div>
                        <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>Prowizja (z transakcji)</p>
                        <p style={{ fontWeight: 700, fontSize: '1.5rem', color: 'var(--accent-green)' }}>
                            {formatCurrency(agent.prowizja_netto_kredyt || 0)}
                        </p>
                    </div>
                    <Trophy size={28} color="var(--accent-green)" style={{ opacity: 0.5 }} />
                </div>

                {error && (
                    <div style={{
                        background: 'rgba(236, 72, 153, 0.1)',
                        border: '1px solid var(--accent-pink)',
                        borderRadius: '8px',
                        padding: '1rem',
                        marginBottom: '1rem',
                        color: 'var(--accent-pink)'
                    }}>
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit}>
                    {/* Editable fields */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
                        <div className="form-group">
                            <label><Users size={14} /> Spotkania pozyskowe</label>
                            <input
                                type="number"
                                className="input-field"
                                value={formData.spotkania_pozyskowe}
                                onChange={e => handleChange('spotkania_pozyskowe', e.target.value)}
                                min="0"
                            />
                        </div>
                        <div className="form-group">
                            <label><Calendar size={14} /> Nowe umowy</label>
                            <input
                                type="number"
                                className="input-field"
                                value={formData.nowe_umowy}
                                onChange={e => handleChange('nowe_umowy', e.target.value)}
                                min="0"
                            />
                        </div>
                        <div className="form-group">
                            <label><Target size={14} /> Prezentacje</label>
                            <input
                                type="number"
                                className="input-field"
                                value={formData.prezentacje}
                                onChange={e => handleChange('prezentacje', e.target.value)}
                                min="0"
                            />
                        </div>
                    </div>

                    <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: '0.75rem' }}>Nieruchomości:</p>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.75rem', marginBottom: '1.5rem' }}>
                        <div className="form-group">
                            <label style={{ fontSize: '0.75rem' }}>Mieszkania</label>
                            <input
                                type="number"
                                className="input-field"
                                style={{ padding: '0.75rem' }}
                                value={formData.mieszkania}
                                onChange={e => handleChange('mieszkania', e.target.value)}
                                min="0"
                            />
                        </div>
                        <div className="form-group">
                            <label style={{ fontSize: '0.75rem' }}>Domy</label>
                            <input
                                type="number"
                                className="input-field"
                                style={{ padding: '0.75rem' }}
                                value={formData.domy}
                                onChange={e => handleChange('domy', e.target.value)}
                                min="0"
                            />
                        </div>
                        <div className="form-group">
                            <label style={{ fontSize: '0.75rem' }}>Działki</label>
                            <input
                                type="number"
                                className="input-field"
                                style={{ padding: '0.75rem' }}
                                value={formData.dzialki}
                                onChange={e => handleChange('dzialki', e.target.value)}
                                min="0"
                            />
                        </div>
                        <div className="form-group">
                            <label style={{ fontSize: '0.75rem' }}>Inne</label>
                            <input
                                type="number"
                                className="input-field"
                                style={{ padding: '0.75rem' }}
                                value={formData.inne}
                                onChange={e => handleChange('inne', e.target.value)}
                                min="0"
                            />
                        </div>
                    </div>

                    <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '1rem',
                        background: 'rgba(99, 102, 241, 0.1)',
                        borderRadius: '12px',
                        marginBottom: '1.5rem'
                    }}>
                        <span style={{ color: 'var(--text-muted)' }}>Suma nieruchomości:</span>
                        <span style={{ fontWeight: 700, fontSize: '1.25rem' }}>
                            {formData.mieszkania + formData.domy + formData.dzialki + formData.inne}
                        </span>
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
                            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                        >
                            <Save size={18} />
                            {loading ? 'Zapisywanie...' : 'Zapisz'}
                        </button>
                    </div>
                </form>
            </motion.div>
        </div>
    )
}

const COLORS = ['#6366f1', '#ec4899', '#3b82f6']
const BRANCH_COLORS: Record<string, string> = {
    'Kraków': '#6366f1',
    'Warszawa': '#ec4899',
    'Olsztyn': '#3b82f6'
}

interface PerformanceViewProps {
    year?: number
    agents?: { name: string; oddzial: string }[]
    userRole?: string
    transactions?: import('../types').Transaction[]
}

const MONTHS_SHORT = ['Sty', 'Lut', 'Mar', 'Kwi', 'Maj', 'Cze', 'Lip', 'Sie', 'Wrz', 'Paź', 'Lis', 'Gru']

interface PlansTableProps {
    branchTargets: import('../types').BranchTarget[]
    selectedYear: number
    userRole: string
    onEditPlans: () => void
}

const PlansTable = ({ branchTargets, selectedYear, userRole, onEditPlans }: PlansTableProps) => {
    const branches = ['Kraków', 'Warszawa', 'Olsztyn']
    const currentMonth = new Date().getMonth() + 1
    const currentYear = new Date().getFullYear()
    const isCurrentYear = selectedYear === currentYear
    const maxMonth = isCurrentYear ? currentMonth : (selectedYear < currentYear ? 12 : 0)

    const formatCurrency = (val: number) => {
        if (val >= 1000000) {
            const m = val / 1000000
            return (m % 1 === 0 ? m.toFixed(0) : m.toFixed(1)) + 'M'
        }
        if (val >= 1000) {
            const k = val / 1000
            return (k % 1 === 0 ? k.toFixed(0) : k.toFixed(1)) + 'k'
        }
        return val.toFixed(0)
    }

    const getTargetForMonth = (branch: string, month: number, field: 'plan_kwota' | 'wykonanie_kwota') => {
        const target = branchTargets.find(t => t.oddzial === branch && t.miesiac === month)
        return target ? target[field] || 0 : 0
    }

    const getTotalForBranch = (branch: string, field: 'plan_kwota' | 'wykonanie_kwota', upToMonth?: number) => {
        const limit = upToMonth || 12
        return branchTargets
            .filter(t => t.oddzial === branch && t.miesiac <= limit)
            .reduce((sum, t) => sum + (t[field] || 0), 0)
    }

    const getGrandTotal = (field: 'plan_kwota' | 'wykonanie_kwota', upToMonth?: number) => {
        const limit = upToMonth || 12
        return branchTargets
            .filter(t => t.miesiac <= limit)
            .reduce((sum, t) => sum + (t[field] || 0), 0)
    }

    const hasAnyPlans = branchTargets.some(t => t.plan_kwota > 0)
    const hasAnyData = branchTargets.length > 0

    return (
        <div className="glass-card" style={{ padding: '1.5rem 2rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '1.1rem' }}>
                    <Target size={22} color="var(--accent-pink)" />
                    Plany miesięczne {selectedYear}
                </h3>
                {userRole === 'admin' && (
                    <button
                        className="btn"
                        style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(236, 72, 153, 0.15)', border: '1px solid var(--accent-pink)' }}
                        onClick={onEditPlans}
                    >
                        <Edit3 size={16} />
                        {hasAnyPlans ? 'Edytuj Plany' : 'Dodaj Plany'}
                    </button>
                )}
            </div>

            {!hasAnyData ? (
                <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                    <Target size={40} style={{ marginBottom: '1rem', opacity: 0.3 }} />
                    <p style={{ fontSize: '1rem' }}>Brak danych na {selectedYear}</p>
                    {userRole === 'admin' && (
                        <p style={{ fontSize: '0.875rem', marginTop: '0.5rem', opacity: 0.7 }}>Kliknij "Dodaj Plany" aby wprowadzić cele</p>
                    )}
                </div>
            ) : (
                <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '1000px' }}>
                        <thead>
                            <tr>
                                <th style={{ textAlign: 'left', padding: '1rem', color: 'var(--text-muted)', fontWeight: 500, borderBottom: '2px solid var(--border)', width: '160px' }}>Oddział</th>
                                {MONTHS_SHORT.map((m, i) => {
                                    const month = i + 1
                                    const isPast = month <= maxMonth
                                    return (
                                        <th key={i} style={{
                                            textAlign: 'center',
                                            padding: '1rem 0.5rem',
                                            color: isPast ? 'var(--text-main)' : 'var(--text-muted)',
                                            fontWeight: 600,
                                            fontSize: '0.85rem',
                                            borderBottom: '2px solid var(--border)',
                                            opacity: isPast ? 1 : 0.4
                                        }}>{m}</th>
                                    )
                                })}
                                <th style={{ textAlign: 'right', padding: '1rem', color: 'var(--text-muted)', fontWeight: 600, borderBottom: '2px solid var(--border)', width: '110px' }}>Suma</th>
                                <th style={{ textAlign: 'right', padding: '1rem', color: 'var(--text-muted)', fontWeight: 600, borderBottom: '2px solid var(--border)', width: '80px' }}>%</th>
                            </tr>
                        </thead>
                        <tbody>
                            {branches.map((branch, branchIndex) => {
                                const totalPlanToDate = getTotalForBranch(branch, 'plan_kwota', maxMonth)
                                const totalWykonanieToDate = getTotalForBranch(branch, 'wykonanie_kwota', maxMonth)
                                const totalPlanYear = getTotalForBranch(branch, 'plan_kwota')
                                const totalWykonanieYear = getTotalForBranch(branch, 'wykonanie_kwota')
                                const pct = totalPlanToDate > 0 ? (totalWykonanieToDate / totalPlanToDate) * 100 : 0

                                return (
                                    <React.Fragment key={branch}>
                                        {/* Plan row - branch name + plan values */}
                                        <tr>
                                            <td style={{ padding: '1rem', verticalAlign: 'middle' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                                    <span style={{
                                                        display: 'inline-block',
                                                        padding: '0.4rem 0.75rem',
                                                        borderRadius: '8px',
                                                        fontSize: '0.85rem',
                                                        fontWeight: 600,
                                                        background: BRANCH_COLORS[branch] + '25',
                                                        color: BRANCH_COLORS[branch]
                                                    }}>
                                                        {branch}
                                                    </span>
                                                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Plan</span>
                                                </div>
                                            </td>
                                            {Array.from({ length: 12 }, (_, i) => {
                                                const month = i + 1
                                                const plan = getTargetForMonth(branch, month, 'plan_kwota')
                                                const isPast = month <= maxMonth
                                                return (
                                                    <td key={i} style={{
                                                        textAlign: 'center',
                                                        padding: '1rem 0.5rem',
                                                        fontSize: '0.95rem',
                                                        fontWeight: plan > 0 ? 600 : 400,
                                                        color: plan > 0 ? 'var(--text-main)' : 'var(--text-muted)',
                                                        opacity: isPast ? 1 : 0.35
                                                    }}>
                                                        {plan > 0 ? formatCurrency(plan) : '-'}
                                                    </td>
                                                )
                                            })}
                                            <td style={{ textAlign: 'right', padding: '1rem', fontWeight: 700, fontSize: '0.95rem' }}>
                                                {formatCurrency(totalPlanYear)} zł
                                            </td>
                                            <td rowSpan={2} style={{
                                                textAlign: 'right',
                                                padding: '1rem',
                                                fontWeight: 700,
                                                fontSize: '1.25rem',
                                                color: pct >= 100 ? 'var(--accent-green)' : pct > 0 ? 'var(--accent-pink)' : 'var(--text-muted)',
                                                verticalAlign: 'middle'
                                            }}>
                                                {pct.toFixed(0)}%
                                            </td>
                                        </tr>
                                        {/* Wykonanie row */}
                                        <tr style={{ borderBottom: branchIndex < branches.length - 1 ? '2px solid var(--border)' : 'none' }}>
                                            <td style={{ padding: '0.75rem 1rem 1.25rem' }}>
                                                <span style={{ fontSize: '0.75rem', color: 'var(--accent-green)', marginLeft: '0.5rem' }}>Wykonanie</span>
                                            </td>
                                            {Array.from({ length: 12 }, (_, i) => {
                                                const month = i + 1
                                                const wykonanie = getTargetForMonth(branch, month, 'wykonanie_kwota')
                                                const plan = getTargetForMonth(branch, month, 'plan_kwota')
                                                const monthPct = plan > 0 ? (wykonanie / plan) * 100 : (wykonanie > 0 ? 100 : 0)
                                                const isPast = month <= maxMonth
                                                return (
                                                    <td key={i} style={{
                                                        textAlign: 'center',
                                                        padding: '0.75rem 0.5rem 1.25rem',
                                                        opacity: isPast ? 1 : 0.35
                                                    }}>
                                                        <div style={{
                                                            fontSize: '0.95rem',
                                                            color: wykonanie > 0 ? 'var(--accent-green)' : 'var(--text-muted)',
                                                            fontWeight: wykonanie > 0 ? 600 : 400
                                                        }}>
                                                            {wykonanie > 0 ? formatCurrency(wykonanie) : '-'}
                                                        </div>
                                                        {plan > 0 && isPast && (
                                                            <div style={{
                                                                fontSize: '0.7rem',
                                                                color: monthPct >= 100 ? 'var(--accent-green)' : 'var(--accent-pink)',
                                                                marginTop: '0.3rem',
                                                                fontWeight: 600
                                                            }}>
                                                                {monthPct.toFixed(0)}%
                                                            </div>
                                                        )}
                                                    </td>
                                                )
                                            })}
                                            <td style={{ textAlign: 'right', padding: '0.75rem 1rem 1.25rem', fontWeight: 600, fontSize: '0.95rem', color: 'var(--accent-green)' }}>
                                                {formatCurrency(totalWykonanieYear)} zł
                                            </td>
                                        </tr>
                                    </React.Fragment>
                                )
                            })}
                            {/* Grand total row */}
                            <tr style={{ background: 'rgba(99, 102, 241, 0.1)', borderTop: '2px solid var(--border)' }}>
                                <td style={{ padding: '1.25rem 1rem', fontWeight: 700, fontSize: '1rem' }}>
                                    RAZEM
                                </td>
                                {Array.from({ length: 12 }, (_, i) => {
                                    const month = i + 1
                                    const totalPlan = branches.reduce((sum, b) => sum + getTargetForMonth(b, month, 'plan_kwota'), 0)
                                    const totalWyk = branches.reduce((sum, b) => sum + getTargetForMonth(b, month, 'wykonanie_kwota'), 0)
                                    const monthPct = totalPlan > 0 ? (totalWyk / totalPlan) * 100 : 0
                                    const isPast = month <= maxMonth
                                    return (
                                        <td key={i} style={{ textAlign: 'center', padding: '1.25rem 0.5rem', opacity: isPast ? 1 : 0.35 }}>
                                            <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>{totalPlan > 0 ? formatCurrency(totalPlan) : '-'}</div>
                                            <div style={{ color: 'var(--accent-green)', fontSize: '0.85rem', fontWeight: 600 }}>{totalWyk > 0 ? formatCurrency(totalWyk) : '-'}</div>
                                            {totalPlan > 0 && isPast && (
                                                <div style={{
                                                    fontSize: '0.65rem',
                                                    color: monthPct >= 100 ? 'var(--accent-green)' : 'var(--accent-pink)',
                                                    marginTop: '0.25rem',
                                                    fontWeight: 600
                                                }}>
                                                    {monthPct.toFixed(0)}%
                                                </div>
                                            )}
                                        </td>
                                    )
                                })}
                                <td style={{ textAlign: 'right', padding: '1.25rem 1rem' }}>
                                    <div style={{ fontWeight: 700, fontSize: '1rem' }}>{formatCurrency(getGrandTotal('plan_kwota'))} zł</div>
                                    <div style={{ color: 'var(--accent-green)', fontWeight: 600, fontSize: '0.95rem' }}>{formatCurrency(getGrandTotal('wykonanie_kwota'))} zł</div>
                                </td>
                                <td style={{
                                    textAlign: 'right',
                                    padding: '1.25rem 1rem',
                                    fontWeight: 700,
                                    fontSize: '1.4rem',
                                    color: getGrandTotal('plan_kwota', maxMonth) > 0 && getGrandTotal('wykonanie_kwota', maxMonth) >= getGrandTotal('plan_kwota', maxMonth) ? 'var(--accent-green)' : 'var(--accent-pink)'
                                }}>
                                    {getGrandTotal('plan_kwota', maxMonth) > 0 ? ((getGrandTotal('wykonanie_kwota', maxMonth) / getGrandTotal('plan_kwota', maxMonth)) * 100).toFixed(0) : 0}%
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    )
}

const PerformanceView = ({ year: initialYear = new Date().getFullYear(), agents = [], userRole = 'agent', transactions = [] }: PerformanceViewProps) => {
    const [selectedYear, setSelectedYear] = useState(initialYear)
    const [isAddingPerformance, setIsAddingPerformance] = useState(false)
    const [isEditingTargets, setIsEditingTargets] = useState(false)
    const [editingAgent, setEditingAgent] = useState<AgentPerformance | null>(null)

    const {
        agentPerformance,
        branchPerformance,
        branchTargets,
        branchTargetsFromDb,
        topAgents,
        monthlyTargetsData,
        loading,
        refreshData
    } = usePerformanceData(selectedYear, transactions)

    const [selectedBranch, setSelectedBranch] = useState<string | null>(null)

    const filteredAgents = useMemo(() => {
        if (!selectedBranch) return topAgents
        return agentPerformance
            .filter(a => a.oddzial === selectedBranch)
            .sort((a, b) => (b.prowizja_netto_kredyt || 0) - (a.prowizja_netto_kredyt || 0))
            .slice(0, 10)
    }, [agentPerformance, topAgents, selectedBranch])

    const formatCurrency = (val: number) => {
        return val.toLocaleString('pl-PL', { minimumFractionDigits: 0, maximumFractionDigits: 0 }) + ' zł'
    }

    const handleAddPerformance = (_data: AgentPerformance) => {
        refreshData()
    }

    // Get unique agents from performance data for the form
    const availableAgents = useMemo(() => {
        const fromPerformance = agentPerformance.map(a => ({ name: a.agent_name, oddzial: a.oddzial }))
        const combined = [...agents, ...fromPerformance]
        const unique = Array.from(new Map(combined.map(a => [a.name, a])).values())
        return unique.sort((a, b) => a.name.localeCompare(b.name))
    }, [agents, agentPerformance])

    if (loading) {
        return (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
                <div className="animate-spin" style={{ width: 48, height: 48, border: '4px solid var(--border)', borderTopColor: 'var(--primary)', borderRadius: '50%' }} />
            </div>
        )
    }

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            {/* Header with Year Selector and Add Button */}
            <div className="glass-card" style={{ padding: '1rem 1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <Calendar size={20} color="var(--primary)" />
                    <span style={{ color: 'var(--text-muted)' }}>Rok:</span>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                        {[2025, 2026, 2027].map(y => (
                            <button
                                key={y}
                                className="btn"
                                style={{
                                    padding: '0.5rem 1rem',
                                    background: selectedYear === y ? 'var(--primary)' : 'rgba(255,255,255,0.05)',
                                    fontWeight: selectedYear === y ? 700 : 400
                                }}
                                onClick={() => setSelectedYear(y)}
                            >
                                {y}
                            </button>
                        ))}
                    </div>
                </div>

                {userRole === 'admin' && (
                    <button
                        className="btn btn-primary"
                        style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                        onClick={() => setIsAddingPerformance(true)}
                    >
                        <PlusCircle size={18} />
                        Dodaj Wydajność
                    </button>
                )}
            </div>

            {/* Plans Table - Always visible */}
            <PlansTable
                branchTargets={branchTargets}
                selectedYear={selectedYear}
                userRole={userRole}
                onEditPlans={() => setIsEditingTargets(true)}
            />

            {agentPerformance.length === 0 ? (
                <div className="glass-card" style={{ textAlign: 'center', padding: '3rem' }}>
                    <Users size={48} color="var(--text-muted)" style={{ marginBottom: '1rem' }} />
                    <h3 style={{ marginBottom: '0.5rem' }}>Brak danych wydajności agentów za {selectedYear}</h3>
                    <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
                        Nie ma jeszcze danych wydajności agentów dla tego roku.
                    </p>
                    {userRole === 'admin' && (
                        <button
                            className="btn btn-primary"
                            onClick={() => setIsAddingPerformance(true)}
                        >
                            <PlusCircle size={18} style={{ marginRight: '0.5rem' }} />
                            Dodaj wydajność agenta
                        </button>
                    )}
                </div>
            ) : (
                <>
                    {/* Summary Cards */}
                    <div className="dashboard-grid">
                        {branchPerformance.map((branch, i) => (
                            <div
                                key={branch.oddzial}
                                className="glass-card"
                                style={{
                                    cursor: 'pointer',
                                    border: selectedBranch === branch.oddzial ? `2px solid ${COLORS[i]}` : undefined,
                                    transition: 'all 0.2s ease'
                                }}
                                onClick={() => setSelectedBranch(selectedBranch === branch.oddzial ? null : branch.oddzial)}
                            >
                                <div style={{ display: 'flex', alignItems: 'center', marginBottom: '1.5rem' }}>
                                    <div style={{
                                        width: '40px', height: '40px', borderRadius: '12px',
                                        background: COLORS[i], display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        marginRight: '1rem'
                                    }}>
                                        <Building2 size={20} color="white" />
                                    </div>
                                    <div>
                                        <h3 style={{ fontSize: '1.25rem' }}>{branch.oddzial}</h3>
                                        <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>{branch.agentCount} Agentów</p>
                                    </div>
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                        <span style={{ color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                            <Trophy size={14} /> Prowizja
                                        </span>
                                        <span style={{ fontWeight: 700, color: 'var(--accent-green)' }}>{formatCurrency(branch.totalProwizja)}</span>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                        <span style={{ color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                            <Users size={14} /> Spotkania
                                        </span>
                                        <span style={{ fontWeight: 600 }}>{branch.totalSpotkania}</span>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                        <span style={{ color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                            <Calendar size={14} /> Prezentacje
                                        </span>
                                        <span style={{ fontWeight: 600 }}>{branch.totalPrezentacje}</span>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                        <span style={{ color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                            <TrendingUp size={14} /> Nieruchomości
                                        </span>
                                        <span style={{ fontWeight: 600 }}>{branch.totalNieruchomosci}</span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Charts Section */}
                    <div className="grid-cols-1-5-1">
                        {/* Top Agents Chart */}
                        <div className="glass-card">
                            <h3 style={{ marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <Trophy size={20} color="var(--primary)" />
                                {selectedBranch ? `Top Agenci - ${selectedBranch}` : 'Top 10 Agentów'}
                            </h3>
                            <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: '1.5rem' }}>
                                Ranking wg prowizji netto + kredyt
                            </p>
                            <div style={{ height: '400px', width: '100%' }}>
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart
                                        data={filteredAgents}
                                        layout="vertical"
                                        margin={{ top: 5, right: 30, left: 120, bottom: 5 }}
                                    >
                                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" horizontal={true} vertical={false} />
                                        <XAxis
                                            type="number"
                                            stroke="var(--text-muted)"
                                            axisLine={false}
                                            tickLine={false}
                                            tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
                                        />
                                        <YAxis
                                            type="category"
                                            dataKey="agent_name"
                                            stroke="var(--text-muted)"
                                            axisLine={false}
                                            tickLine={false}
                                            width={115}
                                            tick={{ fontSize: 12 }}
                                        />
                                        <Tooltip
                                            contentStyle={{
                                                background: 'rgba(15, 23, 42, 0.95)',
                                                border: '1px solid rgba(99, 102, 241, 0.3)',
                                                borderRadius: '12px',
                                                boxShadow: '0 10px 40px rgba(0, 0, 0, 0.5)'
                                            }}
                                            formatter={(value: number | undefined) => [formatCurrency(value || 0), 'Prowizja']}
                                            labelStyle={{ color: 'white', fontWeight: 700 }}
                                            cursor={{ fill: 'rgba(99, 102, 241, 0.1)' }}
                                        />
                                        <Bar
                                            dataKey="prowizja_netto_kredyt"
                                            radius={[0, 6, 6, 0]}
                                            barSize={20}
                                        >
                                            {filteredAgents.map((entry, index) => (
                                                <Cell
                                                    key={`cell-${index}`}
                                                    fill={BRANCH_COLORS[entry.oddzial] || COLORS[index % COLORS.length]}
                                                />
                                            ))}
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        {/* Monthly Targets Chart */}
                        <div className="glass-card">
                            <h3 style={{ marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <Target size={20} color="var(--accent-pink)" />
                                Plan vs Wykonanie {selectedYear}
                            </h3>
                            <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: '1.5rem' }}>
                                Cele miesięczne wszystkich oddziałów
                            </p>
                            <div style={{ height: '400px', width: '100%' }}>
                                <ResponsiveContainer width="100%" height="100%">
                                    <LineChart data={monthlyTargetsData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                                        <XAxis dataKey="name" stroke="var(--text-muted)" axisLine={false} tickLine={false} />
                                        <YAxis
                                            stroke="var(--text-muted)"
                                            axisLine={false}
                                            tickLine={false}
                                            tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
                                        />
                                        <Tooltip
                                            contentStyle={{
                                                background: 'rgba(15, 23, 42, 0.95)',
                                                border: '1px solid rgba(99, 102, 241, 0.3)',
                                                borderRadius: '12px'
                                            }}
                                            formatter={(value: number | undefined) => [formatCurrency(value || 0)]}
                                        />
                                        <Legend />
                                        <Line
                                            type="monotone"
                                            dataKey="plan"
                                            name="Plan"
                                            stroke="var(--primary)"
                                            strokeWidth={3}
                                            dot={{ fill: 'var(--primary)', strokeWidth: 2 }}
                                            activeDot={{ r: 6, fill: 'var(--primary)' }}
                                        />
                                        <Line
                                            type="monotone"
                                            dataKey="wykonanie"
                                            name="Wykonanie"
                                            stroke="var(--accent-green)"
                                            strokeWidth={3}
                                            dot={{ fill: 'var(--accent-green)', strokeWidth: 2 }}
                                            activeDot={{ r: 6, fill: 'var(--accent-green)' }}
                                        />
                                    </LineChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    </div>

                    {/* Agent Performance Table */}
                    <div className="glass-card">
                        <h3 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <Users size={20} color="var(--accent-blue)" />
                            Szczegółowa wydajność agentów
                            {selectedBranch && (
                                <span style={{
                                    fontSize: '0.875rem',
                                    background: BRANCH_COLORS[selectedBranch] + '30',
                                    color: BRANCH_COLORS[selectedBranch],
                                    padding: '0.25rem 0.75rem',
                                    borderRadius: '9999px',
                                    marginLeft: '0.5rem'
                                }}>
                                    {selectedBranch}
                                </span>
                            )}
                        </h3>
                        <div className="table-container">
                            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                <thead>
                                    <tr style={{ borderBottom: '1px solid var(--border)' }}>
                                        <th style={{ textAlign: 'left', padding: '1rem', color: 'var(--text-muted)', fontWeight: 500 }}>Agent</th>
                                        <th style={{ textAlign: 'left', padding: '1rem', color: 'var(--text-muted)', fontWeight: 500 }}>Oddział</th>
                                        <th style={{ textAlign: 'right', padding: '1rem', color: 'var(--text-muted)', fontWeight: 500 }}>Prowizja</th>
                                        <th style={{ textAlign: 'right', padding: '1rem', color: 'var(--text-muted)', fontWeight: 500 }}>Spotkania</th>
                                        <th style={{ textAlign: 'right', padding: '1rem', color: 'var(--text-muted)', fontWeight: 500 }}>Umowy</th>
                                        <th style={{ textAlign: 'right', padding: '1rem', color: 'var(--text-muted)', fontWeight: 500 }}>Prezentacje</th>
                                        <th style={{ textAlign: 'right', padding: '1rem', color: 'var(--text-muted)', fontWeight: 500 }}>Nieruchomości</th>
                                        {userRole === 'admin' && (
                                            <th style={{ textAlign: 'center', padding: '1rem', color: 'var(--text-muted)', fontWeight: 500, width: '60px' }}>Edytuj</th>
                                        )}
                                    </tr>
                                </thead>
                                <tbody>
                                    {(selectedBranch
                                        ? agentPerformance.filter(a => a.oddzial === selectedBranch)
                                        : agentPerformance
                                    ).slice(0, 20).map((agent, index) => (
                                        <tr
                                            key={agent.id || index}
                                            style={{
                                                borderBottom: '1px solid var(--border)',
                                                transition: 'background 0.2s'
                                            }}
                                            onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(99, 102, 241, 0.05)'}
                                            onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                                        >
                                            <td style={{ padding: '1rem', fontWeight: 600 }}>{agent.agent_name}</td>
                                            <td style={{ padding: '1rem' }}>
                                                <span style={{
                                                    background: BRANCH_COLORS[agent.oddzial] + '30',
                                                    color: BRANCH_COLORS[agent.oddzial],
                                                    padding: '0.25rem 0.5rem',
                                                    borderRadius: '4px',
                                                    fontSize: '0.75rem',
                                                    fontWeight: 600
                                                }}>
                                                    {agent.oddzial}
                                                </span>
                                            </td>
                                            <td style={{ padding: '1rem', textAlign: 'right', fontWeight: 700, color: 'var(--accent-green)' }}>
                                                {formatCurrency(agent.prowizja_netto_kredyt || 0)}
                                            </td>
                                            <td style={{ padding: '1rem', textAlign: 'right' }}>{agent.spotkania_pozyskowe}</td>
                                            <td style={{ padding: '1rem', textAlign: 'right' }}>{agent.nowe_umowy}</td>
                                            <td style={{ padding: '1rem', textAlign: 'right' }}>{agent.prezentacje}</td>
                                            <td style={{ padding: '1rem', textAlign: 'right', fontWeight: 600 }}>{agent.suma_nieruchomosci}</td>
                                            {userRole === 'admin' && (
                                                <td style={{ padding: '1rem', textAlign: 'center' }}>
                                                    <button
                                                        onClick={() => setEditingAgent(agent)}
                                                        className="btn"
                                                        style={{
                                                            padding: '0.4rem',
                                                            background: agent.id ? 'rgba(99, 102, 241, 0.15)' : 'rgba(16, 185, 129, 0.15)',
                                                            border: 'none'
                                                        }}
                                                        title={agent.id ? "Edytuj wydajność" : "Dodaj dane wydajności"}
                                                    >
                                                        <Edit3 size={16} color={agent.id ? "var(--primary)" : "var(--accent-green)"} />
                                                    </button>
                                                </td>
                                            )}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </>
            )}

            {/* Performance Entry Modal */}
            <AnimatePresence>
                {isAddingPerformance && (
                    <PerformanceEntry
                        agents={availableAgents}
                        year={selectedYear}
                        onAdd={handleAddPerformance}
                        onClose={() => setIsAddingPerformance(false)}
                    />
                )}
            </AnimatePresence>

            {/* Target Entry Modal */}
            <AnimatePresence>
                {isEditingTargets && (
                    <TargetEntry
                        year={selectedYear}
                        existingTargets={branchTargetsFromDb}
                        onSave={refreshData}
                        onClose={() => setIsEditingTargets(false)}
                    />
                )}
            </AnimatePresence>

            {/* Agent Edit Modal */}
            <AnimatePresence>
                {editingAgent && (
                    <AgentEditModal
                        agent={editingAgent}
                        onSave={refreshData}
                        onClose={() => setEditingAgent(null)}
                    />
                )}
            </AnimatePresence>
        </div>
    )
}

export default PerformanceView
