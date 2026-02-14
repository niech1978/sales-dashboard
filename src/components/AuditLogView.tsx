import { useState, useEffect, useCallback } from 'react'
import { RefreshCw, ChevronLeft, ChevronRight } from 'lucide-react'
import { supabase } from '../lib/supabaseClient'

interface AuditLogEntry {
    id: number
    tabela: string
    akcja: 'INSERT' | 'UPDATE' | 'DELETE'
    rekord_id: string | null
    uzytkownik_email: string | null
    stare_dane: Record<string, unknown> | null
    nowe_dane: Record<string, unknown> | null
    created_at: string
}

const PAGE_SIZE = 30

const akcjaColors: Record<string, { bg: string; color: string }> = {
    INSERT: { bg: 'rgba(16, 185, 129, 0.15)', color: '#10b981' },
    UPDATE: { bg: 'rgba(59, 130, 246, 0.15)', color: '#3b82f6' },
    DELETE: { bg: 'rgba(236, 72, 153, 0.15)', color: '#ec4899' }
}

const akcjaLabels: Record<string, string> = {
    INSERT: 'DODANO',
    UPDATE: 'EDYCJA',
    DELETE: 'USUNIĘTO'
}

const tabelaLabels: Record<string, string> = {
    transactions: 'Transakcje',
    agents: 'Agenci',
    transaction_tranches: 'Transze',
    branch_targets: 'Plany'
}

const AuditLogView = () => {
    const [logs, setLogs] = useState<AuditLogEntry[]>([])
    const [loading, setLoading] = useState(true)
    const [page, setPage] = useState(0)
    const [totalCount, setTotalCount] = useState(0)
    const [filterTabela, setFilterTabela] = useState('all')
    const [filterAkcja, setFilterAkcja] = useState('all')
    const [expandedId, setExpandedId] = useState<number | null>(null)

    const fetchLogs = useCallback(async () => {
        setLoading(true)
        let query = supabase
            .from('audit_log')
            .select('*', { count: 'exact' })
            .order('created_at', { ascending: false })
            .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1)

        if (filterTabela !== 'all') query = query.eq('tabela', filterTabela)
        if (filterAkcja !== 'all') query = query.eq('akcja', filterAkcja)

        const { data, count, error } = await query

        if (error) {
            console.error('Error fetching audit logs:', error)
        } else {
            setLogs(data || [])
            setTotalCount(count || 0)
        }
        setLoading(false)
    }, [page, filterTabela, filterAkcja])

    useEffect(() => {
        fetchLogs()
    }, [fetchLogs])

    useEffect(() => {
        setPage(0)
    }, [filterTabela, filterAkcja])

    const totalPages = Math.ceil(totalCount / PAGE_SIZE)

    const formatDate = (dateStr: string) => {
        const d = new Date(dateStr)
        return d.toLocaleString('pl-PL', {
            day: '2-digit', month: '2-digit', year: 'numeric',
            hour: '2-digit', minute: '2-digit', second: '2-digit'
        })
    }

    const getChangedFields = (oldData: Record<string, unknown> | null, newData: Record<string, unknown> | null): string[] => {
        if (!oldData || !newData) return []
        return Object.keys(newData).filter(key => {
            if (key === 'updated_at' || key === 'created_at') return false
            return JSON.stringify(oldData[key]) !== JSON.stringify(newData[key])
        })
    }

    const getSummary = (log: AuditLogEntry): string => {
        const data = log.nowe_dane || log.stare_dane
        if (!data) return ''

        if (log.tabela === 'transactions') {
            return `${data.agent || ''} • ${data.oddzial || ''} • ${data.strona || ''}`
        }
        if (log.tabela === 'agents') {
            return `${data.name || ''} • ${data.oddzial || ''}`
        }
        if (log.tabela === 'transaction_tranches') {
            return `Transza ${data.miesiac || ''}/${data.rok || ''} • ${data.kwota || 0} zł`
        }
        if (log.tabela === 'branch_targets') {
            return `${data.oddzial || ''} • ${data.miesiac || ''}/${data.rok || ''}`
        }
        return ''
    }

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h2 style={{ fontSize: '1.5rem', fontWeight: 700 }}>Historia Zmian</h2>
                <button className="btn" onClick={fetchLogs} style={{ padding: '0.5rem 1rem', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border)' }}>
                    <RefreshCw size={16} style={{ marginRight: '0.5rem' }} /> Odśwież
                </button>
            </div>

            <div className="glass-card" style={{ display: 'flex', gap: '1rem', padding: '1rem 1.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
                <span style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Filtruj:</span>
                <select
                    className="input-field"
                    style={{ margin: 0, padding: '0.5rem', width: '160px' }}
                    value={filterTabela}
                    onChange={e => setFilterTabela(e.target.value)}
                >
                    <option value="all">Wszystkie tabele</option>
                    <option value="transactions">Transakcje</option>
                    <option value="agents">Agenci</option>
                    <option value="transaction_tranches">Transze</option>
                    <option value="branch_targets">Plany</option>
                </select>
                <select
                    className="input-field"
                    style={{ margin: 0, padding: '0.5rem', width: '140px' }}
                    value={filterAkcja}
                    onChange={e => setFilterAkcja(e.target.value)}
                >
                    <option value="all">Wszystkie akcje</option>
                    <option value="INSERT">Dodanie</option>
                    <option value="UPDATE">Edycja</option>
                    <option value="DELETE">Usunięcie</option>
                </select>
                <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginLeft: 'auto' }}>
                    {totalCount} wpisów
                </span>
            </div>

            {loading ? (
                <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}>
                    <RefreshCw className="animate-spin" size={32} color="var(--primary)" />
                </div>
            ) : logs.length === 0 ? (
                <div className="glass-card" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                    Brak logów do wyświetlenia
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {logs.map(log => {
                        const colors = akcjaColors[log.akcja] || { bg: 'rgba(255,255,255,0.05)', color: 'var(--text-muted)' }
                        const isExpanded = expandedId === log.id
                        const changedFields = log.akcja === 'UPDATE' ? getChangedFields(log.stare_dane, log.nowe_dane) : []

                        return (
                            <div
                                key={log.id}
                                className="glass-card"
                                style={{ padding: '1rem 1.5rem', cursor: 'pointer', transition: 'all 0.2s' }}
                                onClick={() => setExpandedId(isExpanded ? null : log.id)}
                            >
                                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                                    <span style={{
                                        padding: '0.2rem 0.6rem',
                                        borderRadius: '6px',
                                        fontSize: '0.7rem',
                                        fontWeight: 700,
                                        background: colors.bg,
                                        color: colors.color,
                                        minWidth: '70px',
                                        textAlign: 'center'
                                    }}>
                                        {akcjaLabels[log.akcja] || log.akcja}
                                    </span>
                                    <span style={{
                                        padding: '0.2rem 0.6rem',
                                        borderRadius: '6px',
                                        fontSize: '0.7rem',
                                        fontWeight: 600,
                                        background: 'rgba(255,255,255,0.05)',
                                        color: 'var(--text-muted)'
                                    }}>
                                        {tabelaLabels[log.tabela] || log.tabela}
                                    </span>
                                    <span style={{ fontSize: '0.85rem', flex: 1 }}>
                                        {getSummary(log)}
                                    </span>
                                    {changedFields.length > 0 && (
                                        <span style={{ fontSize: '0.75rem', color: 'var(--accent-blue)' }}>
                                            {changedFields.length} zmian
                                        </span>
                                    )}
                                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                                        {formatDate(log.created_at)}
                                    </span>
                                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                        {log.uzytkownik_email || 'system'}
                                    </span>
                                </div>

                                {isExpanded && (
                                    <div style={{ marginTop: '1rem', borderTop: '1px solid var(--border)', paddingTop: '1rem' }}>
                                        {log.akcja === 'UPDATE' && changedFields.length > 0 && (
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                                <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)' }}>Zmienione pola:</span>
                                                {changedFields.map(field => (
                                                    <div key={field} style={{ display: 'flex', gap: '1rem', fontSize: '0.8rem', padding: '0.25rem 0' }}>
                                                        <span style={{ fontWeight: 600, minWidth: '150px', color: 'var(--accent-blue)' }}>{field}</span>
                                                        <span style={{ color: 'var(--accent-pink)' }}>
                                                            {JSON.stringify(log.stare_dane?.[field]) ?? 'null'}
                                                        </span>
                                                        <span style={{ color: 'var(--text-muted)' }}>→</span>
                                                        <span style={{ color: 'var(--accent-green)' }}>
                                                            {JSON.stringify(log.nowe_dane?.[field]) ?? 'null'}
                                                        </span>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                        {log.akcja === 'INSERT' && log.nowe_dane && (
                                            <pre style={{ fontSize: '0.75rem', color: 'var(--text-muted)', overflowX: 'auto', whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
                                                {JSON.stringify(log.nowe_dane, null, 2)}
                                            </pre>
                                        )}
                                        {log.akcja === 'DELETE' && log.stare_dane && (
                                            <pre style={{ fontSize: '0.75rem', color: 'var(--accent-pink)', overflowX: 'auto', whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
                                                {JSON.stringify(log.stare_dane, null, 2)}
                                            </pre>
                                        )}
                                    </div>
                                )}
                            </div>
                        )
                    })}
                </div>
            )}

            {totalPages > 1 && (
                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '1rem', padding: '1rem 0' }}>
                    <button
                        className="btn"
                        style={{ padding: '0.5rem', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border)' }}
                        onClick={() => setPage(p => Math.max(0, p - 1))}
                        disabled={page === 0}
                    >
                        <ChevronLeft size={18} />
                    </button>
                    <span style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                        {page + 1} / {totalPages}
                    </span>
                    <button
                        className="btn"
                        style={{ padding: '0.5rem', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border)' }}
                        onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                        disabled={page >= totalPages - 1}
                    >
                        <ChevronRight size={18} />
                    </button>
                </div>
            )}
        </div>
    )
}

export default AuditLogView
