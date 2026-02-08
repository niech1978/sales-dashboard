import { useState, useMemo } from 'react'
import { X, Save, Plus, Trash2, Scissors, AlertTriangle } from 'lucide-react'
import type { Transaction, TransactionTranche } from '../types'

interface TrancheEditorProps {
    transaction: Transaction
    tranches: TransactionTranche[]
    onSave: (transactionId: string, tranches: Omit<TransactionTranche, 'id' | 'transaction_id' | 'created_at' | 'updated_at'>[]) => Promise<string | null>
    onClose: () => void
}

interface TrancheRow {
    key: number
    miesiac: number
    rok: number
    kwota: number
    status: 'zrealizowana' | 'prognoza'
    prawdopodobienstwo: number
    notatka: string
}

const TrancheEditor = ({ transaction, tranches, onSave, onClose }: TrancheEditorProps) => {
    const [saving, setSaving] = useState(false)
    const [splitCount, setSplitCount] = useState(3)

    const [rows, setRows] = useState<TrancheRow[]>(() => {
        if (tranches.length > 0) {
            return tranches.map((tr, i) => ({
                key: i,
                miesiac: tr.miesiac,
                rok: tr.rok,
                kwota: tr.kwota,
                status: tr.status,
                prawdopodobienstwo: tr.prawdopodobienstwo,
                notatka: tr.notatka || ''
            }))
        }
        return []
    })

    const [nextKey, setNextKey] = useState(tranches.length)

    const sumaTransz = useMemo(() =>
        rows.reduce((sum, r) => sum + (r.kwota || 0), 0),
        [rows]
    )

    const roznica = transaction.prowizjaNetto - sumaTransz

    const addRow = () => {
        const currentMonth = new Date().getMonth() + 1
        const currentYear = new Date().getFullYear()
        setRows([...rows, {
            key: nextKey,
            miesiac: currentMonth,
            rok: currentYear,
            kwota: 0,
            status: 'prognoza',
            prawdopodobienstwo: 50,
            notatka: ''
        }])
        setNextKey(nextKey + 1)
    }

    const removeRow = (key: number) => {
        setRows(rows.filter(r => r.key !== key))
    }

    const updateRow = (key: number, field: keyof TrancheRow, value: number | string) => {
        setRows(rows.map(r => {
            if (r.key !== key) return r
            const updated = { ...r, [field]: value }
            if (field === 'status' && value === 'zrealizowana') {
                updated.prawdopodobienstwo = 100
            }
            return updated
        }))
    }

    const handleSplitEvenly = () => {
        if (splitCount < 2 || splitCount > 12) return
        const kwotaPerTranche = Math.floor(transaction.prowizjaNetto / splitCount * 100) / 100
        const remainder = Math.round((transaction.prowizjaNetto - kwotaPerTranche * splitCount) * 100) / 100

        const startMonth = transaction.miesiac
        const startYear = transaction.rok
        const newRows: TrancheRow[] = []

        for (let i = 0; i < splitCount; i++) {
            let m = startMonth + i
            let y = startYear
            while (m > 12) { m -= 12; y += 1 }

            newRows.push({
                key: nextKey + i,
                miesiac: m,
                rok: y,
                kwota: i === 0 ? kwotaPerTranche + remainder : kwotaPerTranche,
                status: i === 0 ? 'zrealizowana' : 'prognoza',
                prawdopodobienstwo: i === 0 ? 100 : 50,
                notatka: i === 0 ? 'Umowa przedwstępna' : i === splitCount - 1 ? 'Akt notarialny' : ''
            })
        }

        setRows(newRows)
        setNextKey(nextKey + splitCount)
    }

    const handleSave = async () => {
        setSaving(true)
        try {
            await onSave(transaction.id!, rows.map(r => ({
                miesiac: r.miesiac,
                rok: r.rok,
                kwota: r.kwota,
                status: r.status,
                prawdopodobienstwo: r.prawdopodobienstwo,
                notatka: r.notatka || undefined
            })))
            onClose()
        } catch (err) {
            console.error('Error saving tranches:', err)
        } finally {
            setSaving(false)
        }
    }

    const formatCurrency = (val: number) =>
        val.toLocaleString('pl-PL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

    const monthNames = [
        'Styczeń', 'Luty', 'Marzec', 'Kwiecień', 'Maj', 'Czerwiec',
        'Lipiec', 'Sierpień', 'Wrzesień', 'Październik', 'Listopad', 'Grudzień'
    ]

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div
                className="glass-card modal-card"
                style={{ width: '100%', maxWidth: '900px', maxHeight: '90vh', overflowY: 'auto', position: 'relative' }}
                onClick={e => e.stopPropagation()}
            >
                <button onClick={onClose} style={{ position: 'absolute', top: '1.5rem', right: '1.5rem', background: 'transparent', color: 'var(--text-muted)', zIndex: 10 }}>
                    <X size={24} />
                </button>

                {/* Header */}
                <h2 style={{ fontWeight: 700, marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div style={{ background: 'var(--primary)', padding: '0.4rem', borderRadius: '8px', display: 'flex' }}>
                        <Scissors size={20} color="white" />
                    </div>
                    Transze prowizji
                </h2>

                {/* Transaction info */}
                <div style={{
                    background: 'rgba(99, 102, 241, 0.1)',
                    borderRadius: '12px',
                    padding: '1rem',
                    marginBottom: '1.5rem',
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: '1.5rem'
                }}>
                    <div>
                        <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>Adres</p>
                        <p style={{ fontWeight: 600 }}>{transaction.adres}</p>
                    </div>
                    <div>
                        <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>Agent</p>
                        <p style={{ fontWeight: 600 }}>{transaction.agent}</p>
                    </div>
                    <div>
                        <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>Oddział</p>
                        <p style={{ fontWeight: 600 }}>{transaction.oddzial}</p>
                    </div>
                    <div>
                        <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>Prowizja netto</p>
                        <p style={{ fontWeight: 700, color: 'var(--accent-green)', fontSize: '1.1rem' }}>{formatCurrency(transaction.prowizjaNetto)} zł</p>
                    </div>
                </div>

                {/* Quick split */}
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem',
                    marginBottom: '1.5rem',
                    flexWrap: 'wrap'
                }}>
                    <span style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Podziel równo na:</span>
                    <input
                        type="number"
                        className="input-field"
                        style={{ width: '70px', margin: 0, padding: '0.5rem', textAlign: 'center' }}
                        value={splitCount}
                        onChange={e => setSplitCount(Math.max(2, Math.min(12, parseInt(e.target.value) || 2)))}
                        min={2}
                        max={12}
                    />
                    <span style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>miesięcy</span>
                    <button
                        className="btn"
                        style={{ padding: '0.5rem 1rem', background: 'rgba(99, 102, 241, 0.15)', border: '1px solid var(--primary)' }}
                        onClick={handleSplitEvenly}
                    >
                        <Scissors size={16} style={{ marginRight: '0.5rem' }} />
                        Podziel
                    </button>
                    <button
                        className="btn"
                        style={{ padding: '0.5rem 1rem', marginLeft: 'auto' }}
                        onClick={addRow}
                    >
                        <Plus size={16} style={{ marginRight: '0.5rem' }} />
                        Dodaj transzę
                    </button>
                </div>

                {/* Tranches table */}
                {rows.length === 0 ? (
                    <div style={{
                        textAlign: 'center',
                        padding: '3rem',
                        color: 'var(--text-muted)',
                        background: 'rgba(255,255,255,0.02)',
                        borderRadius: '12px',
                        marginBottom: '1.5rem'
                    }}>
                        <p>Brak transz. Transakcja traktowana jako jednorazowa (100% zrealizowana).</p>
                        <p style={{ fontSize: '0.875rem', marginTop: '0.5rem' }}>Użyj "Podziel" lub "Dodaj transzę" aby rozłożyć prowizję na raty.</p>
                    </div>
                ) : (
                    <div style={{ overflowX: 'auto', marginBottom: '1.5rem' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
                            <thead>
                                <tr style={{ borderBottom: '2px solid var(--border)' }}>
                                    <th style={{ padding: '0.75rem 0.5rem', textAlign: 'left' }}>Miesiąc</th>
                                    <th style={{ padding: '0.75rem 0.5rem', textAlign: 'left' }}>Rok</th>
                                    <th style={{ padding: '0.75rem 0.5rem', textAlign: 'right' }}>Kwota (zł)</th>
                                    <th style={{ padding: '0.75rem 0.5rem', textAlign: 'center' }}>Status</th>
                                    <th style={{ padding: '0.75rem 0.5rem', textAlign: 'center' }}>Prawd. %</th>
                                    <th style={{ padding: '0.75rem 0.5rem', textAlign: 'left' }}>Notatka</th>
                                    <th style={{ padding: '0.75rem 0.5rem', textAlign: 'center', width: '40px' }}></th>
                                </tr>
                            </thead>
                            <tbody>
                                {rows.map(row => (
                                    <tr key={row.key} style={{ borderBottom: '1px solid var(--border)' }}>
                                        <td style={{ padding: '0.5rem' }}>
                                            <select
                                                className="input-field"
                                                style={{ margin: 0, padding: '0.4rem', width: '130px' }}
                                                value={row.miesiac}
                                                onChange={e => updateRow(row.key, 'miesiac', parseInt(e.target.value))}
                                            >
                                                {monthNames.map((m, i) => (
                                                    <option key={i} value={i + 1}>{m}</option>
                                                ))}
                                            </select>
                                        </td>
                                        <td style={{ padding: '0.5rem' }}>
                                            <select
                                                className="input-field"
                                                style={{ margin: 0, padding: '0.4rem', width: '80px' }}
                                                value={row.rok}
                                                onChange={e => updateRow(row.key, 'rok', parseInt(e.target.value))}
                                            >
                                                {[2024, 2025, 2026, 2027, 2028].map(y => (
                                                    <option key={y} value={y}>{y}</option>
                                                ))}
                                            </select>
                                        </td>
                                        <td style={{ padding: '0.5rem' }}>
                                            <input
                                                type="number"
                                                className="input-field"
                                                style={{ margin: 0, padding: '0.4rem', width: '120px', textAlign: 'right' }}
                                                value={row.kwota}
                                                onChange={e => updateRow(row.key, 'kwota', parseFloat(e.target.value) || 0)}
                                                min={0}
                                                step={0.01}
                                            />
                                        </td>
                                        <td style={{ padding: '0.5rem', textAlign: 'center' }}>
                                            <select
                                                className="input-field"
                                                style={{
                                                    margin: 0,
                                                    padding: '0.4rem',
                                                    width: '120px',
                                                    color: row.status === 'zrealizowana' ? 'var(--accent-green)' : 'var(--accent-blue)',
                                                    fontWeight: 600
                                                }}
                                                value={row.status}
                                                onChange={e => updateRow(row.key, 'status', e.target.value)}
                                            >
                                                <option value="zrealizowana">Zrealizowana</option>
                                                <option value="prognoza">Prognoza</option>
                                            </select>
                                        </td>
                                        <td style={{ padding: '0.5rem', textAlign: 'center' }}>
                                            <input
                                                type="number"
                                                className="input-field"
                                                style={{
                                                    margin: 0,
                                                    padding: '0.4rem',
                                                    width: '65px',
                                                    textAlign: 'center',
                                                    opacity: row.status === 'zrealizowana' ? 0.5 : 1
                                                }}
                                                value={row.status === 'zrealizowana' ? 100 : row.prawdopodobienstwo}
                                                onChange={e => updateRow(row.key, 'prawdopodobienstwo', Math.max(0, Math.min(100, parseInt(e.target.value) || 0)))}
                                                disabled={row.status === 'zrealizowana'}
                                                min={0}
                                                max={100}
                                            />
                                        </td>
                                        <td style={{ padding: '0.5rem' }}>
                                            <input
                                                type="text"
                                                className="input-field"
                                                style={{ margin: 0, padding: '0.4rem', width: '150px' }}
                                                value={row.notatka}
                                                onChange={e => updateRow(row.key, 'notatka', e.target.value)}
                                                placeholder="np. akt notarialny"
                                            />
                                        </td>
                                        <td style={{ padding: '0.5rem', textAlign: 'center' }}>
                                            <button
                                                onClick={() => removeRow(row.key)}
                                                className="btn"
                                                style={{ padding: '0.3rem', background: 'transparent', color: 'var(--accent-pink)' }}
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                {/* Sum comparison */}
                {rows.length > 0 && (
                    <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '1rem',
                        background: Math.abs(roznica) > 0.01 ? 'rgba(245, 158, 11, 0.1)' : 'rgba(16, 185, 129, 0.1)',
                        borderRadius: '12px',
                        marginBottom: '1.5rem',
                        border: Math.abs(roznica) > 0.01 ? '1px solid rgba(245, 158, 11, 0.3)' : '1px solid rgba(16, 185, 129, 0.3)'
                    }}>
                        <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap' }}>
                            <div>
                                <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>Suma transz</span>
                                <p style={{ fontWeight: 700 }}>{formatCurrency(sumaTransz)} zł</p>
                            </div>
                            <div>
                                <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>Prowizja netto</span>
                                <p style={{ fontWeight: 700 }}>{formatCurrency(transaction.prowizjaNetto)} zł</p>
                            </div>
                            <div>
                                <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>Różnica</span>
                                <p style={{ fontWeight: 700, color: Math.abs(roznica) > 0.01 ? '#f59e0b' : 'var(--accent-green)' }}>
                                    {formatCurrency(roznica)} zł
                                </p>
                            </div>
                        </div>
                        {Math.abs(roznica) > 0.01 && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#f59e0b' }}>
                                <AlertTriangle size={18} />
                                <span style={{ fontSize: '0.8rem' }}>
                                    Po zapisie prowizja netto zostanie zaktualizowana do sumy transz
                                </span>
                            </div>
                        )}
                    </div>
                )}

                {/* Actions */}
                <div style={{ display: 'flex', gap: '1rem' }}>
                    <button
                        type="button"
                        onClick={onClose}
                        className="btn"
                        style={{ flex: 1, height: '3rem', background: 'var(--bg-card)', border: '1px solid var(--border)' }}
                    >
                        Anuluj
                    </button>
                    <button
                        onClick={handleSave}
                        className="btn btn-primary"
                        style={{ flex: 2, height: '3rem' }}
                        disabled={saving}
                    >
                        <Save size={18} style={{ marginRight: '0.5rem' }} />
                        {saving ? 'Zapisywanie...' : 'Zapisz transze'}
                    </button>
                </div>
            </div>
        </div>
    )
}

export default TrancheEditor
