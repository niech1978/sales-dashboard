import { useMemo, useState } from 'react'
import { Search, Filter, Trash2, ArrowUpDown } from 'lucide-react'
import type { Transaction } from '../types'

interface DatabaseViewProps {
    transactions: Transaction[]
    onDelete: (id: string) => void
}

const DatabaseView = ({ transactions, onDelete }: DatabaseViewProps) => {
    const [searchTerm, setSearchTerm] = useState('')
    const [selectedBranch, setSelectedBranch] = useState('all')
    const [sortConfig, setSortConfig] = useState<{ key: keyof Transaction, direction: 'asc' | 'desc' } | null>(null)

    const sortedData = useMemo(() => {
        let filtered = transactions.filter(t =>
            (selectedBranch === 'all' || t.oddzial === selectedBranch) &&
            (t.agent.toLowerCase().includes(searchTerm.toLowerCase()) ||
                t.adres.toLowerCase().includes(searchTerm.toLowerCase()))
        )

        if (sortConfig) {
            filtered.sort((a, b) => {
                const aValue = (a[sortConfig.key] ?? '') as any
                const bValue = (b[sortConfig.key] ?? '') as any
                if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1
                if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1
                return 0
            })
        }

        return filtered
    }, [transactions, searchTerm, selectedBranch, sortConfig])

    const requestSort = (key: keyof Transaction) => {
        let direction: 'asc' | 'desc' = 'asc'
        if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc'
        }
        setSortConfig({ key, direction })
    }

    const formatCurrency = (val: number) =>
        val.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h2 style={{ fontSize: '1.5rem', fontWeight: 700 }}>Pełna Baza Danych</h2>
                <div style={{ display: 'flex', gap: '1rem', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                    <span>Liczba rekordów: {sortedData.length}</span>
                </div>
            </div>

            <div className="glass-card" style={{ display: 'flex', gap: '1.5rem', alignItems: 'center', padding: '1.5rem 2rem', flexWrap: 'wrap' }}>
                <div style={{ position: 'relative', flex: 1 }}>
                    <Search size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                    <input
                        type="text"
                        className="input-field"
                        placeholder="Szukaj po agencie lub adresie..."
                        style={{ paddingLeft: '3rem', margin: 0 }}
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                    />
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', width: window.innerWidth <= 768 ? '100%' : 'auto' }}>
                    <Filter size={18} style={{ color: 'var(--text-muted)' }} />
                    <select
                        className="input-field"
                        style={{ width: window.innerWidth <= 768 ? '100%' : '200px', margin: 0 }}
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

            <div className="glass-card table-container" style={{ padding: 0, maxHeight: '70vh' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '1200px' }}>
                    <thead style={{ position: 'sticky', top: 0, zIndex: 10 }}>
                        <tr style={{ background: 'var(--bg-dark)', borderBottom: '1px solid var(--border)' }}>
                            <SortableHeader label="Oddział" sortKey="oddzial" onSort={requestSort} />
                            <SortableHeader label="Miesiąc" sortKey="miesiac" onSort={requestSort} />
                            <SortableHeader label="Rok" sortKey="rok" onSort={requestSort} />
                            <SortableHeader label="Agent" sortKey="agent" onSort={requestSort} />
                            <SortableHeader label="Typ" sortKey="typNieruchomosci" onSort={requestSort} />
                            <SortableHeader label="Strona" sortKey="strona" onSort={requestSort} />
                            <SortableHeader label="Nr" sortKey="transakcja" onSort={requestSort} />
                            <SortableHeader label="Adres" sortKey="adres" onSort={requestSort} />
                            <SortableHeader label="Prowizja" sortKey="prowizjaNetto" onSort={requestSort} textAlign="right" />
                            <SortableHeader label="Wartość" sortKey="wartoscNieruchomosci" onSort={requestSort} textAlign="right" />
                            <th style={{ padding: '1.25rem 1rem', fontWeight: 600, textAlign: 'center' }}>Akcje</th>
                        </tr>
                    </thead>
                    <tbody>
                        {sortedData.map((t) => (
                            <tr key={t.id} style={{ borderBottom: '1px solid var(--border)', transition: 'background 0.2s' }} className="table-row-hover">
                                <td style={{ padding: '1rem' }}>{t.oddzial}</td>
                                <td style={{ padding: '1rem' }}>{t.miesiac}</td>
                                <td style={{ padding: '1rem' }}>{t.rok}</td>
                                <td style={{ padding: '1rem', fontWeight: 600 }}>{t.agent}</td>
                                <td style={{ padding: '1rem' }}>{t.typNieruchomosci}</td>
                                <td style={{ padding: '1rem' }}>
                                    <span style={{
                                        fontSize: '0.75rem',
                                        padding: '0.2rem 0.5rem',
                                        borderRadius: '4px',
                                        background: t.strona === 'SPRZEDAŻ' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(14, 165, 233, 0.1)',
                                        color: t.strona === 'SPRZEDAŻ' ? 'var(--accent-green)' : 'var(--accent-blue)'
                                    }}>
                                        {t.strona}
                                    </span>
                                </td>
                                <td style={{ padding: '1rem' }}>{t.transakcja}</td>
                                <td style={{ padding: '1rem', fontSize: '0.875rem', color: 'var(--text-muted)' }}>{t.adres}</td>
                                <td style={{ padding: '1rem', textAlign: 'right', fontWeight: 700, color: 'var(--accent-green)' }}>
                                    {formatCurrency(t.prowizjaNetto)} zł
                                </td>
                                <td style={{ padding: '1rem', textAlign: 'right' }}>
                                    {t.wartoscNieruchomosci.toLocaleString()} zł
                                </td>
                                <td style={{ padding: '1rem', textAlign: 'center' }}>
                                    <button
                                        onClick={() => {
                                            if (t.id && confirm('Czy na pewno chcesz usunąć tę transakcję?')) {
                                                onDelete(t.id)
                                            }
                                        }}
                                        className="btn"
                                        style={{ padding: '0.5rem', background: 'transparent', color: 'var(--accent-pink)' }}
                                    >
                                        <Trash2 size={16} />
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

const SortableHeader = ({ label, sortKey, onSort, textAlign = 'left' }: { label: string, sortKey: keyof Transaction, onSort: (key: keyof Transaction) => void, textAlign?: 'left' | 'right' }) => (
    <th
        onClick={() => onSort(sortKey)}
        style={{
            padding: '1.25rem 1rem',
            fontWeight: 600,
            textAlign,
            cursor: 'pointer',
            whiteSpace: 'nowrap'
        }}
    >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', justifyContent: textAlign === 'right' ? 'flex-end' : 'flex-start' }}>
            {label}
            <ArrowUpDown size={14} style={{ opacity: 0.5 }} />
        </div>
    </th>
)

export default DatabaseView
