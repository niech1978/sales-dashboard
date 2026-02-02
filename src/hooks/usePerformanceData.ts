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

                // Calculate wykonanie from transactions (prowizja - koszty + kredyt)
                const monthTransactions = yearTransactions.filter(
                    t => t.oddzial === branch && t.miesiac === month
                )
                const wykonanie = monthTransactions.reduce((sum, t) => {
                    const prowizja = t.prowizjaNetto || 0
                    const koszty = t.koszty || 0
                    const kredyt = t.kredyt || 0
                    return sum + (prowizja - koszty + kredyt)
                }, 0)

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

    // Calculate wykonanie (prowizja - koszty + kredyt) from transactions for each agent
    // Also include agents from transactions who don't have a performance record yet
    const agentPerformanceWithProwizja = useMemo(() => {
        // Get all unique agents from transactions with their branch
        const agentsFromTransactions = new Map<string, { name: string; oddzial: string; prowizja: number }>()

        yearTransactions.forEach(t => {
            if (t.agent) {
                const prowizja = t.prowizjaNetto || 0
                const koszty = t.koszty || 0
                const kredyt = t.kredyt || 0
                const wykonanie = prowizja - koszty + kredyt

                if (wykonanie > 0 || prowizja > 0) {
                    const existing = agentsFromTransactions.get(t.agent)
                    if (existing) {
                        existing.prowizja += wykonanie
                    } else {
                        agentsFromTransactions.set(t.agent, {
                            name: t.agent,
                            oddzial: t.oddzial,
                            prowizja: wykonanie
                        })
                    }
                }
            }
        })

        // Update existing performance records with prowizja from transactions
        const updatedPerformance = agentPerformance.map(agent => {
            const transactionData = agentsFromTransactions.get(agent.agent_name)
            const prowizjaFromTransactions = transactionData?.prowizja || 0

            // Remove from map so we know it's already processed
            agentsFromTransactions.delete(agent.agent_name)

            return {
                ...agent,
                prowizja_netto_kredyt: prowizjaFromTransactions
            }
        })

        // Add agents from transactions who don't have a performance record
        const newAgentsFromTransactions: AgentPerformance[] = Array.from(agentsFromTransactions.values()).map(agent => ({
            agent_name: agent.name,
            oddzial: agent.oddzial,
            rok: year,
            miesiac: null,
            prowizja_netto_kredyt: agent.prowizja,
            spotkania_pozyskowe: 0,
            nowe_umowy: 0,
            prezentacje: 0,
            mieszkania: 0,
            domy: 0,
            dzialki: 0,
            inne: 0,
            suma_nieruchomosci: 0
        }))

        return [...updatedPerformance, ...newAgentsFromTransactions]
    }, [agentPerformance, yearTransactions, year])

    // Aggregate stats by branch - use full agent list including those from transactions
    const branchPerformance = useMemo(() => {
        const branches = ['Kraków', 'Warszawa', 'Olsztyn']
        return branches.map(branch => {
            // Use the merged agent list (including agents from transactions)
            const agents = agentPerformanceWithProwizja.filter(a => a.oddzial === branch)
            const targets = branchTargets.filter(t => t.oddzial === branch)

            // Wykonanie from transactions (prowizja - koszty + kredyt)
            const branchTransactions = yearTransactions.filter(t => t.oddzial === branch)
            const totalProwizja = branchTransactions.reduce((sum, t) => {
                const prowizja = t.prowizjaNetto || 0
                const koszty = t.koszty || 0
                const kredyt = t.kredyt || 0
                return sum + (prowizja - koszty + kredyt)
            }, 0)
            const totalSpotkania = agents.reduce((sum, a) => sum + (a.spotkania_pozyskowe || 0), 0)
            const totalUmowy = agents.reduce((sum, a) => sum + (a.nowe_umowy || 0), 0)
            const totalPrezentacje = agents.reduce((sum, a) => sum + (a.prezentacje || 0), 0)
            const totalNieruchomosci = agents.reduce((sum, a) => sum + (a.suma_nieruchomosci || 0), 0)

            const planTotal = targets.reduce((sum, t) => sum + (t.plan_kwota || 0), 0)
            // Wykonanie teraz z transakcji (prowizja - koszty + kredyt)
            const wykonanieTotal = branchTransactions.reduce((sum, t) => {
                const prowizja = t.prowizjaNetto || 0
                const koszty = t.koszty || 0
                const kredyt = t.kredyt || 0
                return sum + (prowizja - koszty + kredyt)
            }, 0)

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
    }, [agentPerformanceWithProwizja, branchTargets, yearTransactions])

    // Top agents across all branches
    const topAgents = useMemo(() => {
        return [...agentPerformanceWithProwizja]
            .sort((a, b) => (b.prowizja_netto_kredyt || 0) - (a.prowizja_netto_kredyt || 0))
            .slice(0, 10)
    }, [agentPerformanceWithProwizja])

    // Monthly targets chart data - wykonanie from transactions (prowizja - koszty + kredyt)
    const monthlyTargetsData = useMemo(() => {
        const months = ['Sty', 'Lut', 'Mar', 'Kwi', 'Maj', 'Cze', 'Lip', 'Sie', 'Wrz', 'Paź', 'Lis', 'Gru']
        return months.map((name, index) => {
            const month = index + 1
            const monthTargets = branchTargetsFromDb.filter(t => t.miesiac === month)
            const plan = monthTargets.reduce((sum, t) => sum + (t.plan_kwota || 0), 0)

            // Wykonanie from transactions (prowizja - koszty + kredyt)
            const wykonanie = yearTransactions
                .filter(t => t.miesiac === month)
                .reduce((sum, t) => {
                    const prowizja = t.prowizjaNetto || 0
                    const koszty = t.koszty || 0
                    const kredyt = t.kredyt || 0
                    return sum + (prowizja - koszty + kredyt)
                }, 0)

            return { name, plan, wykonanie }
        })
    }, [branchTargetsFromDb, yearTransactions])

    return {
        agentPerformance: agentPerformanceWithProwizja, // prowizja from transactions
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
