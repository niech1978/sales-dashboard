/**
 * Script to import agent performance data from CSV to Supabase
 * Run with: node scripts/importPerformanceData.cjs
 */

const fs = require('fs');
const path = require('path');
const Papa = require('papaparse');
const { createClient } = require('@supabase/supabase-js');

// Supabase configuration
const SUPABASE_URL = 'https://ihnsjocfipigwnojqsxv.supabase.co';
const SUPABASE_KEY = 'sb_publishable_DDoTPExM1UqV8VEBazNChA_UgBE92nW';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Parse Polish currency format to number
function parseCurrency(value) {
    if (!value || value === '-' || value === '0' || value === 0) return 0;
    // Remove currency symbols, spaces, and handle Polish number format
    const cleaned = value.toString()
        .replace(/zł/gi, '')
        .replace(/PLN/gi, '')
        .replace(/\s/g, '')  // Remove all spaces (thousand separators)
        .replace(/\./g, '')  // Remove dots (thousand separators in some formats)
        .replace(',', '.');  // Replace comma with dot for decimal
    const result = parseFloat(cleaned) || 0;
    return result;
}

// Parse integer from string
function parseIntSafe(value) {
    if (!value || value === '-') return 0;
    return parseInt(value.toString().replace(/\s/g, ''), 10) || 0;
}

// Read and parse CSV file using papaparse
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

        // Detect branch from header
        if (cells[1] && ['Warszawa', 'Kraków', 'Olsztyn'].includes(cells[1])) {
            currentBranch = cells[1];
            console.log(`Found branch: ${currentBranch}`);
        }

        // Detect agent section header
        if (cells[0] && cells[0].includes('Zespół oddziału:')) {
            const match = cells[0].match(/Zespół oddziału:\s*(\w+)/);
            if (match) {
                currentBranch = match[1];
                console.log(`Found team section: ${currentBranch}`);
            }
            inAgentSection = true;
            continue;
        }

        // Parse monthly targets (PLAN row)
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
            console.log(`  Found ${branchTargets.filter(t => t.oddzial === currentBranch).length} monthly targets`);
            continue;
        }

        // Parse execution data (WYKONANIE row)
        if (cells[0] === 'WYKONANIE' && currentBranch) {
            for (let m = 0; m < 12; m++) {
                const wykonanieValue = parseCurrency(cells[m + 1]);
                const target = branchTargets.find(t =>
                    t.oddzial === currentBranch && t.rok === 2025 && t.miesiac === m + 1
                );
                if (target) {
                    target.wykonanie_kwota = wykonanieValue;
                }
            }
            continue;
        }

        // Parse agent data (when in agent section)
        if (inAgentSection && cells[1]) {
            const agentName = cells[1].trim();

            // Skip header row, empty names, and special rows
            if (!agentName || agentName === 'Agent' || agentName.startsWith('Rodzaj') || agentName.length < 3) {
                continue;
            }

            // Check if this looks like a valid agent name (First Last format with Polish characters)
            if (/^[A-ZŁŚŻŹĆŃĘ][a-ząęółśżźćń]+\s+[A-ZŁŚŻŹĆŃĘ]/.test(agentName)) {
                const prowizja = parseCurrency(cells[2]);

                agentPerformance.push({
                    agent_name: agentName,
                    oddzial: currentBranch,
                    rok: 2025,
                    miesiac: null, // Annual summary
                    prowizja_netto_kredyt: prowizja,
                    spotkania_pozyskowe: parseIntSafe(cells[3]),
                    nowe_umowy: parseIntSafe(cells[4]),
                    prezentacje: parseIntSafe(cells[5]),
                    mieszkania: parseIntSafe(cells[6]),
                    domy: parseIntSafe(cells[7]),
                    dzialki: parseIntSafe(cells[8]),
                    inne: parseIntSafe(cells[9]),
                    suma_nieruchomosci: parseIntSafe(cells[10])
                });
                console.log(`  Agent: ${agentName} - ${prowizja.toLocaleString('pl-PL')} zł`);
            }
        }
    }

    return { agentPerformance, branchTargets };
}

async function importData() {
    console.log('Starting import...\n');

    // Path to CSV file
    const csvPath = path.join(__dirname, '../../Nowe rozliczenie 2025 - Podsumowanie.csv');

    if (!fs.existsSync(csvPath)) {
        console.error('CSV file not found:', csvPath);
        process.exit(1);
    }

    console.log('Parsing CSV file...');
    const { agentPerformance, branchTargets } = parseCSV(csvPath);

    console.log(`\nFound ${agentPerformance.length} agent records`);
    console.log(`Found ${branchTargets.length} branch target records\n`);

    // Import agent performance data
    if (agentPerformance.length > 0) {
        console.log('Importing agent performance data...');
        const { data: perfData, error: perfError } = await supabase
            .from('agent_performance')
            .upsert(agentPerformance, {
                onConflict: 'agent_name,oddzial,rok,miesiac',
                ignoreDuplicates: false
            })
            .select();

        if (perfError) {
            console.error('Error importing agent performance:', perfError);
        } else {
            console.log(`Successfully imported ${perfData?.length || agentPerformance.length} agent performance records`);
        }
    }

    // Import branch targets
    if (branchTargets.length > 0) {
        console.log('Importing branch targets...');
        const { data: targetData, error: targetError } = await supabase
            .from('branch_targets')
            .upsert(branchTargets, {
                onConflict: 'oddzial,rok,miesiac',
                ignoreDuplicates: false
            })
            .select();

        if (targetError) {
            console.error('Error importing branch targets:', targetError);
        } else {
            console.log(`Successfully imported ${targetData?.length || branchTargets.length} branch target records`);
        }
    }

    console.log('\nImport completed!');
}

importData().catch(console.error);
