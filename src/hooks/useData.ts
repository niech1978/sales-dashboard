import { useState, useEffect, useMemo, useCallback } from 'react'
import { supabase } from '../lib/supabaseClient'
import type { Transaction, Agent, TransactionTranche, EffectiveTranche } from '../types'

export function useData() {
    const [dbTransactions, setDbTransactions] = useState<Transaction[]>([])
    const [dbAgents, setDbAgents] = useState<Agent[]>([])
    const [dbTranches, setDbTranches] = useState<TransactionTranche[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [dateRange, setDateRange] = useState({ startMonth: 1, endMonth: 12, year: 2026 })

    useEffect(() => {
        fetchData()
    }, [])

    async function fetchData() {
        try {
            setLoading(true)

            // 1. Fetch Agents
            const { data: agentsData, error: agentsError } = await supabase
                .from('agents')
                .select('*')
                .order('name')

            if (agentsError) {
                console.warn('Agents fetch info:', agentsError)
                // We don't throw for agents specifically to allow partial functionality,
                // but we should know if the table is missing
                if (agentsError.code === '42P01') throw new Error('Nie znaleziono tabeli "agents" w Supabase. Uruchom skrypt SQL!')
            }

            // 2. Fetch Transactions
            const { data: transData, error: transError } = await supabase
                .from('transactions')
                .select('*')
                .order('rok', { ascending: false })
                .order('miesiac', { ascending: false })

            if (transError) {
                console.warn('Transactions fetch info:', transError)
                if (transError.code === '42P01') throw new Error('Nie znaleziono tabeli "transactions" w Supabase. Uruchom skrypt SQL!')
                throw transError
            }

            // 3. Fetch Tranches
            const { data: tranchesData, error: tranchesError } = await supabase
                .from('transaction_tranches')
                .select('*')
                .order('rok', { ascending: true })
                .order('miesiac', { ascending: true })

            if (tranchesError) {
                // Table may not exist yet - that's ok
                if (tranchesError.code !== '42P01') {
                    console.warn('Tranches fetch info:', tranchesError)
                }
            }

            setDbAgents(agentsData || [])
            setDbTransactions(transData || [])
            setDbTranches(tranchesData || [])
        } catch (err: unknown) {
            console.error('Error fetching data:', err)
            setError(err instanceof Error ? err.message : 'Wystąpił błąd pobierania danych')
        } finally {
            setLoading(false)
        }
    }

    // Simplified transactions memo - only shows DB data
    const transactions = useMemo(() => {
        return dbTransactions
    }, [dbTransactions])

    // Derive agents from DB data (agents are already seeded)
    const allAgents = useMemo(() => {
        return dbAgents
    }, [dbAgents])

    // Tranches grouped by transaction_id
    const tranchesByTransaction = useMemo(() => {
        const map = new Map<string, TransactionTranche[]>()
        dbTranches.forEach(tr => {
            const existing = map.get(tr.transaction_id) || []
            existing.push(tr)
            map.set(tr.transaction_id, existing)
        })
        return map
    }, [dbTranches])

    // Key function: getEffectiveTranches
    const getEffectiveTranches = useCallback((
        txs: Transaction[],
        startMonth: number,
        endMonth: number,
        year: number
    ): EffectiveTranche[] => {
        const result: EffectiveTranche[] = []

        txs.forEach(tx => {
            if (!tx.id) return
            const tranches = tranchesByTransaction.get(tx.id)

            if (!tranches || tranches.length === 0) {
                // No tranches -> implicit single tranche (100%, zrealizowana, cala kwota)
                if (tx.rok === year && tx.miesiac >= startMonth && tx.miesiac <= endMonth) {
                    const koszty = tx.koszty || 0
                    const kredyt = tx.kredyt || 0
                    result.push({
                        transactionId: tx.id,
                        transaction: tx,
                        miesiac: tx.miesiac,
                        rok: tx.rok,
                        kwota: tx.prowizjaNetto,
                        status: 'zrealizowana',
                        prawdopodobienstwo: 100,
                        kwotaZrealizowana: tx.prowizjaNetto,
                        kwotaPrognozaWazona: 0,
                        kwotaPrognozaPelna: 0,
                        udzial: 1,
                        kosztyProporcjonalne: koszty,
                        kredytProporcjonalny: kredyt,
                        wykonanie: tx.prowizjaNetto - koszty + kredyt
                    })
                }
            } else {
                // Has tranches -> filter by date range
                const prowizjaNetto = tx.prowizjaNetto || 0
                const koszty = tx.koszty || 0
                const kredyt = tx.kredyt || 0

                tranches.forEach(tr => {
                    if (tr.rok === year && tr.miesiac >= startMonth && tr.miesiac <= endMonth) {
                        const udzial = prowizjaNetto > 0 ? tr.kwota / prowizjaNetto : 0
                        const kosztyProp = koszty * udzial
                        const kredytProp = kredyt * udzial
                        const isZrealizowana = tr.status === 'zrealizowana'
                        const prob = isZrealizowana ? 100 : tr.prawdopodobienstwo

                        let wykonanie: number
                        if (isZrealizowana) {
                            wykonanie = tr.kwota - kosztyProp + kredytProp
                        } else {
                            wykonanie = (tr.kwota - kosztyProp + kredytProp) * prob / 100
                        }

                        result.push({
                            transactionId: tx.id!,
                            transaction: tx,
                            miesiac: tr.miesiac,
                            rok: tr.rok,
                            kwota: tr.kwota,
                            status: tr.status,
                            prawdopodobienstwo: prob,
                            kwotaZrealizowana: isZrealizowana ? tr.kwota : 0,
                            kwotaPrognozaWazona: isZrealizowana ? 0 : tr.kwota * prob / 100,
                            kwotaPrognozaPelna: isZrealizowana ? 0 : tr.kwota,
                            udzial,
                            kosztyProporcjonalne: kosztyProp,
                            kredytProporcjonalny: kredytProp,
                            wykonanie
                        })
                    }
                })
            }
        })

        return result
    }, [tranchesByTransaction])

    // 2. Available Years
    const availableYears = useMemo(() => {
        const years = new Set<number>()
        transactions.forEach(t => years.add(t.rok))
        years.add(new Date().getFullYear())
        return Array.from(years).sort((a, b) => b - a)
    }, [transactions])

    // 3. Filtered Transactions - transaction is visible if ANY of its tranches falls in date range
    const allTransactions = useMemo(() => {
        const activeAgentNames = new Set(
            allAgents.filter(a => a.status === 'aktywny').map(a => a.name)
        )

        return transactions.filter(t => {
            if (!activeAgentNames.has(t.agent)) return false

            const tranches = t.id ? tranchesByTransaction.get(t.id) : undefined
            if (!tranches || tranches.length === 0) {
                // No tranches - filter by transaction's own date
                return t.rok === dateRange.year &&
                    t.miesiac >= dateRange.startMonth &&
                    t.miesiac <= dateRange.endMonth
            } else {
                // Has tranches - visible if ANY tranche is in range
                return tranches.some(tr =>
                    tr.rok === dateRange.year &&
                    tr.miesiac >= dateRange.startMonth &&
                    tr.miesiac <= dateRange.endMonth
                )
            }
        })
    }, [transactions, allAgents, dateRange, tranchesByTransaction])

    const unfilteredTransactions = useMemo(() => {
        return transactions.filter(t => t.rok === dateRange.year)
    }, [transactions, dateRange.year])

    const addTransaction = async (transaction: Transaction): Promise<string | null> => {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { id: _id, ...transWithoutId } = transaction
        const { data, error } = await supabase
            .from('transactions')
            .insert([transWithoutId])
            .select()

        if (error) {
            console.error('Error adding transaction:', error)
            return error.message
        }

        if (data) {
            setDbTransactions(prev => [data[0], ...prev])
        }
        return null
    }

    const deleteTransaction = async (id: string): Promise<string | null> => {
        const { error } = await supabase
            .from('transactions')
            .delete()
            .eq('id', id)

        if (error) {
            console.error('Error deleting transaction:', error)
            return error.message
        }

        setDbTransactions(prev => prev.filter(t => t.id !== id))
        // Tranches are cascade-deleted by DB
        setDbTranches(prev => prev.filter(tr => tr.transaction_id !== id))
        return null
    }

    const updateTransaction = async (transaction: Transaction): Promise<string | null> => {
        if (!transaction.id) {
            return 'Brak ID transakcji'
        }

        const { id, ...transWithoutId } = transaction
        const { data, error } = await supabase
            .from('transactions')
            .update(transWithoutId)
            .eq('id', id)
            .select()

        if (error) {
            console.error('Error updating transaction:', error)
            return error.message
        }

        if (data) {
            setDbTransactions(prev => prev.map(t => t.id === id ? data[0] : t))
        }
        return null
    }

    // CRUD for tranches: delete all + insert new + update parent prowizjaNetto
    const saveTranches = async (transactionId: string, tranches: Omit<TransactionTranche, 'id' | 'transaction_id' | 'created_at' | 'updated_at'>[]): Promise<string | null> => {
        // 1. Delete existing tranches for this transaction
        const { error: deleteError } = await supabase
            .from('transaction_tranches')
            .delete()
            .eq('transaction_id', transactionId)

        if (deleteError) {
            console.error('Error deleting tranches:', deleteError)
            return deleteError.message
        }

        // 2. Insert new tranches (if any)
        let newTranches: TransactionTranche[] = []
        if (tranches.length > 0) {
            const toInsert = tranches.map(tr => ({
                transaction_id: transactionId,
                miesiac: tr.miesiac,
                rok: tr.rok,
                kwota: tr.kwota,
                status: tr.status,
                prawdopodobienstwo: tr.status === 'zrealizowana' ? 100 : tr.prawdopodobienstwo,
                notatka: tr.notatka || null
            }))

            const { data: insertedData, error: insertError } = await supabase
                .from('transaction_tranches')
                .insert(toInsert)
                .select()

            if (insertError) {
                console.error('Error inserting tranches:', insertError)
                // Re-fetch to restore consistent state after partial failure
                await fetchData()
                return insertError.message
            }

            newTranches = insertedData || []
        }

        // 3. Update parent prowizjaNetto to sum of tranches (if tranches exist)
        if (tranches.length > 0) {
            const sumKwota = tranches.reduce((sum, tr) => sum + tr.kwota, 0)
            const { error: updateError } = await supabase
                .from('transactions')
                .update({ prowizjaNetto: sumKwota })
                .eq('id', transactionId)
                .select()

            if (updateError) {
                console.error('Error updating transaction prowizjaNetto:', updateError)
            } else {
                setDbTransactions(prev => prev.map(t =>
                    t.id === transactionId ? { ...t, prowizjaNetto: sumKwota } : t
                ))
            }
        }

        // 4. Update local tranches state
        setDbTranches(prev => {
            const filtered = prev.filter(tr => tr.transaction_id !== transactionId)
            return [...filtered, ...newTranches]
        })
        return null
    }

    const addAgent = async (agent: Agent): Promise<string | null> => {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { id: _id, ...agentWithoutId } = agent
        const { data, error } = await supabase
            .from('agents')
            .insert([agentWithoutId])
            .select()

        if (error) {
            console.error('Error adding agent:', error)
            return error.message
        }

        if (data) {
            setDbAgents(prev => [...prev, data[0]])
        }
        return null
    }

    const toggleAgentStatus = async (agentId: string): Promise<string | null> => {
        const agent = allAgents.find(a => a.id === agentId)
        if (!agent) return 'Agent nie znaleziony'

        const newStatus = agent.status === 'aktywny' ? 'nieaktywny' : 'aktywny'

        const { error } = await supabase
            .from('agents')
            .update({ status: newStatus })
            .eq('id', agentId)

        if (error) {
            console.error('Error updating agent status:', error)
            return error.message
        }

        setDbAgents(prev => prev.map(a => a.id === agentId ? { ...a, status: newStatus } : a))
        return null
    }

    return {
        allTransactions,
        unfilteredTransactions,
        addTransaction,
        updateTransaction,
        deleteTransaction,
        allAgents,
        addAgent,
        toggleAgentStatus,
        dateRange,
        setDateRange,
        availableYears,
        loading,
        error,
        transactions,
        refreshData: fetchData,
        tranchesByTransaction,
        getEffectiveTranches,
        saveTranches
    }
}
