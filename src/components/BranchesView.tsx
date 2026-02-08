import { useMemo, useState } from 'react'
import { MapPin } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Sector, Cell } from 'recharts'
import type { Transaction, EffectiveTranche } from '../types'

interface BranchesViewProps {
    transactions: Transaction[]
    getEffectiveTranches?: (txs: Transaction[], startMonth: number, endMonth: number, year: number) => EffectiveTranche[]
    dateRange?: { startMonth: number, endMonth: number, year: number }
}

const COLORS = ['#6366f1', '#ec4899', '#3b82f6'];

// Custom tooltip with modern styling
const CustomBarTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
        return (
            <div style={{
                background: 'rgba(15, 23, 42, 0.95)',
                border: '1px solid rgba(99, 102, 241, 0.3)',
                borderRadius: '12px',
                padding: '1rem',
                boxShadow: '0 10px 40px rgba(0, 0, 0, 0.5)',
                backdropFilter: 'blur(10px)'
            }}>
                <p style={{ fontWeight: 700, marginBottom: '0.5rem', color: '#fff' }}>{label}</p>
                <p style={{ color: 'var(--primary)', fontSize: '1.125rem', fontWeight: 600 }}>
                    {payload[0].value.toLocaleString('pl-PL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} zł
                </p>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginTop: '0.25rem' }}>Wykonanie</p>
            </div>
        );
    }
    return null;
};

// Custom pie sector renderer with hover effect
const createSectorRenderer = (activePieIndex: number, branchStats: any[]) => (props: any) => {
    const { cx, cy, innerRadius, outerRadius, startAngle, endAngle, fill, payload, value, index } = props;
    const isActive = index === activePieIndex;
    const totalVolume = branchStats.reduce((acc, b) => acc + b.volume, 0);
    const percentage = totalVolume > 0 ? ((value / totalVolume) * 100).toFixed(0) : '0';

    if (isActive) {
        return (
            <g>
                <text x={cx} y={cy - 10} textAnchor="middle" fill="#fff" style={{ fontSize: '0.9rem', fontWeight: 700 }}>
                    {payload.name}
                </text>
                <text x={cx} y={cy + 8} textAnchor="middle" fill="#94a3b8" style={{ fontSize: '0.75rem' }}>
                    {(value/1000).toFixed(0)}k zł
                </text>
                <text x={cx} y={cy + 24} textAnchor="middle" fill={COLORS[index % COLORS.length]} style={{ fontSize: '0.75rem', fontWeight: 600 }}>
                    {percentage}%
                </text>
                <Sector
                    cx={cx}
                    cy={cy}
                    innerRadius={innerRadius}
                    outerRadius={outerRadius + 5}
                    startAngle={startAngle}
                    endAngle={endAngle}
                    fill={fill}
                    style={{ filter: `drop-shadow(0 0 8px ${COLORS[index % COLORS.length]}80)`, transition: 'all 0.3s ease' }}
                />
                <Sector
                    cx={cx}
                    cy={cy}
                    startAngle={startAngle}
                    endAngle={endAngle}
                    innerRadius={outerRadius + 9}
                    outerRadius={outerRadius + 12}
                    fill={fill}
                    opacity={0.4}
                />
            </g>
        );
    }

    return (
        <Sector
            cx={cx}
            cy={cy}
            innerRadius={innerRadius}
            outerRadius={outerRadius}
            startAngle={startAngle}
            endAngle={endAngle}
            fill={fill}
            style={{ transition: 'all 0.3s ease' }}
        />
    );
};

const BranchesView = ({ transactions, getEffectiveTranches, dateRange }: BranchesViewProps) => {
    const [activePieIndex, setActivePieIndex] = useState(0);

    const branchStats = useMemo(() => {
        const branches = ['Kraków', 'Warszawa', 'Olsztyn']

        if (getEffectiveTranches && dateRange) {
            return branches.map(name => {
                const branchTxs = transactions.filter(t => t.oddzial === name)
                const tranches = getEffectiveTranches(branchTxs, dateRange.startMonth, dateRange.endMonth, dateRange.year)

                const wykonanie = tranches.reduce((acc, et) => acc + et.wykonanie, 0)
                const commission = tranches.reduce((acc, et) => acc + et.kwota, 0)
                const koszty = tranches.reduce((acc, et) => acc + et.kosztyProporcjonalne, 0)
                const kredyt = tranches.reduce((acc, et) => acc + et.kredytProporcjonalny, 0)
                const volume = branchTxs.reduce((acc, curr) => acc + curr.wartoscNieruchomosci, 0)
                const count = branchTxs.length

                return { name, commission, wykonanie, koszty, kredyt, volume, count }
            })
        }

        return branches.map(name => {
            const branchTransactions = transactions.filter(t => t.oddzial === name)
            const commission = branchTransactions.reduce((acc, curr) => acc + curr.prowizjaNetto, 0)
            const koszty = branchTransactions.reduce((acc, curr) => acc + (curr.koszty || 0), 0)
            const kredyt = branchTransactions.reduce((acc, curr) => acc + (curr.kredyt || 0), 0)
            const wykonanie = commission - koszty + kredyt // prowizja - koszty + kredyt
            const volume = branchTransactions.reduce((acc, curr) => acc + curr.wartoscNieruchomosci, 0)
            const count = branchTransactions.length
            return { name, commission, wykonanie, koszty, kredyt, volume, count }
        })
    }, [transactions, getEffectiveTranches, dateRange])

    // Prepare pie data with fills
    const pieData = useMemo(() => {
        return branchStats.map((stat, index) => ({
            ...stat,
            fill: COLORS[index % COLORS.length]
        }))
    }, [branchStats])

    const formatCurrency = (val: number | undefined) => {
        if (val === undefined) return '0.00'
        return val.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    }

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div className="dashboard-grid" style={{ gap: '1.25rem' }}>
                {branchStats.map((branch, i) => (
                    <div key={branch.name} className="glass-card" style={{ padding: '1.25rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', marginBottom: '1rem' }}>
                            <div style={{
                                width: '36px', height: '36px', borderRadius: '10px',
                                background: COLORS[i], display: 'flex', alignItems: 'center', justifyContent: 'center',
                                marginRight: '0.875rem'
                            }}>
                                <MapPin size={18} color="white" />
                            </div>
                            <div>
                                <h3 style={{ fontSize: '1.1rem', fontWeight: 600 }}>{branch.name}</h3>
                                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{branch.count} transakcji</p>
                            </div>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.875rem' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                <span style={{ color: 'var(--text-muted)' }}>Wykonanie</span>
                                <span style={{ fontWeight: 700, color: 'var(--primary)' }}>{formatCurrency(branch.wykonanie)}</span>
                            </div>
                            <div style={{ height: '3px', background: 'rgba(255,255,255,0.05)', borderRadius: '2px' }}>
                                <div style={{
                                    height: '100%',
                                    width: `${(branch.wykonanie / Math.max(...branchStats.map(s => s.wykonanie), 1)) * 100}%`,
                                    background: COLORS[i],
                                    borderRadius: '2px'
                                }} />
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                <span style={{ color: 'var(--text-muted)' }}>Prowizja</span>
                                <span style={{ fontWeight: 600 }}>{formatCurrency(branch.commission)}</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                <span style={{ color: 'var(--text-muted)' }}>Koszty</span>
                                <span style={{ color: branch.koszty > 0 ? 'var(--accent-pink)' : 'var(--text-muted)' }}>
                                    {branch.koszty > 0 ? `-${formatCurrency(branch.koszty)}` : '-'}
                                </span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                <span style={{ color: 'var(--text-muted)' }}>Kredyt</span>
                                <span style={{ color: branch.kredyt > 0 ? 'var(--accent-blue)' : 'var(--text-muted)' }}>
                                    {branch.kredyt > 0 ? formatCurrency(branch.kredyt) : '-'}
                                </span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                <span style={{ color: 'var(--text-muted)' }}>Obrót</span>
                                <span style={{ fontWeight: 600 }}>{(branch.volume / 1000).toFixed(0)}k</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                <span style={{ color: 'var(--text-muted)' }}>Stawka</span>
                                <span style={{ color: 'var(--accent-green)', fontWeight: 600 }}>
                                    {branch.volume > 0 ? ((branch.commission / branch.volume) * 100).toFixed(1) : '0'}%
                                </span>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            <div className="grid-cols-1-5-1" style={{ gap: '1.25rem' }}>
                <div className="glass-card" style={{ padding: '1.25rem' }}>
                    <h3 style={{ marginBottom: '1rem', fontSize: '1rem' }}>Porównanie Wykonania</h3>
                    <div style={{ height: '260px', width: '100%' }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={branchStats} margin={{ top: 10, right: 15, left: 0, bottom: 5 }}>
                                <defs>
                                    {COLORS.map((color, index) => (
                                        <linearGradient key={`gradient-${index}`} id={`barGradient-${index}`} x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="0%" stopColor={color} stopOpacity={1} />
                                            <stop offset="100%" stopColor={color} stopOpacity={0.6} />
                                        </linearGradient>
                                    ))}
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                                <XAxis dataKey="name" stroke="var(--text-muted)" axisLine={false} tickLine={false} fontSize={13} />
                                <YAxis
                                    width={75}
                                    stroke="var(--text-muted)"
                                    axisLine={false}
                                    tickLine={false}
                                    fontSize={12}
                                    tickFormatter={(v) => `${(v/1000).toFixed(0)}k`}
                                />
                                <Tooltip
                                    content={<CustomBarTooltip />}
                                    cursor={{ fill: 'rgba(99, 102, 241, 0.1)', radius: 8 }}
                                />
                                <Bar
                                    dataKey="wykonanie"
                                    name="Wykonanie"
                                    radius={[6, 6, 0, 0]}
                                    barSize={50}
                                    animationDuration={800}
                                    animationEasing="ease-out"
                                >
                                    {branchStats.map((_, index) => (
                                        <Cell
                                            key={`bar-${index}`}
                                            fill={`url(#barGradient-${index})`}
                                        />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div className="glass-card" style={{ padding: '1.25rem' }}>
                    <h3 style={{ marginBottom: '0.75rem', fontSize: '1rem' }}>Udział w Rynku</h3>
                    <div style={{ height: '215px', width: '100%' }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
                                <defs>
                                    {COLORS.map((color, index) => (
                                        <linearGradient key={`pieGradient-${index}`} id={`pieGradient-${index}`} x1="0" y1="0" x2="1" y2="1">
                                            <stop offset="0%" stopColor={color} stopOpacity={1} />
                                            <stop offset="100%" stopColor={color} stopOpacity={0.7} />
                                        </linearGradient>
                                    ))}
                                </defs>
                                <Pie
                                    data={pieData}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={42}
                                    outerRadius={72}
                                    paddingAngle={4}
                                    dataKey="volume"
                                    onMouseEnter={(_, index) => setActivePieIndex(index)}
                                    animationDuration={800}
                                    animationEasing="ease-out"
                                    shape={createSectorRenderer(activePieIndex, branchStats)}
                                />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                        {branchStats.map((branch, i) => {
                            const totalVolume = branchStats.reduce((acc, b) => acc + b.volume, 0);
                            const percentage = totalVolume > 0 ? ((branch.volume / totalVolume) * 100).toFixed(0) : '0';
                            return (
                                <div
                                    key={branch.name}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '0.4rem',
                                        cursor: 'pointer',
                                        padding: '0.4rem 0.6rem',
                                        borderRadius: '6px',
                                        background: activePieIndex === i ? 'rgba(99, 102, 241, 0.15)' : 'transparent',
                                        border: activePieIndex === i ? '1px solid rgba(99, 102, 241, 0.3)' : '1px solid transparent',
                                        transition: 'all 0.2s ease'
                                    }}
                                    onMouseEnter={() => setActivePieIndex(i)}
                                >
                                    <div style={{
                                        width: '11px',
                                        height: '11px',
                                        borderRadius: '3px',
                                        background: COLORS[i],
                                        boxShadow: activePieIndex === i ? `0 0 6px ${COLORS[i]}` : 'none',
                                        transition: 'box-shadow 0.2s ease'
                                    }} />
                                    <span style={{ fontSize: '0.8rem', fontWeight: activePieIndex === i ? 600 : 400 }}>
                                        {branch.name}
                                    </span>
                                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                        {percentage}%
                                    </span>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        </div>
    )
}

export default BranchesView
