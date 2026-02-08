import { useMemo, useState } from 'react'
import { Search, Filter, UserPlus, Power, PowerOff } from 'lucide-react'
import { useWindowWidth } from '../hooks/useWindowWidth'
import type { Transaction, Agent, EffectiveTranche } from '../types'

interface AgentsViewProps {
    transactions: Transaction[]
    agents: Agent[]
    onAddAgent: () => void
    onToggleStatus: (id: string) => void
    getEffectiveTranches?: (txs: Transaction[], startMonth: number, endMonth: number, year: number) => EffectiveTranche[]
    dateRange?: { startMonth: number, endMonth: number, year: number }
    userRole?: string
}

const AgentsView = ({ transactions, agents, onAddAgent, onToggleStatus, getEffectiveTranches, dateRange, userRole = 'agent' }: AgentsViewProps) => {
    const [searchTerm, setSearchTerm] = useState('')
    const [selectedBranch, setSelectedBranch] = useState('all')
    const windowWidth = useWindowWidth()

    const agentStats = useMemo(() => {
        const statsMap: Record<string, { wykonanie: number, count: number }> = {}

        if (getEffectiveTranches && dateRange) {
            const tranches = getEffectiveTranches(transactions, dateRange.startMonth, dateRange.endMonth, dateRange.year)
            const txIds = new Set<string>()
            tranches.forEach(et => {
                if (!statsMap[et.transaction.agent]) {
                    statsMap[et.transaction.agent] = { wykonanie: 0, count: 0 }
                }
                statsMap[et.transaction.agent].wykonanie += et.wykonanie
                if (!txIds.has(et.transactionId)) {
                    txIds.add(et.transactionId)
                    statsMap[et.transaction.agent].count += 1
                }
            })
        } else {
            transactions.forEach(t => {
                if (!statsMap[t.agent]) {
                    statsMap[t.agent] = { wykonanie: 0, count: 0 }
                }
                statsMap[t.agent].wykonanie += (t.prowizjaNetto || 0) - (t.koszty || 0) + (t.kredyt || 0)
                statsMap[t.agent].count += 1
            })
        }

        return agents.map(agent => ({
            ...agent,
            totalComm: statsMap[agent.name]?.wykonanie || 0,
            count: statsMap[agent.name]?.count || 0
        }))
            .filter(a => (selectedBranch === 'all' || a.oddzial === selectedBranch))
            .filter(a => a.name.toLowerCase().includes(searchTerm.toLowerCase()))
            .sort((a, b) => b.totalComm - a.totalComm)
    }, [transactions, agents, searchTerm, selectedBranch, getEffectiveTranches, dateRange])

    const formatCurrency = (val: number) =>
        val.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h2 style={{ fontSize: '1.5rem', fontWeight: 700 }}>Baza Agentów</h2>
                {(userRole === 'admin' || userRole === 'superadmin' || userRole === 'manager') && (
                    <button className="btn btn-primary" onClick={onAddAgent}>
                        <UserPlus size={18} style={{ marginRight: '0.5rem' }} />
                        Dodaj Agenta
                    </button>
                )}
            </div>

            <div className="glass-card" style={{ display: 'flex', gap: '1.5rem', alignItems: 'center', padding: '1.5rem 2rem', flexWrap: 'wrap' }}>
                <div style={{ position: 'relative', flex: 1 }}>
                    <Search size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                    <input
                        type="text"
                        className="input-field"
                        placeholder="Szukaj agenta..."
                        style={{ paddingLeft: '3rem', margin: 0 }}
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                    />
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', width: windowWidth <= 768 ? '100%' : 'auto' }}>
                    <Filter size={18} style={{ color: 'var(--text-muted)' }} />
                    <select
                        className="input-field"
                        style={{ width: windowWidth <= 768 ? '100%' : '200px', margin: 0 }}
                        value={selectedBranch}
                        onChange={e => setSelectedBranch(e.target.value)}
                    >
                        <option value="all">Wszystkie Oddziały</option>
                        <option value="Kraków">Kraków</option>
                        <option value="Warszawa">Warszawa</option>
                        <option value="Olsztyn">Olsztyn</option>
                    </select>
                </div>
            </div>

            <div className="glass-card table-container" style={{ padding: 0 }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '600px' }}>
                    <thead>
                        <tr style={{ background: 'rgba(255,255,255,0.02)', borderBottom: '1px solid var(--border)' }}>
                            <th style={{ padding: '1.5rem 2rem', fontWeight: 600 }}>Ranking</th>
                            <th style={{ padding: '1.5rem 2rem', fontWeight: 600 }}>Agent</th>
                            <th style={{ padding: '1.5rem 2rem', fontWeight: 600 }}>Oddział</th>
                            <th style={{ padding: '1.5rem 2rem', fontWeight: 600 }}>Status</th>
                            <th style={{ padding: '1.5rem 2rem', fontWeight: 600, textAlign: 'right' }}>Wykonanie</th>
                            {(userRole === 'admin' || userRole === 'superadmin' || userRole === 'manager') && (
                                <th style={{ padding: '1.5rem 2rem', fontWeight: 600, textAlign: 'center' }}>Akcje</th>
                            )}
                        </tr>
                    </thead>
                    <tbody>
                        {agentStats.map((agent, i) => (
                            <tr key={agent.id} style={{
                                borderBottom: '1px solid var(--border)',
                                transition: 'all 0.2s',
                                opacity: agent.status === 'nieaktywny' ? 0.5 : 1,
                                background: agent.status === 'nieaktywny' ? 'rgba(0,0,0,0.1)' : 'transparent'
                            }} className="table-row-hover">
                                <td style={{ padding: '1.5rem 2rem' }}>
                                    <div style={{
                                        width: '32px', height: '32px', borderRadius: '8px',
                                        background: i < 3 && agent.status === 'aktywny' ? 'rgba(245, 158, 11, 0.1)' : 'rgba(255,255,255,0.05)',
                                        color: i < 3 && agent.status === 'aktywny' ? '#f59e0b' : 'var(--text-muted)',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700
                                    }}>
                                        {i + 1}
                                    </div>
                                </td>
                                <td style={{ padding: '1.5rem 2rem' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                        <div style={{
                                            width: '40px', height: '40px', borderRadius: '50%', background: agent.status === 'aktywny' ? 'var(--primary)' : 'var(--bg-card)',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '0.875rem'
                                        }}>
                                            {agent.name.split(' ').map(n => n[0]).join('')}
                                        </div>
                                        <div>
                                            <span style={{ fontWeight: 600 }}>{agent.name}</span>
                                            {agent.email && <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{agent.email}</p>}
                                        </div>
                                    </div>
                                </td>
                                <td style={{ padding: '1.5rem 2rem', color: 'var(--text-muted)' }}>{agent.oddzial}</td>
                                <td style={{ padding: '1.5rem 2rem' }}>
                                    <span style={{
                                        padding: '0.25rem 0.75rem',
                                        borderRadius: '1rem',
                                        fontSize: '0.75rem',
                                        fontWeight: 700,
                                        background: agent.status === 'aktywny' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(236, 72, 153, 0.1)',
                                        color: agent.status === 'aktywny' ? 'var(--accent-green)' : 'var(--accent-pink)'
                                    }}>
                                        {agent.status.toUpperCase()}
                                    </span>
                                </td>
                                <td style={{ padding: '1.5rem 2rem', textAlign: 'right', fontWeight: 700, color: agent.status === 'aktywny' ? 'var(--accent-green)' : 'var(--text-muted)' }}>
                                    {formatCurrency(agent.totalComm)} zł
                                </td>
                                {(userRole === 'admin' || userRole === 'superadmin' || userRole === 'manager') && (
                                    <td style={{ padding: '1.5rem 2rem', textAlign: 'center' }}>
                                        <button
                                            onClick={() => onToggleStatus(agent.id)}
                                            className="btn"
                                            title={agent.status === 'aktywny' ? 'Deaktywuj' : 'Aktywuj'}
                                            style={{
                                                padding: '0.5rem',
                                                background: 'transparent',
                                                color: agent.status === 'aktywny' ? 'var(--accent-pink)' : 'var(--accent-green)'
                                            }}
                                        >
                                            {agent.status === 'aktywny' ? <PowerOff size={18} /> : <Power size={18} />}
                                        </button>
                                    </td>
                                )}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    )
}

export default AgentsView
