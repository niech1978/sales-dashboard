import { useMemo, useState } from 'react'
import { Trophy, Target, Users, TrendingUp, Calendar, Building2, PlusCircle } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, LineChart, Line, Legend } from 'recharts'
import { AnimatePresence } from 'framer-motion'
import { usePerformanceData } from '../hooks/usePerformanceData'
import PerformanceEntry from './PerformanceEntry'
import type { AgentPerformance } from '../types'

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
}

const PerformanceView = ({ year: initialYear = 2025, agents = [], userRole = 'agent' }: PerformanceViewProps) => {
    const [selectedYear, setSelectedYear] = useState(initialYear)
    const [isAddingPerformance, setIsAddingPerformance] = useState(false)

    const {
        agentPerformance,
        branchPerformance,
        topAgents,
        monthlyTargetsData,
        loading,
        refreshData
    } = usePerformanceData(selectedYear)

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

            {agentPerformance.length === 0 ? (
                <div className="glass-card" style={{ textAlign: 'center', padding: '3rem' }}>
                    <Target size={48} color="var(--text-muted)" style={{ marginBottom: '1rem' }} />
                    <h3 style={{ marginBottom: '0.5rem' }}>Brak danych wydajności za {selectedYear}</h3>
                    <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
                        Nie ma jeszcze danych dla tego roku.
                    </p>
                    {userRole === 'admin' && (
                        <button
                            className="btn btn-primary"
                            onClick={() => setIsAddingPerformance(true)}
                        >
                            <PlusCircle size={18} style={{ marginRight: '0.5rem' }} />
                            Dodaj pierwsze dane
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
        </div>
    )
}

export default PerformanceView
