import { useMemo } from 'react'
import { Download, ArrowUpRight, ArrowDownRight } from 'lucide-react'
import type { Transaction } from '../types'

interface ReportsViewProps {
    transactions: Transaction[]
}

const ReportsView = ({ transactions }: ReportsViewProps) => {
    const monthlyStats = useMemo(() => {
        const months: Record<number, { commission: number, volume: number, count: number }> = {}

        transactions.forEach(t => {
            if (!months[t.miesiac]) {
                months[t.miesiac] = { commission: 0, volume: 0, count: 0 }
            }
            months[t.miesiac].commission += t.prowizjaNetto
            months[t.miesiac].volume += t.wartoscNieruchomosci
            months[t.miesiac].count += 1
        })

        return Object.entries(months).map(([m, stats]) => ({
            month: parseInt(m),
            ...stats
        })).sort((a, b) => a.month - b.month)
    }, [transactions])

    const monthNames = [
        'Styczeń', 'Luty', 'Marzec', 'Kwiecień', 'Maj', 'Czerwiec',
        'Lipiec', 'Sierpień', 'Wrzesień', 'Październik', 'Listopad', 'Grudzień'
    ]

    const formatCurrency = (val: number) =>
        val.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })

    const handleDownloadCSV = () => {
        if (monthlyStats.length === 0) return

        const headers = ['Miesiąc', 'Liczba Transakcji', 'Wartość Nieruchomości', 'Suma Prowizji']
        const rows = monthlyStats.map(m => [
            monthNames[m.month - 1],
            m.count,
            m.volume,
            m.commission
        ])

        const csvContent = [headers, ...rows].map(e => e.join(',')).join('\n')
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
        const link = document.createElement('a')
        const url = URL.createObjectURL(blob)
        link.setAttribute('href', url)
        link.setAttribute('download', `raport_miesieczny_${new Date().getFullYear()}.csv`)
        link.style.visibility = 'hidden'
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
    }


    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                <h2 style={{ fontSize: '1.5rem', fontWeight: 700 }}>Raporty Miesięczne</h2>
                <div style={{ display: 'flex', gap: '1rem', width: window.innerWidth <= 640 ? '100%' : 'auto' }}>
                    <button className="btn btn-primary" style={{ flex: 1 }} onClick={handleDownloadCSV}>
                        <Download size={18} style={{ marginRight: '0.5rem' }} />
                        Pobierz Raport CSV
                    </button>
                </div>
            </div>

            <div className="dashboard-grid">
                {monthlyStats.slice(-4).map((m) => {
                    const prev = monthlyStats[monthlyStats.indexOf(m) - 1]
                    const growth = prev ? ((m.commission - prev.commission) / prev.commission) * 100 : 0

                    return (
                        <div key={m.month} className="glass-card">
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
                                <div>
                                    <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>{monthNames[m.month - 1]}</p>
                                    <h3 style={{ fontSize: '1.5rem', fontWeight: 700 }}>{formatCurrency(m.commission)} zł</h3>
                                </div>
                                <div style={{
                                    color: growth >= 0 ? 'var(--accent-green)' : 'var(--accent-pink)',
                                    display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.875rem'
                                }}>
                                    {growth >= 0 ? <ArrowUpRight size={16} /> : <ArrowDownRight size={16} />}
                                    {Math.abs(growth).toFixed(1)}%
                                </div>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem' }}>
                                    <span style={{ color: 'var(--text-muted)' }}>Transakcje</span>
                                    <span>{m.count}</span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem' }}>
                                    <span style={{ color: 'var(--text-muted)' }}>Śr. Prowizja</span>
                                    <span>{formatCurrency(m.commission / m.count)} zł</span>
                                </div>
                            </div>
                        </div>
                    )
                })}
            </div>

            <div className="glass-card table-container" style={{ padding: 0 }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                        <tr style={{ background: 'rgba(255,255,255,0.02)', borderBottom: '1px solid var(--border)' }}>
                            <th style={{ padding: '1.5rem 2rem', textAlign: 'left' }}>Miesiąc</th>
                            <th style={{ padding: '1.5rem 2rem', textAlign: 'right' }}>Liczba Transakcji</th>
                            <th style={{ padding: '1.5rem 2rem', textAlign: 'right' }}>Wartość Nieruchomości</th>
                            <th style={{ padding: '1.5rem 2rem', textAlign: 'right' }}>Suma Prowizji</th>
                            <th style={{ padding: '1.5rem 2rem', textAlign: 'right' }}>Śr. Prowizja %</th>
                            <th className="no-print" style={{ padding: '1.5rem 2rem', textAlign: 'center' }}>Akcje</th>
                        </tr>
                    </thead>
                    <tbody>
                        {monthlyStats.map(m => (
                            <tr key={m.month} style={{ borderBottom: '1px solid var(--border)' }}>
                                <td style={{ padding: '1.5rem 2rem', fontWeight: 600 }}>{monthNames[m.month - 1]}</td>
                                <td style={{ padding: '1.5rem 2rem', textAlign: 'right' }}>{m.count}</td>
                                <td style={{ padding: '1.5rem 2rem', textAlign: 'right' }}>{m.volume.toLocaleString()} zł</td>
                                <td style={{ padding: '1.5rem 2rem', textAlign: 'right', fontWeight: 700, color: 'var(--accent-green)' }}>
                                    {formatCurrency(m.commission)} zł
                                </td>
                                <td style={{ padding: '1.5rem 2rem', textAlign: 'right', color: 'var(--text-muted)' }}>
                                    {m.volume > 0 ? ((m.commission / m.volume) * 100).toFixed(2) : '0.00'} %
                                </td>
                                <td className="no-print" style={{ padding: '1.5rem 2rem', textAlign: 'center' }}>
                                    <button
                                        className="btn"
                                        style={{ padding: '0.5rem', background: 'transparent', color: 'var(--primary)' }}
                                        onClick={() => {
                                            const headers = ['Data', 'Transakcje', 'Wolumen', 'Prowizja']
                                            const csvContent = [headers, [monthNames[m.month - 1], m.count, m.volume, m.commission]].map(e => e.join(',')).join('\n')
                                            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
                                            const link = document.createElement('a')
                                            link.href = URL.createObjectURL(blob)
                                            link.download = `raport_${monthNames[m.month - 1].toLowerCase()}.csv`
                                            link.click()
                                        }}
                                    >
                                        <Download size={18} />
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    )
}

export default ReportsView
