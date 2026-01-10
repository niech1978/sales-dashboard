import { useMemo } from 'react'
import { MapPin } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'
import type { Transaction } from '../types'

interface BranchesViewProps {
    transactions: Transaction[]
}

const COLORS = ['#6366f1', '#ec4899', '#3b82f6'];

const BranchesView = ({ transactions }: BranchesViewProps) => {
    const branchStats = useMemo(() => {
        const branches = ['Kraków', 'Warszawa', 'Olsztyn']
        return branches.map(name => {
            const branchTransactions = transactions.filter(t => t.oddzial === name)
            const commission = branchTransactions.reduce((acc, curr) => acc + curr.prowizjaNetto, 0)
            const volume = branchTransactions.reduce((acc, curr) => acc + curr.wartoscNieruchomosci, 0)
            const count = branchTransactions.length
            return { name, commission, volume, count }
        })
    }, [transactions])

    const formatCurrency = (val: number | undefined) => {
        if (val === undefined) return '0.00'
        return val.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    }

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            <div className="dashboard-grid">
                {branchStats.map((branch, i) => (
                    <div key={branch.name} className="glass-card">
                        <div style={{ display: 'flex', alignItems: 'center', marginBottom: '1.5rem' }}>
                            <div style={{
                                width: '40px', height: '40px', borderRadius: '12px',
                                background: COLORS[i], display: 'flex', alignItems: 'center', justifyContent: 'center',
                                marginRight: '1rem'
                            }}>
                                <MapPin size={20} color="white" />
                            </div>
                            <div>
                                <h3 style={{ fontSize: '1.25rem' }}>{branch.name}</h3>
                                <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>{branch.count} Transakcji</p>
                            </div>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                <span style={{ color: 'var(--text-muted)' }}>Prowizja</span>
                                <span style={{ fontWeight: 700 }}>{formatCurrency(branch.commission)} zł</span>
                            </div>
                            <div style={{ height: '4px', background: 'rgba(255,255,255,0.05)', borderRadius: '2px' }}>
                                <div style={{
                                    height: '100%',
                                    width: `${(branch.commission / Math.max(...branchStats.map(s => s.commission))) * 100}%`,
                                    background: COLORS[i],
                                    borderRadius: '2px'
                                }} />
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                <span style={{ color: 'var(--text-muted)' }}>Obrót</span>
                                <span style={{ fontWeight: 700 }}>{branch.volume.toLocaleString()} zł</span>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '1.5rem' }}>
                <div className="glass-card">
                    <h3 style={{ marginBottom: '2rem' }}>Porównanie Prowizji</h3>
                    <div style={{ height: '350px', width: '100%' }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={branchStats}>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                                <XAxis dataKey="name" stroke="var(--text-muted)" axisLine={false} tickLine={false} />
                                <YAxis stroke="var(--text-muted)" axisLine={false} tickLine={false} tickFormatter={(v) => `${(v / 1000).toFixed(1)}k`} />
                                <Tooltip
                                    contentStyle={{ background: 'var(--bg-dark)', borderColor: 'var(--border)', borderRadius: '12px' }}
                                    itemStyle={{ color: 'white' }}
                                    formatter={(value: number | undefined) => [`${formatCurrency(value)} zł`, 'Prowizja Netto']}
                                />
                                <Bar dataKey="commission" name="Prowizja Netto" fill="var(--primary)" radius={[6, 6, 0, 0]} barSize={60}>
                                    {branchStats.map((_, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div className="glass-card">
                    <h3 style={{ marginBottom: '2rem' }}>Udział w Rynku</h3>
                    <div style={{ height: '350px', width: '100%' }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={branchStats}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={60}
                                    outerRadius={100}
                                    paddingAngle={5}
                                    dataKey="volume"
                                >
                                    {branchStats.map((_, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip
                                    contentStyle={{ background: 'var(--bg-dark)', borderColor: 'var(--border)', borderRadius: '12px' }}
                                    itemStyle={{ color: 'white' }}
                                    formatter={(value: number | undefined) => [`${(value || 0).toLocaleString()} zł`, 'Obrót']}
                                />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'center', gap: '1.5rem', marginTop: '1rem' }}>
                        {branchStats.map((branch, i) => (
                            <div key={branch.name} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <div style={{ width: '12px', height: '12px', borderRadius: '3px', background: COLORS[i] }} />
                                <span style={{ fontSize: '0.875rem' }}>{branch.name}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    )
}

export default BranchesView
