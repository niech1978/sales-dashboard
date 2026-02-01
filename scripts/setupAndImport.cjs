/**
 * Setup tables and import data to Supabase
 * Run with: node scripts/setupAndImport.cjs
 */

const fs = require('fs');
const path = require('path');
const Papa = require('papaparse');
const { createClient } = require('@supabase/supabase-js');

// Supabase configuration with SERVICE ROLE key (admin access)
const SUPABASE_URL = 'https://ihnsjocfipigwnojqsxv.supabase.co';
const SUPABASE_SERVICE_KEY = 'sb_secret_me4sYTwjJkUOmZ4S-1ysOQ_2Eiz1W0x';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// SQL to create tables
const CREATE_TABLES_SQL = `
-- 1. Agent Performance Table
CREATE TABLE IF NOT EXISTS agent_performance (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    agent_name TEXT NOT NULL,
    oddzial TEXT NOT NULL,
    rok INTEGER NOT NULL,
    miesiac INTEGER,
    prowizja_netto_kredyt DECIMAL(12,2) DEFAULT 0,
    spotkania_pozyskowe INTEGER DEFAULT 0,
    nowe_umowy INTEGER DEFAULT 0,
    prezentacje INTEGER DEFAULT 0,
    mieszkania INTEGER DEFAULT 0,
    domy INTEGER DEFAULT 0,
    dzialki INTEGER DEFAULT 0,
    inne INTEGER DEFAULT 0,
    suma_nieruchomosci INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(agent_name, oddzial, rok, miesiac)
);

-- 2. Branch Targets Table
CREATE TABLE IF NOT EXISTS branch_targets (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    oddzial TEXT NOT NULL,
    rok INTEGER NOT NULL,
    miesiac INTEGER NOT NULL,
    plan_kwota DECIMAL(12,2) DEFAULT 0,
    wykonanie_kwota DECIMAL(12,2) DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(oddzial, rok, miesiac)
);
`;

const ENABLE_RLS_SQL = `
ALTER TABLE agent_performance ENABLE ROW LEVEL SECURITY;
ALTER TABLE branch_targets ENABLE ROW LEVEL SECURITY;
`;

const CREATE_POLICIES_SQL = `
DO $$
BEGIN
    -- Policies for agent_performance
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'agent_performance' AND policyname = 'Allow all for authenticated') THEN
        CREATE POLICY "Allow all for authenticated" ON agent_performance FOR ALL TO authenticated USING (true) WITH CHECK (true);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'agent_performance' AND policyname = 'Allow read for anon') THEN
        CREATE POLICY "Allow read for anon" ON agent_performance FOR SELECT TO anon USING (true);
    END IF;

    -- Policies for branch_targets
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'branch_targets' AND policyname = 'Allow all for authenticated') THEN
        CREATE POLICY "Allow all for authenticated" ON branch_targets FOR ALL TO authenticated USING (true) WITH CHECK (true);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'branch_targets' AND policyname = 'Allow read for anon') THEN
        CREATE POLICY "Allow read for anon" ON branch_targets FOR SELECT TO anon USING (true);
    END IF;
END $$;
`;

// Parse Polish currency format to number
function parseCurrency(value) {
    if (!value || value === '-' || value === '0' || value === 0) return 0;
    const cleaned = value.toString()
        .replace(/zł/gi, '')
        .replace(/PLN/gi, '')
        .replace(/\s/g, '')
        .replace(/\./g, '')
        .replace(',', '.');
    return parseFloat(cleaned) || 0;
}

function parseIntSafe(value) {
    if (!value || value === '-') return 0;
    return parseInt(value.toString().replace(/\s/g, ''), 10) || 0;
}

function parseCSV(filePath) {
    const content = fs.readFileSync(filePath, 'utf-8');
    const parsed = Papa.parse(content, { header: false, skipEmptyLines: false });
    const rows = parsed.data;

    const agentPerformance = [];
    const branchTargets = [];

    let currentBranch = '';
    let inAgentSection = false;

    for (let i = 0; i < rows.length; i++) {
        const cells = rows[i].map(c => (c || '').toString().trim());

        if (cells[1] && ['Warszawa', 'Kraków', 'Olsztyn'].includes(cells[1])) {
            currentBranch = cells[1];
        }

        if (cells[0] && cells[0].includes('Zespół oddziału:')) {
            const match = cells[0].match(/Zespół oddziału:\s*(\w+)/);
            if (match) currentBranch = match[1];
            inAgentSection = true;
            continue;
        }

        if (cells[0] === 'PLAN' && currentBranch) {
            for (let m = 0; m < 12; m++) {
                const planValue = parseCurrency(cells[m + 1]);
                if (planValue > 0) {
                    branchTargets.push({
                        oddzial: currentBranch,
                        rok: 2025,
                        miesiac: m + 1,
                        plan_kwota: planValue,
                        wykonanie_kwota: 0
                    });
                }
            }
            continue;
        }

        if (cells[0] === 'WYKONANIE' && currentBranch) {
            for (let m = 0; m < 12; m++) {
                const wykonanieValue = parseCurrency(cells[m + 1]);
                const target = branchTargets.find(t =>
                    t.oddzial === currentBranch && t.rok === 2025 && t.miesiac === m + 1
                );
                if (target) target.wykonanie_kwota = wykonanieValue;
            }
            continue;
        }

        if (inAgentSection && cells[1]) {
            const agentName = cells[1].trim();
            if (!agentName || agentName === 'Agent' || agentName.startsWith('Rodzaj') || agentName.length < 3) continue;

            if (/^[A-ZŁŚŻŹĆŃĘ][a-ząęółśżźćń]+\s+[A-ZŁŚŻŹĆŃĘ]/.test(agentName)) {
                agentPerformance.push({
                    agent_name: agentName,
                    oddzial: currentBranch,
                    rok: 2025,
                    miesiac: null,
                    prowizja_netto_kredyt: parseCurrency(cells[2]),
                    spotkania_pozyskowe: parseIntSafe(cells[3]),
                    nowe_umowy: parseIntSafe(cells[4]),
                    prezentacje: parseIntSafe(cells[5]),
                    mieszkania: parseIntSafe(cells[6]),
                    domy: parseIntSafe(cells[7]),
                    dzialki: parseIntSafe(cells[8]),
                    inne: parseIntSafe(cells[9]),
                    suma_nieruchomosci: parseIntSafe(cells[10])
                });
            }
        }
    }

    return { agentPerformance, branchTargets };
}

async function main() {
    console.log('🚀 Starting Supabase setup and import...\n');

    // Step 1: Check if tables exist
    console.log('📦 Checking tables...');
    const { data: tableCheck, error: checkError } = await supabase
        .from('agent_performance')
        .select('id')
        .limit(1);

    if (checkError && checkError.code === 'PGRST205') {
        console.log('   ⚠️  Tables do not exist yet.');
        console.log('   Please create them first in Supabase SQL Editor.\n');
        console.log('   Copy and run this SQL:\n');
        console.log(CREATE_TABLES_SQL);
        console.log('\n   Then run this script again.');
        process.exit(1);
    } else {
        console.log('   ✅ Tables exist!\n');
    }

    // Step 2: Parse CSV
    console.log('📄 Parsing CSV file...');
    const csvPath = path.join(__dirname, '../../Nowe rozliczenie 2025 - Podsumowanie.csv');

    if (!fs.existsSync(csvPath)) {
        console.error('❌ CSV file not found:', csvPath);
        process.exit(1);
    }

    const { agentPerformance, branchTargets } = parseCSV(csvPath);
    console.log(`   Found ${agentPerformance.length} agents`);
    console.log(`   Found ${branchTargets.length} monthly targets\n`);

    // Step 3: Import agent performance
    if (agentPerformance.length > 0) {
        console.log('👥 Importing agent performance...');

        // Delete existing data for 2025 first
        await supabase.from('agent_performance').delete().eq('rok', 2025);

        const { data: perfData, error: perfError } = await supabase
            .from('agent_performance')
            .insert(agentPerformance)
            .select();

        if (perfError) {
            console.error('   ❌ Error:', perfError.message);
        } else {
            console.log(`   ✅ Imported ${perfData?.length || agentPerformance.length} agent records`);

            // Show top 5
            console.log('\n   Top 5 agents by commission:');
            agentPerformance
                .sort((a, b) => b.prowizja_netto_kredyt - a.prowizja_netto_kredyt)
                .slice(0, 5)
                .forEach((a, i) => {
                    console.log(`   ${i + 1}. ${a.agent_name} (${a.oddzial}): ${a.prowizja_netto_kredyt.toLocaleString('pl-PL')} zł`);
                });
        }
    }

    // Step 4: Import branch targets
    if (branchTargets.length > 0) {
        console.log('\n🎯 Importing branch targets...');

        // Delete existing data for 2025 first
        await supabase.from('branch_targets').delete().eq('rok', 2025);

        const { data: targetData, error: targetError } = await supabase
            .from('branch_targets')
            .insert(branchTargets)
            .select();

        if (targetError) {
            console.error('   ❌ Error:', targetError.message);
        } else {
            console.log(`   ✅ Imported ${targetData?.length || branchTargets.length} target records`);
        }
    }

    console.log('\n🎉 Import completed!');
    console.log('   Refresh your dashboard to see the new "Wydajność" tab.');
}

main().catch(console.error);
