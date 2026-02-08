import { useMemo } from 'react'
import { Wallet, TrendingUp, Briefcase, Users } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import type { Transaction, EffectiveTranche } from '../types'

interface SummaryViewProps {
    transactions: Transaction[] // filtered by date range + active agents
    allDbTransactions: Transaction[] // all from DB (for previous period comparison)
    dateRange: { startMonth: number, endMonth: number, year: number }
    getEffectiveTranches?: (txs: Transaction[], startMonth: number, endMonth: number, year: number) => EffectiveTranche[]
}

const SummaryView = ({ transactions, allDbTransactions, dateRange, getEffectiveTranches }: SummaryViewProps) => {
    const stats = useMemo(() => {
        // Use tranches if available
        const effectiveTranches = getEffectiveTranches
            ? getEffectiveTranches(transactions, dateRange.startMonth, dateRange.endMonth, dateRange.year)
            : null

        // Transaction-based stats (totalSales, transactionCount stay transaction-based)
        const totalSales = transactions.reduce((acc, curr) => acc + curr.wartoscNieruchomosci, 0)
        const transactionCount = transactions.length

        let totalWykonanie: number
        let totalCommission: number
        let totalKoszty: number
        let totalKredyt: number
        let zrealizowane: number
        let prognozaWazona: number

        if (effectiveTranches) {
            // Tranche-based
            totalCommission = effectiveTranches.reduce((acc, et) => acc + et.kwota, 0)
            totalKoszty = effectiveTranches.reduce((acc, et) => acc + et.kosztyProporcjonalne, 0)
            totalKredyt = effectiveTranches.reduce((acc, et) => acc + et.kredytProporcjonalny, 0)
            totalWykonanie = effectiveTranches.reduce((acc, et) => acc + et.wykonanie, 0)
            zrealizowane = effectiveTranches
                .filter(et => et.status === 'zrealizowana')
                .reduce((acc, et) => acc + et.wykonanie, 0)
            prognozaWazona = effectiveTranches
                .filter(et => et.status === 'prognoza')
                .reduce((acc, et) => acc + et.wykonanie, 0)
        } else {
            // Fallback: transaction-based
            const calcWykonanie = (t: Transaction) => (t.prowizjaNetto || 0) - (t.koszty || 0) + (t.kredyt || 0)
            totalCommission = transactions.reduce((acc, curr) => acc + curr.prowizjaNetto, 0)
            totalKoszty = transactions.reduce((acc, curr) => acc + (curr.koszty || 0), 0)
            totalKredyt = transactions.reduce((acc, curr) => acc + (curr.kredyt || 0), 0)
            totalWykonanie = transactions.reduce((acc, curr) => acc + calcWykonanie(curr), 0)
            zrealizowane = totalWykonanie
            prognozaWazona = 0
        }

        const avgCommission = totalWykonanie / (transactionCount || 1)
        const avgCommissionPct = totalSales > 0 ? (totalCommission / totalSales) * 100 : 0

        // Previous period calculation
        const duration = dateRange.endMonth - dateRange.startMonth + 1;
        let prevStartMonth = dateRange.startMonth - duration;
        let prevEndMonth = dateRange.endMonth - duration;
        let prevYear = dateRange.year;

        if (prevStartMonth < 1) {
            prevYear -= 1;
            prevStartMonth += 12;
        }
        if (prevEndMonth < 1) {
            prevEndMonth += 12;
        }

        const prevPeriodTransactions = allDbTransactions.filter(t =>
            t.rok === prevYear &&
            t.miesiac >= prevStartMonth &&
            t.miesiac <= prevEndMonth
        );

        let prevWykonanie: number
        if (getEffectiveTranches) {
            const prevTranches = getEffectiveTranches(prevPeriodTransactions, prevStartMonth, prevEndMonth, prevYear)
            prevWykonanie = prevTranches.reduce((acc, et) => acc + et.wykonanie, 0)
        } else {
            prevWykonanie = prevPeriodTransactions.reduce((acc, curr) => acc + (curr.prowizjaNetto || 0) - (curr.koszty || 0) + (curr.kredyt || 0), 0)
        }

        const prevSales = prevPeriodTransactions.reduce((acc, curr) => acc + curr.wartoscNieruchomosci, 0)
        const prevCount = prevPeriodTransactions.length

        const getTrend = (current: number, previous: number) => {
            if (previous === 0) return current > 0 ? `+100%` : '0%';
            const change = ((current - previous) / previous) * 100;
            return `${change >= 0 ? '+' : ''}${change.toFixed(1)}%`;
        };

        const getCountTrend = (current: number, previous: number) => {
            const diff = current - previous;
            return `${diff >= 0 ? '+' : ''}${diff}`;
        };

        return {
            totalSales, totalCommission, totalWykonanie, totalKoszty, totalKredyt,
            transactionCount, avgCommission, avgCommissionPct,
            zrealizowane, prognozaWazona,
            trends: {
                sales: getTrend(totalSales, prevSales),
                wykonanie: getTrend(totalWykonanie, prevWykonanie),
                count: getCountTrend(transactionCount, prevCount)
            }
        }
    }, [transactions, allDbTransactions, dateRange, getEffectiveTranches])

    const branchData = useMemo(() => {
        const branches = ['Kraków', 'Warszawa', 'Olsztyn']

        if (getEffectiveTranches) {
            return branches.map(name => {
                const branchTxs = transactions.filter(t => t.oddzial === name)
                const tranches = getEffectiveTranches(branchTxs, dateRange.startMonth, dateRange.endMonth, dateRange.year)
                return {
                    name,
                    value: tranches.reduce((acc, et) => acc + et.wykonanie, 0)
                }
            })
        }

        return branches.map(name => ({
            name,
            value: transactions.filter(t => t.oddzial === name).reduce((acc, curr) => {
                const prowizja = curr.prowizjaNetto || 0
                const koszty = curr.koszty || 0
                const kredyt = curr.kredyt || 0
                return acc + (prowizja - koszty + kredyt)
            }, 0)
        }))
    }, [transactions, dateRange, getEffectiveTranches])

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
                    trend={stats.trends.sales}
                    icon={<Wallet size={20} color="var(--primary)" />}
                    trendLabel="vs poprzedni okres"
                />
                <StatCard
                    title="Wykonanie"
                    value={`${formatCurrency(stats.totalWykonanie)} PLN`}
                    trend={stats.trends.wykonanie}
                    icon={<TrendingUp size={20} color="var(--accent-pink)" />}
                    trendLabel="prowizja - koszty + kredyt"
                    subtitle={stats.prognozaWazona > 0 ? `Zrealiz.: ${formatCurrency(stats.zrealizowane)} / Prognoza: ${formatCurrency(stats.prognozaWazona)}` : undefined}
                />
                <StatCard
                    title="Liczba Transakcji"
                    value={stats.transactionCount.toString()}
                    trend={stats.trends.count}
                    icon={<Briefcase size={20} color="var(--accent-blue)" />}
                    trendLabel="vs poprzedni okres"
                />
                <StatCard
                    title="Średnie Wykonanie"
                    value={`${formatCurrency(stats.avgCommission)} PLN`}
                    trend={`${stats.avgCommissionPct.toFixed(2)}%`}
                    icon={<Users size={20} color="var(--accent-green)" />}
                    trendLabel="śr. stawka prowizji"
                />
            </div>

            <div className="grid-cols-2-1" style={{ marginTop: '2.5rem' }}>
                <div className="glass-card">
                    <h3 style={{ marginBottom: '2rem' }}>Wykonanie wg Oddziałów</h3>
                    <div style={{ height: '300px', width: '100%' }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={branchData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                                <defs>
                                    <linearGradient id="summaryBarGradient" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="0%" stopColor="var(--primary)" stopOpacity={1} />
                                        <stop offset="100%" stopColor="var(--primary)" stopOpacity={0.6} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                                <XAxis dataKey="name" stroke="var(--text-muted)" axisLine={false} tickLine={false} />
                                <YAxis
                                    width={100}
                                    stroke="var(--text-muted)"
                                    axisLine={false}
                                    tickLine={false}
                                    tickFormatter={(v) => `${v.toLocaleString('pl-PL')} zł`}
                                />
                                <Tooltip
                                    contentStyle={{
                                        background: 'rgba(15, 23, 42, 0.95)',
                                        border: '1px solid rgba(99, 102, 241, 0.3)',
                                        borderRadius: '12px',
                                        boxShadow: '0 10px 40px rgba(0, 0, 0, 0.5)',
                                        backdropFilter: 'blur(10px)'
                                    }}
                                    itemStyle={{ color: 'var(--primary)', fontWeight: 600 }}
                                    labelStyle={{ color: 'white', fontWeight: 700, marginBottom: '0.5rem' }}
                                    formatter={(value: number | undefined) => [`${formatCurrency(value)} zł`, 'Wykonanie']}
                                    cursor={{ fill: 'rgba(99, 102, 241, 0.1)', radius: 8 }}
                                />
                                <Bar
                                    dataKey="value"
                                    fill="url(#summaryBarGradient)"
                                    radius={[8, 8, 0, 0]}
                                    barSize={40}
                                    animationDuration={800}
                                    animationEasing="ease-out"
                                    style={{ filter: 'drop-shadow(0 4px 8px rgba(0, 0, 0, 0.3))' }}
                                />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div className="glass-card">
                    <h3 style={{ marginBottom: '2rem' }}>Ostatnie Transakcje</h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                        {transactions.length > 0 ? (
                            transactions.slice(0, 5).map((t, i) => {
                                const initials = t.agent
                                    ? t.agent.split(' ').filter(n => n.length > 0).map(n => n[0]).join('').toUpperCase()
                                    : '?';
                                const wykonanie = (t.prowizjaNetto || 0) - (t.koszty || 0) + (t.kredyt || 0)
                                return (
                                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <div style={{ display: 'flex', alignItems: 'center' }}>
                                            <div style={{
                                                width: '40px', height: '40px', borderRadius: '50%',
                                                background: 'linear-gradient(135deg, var(--primary), var(--accent-blue))',
                                                marginRight: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                fontWeight: 700, fontSize: '0.875rem'
                                            }}>
                                                {initials}
                                            </div>
                                            <div>
                                                <p style={{ fontWeight: 600 }}>{t.agent}</p>
                                                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{t.oddzial} • {t.typNieruchomosci}</p>
                                            </div>
                                        </div>
                                        <p style={{ fontWeight: 700, color: 'var(--accent-green)' }}>{formatCurrency(wykonanie)} zł</p>
                                    </div>
                                );
                            })
                        ) : (
                            <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '2rem' }}>
                                Brak transakcji w wybranym okresie
                            </p>
                        )}
                    </div>
                </div>
            </div>
        </>
    )
}

const StatCard = ({ title, value, trend, icon, trendLabel = 'vs ostatni miesiąc', subtitle }: { title: string, value: string, trend: string, icon: React.ReactNode, trendLabel?: string, subtitle?: string }) => (
    <div className="glass-card" style={{ position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: '1.5rem', right: '1.5rem', opacity: 0.8 }}>
            {icon}
        </div>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: '0.75rem' }}>{title}</p>
        <h3 style={{ fontSize: '1.75rem', marginBottom: '0.75rem', fontWeight: 700, whiteSpace: 'nowrap' }}>{value}</h3>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{
                color: trend.startsWith('+') || !trend.includes('-') ? 'var(--accent-green)' : 'var(--accent-pink)',
                background: trend.startsWith('+') || !trend.includes('-') ? 'rgba(16, 185, 129, 0.1)' : 'rgba(236, 72, 153, 0.1)',
                padding: '0.25rem 0.5rem',
                borderRadius: '0.5rem',
                fontSize: '0.75rem',
                fontWeight: 700
            }}>
                {trend}
            </span>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{trendLabel}</span>
        </div>
        {subtitle && (
            <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>{subtitle}</p>
        )}
    </div>
)

export default SummaryView
