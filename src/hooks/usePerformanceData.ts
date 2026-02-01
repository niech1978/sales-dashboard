import { useState, useEffect, useMemo } from 'react'
import { supabase } from '../lib/supabaseClient'
import type { AgentPerformance, BranchTarget } from '../types'

export function usePerformanceData(year: number = 2025) {
    const [agentPerformance, setAgentPerformance] = useState<AgentPerformance[]>([])
    const [branchTargets, setBranchTargets] = useState<BranchTarget[]>([])
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

            // Fetch branch targets
            const { data: targetData, error: targetError } = await supabase
                .from('branch_targets')
                .select('*')
                .eq('rok', year)
                .order('miesiac')

            if (targetError && targetError.code !== '42P01') {
                console.warn('Branch targets fetch error:', targetError)
            }

            setAgentPerformance(perfData || [])
            setBranchTargets(targetData || [])
        } catch (err) {
            console.error('Error fetching performance data:', err)
            setError(err instanceof Error ? err.message : 'Błąd pobierania danych')
        } finally {
            setLoading(false)
        }
    }

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
            const wykonanieTotal = targets.reduce((sum, t) => sum + (t.wykonanie_kwota || 0), 0)

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
    }, [agentPerformance, branchTargets])

    // Top agents across all branches
    const topAgents = useMemo(() => {
        return [...agentPerformance]
            .sort((a, b) => (b.prowizja_netto_kredyt || 0) - (a.prowizja_netto_kredyt || 0))
            .slice(0, 10)
    }, [agentPerformance])

    // Monthly targets chart data
    const monthlyTargetsData = useMemo(() => {
        const months = ['Sty', 'Lut', 'Mar', 'Kwi', 'Maj', 'Cze', 'Lip', 'Sie', 'Wrz', 'Paź', 'Lis', 'Gru']
        return months.map((name, index) => {
            const monthTargets = branchTargets.filter(t => t.miesiac === index + 1)
            return {
                name,
                plan: monthTargets.reduce((sum, t) => sum + (t.plan_kwota || 0), 0),
                wykonanie: monthTargets.reduce((sum, t) => sum + (t.wykonanie_kwota || 0), 0)
            }
        })
    }, [branchTargets])

    return {
        agentPerformance,
        branchTargets,
        branchPerformance,
        topAgents,
        monthlyTargetsData,
        loading,
        error,
        refreshData: fetchData
    }
}
