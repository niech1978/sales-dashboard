import { useMemo, useState } from 'react'
import { Search, Filter, Trash2, ArrowUpDown, Edit2, X, Save, MinusCircle, CreditCard, DollarSign, Scissors } from 'lucide-react'
import type { Transaction, Agent, TransactionTranche } from '../types'
import TrancheEditor from './TrancheEditor'

interface DatabaseViewProps {
    transactions: Transaction[]
    onDelete: (id: string) => void
    onUpdate: (transaction: Transaction) => void
    agents: Agent[]
    tranchesByTransaction?: Map<string, TransactionTranche[]>
    onSaveTranches?: (transactionId: string, tranches: Omit<TransactionTranche, 'id' | 'transaction_id' | 'created_at' | 'updated_at'>[]) => Promise<string | null>
    userRole?: string
}

const DatabaseView = ({ transactions, onDelete, onUpdate, agents, tranchesByTransaction, onSaveTranches, userRole = 'agent' }: DatabaseViewProps) => {
    const [searchTerm, setSearchTerm] = useState('')
    const [selectedBranch, setSelectedBranch] = useState('all')
    const [sortConfig, setSortConfig] = useState<{ key: keyof Transaction, direction: 'asc' | 'desc' } | null>(null)
    const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null)
    const [trancheTransaction, setTrancheTransaction] = useState<Transaction | null>(null)

    const sortedData = useMemo(() => {
        const filtered = transactions.filter(t =>
            (selectedBranch === 'all' || t.oddzial === selectedBranch) &&
            (t.agent.toLowerCase().includes(searchTerm.toLowerCase()) ||
                t.adres.toLowerCase().includes(searchTerm.toLowerCase()))
        )

        if (sortConfig) {
            filtered.sort((a, b) => {
                const aValue = a[sortConfig.key] ?? ''
                const bValue = b[sortConfig.key] ?? ''
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
                <div className="filter-controls" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <Filter size={18} style={{ color: 'var(--text-muted)' }} />
                    <select
                        className="input-field branch-select"
                        style={{ margin: 0 }}
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
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.8125rem' }}>
                    <thead style={{ position: 'sticky', top: 0, zIndex: 10 }}>
                        <tr style={{ background: 'var(--bg-dark)', borderBottom: '1px solid var(--border)' }}>
                            <SortableHeader label="Oddział" sortKey="oddzial" onSort={requestSort} />
                            <SortableHeader label="Mies." sortKey="miesiac" onSort={requestSort} />
                            <SortableHeader label="Rok" sortKey="rok" onSort={requestSort} />
                            <SortableHeader label="Agent" sortKey="agent" onSort={requestSort} />
                            <SortableHeader label="Typ" sortKey="typNieruchomosci" onSort={requestSort} />
                            <SortableHeader label="Strona" sortKey="strona" onSort={requestSort} />
                            <SortableHeader label="Nr" sortKey="transakcja" onSort={requestSort} />
                            <SortableHeader label="Adres" sortKey="adres" onSort={requestSort} />
                            <SortableHeader label="Prowizja" sortKey="prowizjaNetto" onSort={requestSort} textAlign="right" />
                            <th style={{ padding: '0.75rem 0.5rem', fontWeight: 600, textAlign: 'right' }}>%</th>
                            <SortableHeader label="Koszty" sortKey="koszty" onSort={requestSort} textAlign="right" />
                            <SortableHeader label="Kredyt" sortKey="kredyt" onSort={requestSort} textAlign="right" />
                            <th style={{ padding: '0.75rem 0.5rem', fontWeight: 600, textAlign: 'right' }}>Wykonanie</th>
                            <SortableHeader label="Wartość" sortKey="wartoscNieruchomosci" onSort={requestSort} textAlign="right" />
                            {(userRole === 'admin' || userRole === 'superadmin' || userRole === 'manager') && (
                                <th className="no-print" style={{ padding: '0.75rem 0.5rem', fontWeight: 600, textAlign: 'center' }}>Akcje</th>
                            )}
                        </tr>
                    </thead>
                    <tbody>
                        {sortedData.map((t) => {
                            const koszty = t.koszty || 0
                            const kredyt = t.kredyt || 0
                            const wykonanie = t.prowizjaNetto - koszty + kredyt
                            return (
                                <tr key={t.id} style={{ borderBottom: '1px solid var(--border)', transition: 'background 0.2s' }} className="table-row-hover">
                                    <td style={{ padding: '0.6rem 0.5rem' }}>{t.oddzial}</td>
                                    <td style={{ padding: '0.6rem 0.5rem' }}>{t.miesiac}</td>
                                    <td style={{ padding: '0.6rem 0.5rem' }}>{t.rok}</td>
                                    <td style={{ padding: '0.6rem 0.5rem', fontWeight: 600 }}>{t.agent}</td>
                                    <td style={{ padding: '0.6rem 0.5rem' }}>{t.typNieruchomosci}</td>
                                    <td style={{ padding: '0.6rem 0.5rem' }}>
                                        <span style={{
                                            fontSize: '0.7rem',
                                            padding: '0.15rem 0.35rem',
                                            borderRadius: '4px',
                                            background: t.strona === 'SPRZEDAŻ' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(14, 165, 233, 0.1)',
                                            color: t.strona === 'SPRZEDAŻ' ? 'var(--accent-green)' : 'var(--accent-blue)'
                                        }}>
                                            {t.strona}
                                        </span>
                                    </td>
                                    <td style={{ padding: '0.6rem 0.5rem' }}>{t.transakcja}</td>
                                    <td style={{ padding: '0.6rem 0.5rem', color: 'var(--text-muted)' }}>{t.adres}</td>
                                    <td style={{ padding: '0.6rem 0.5rem', textAlign: 'right', fontWeight: 600, color: 'var(--accent-green)' }}>
                                        {formatCurrency(t.prowizjaNetto)}
                                    </td>
                                    <td style={{ padding: '0.6rem 0.5rem', textAlign: 'right', color: 'var(--text-muted)' }}>
                                        {t.wartoscNieruchomosci > 0 ? ((t.prowizjaNetto / t.wartoscNieruchomosci) * 100).toFixed(1) : '0'}%
                                    </td>
                                    <td style={{ padding: '0.6rem 0.5rem', textAlign: 'right', color: koszty > 0 ? 'var(--accent-pink)' : 'var(--text-muted)' }}>
                                        {koszty > 0 ? `-${formatCurrency(koszty)}` : '-'}
                                    </td>
                                    <td style={{ padding: '0.6rem 0.5rem', textAlign: 'right', color: kredyt > 0 ? 'var(--accent-blue)' : 'var(--text-muted)' }}>
                                        {kredyt > 0 ? formatCurrency(kredyt) : '-'}
                                    </td>
                                    <td style={{ padding: '0.6rem 0.5rem', textAlign: 'right', fontWeight: 700, color: 'var(--primary)' }}>
                                        {formatCurrency(wykonanie)}
                                    </td>
                                    <td style={{ padding: '0.6rem 0.5rem', textAlign: 'right' }}>
                                        {t.wartoscNieruchomosci.toLocaleString()}
                                    </td>
                                    {(userRole === 'admin' || userRole === 'superadmin' || userRole === 'manager') && (
                                    <td className="no-print" style={{ padding: '0.6rem 0.5rem', textAlign: 'center' }}>
                                        <div style={{ display: 'flex', gap: '0.15rem', justifyContent: 'center', alignItems: 'center' }}>
                                            {onSaveTranches && (
                                                <button
                                                    onClick={() => setTrancheTransaction({ ...t })}
                                                    className="btn"
                                                    style={{
                                                        padding: '0.3rem',
                                                        background: 'transparent',
                                                        color: (t.id && tranchesByTransaction?.has(t.id)) ? 'var(--accent-green)' : 'var(--text-muted)',
                                                        position: 'relative'
                                                    }}
                                                    title="Transze"
                                                >
                                                    <Scissors size={14} />
                                                    {t.id && tranchesByTransaction?.has(t.id) && (
                                                        <span style={{
                                                            position: 'absolute',
                                                            top: '-4px',
                                                            right: '-4px',
                                                            background: 'var(--accent-green)',
                                                            color: '#fff',
                                                            borderRadius: '50%',
                                                            width: '14px',
                                                            height: '14px',
                                                            fontSize: '0.6rem',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'center',
                                                            fontWeight: 700
                                                        }}>
                                                            {tranchesByTransaction.get(t.id)!.length}
                                                        </span>
                                                    )}
                                                </button>
                                            )}
                                            <button
                                                onClick={() => setEditingTransaction({ ...t })}
                                                className="btn"
                                                style={{ padding: '0.3rem', background: 'transparent', color: 'var(--primary)' }}
                                                title="Edytuj"
                                            >
                                                <Edit2 size={14} />
                                            </button>
                                            <button
                                                onClick={() => {
                                                    if (t.id && confirm('Czy na pewno chcesz usunąć tę transakcję?')) {
                                                        onDelete(t.id)
                                                    }
                                                }}
                                                className="btn"
                                                style={{ padding: '0.3rem', background: 'transparent', color: 'var(--accent-pink)' }}
                                                title="Usuń"
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        </div>
                                    </td>
                                    )}
                                </tr>
                            )
                        })}
                    </tbody>
                </table>
            </div>

            {/* Modal edycji transakcji */}
            {editingTransaction && (
                <EditTransactionModal
                    transaction={editingTransaction}
                    agents={agents}
                    hasTranches={!!(editingTransaction.id && tranchesByTransaction?.has(editingTransaction.id))}
                    onSave={(updated) => {
                        onUpdate(updated)
                        setEditingTransaction(null)
                    }}
                    onClose={() => setEditingTransaction(null)}
                />
            )}

            {/* Modal transz */}
            {trancheTransaction && trancheTransaction.id && onSaveTranches && (
                <TrancheEditor
                    transaction={trancheTransaction}
                    tranches={tranchesByTransaction?.get(trancheTransaction.id!) || []}
                    onSave={onSaveTranches}
                    onClose={() => setTrancheTransaction(null)}
                />
            )}
        </div>
    )
}

// Komponent modalu edycji
const EditTransactionModal = ({
    transaction,
    agents,
    hasTranches,
    onSave,
    onClose
}: {
    transaction: Transaction
    agents: Agent[]
    hasTranches?: boolean
    onSave: (t: Transaction) => void
    onClose: () => void
}) => {
    const [formData, setFormData] = useState<Transaction>({
        ...transaction,
        koszty: transaction.koszty || 0,
        kredyt: transaction.kredyt || 0
    })

    const filteredAgents = agents.filter(a => a.oddzial === formData.oddzial)
    const wykonanie = formData.prowizjaNetto - (formData.koszty || 0) + (formData.kredyt || 0)

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        onSave(formData)
    }

    return (
        <div className="modal-overlay">
            <div className="glass-card modal-card" style={{
                width: '100%',
                maxWidth: '700px',
                position: 'relative',
                maxHeight: '90vh',
                overflowY: 'auto'
            }}>
                <button onClick={onClose} style={{ position: 'absolute', top: '1.5rem', right: '1.5rem', background: 'transparent', color: 'var(--text-muted)', zIndex: 10 }}>
                    <X size={24} />
                </button>

                <h2 className="modal-title" style={{ fontWeight: 700, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div style={{ background: 'var(--primary)', padding: '0.4rem', borderRadius: '8px', display: 'flex' }}>
                        <Edit2 size={20} color="white" />
                    </div>
                    Edytuj Transakcję
                </h2>

                {hasTranches && (
                    <div style={{
                        background: 'rgba(245, 158, 11, 0.1)',
                        border: '1px solid rgba(245, 158, 11, 0.3)',
                        borderRadius: '8px',
                        padding: '0.75rem 1rem',
                        marginBottom: '1.5rem',
                        fontSize: '0.8125rem',
                        color: '#f59e0b',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem'
                    }}>
                        <Scissors size={16} />
                        Ta transakcja ma transze. Zmiana prowizji netto tutaj nie zaktualizuje transz automatycznie.
                    </div>
                )}

                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                        <div className="form-group">
                            <label>Oddział</label>
                            <select
                                className="input-field"
                                value={formData.oddzial}
                                onChange={e => setFormData({ ...formData, oddzial: e.target.value })}
                            >
                                <option value="Kraków">Kraków</option>
                                <option value="Warszawa">Warszawa</option>
                                <option value="Olsztyn">Olsztyn</option>
                            </select>
                        </div>
                        <div className="form-group">
                            <label>Agent</label>
                            <select
                                className="input-field"
                                value={formData.agent}
                                onChange={e => setFormData({ ...formData, agent: e.target.value })}
                            >
                                {filteredAgents.map(a => (
                                    <option key={a.id} value={a.name}>{a.name}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '1rem' }}>
                        <div className="form-group">
                            <label>Rok</label>
                            <select
                                className="input-field"
                                value={formData.rok}
                                onChange={e => setFormData({ ...formData, rok: parseInt(e.target.value) })}
                            >
                                {[2024, 2025, 2026, 2027].map(year => (
                                    <option key={year} value={year}>{year}</option>
                                ))}
                            </select>
                        </div>
                        <div className="form-group">
                            <label>Miesiąc</label>
                            <select
                                className="input-field"
                                value={formData.miesiac}
                                onChange={e => setFormData({ ...formData, miesiac: parseInt(e.target.value) })}
                            >
                                {Array.from({ length: 12 }, (_, i) => (
                                    <option key={i + 1} value={i + 1}>{i + 1}</option>
                                ))}
                            </select>
                        </div>
                        <div className="form-group">
                            <label>Strona</label>
                            <select
                                className="input-field"
                                value={formData.strona}
                                onChange={e => setFormData({ ...formData, strona: e.target.value as Transaction['strona'] })}
                            >
                                <option value="SPRZEDAŻ">SPRZEDAŻ</option>
                                <option value="KUPNO">KUPNO</option>
                                <option value="WYNAJEM">WYNAJEM</option>
                                <option value="NAJEM">NAJEM</option>
                            </select>
                        </div>
                        <div className="form-group">
                            <label>Typ</label>
                            <select
                                className="input-field"
                                value={formData.typNieruchomosci}
                                onChange={e => setFormData({ ...formData, typNieruchomosci: e.target.value })}
                            >
                                <option value="Mieszkanie">Mieszkanie</option>
                                <option value="Dom">Dom</option>
                                <option value="Działka">Działka</option>
                                <option value="Lokal">Lokal</option>
                            </select>
                        </div>
                    </div>

                    <div className="form-group">
                        <label>Adres</label>
                        <input
                            type="text"
                            className="input-field"
                            value={formData.adres}
                            onChange={e => setFormData({ ...formData, adres: e.target.value })}
                        />
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                        <div className="form-group">
                            <label><DollarSign size={16} /> Wartość Nieruchomości (zł)</label>
                            <input
                                type="number"
                                className="input-field"
                                value={formData.wartoscNieruchomosci}
                                onChange={e => setFormData({ ...formData, wartoscNieruchomosci: parseFloat(e.target.value) || 0 })}
                            />
                        </div>
                        <div className="form-group">
                            <label><DollarSign size={16} /> Prowizja Netto (zł)</label>
                            <input
                                type="number"
                                className="input-field"
                                value={formData.prowizjaNetto}
                                onChange={e => setFormData({ ...formData, prowizjaNetto: parseFloat(e.target.value) || 0 })}
                            />
                        </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
                        <div className="form-group">
                            <label><MinusCircle size={16} /> Koszty (zł)</label>
                            <input
                                type="number"
                                className="input-field"
                                placeholder="Obniżają prowizję"
                                value={formData.koszty || 0}
                                onChange={e => setFormData({ ...formData, koszty: parseFloat(e.target.value) || 0 })}
                            />
                        </div>
                        <div className="form-group">
                            <label><CreditCard size={16} /> Kredyt (zł)</label>
                            <input
                                type="number"
                                className="input-field"
                                placeholder="Dodaje do wykonania"
                                value={formData.kredyt || 0}
                                onChange={e => setFormData({ ...formData, kredyt: parseFloat(e.target.value) || 0 })}
                            />
                        </div>
                        <div className="form-group">
                            <label><DollarSign size={16} /> Wykonanie (zł)</label>
                            <input
                                type="number"
                                className="input-field"
                                disabled
                                value={wykonanie.toFixed(2)}
                                style={{ background: 'rgba(99, 102, 241, 0.1)', color: 'var(--primary)', fontWeight: 700 }}
                            />
                        </div>
                    </div>

                    <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                        <button
                            type="button"
                            onClick={onClose}
                            className="btn"
                            style={{ flex: 1, height: '3rem', background: 'var(--bg-card)', border: '1px solid var(--border)' }}
                        >
                            Anuluj
                        </button>
                        <button type="submit" className="btn btn-primary" style={{ flex: 2, height: '3rem' }}>
                            <Save size={18} style={{ marginRight: '0.5rem' }} />
                            Zapisz Zmiany
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}

const SortableHeader = ({ label, sortKey, onSort, textAlign = 'left' }: { label: string, sortKey: keyof Transaction, onSort: (key: keyof Transaction) => void, textAlign?: 'left' | 'right' }) => (
    <th
        onClick={() => onSort(sortKey)}
        style={{
            padding: '0.75rem 0.5rem',
            fontWeight: 600,
            textAlign,
            cursor: 'pointer',
            whiteSpace: 'nowrap'
        }}
    >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', justifyContent: textAlign === 'right' ? 'flex-end' : 'flex-start' }}>
            {label}
            <ArrowUpDown size={12} style={{ opacity: 0.5 }} />
        </div>
    </th>
)

export default DatabaseView
