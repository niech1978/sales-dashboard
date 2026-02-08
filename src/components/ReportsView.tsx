import { useMemo } from 'react'
import { Download, ArrowUpRight, ArrowDownRight } from 'lucide-react'
import { useWindowWidth } from '../hooks/useWindowWidth'
import type { Transaction, EffectiveTranche } from '../types'

interface ReportsViewProps {
    transactions: Transaction[]
    getEffectiveTranches?: (txs: Transaction[], startMonth: number, endMonth: number, year: number) => EffectiveTranche[]
    dateRange?: { startMonth: number, endMonth: number, year: number }
}

const ReportsView = ({ transactions, getEffectiveTranches, dateRange }: ReportsViewProps) => {
    const windowWidth = useWindowWidth()
    const monthlyStats = useMemo(() => {
        const months: Record<number, {
            commission: number,
            volume: number,
            count: number,
            zrealizowane: number,
            prognozaWazona: number,
            transactionIds: Set<string>
        }> = {}

        const year = dateRange?.year || (transactions[0]?.rok ?? new Date().getFullYear())
        const startM = dateRange?.startMonth || 1
        const endM = dateRange?.endMonth || 12

        if (getEffectiveTranches) {
            // Tranche-based aggregation
            const allTranches = getEffectiveTranches(transactions, startM, endM, year)

            allTranches.forEach(et => {
                if (!months[et.miesiac]) {
                    months[et.miesiac] = { commission: 0, volume: 0, count: 0, zrealizowane: 0, prognozaWazona: 0, transactionIds: new Set() }
                }
                months[et.miesiac].commission += et.kwota
                months[et.miesiac].transactionIds.add(et.transactionId)
                if (et.status === 'zrealizowana') {
                    months[et.miesiac].zrealizowane += et.kwota
                } else {
                    months[et.miesiac].prognozaWazona += et.kwotaPrognozaWazona
                }
            })

            // Add volume from unique transactions per month
            Object.values(months).forEach(m => {
                m.count = m.transactionIds.size
                m.transactionIds.forEach(txId => {
                    const tx = transactions.find(t => t.id === txId)
                    if (tx) m.volume += tx.wartoscNieruchomosci
                })
            })
        } else {
            // Fallback: transaction-based
            transactions.forEach(t => {
                if (!months[t.miesiac]) {
                    months[t.miesiac] = { commission: 0, volume: 0, count: 0, zrealizowane: 0, prognozaWazona: 0, transactionIds: new Set() }
                }
                months[t.miesiac].commission += t.prowizjaNetto
                months[t.miesiac].volume += t.wartoscNieruchomosci
                months[t.miesiac].count += 1
                months[t.miesiac].zrealizowane += t.prowizjaNetto
            })
        }

        return Object.entries(months).map(([m, stats]) => ({
            month: parseInt(m),
            commission: stats.commission,
            volume: stats.volume,
            count: stats.count,
            zrealizowane: stats.zrealizowane,
            prognozaWazona: stats.prognozaWazona
        })).sort((a, b) => a.month - b.month)
    }, [transactions, getEffectiveTranches, dateRange])

    const monthNames = [
        'Styczeń', 'Luty', 'Marzec', 'Kwiecień', 'Maj', 'Czerwiec',
        'Lipiec', 'Sierpień', 'Wrzesień', 'Październik', 'Listopad', 'Grudzień'
    ]

    const formatCurrency = (val: number) =>
        val.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })

    const hasTranches = getEffectiveTranches !== undefined

    const handleDownloadCSV = () => {
        if (monthlyStats.length === 0) return

        const headers = hasTranches
            ? ['Miesiąc', 'Liczba Transakcji', 'Wartość Nieruchomości', 'Suma Prowizji', 'Zrealizowane', 'Prognoza ważona']
            : ['Miesiąc', 'Liczba Transakcji', 'Wartość Nieruchomości', 'Suma Prowizji']

        const rows = monthlyStats.map(m => {
            const base = [
                monthNames[m.month - 1],
                m.count,
                m.volume.toFixed(2),
                m.commission.toFixed(2)
            ]
            if (hasTranches) {
                base.push(m.zrealizowane.toFixed(2), m.prognozaWazona.toFixed(2))
            }
            return base
        })

        const csvContent = [headers, ...rows].map(e => e.join(',')).join('\n')
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
        const link = document.createElement('a')
        const url = URL.createObjectURL(blob)
        link.setAttribute('href', url)
        link.setAttribute('download', `raport_miesieczny_${dateRange?.year || new Date().getFullYear()}.csv`)
        link.style.visibility = 'hidden'
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
    }


    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                <h2 style={{ fontSize: '1.5rem', fontWeight: 700 }}>Raporty Miesięczne</h2>
                <div style={{ display: 'flex', gap: '1rem', width: windowWidth <= 640 ? '100%' : 'auto' }}>
                    <button className="btn btn-primary" style={{ flex: 1 }} onClick={handleDownloadCSV}>
                        <Download size={18} style={{ marginRight: '0.5rem' }} />
                        Pobierz Raport CSV
                    </button>
                </div>
            </div>

            <div className="dashboard-grid">
                {monthlyStats.slice(-4).map((m) => {
                    const prev = monthlyStats[monthlyStats.indexOf(m) - 1]
                    const growth = prev && prev.commission !== 0 ? ((m.commission - prev.commission) / prev.commission) * 100 : 0

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
                                    <span>{m.count > 0 ? formatCurrency(m.commission / m.count) : '0.00'} zł</span>
                                </div>
                                {hasTranches && m.prognozaWazona > 0 && (
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem' }}>
                                        <span style={{ color: 'var(--text-muted)' }}>Prognoza waż.</span>
                                        <span style={{ color: 'var(--accent-blue)' }}>{formatCurrency(m.prognozaWazona)} zł</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    )
                })}
            </div>

            <div className="glass-card table-container" style={{ padding: 0 }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '750px' }}>
                    <thead>
                        <tr style={{ background: 'rgba(255,255,255,0.02)', borderBottom: '1px solid var(--border)' }}>
                            <th style={{ padding: '1.5rem 2rem', textAlign: 'left' }}>Miesiąc</th>
                            <th style={{ padding: '1.5rem 2rem', textAlign: 'right' }}>Liczba Transakcji</th>
                            <th style={{ padding: '1.5rem 2rem', textAlign: 'right' }}>Wartość Nieruchomości</th>
                            <th style={{ padding: '1.5rem 2rem', textAlign: 'right' }}>Suma Prowizji</th>
                            {hasTranches && (
                                <>
                                    <th style={{ padding: '1.5rem 1rem', textAlign: 'right' }}>Zrealizowane</th>
                                    <th style={{ padding: '1.5rem 1rem', textAlign: 'right' }}>Prognoza waż.</th>
                                </>
                            )}
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
                                {hasTranches && (
                                    <>
                                        <td style={{ padding: '1.5rem 1rem', textAlign: 'right', color: 'var(--accent-green)' }}>
                                            {formatCurrency(m.zrealizowane)} zł
                                        </td>
                                        <td style={{ padding: '1.5rem 1rem', textAlign: 'right', color: m.prognozaWazona > 0 ? 'var(--accent-blue)' : 'var(--text-muted)' }}>
                                            {m.prognozaWazona > 0 ? `${formatCurrency(m.prognozaWazona)} zł` : '-'}
                                        </td>
                                    </>
                                )}
                                <td style={{ padding: '1.5rem 2rem', textAlign: 'right', color: 'var(--text-muted)' }}>
                                    {m.volume > 0 ? ((m.commission / m.volume) * 100).toFixed(2) : '0.00'} %
                                </td>
                                <td className="no-print" style={{ padding: '1.5rem 2rem', textAlign: 'center' }}>
                                    <button
                                        className="btn"
                                        style={{ padding: '0.5rem', background: 'transparent', color: 'var(--primary)' }}
                                        onClick={() => {
                                            const headers = hasTranches
                                                ? ['Data', 'Transakcje', 'Wolumen', 'Prowizja', 'Zrealizowane', 'Prognoza waż.']
                                                : ['Data', 'Transakcje', 'Wolumen', 'Prowizja']
                                            const row = [monthNames[m.month - 1], m.count, m.volume.toFixed(2), m.commission.toFixed(2)]
                                            if (hasTranches) {
                                                row.push(m.zrealizowane.toFixed(2), m.prognozaWazona.toFixed(2))
                                            }
                                            const csvContent = [headers, row].map(e => e.join(',')).join('\n')
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
