import { supabase } from './supabaseClient'
import { initialTransactions } from '../data/initialData'

export async function seedDatabase(): Promise<'synced' | 'skipped'> {
    console.log('Starting synchronization with Supabase...')

    // 1. Seed Agents
    const agentsMap = new Map()
    initialTransactions.forEach(t => {
        if (!agentsMap.has(t.agent)) {
            agentsMap.set(t.agent, {
                name: t.agent,
                oddzial: t.oddzial,
                status: 'aktywny'
            })
        }
    })

    const agentsToInsert = Array.from(agentsMap.values())
    console.log(`Syncing ${agentsToInsert.length} agents...`)

    const { error: agentError } = await supabase
        .from('agents')
        .upsert(agentsToInsert, { onConflict: 'name' })

    if (agentError) {
        console.error('Error seeding agents:', agentError)
        throw new Error(`Błąd agentów: ${agentError.message}`)
    }

    // 2. Clear or Check Transactions
    // To prevent duplicates, we check if there are any transactions already
    const { count, error: countError } = await supabase
        .from('transactions')
        .select('*', { count: 'exact', head: true })

    if (countError) {
        console.error('Error checking transaction count:', countError)
        throw new Error('Nie udało się sprawdzić stanu bazy danych.')
    }

    if (count && count > 0) {
        console.log('Database already contains transactions. Skipping initial seed.')
        return 'skipped'
    }

    // 3. Seed Transactions in batches
    const batchSize = 500
    console.log(`Syncing ${initialTransactions.length} transactions...`)

    for (let i = 0; i < initialTransactions.length; i += batchSize) {
        const batch = initialTransactions.slice(i, i + batchSize).map(t => ({
            oddzial: t.oddzial,
            miesiac: t.miesiac,
            rok: t.rok,
            agent: t.agent,
            typNieruchomosci: t.typNieruchomosci,
            strona: t.strona,
            transakcja: t.transakcja || "",
            adres: t.adres || "",
            prowizjaNetto: Number(t.prowizjaNetto) || 0,
            wartoscNieruchomosci: Number(t.wartoscNieruchomosci) || 0
        }))

        const { error: transError } = await supabase
            .from('transactions')
            .insert(batch)

        if (transError) {
            console.error(`Error seeding transactions batch ${i / batchSize + 1}:`, transError)
            throw new Error(`Błąd zapisu transakcji (batch ${i / batchSize + 1}): ${transError.message}`)
        }
        console.log(`Batch ${i / batchSize + 1} synced...`)
    }

    console.log('Synchronization completed successfully!')
    return 'synced'
}
