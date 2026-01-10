import { useState, useEffect, useMemo } from 'react'
import { supabase } from '../lib/supabaseClient'
import type { Transaction, Agent } from '../types'

export function useData() {
    const [dbTransactions, setDbTransactions] = useState<Transaction[]>([])
    const [dbAgents, setDbAgents] = useState<Agent[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [dateRange, setDateRange] = useState({ startMonth: 1, endMonth: 12, year: 2025 })

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

            setDbAgents(agentsData || [])
            setDbTransactions(transData || [])
        } catch (err: any) {
            console.error('Error fetching data:', err)
            setError(err.message)
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

    // 2. Available Years
    const availableYears = useMemo(() => {
        const years = new Set<number>()
        transactions.forEach(t => years.add(t.rok))
        years.add(new Date().getFullYear())
        years.add(new Date().getFullYear() + 1)
        return Array.from(years).sort((a, b) => b - a)
    }, [transactions])

    // 3. Filtered Transactions
    const allTransactions = useMemo(() => {
        const activeAgentNames = new Set(
            allAgents.filter(a => a.status === 'aktywny').map(a => a.name)
        )

        return transactions.filter(t =>
            activeAgentNames.has(t.agent) &&
            t.rok === dateRange.year &&
            t.miesiac >= dateRange.startMonth &&
            t.miesiac <= dateRange.endMonth
        )
    }, [transactions, allAgents, dateRange])

    const unfilteredTransactions = useMemo(() => {
        return transactions.filter(t => t.rok === dateRange.year)
    }, [transactions, dateRange.year])

    const addTransaction = async (transaction: Transaction) => {
        const { id, ...transWithoutId } = transaction
        const { data, error } = await supabase
            .from('transactions')
            .insert([transWithoutId])
            .select()

        if (error) {
            console.error('Error adding transaction:', error)
            return
        }

        if (data) {
            setDbTransactions([data[0], ...dbTransactions])
        }
    }

    const deleteTransaction = async (id: string) => {
        const { error } = await supabase
            .from('transactions')
            .delete()
            .eq('id', id)

        if (error) {
            console.error('Error deleting transaction:', error)
            return
        }

        setDbTransactions(dbTransactions.filter(t => t.id !== id))
    }

    const addAgent = async (agent: Agent) => {
        const { id, ...agentWithoutId } = agent
        const { data, error } = await supabase
            .from('agents')
            .insert([agentWithoutId])
            .select()

        if (error) {
            console.error('Error adding agent:', error)
            return
        }

        if (data) {
            setDbAgents([...dbAgents, data[0]])
        }
    }

    const toggleAgentStatus = async (agentId: string) => {
        const agent = allAgents.find(a => a.id === agentId)
        if (!agent) return

        const newStatus = agent.status === 'aktywny' ? 'nieaktywny' : 'aktywny'

        const { error } = await supabase
            .from('agents')
            .update({ status: newStatus })
            .eq('id', agentId)

        if (error) {
            console.error('Error updating agent status:', error)
            return
        }

        setDbAgents(dbAgents.map(a => a.id === agentId ? { ...a, status: newStatus } : a))
    }

    return {
        allTransactions,
        unfilteredTransactions,
        addTransaction,
        deleteTransaction,
        allAgents,
        addAgent,
        toggleAgentStatus,
        dateRange,
        setDateRange,
        availableYears,
        loading,
        error,
        refreshData: fetchData
    }
}
