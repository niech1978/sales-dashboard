import { useMemo } from 'react'
import { Wallet, TrendingUp, Briefcase, Users } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import type { Transaction } from '../types'

interface SummaryViewProps {
    transactions: Transaction[]
}

const SummaryView = ({ transactions }: SummaryViewProps) => {
    const stats = useMemo(() => {
        const totalSales = transactions.reduce((acc, curr) => acc + curr.wartoscNieruchomosci, 0)
        const totalCommission = transactions.reduce((acc, curr) => acc + curr.prowizjaNetto, 0)
        const transactionCount = transactions.length
        const avgCommission = totalCommission / (transactionCount || 1)

        return { totalSales, totalCommission, transactionCount, avgCommission }
    }, [transactions])

    const branchData = useMemo(() => {
        const branches = ['Kraków', 'Warszawa', 'Olsztyn']
        return branches.map(name => ({
            name,
            value: transactions.filter(t => t.oddzial === name).reduce((acc, curr) => acc + curr.prowizjaNetto, 0)
        }))
    }, [transactions])

    const formatCurrency = (val: number | undefined) => {
        if (val === undefined) return '0.00'
        return val.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    }

    return (
        <>
            <div className="dashboard-grid">
                <StatCard
                    title="Suma Sprzedaży"
                    value={`${stats.totalSales.toLocaleString()} PLN`}
                    trend="+12.5%"
                    icon={<Wallet size={20} color="var(--primary)" />}
                />
                <StatCard
                    title="Suma Prowizji"
                    value={`${formatCurrency(stats.totalCommission)} PLN`}
                    trend="+8.2%"
                    icon={<TrendingUp size={20} color="var(--accent-pink)" />}
                />
                <StatCard
                    title="Liczba Transakcji"
                    value={stats.transactionCount.toString()}
                    trend="+4"
                    icon={<Briefcase size={20} color="var(--accent-blue)" />}
                />
                <StatCard
                    title="Średnia Prowizja"
                    value={`${formatCurrency(stats.avgCommission)} PLN`}
                    trend="+2.1%"
                    icon={<Users size={20} color="var(--accent-green)" />}
                />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1.5rem', marginTop: '2.5rem' }}>
                <div className="glass-card">
                    <h3 style={{ marginBottom: '2rem' }}>Prowizja wg Oddziałów</h3>
                    <div style={{ height: '300px', width: '100%' }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={branchData}>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                                <XAxis dataKey="name" stroke="var(--text-muted)" axisLine={false} tickLine={false} />
                                <YAxis
                                    stroke="var(--text-muted)"
                                    axisLine={false}
                                    tickLine={false}
                                    tickFormatter={(v) => `${(v / 1000).toFixed(1)}k`}
                                />
                                <Tooltip
                                    contentStyle={{ background: 'var(--bg-dark)', borderColor: 'var(--border)', borderRadius: '12px' }}
                                    itemStyle={{ color: 'white' }}
                                    formatter={(value: number | undefined) => [`${formatCurrency(value)} zł`, 'Prowizja']}
                                />
                                <Bar dataKey="value" fill="var(--primary)" radius={[6, 6, 0, 0]} barSize={40} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div className="glass-card">
                    <h3 style={{ marginBottom: '2rem' }}>Ostatnie Transakcje</h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                        {transactions.slice(-5).reverse().map((t, i) => (
                            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div style={{ display: 'flex', alignItems: 'center' }}>
                                    <div style={{
                                        width: '40px', height: '40px', borderRadius: '50%',
                                        background: 'linear-gradient(135deg, var(--primary), var(--accent-blue))',
                                        marginRight: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        fontWeight: 700, fontSize: '0.875rem'
                                    }}>
                                        {t.agent.split(' ').map(n => n[0]).join('')}
                                    </div>
                                    <div>
                                        <p style={{ fontWeight: 600 }}>{t.agent}</p>
                                        <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{t.oddzial} • {t.typNieruchomosci}</p>
                                    </div>
                                </div>
                                <p style={{ fontWeight: 700, color: 'var(--accent-green)' }}>{formatCurrency(t.prowizjaNetto)} zł</p>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </>
    )
}

const StatCard = ({ title, value, trend, icon }: { title: string, value: string, trend: string, icon: React.ReactNode }) => (
    <div className="glass-card" style={{ position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: '1.5rem', right: '1.5rem', opacity: 0.8 }}>
            {icon}
        </div>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: '0.75rem' }}>{title}</p>
        <h3 style={{ fontSize: '1.75rem', marginBottom: '0.75rem', fontWeight: 700, whiteSpace: 'nowrap' }}>{value}</h3>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{
                color: trend.startsWith('+') ? 'var(--accent-green)' : 'var(--accent-pink)',
                background: trend.startsWith('+') ? 'rgba(16, 185, 129, 0.1)' : 'rgba(236, 72, 153, 0.1)',
                padding: '0.25rem 0.5rem',
                borderRadius: '0.5rem',
                fontSize: '0.75rem',
                fontWeight: 700
            }}>
                {trend}
            </span>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>vs ostatni miesiąc</span>
        </div>
    </div>
)

export default SummaryView
