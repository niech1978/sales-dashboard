import { useState, useEffect, useMemo } from 'react'
import { supabase } from '../lib/supabaseClient'
import type { AgentPerformance, BranchTarget, Transaction } from '../types'

interface BranchTargetWithWykonanie extends Omit<BranchTarget, 'wykonanie_kwota'> {
    plan_kwota: number
    wykonanie_kwota: number // calculated from transactions
}

export function usePerformanceData(year: number = 2026, transactions: Transaction[] = []) {
    const [agentPerformance, setAgentPerformance] = useState<AgentPerformance[]>([])
    const [branchTargetsFromDb, setBranchTargetsFromDb] = useState<BranchTarget[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        fetchData()
    }, [year])

    async function fetchData() {
        try {
            setLoading(true)
            setError(null)

            // Fetch agent performance
            const { data: perfData, error: perfError } = await supabase
                .from('agent_performance')
                .select('*')
                .eq('rok', year)
                .order('prowizja_netto_kredyt', { ascending: false })

            if (perfError && perfError.code !== '42P01') {
                console.warn('Agent performance fetch error:', perfError)
            }

            // Fetch branch targets (only plan_kwota matters now)
            const { data: targetData, error: targetError } = await supabase
                .from('branch_targets')
                .select('*')
                .eq('rok', year)
                .order('miesiac')

            if (targetError && targetError.code !== '42P01') {
                console.warn('Branch targets fetch error:', targetError)
            }

            setAgentPerformance(perfData || [])
            setBranchTargetsFromDb(targetData || [])
        } catch (err) {
            console.error('Error fetching performance data:', err)
            setError(err instanceof Error ? err.message : 'Błąd pobierania danych')
        } finally {
            setLoading(false)
        }
    }

    // Filter transactions for the selected year
    const yearTransactions = useMemo(() => {
        return transactions.filter(t => t.rok === year)
    }, [transactions, year])

    // Calculate wykonanie from transactions per branch per month
    const branchTargets: BranchTargetWithWykonanie[] = useMemo(() => {
        const branches = ['Kraków', 'Warszawa', 'Olsztyn']
        const result: BranchTargetWithWykonanie[] = []

        branches.forEach(branch => {
            for (let month = 1; month <= 12; month++) {
                // Get plan from DB
                const dbTarget = branchTargetsFromDb.find(t => t.oddzial === branch && t.miesiac === month)
                const plan = dbTarget?.plan_kwota || 0

                // Calculate wykonanie from transactions
                const monthTransactions = yearTransactions.filter(
                    t => t.oddzial === branch && t.miesiac === month
                )
                const wykonanie = monthTransactions.reduce((sum, t) => sum + (t.prowizjaNetto || 0), 0)

                // Only include if there's a plan or wykonanie
                if (plan > 0 || wykonanie > 0) {
                    result.push({
                        id: dbTarget?.id,
                        oddzial: branch,
                        rok: year,
                        miesiac: month,
                        plan_kwota: plan,
                        wykonanie_kwota: wykonanie
                    })
                }
            }
        })

        return result
    }, [branchTargetsFromDb, yearTransactions, year])

    // Aggregate stats by branch
    const branchPerformance = useMemo(() => {
        const branches = ['Kraków', 'Warszawa', 'Olsztyn']
        return branches.map(branch => {
            const agents = agentPerformance.filter(a => a.oddzial === branch)
            const targets = branchTargets.filter(t => t.oddzial === branch)

            const totalProwizja = agents.reduce((sum, a) => sum + (a.prowizja_netto_kredyt || 0), 0)
            const totalSpotkania = agents.reduce((sum, a) => sum + (a.spotkania_pozyskowe || 0), 0)
            const totalUmowy = agents.reduce((sum, a) => sum + (a.nowe_umowy || 0), 0)
            const totalPrezentacje = agents.reduce((sum, a) => sum + (a.prezentacje || 0), 0)
            const totalNieruchomosci = agents.reduce((sum, a) => sum + (a.suma_nieruchomosci || 0), 0)

            const planTotal = targets.reduce((sum, t) => sum + (t.plan_kwota || 0), 0)
            // Wykonanie teraz z transakcji
            const wykonanieTotal = yearTransactions
                .filter(t => t.oddzial === branch)
                .reduce((sum, t) => sum + (t.prowizjaNetto || 0), 0)

            return {
                oddzial: branch,
                agentCount: agents.length,
                totalProwizja,
                totalSpotkania,
                totalUmowy,
                totalPrezentacje,
                totalNieruchomosci,
                planTotal,
                wykonanieTotal,
                wykonaniePercent: planTotal > 0 ? (wykonanieTotal / planTotal) * 100 : 0
            }
        })
    }, [agentPerformance, branchTargets, yearTransactions])

    // Top agents across all branches
    const topAgents = useMemo(() => {
        return [...agentPerformance]
            .sort((a, b) => (b.prowizja_netto_kredyt || 0) - (a.prowizja_netto_kredyt || 0))
            .slice(0, 10)
    }, [agentPerformance])

    // Monthly targets chart data - wykonanie from transactions
    const monthlyTargetsData = useMemo(() => {
        const months = ['Sty', 'Lut', 'Mar', 'Kwi', 'Maj', 'Cze', 'Lip', 'Sie', 'Wrz', 'Paź', 'Lis', 'Gru']
        return months.map((name, index) => {
            const month = index + 1
            const monthTargets = branchTargetsFromDb.filter(t => t.miesiac === month)
            const plan = monthTargets.reduce((sum, t) => sum + (t.plan_kwota || 0), 0)

            // Wykonanie from transactions
            const wykonanie = yearTransactions
                .filter(t => t.miesiac === month)
                .reduce((sum, t) => sum + (t.prowizjaNetto || 0), 0)

            return { name, plan, wykonanie }
        })
    }, [branchTargetsFromDb, yearTransactions])

    return {
        agentPerformance,
        branchTargets,
        branchTargetsFromDb, // only plans from DB
        branchPerformance,
        topAgents,
        monthlyTargetsData,
        loading,
        error,
        refreshData: fetchData
    }
}
