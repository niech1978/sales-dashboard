/**
 * Create tables in Supabase using the SQL API
 */

const SUPABASE_URL = 'https://ihnsjocfipigwnojqsxv.supabase.co';
const SUPABASE_SERVICE_KEY = 'sb_secret_me4sYTwjJkUOmZ4S-1ysOQ_2Eiz1W0x';

const SQL_STATEMENTS = [
    // Create agent_performance table
    `CREATE TABLE IF NOT EXISTS agent_performance (
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
    )`,

    // Create branch_targets table
    `CREATE TABLE IF NOT EXISTS branch_targets (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        oddzial TEXT NOT NULL,
        rok INTEGER NOT NULL,
        miesiac INTEGER NOT NULL,
        plan_kwota DECIMAL(12,2) DEFAULT 0,
        wykonanie_kwota DECIMAL(12,2) DEFAULT 0,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        UNIQUE(oddzial, rok, miesiac)
    )`,

    // Enable RLS
    `ALTER TABLE agent_performance ENABLE ROW LEVEL SECURITY`,
    `ALTER TABLE branch_targets ENABLE ROW LEVEL SECURITY`,

    // Create policies (with IF NOT EXISTS workaround)
    `DO $$ BEGIN
        CREATE POLICY "Allow all for authenticated" ON agent_performance FOR ALL TO authenticated USING (true) WITH CHECK (true);
    EXCEPTION WHEN duplicate_object THEN NULL;
    END $$`,

    `DO $$ BEGIN
        CREATE POLICY "Allow read for anon" ON agent_performance FOR SELECT TO anon USING (true);
    EXCEPTION WHEN duplicate_object THEN NULL;
    END $$`,

    `DO $$ BEGIN
        CREATE POLICY "Allow all for authenticated" ON branch_targets FOR ALL TO authenticated USING (true) WITH CHECK (true);
    EXCEPTION WHEN duplicate_object THEN NULL;
    END $$`,

    `DO $$ BEGIN
        CREATE POLICY "Allow read for anon" ON branch_targets FOR SELECT TO anon USING (true);
    EXCEPTION WHEN duplicate_object THEN NULL;
    END $$`
];

async function runSQL(sql) {
    // Extract project ref from URL
    const projectRef = SUPABASE_URL.replace('https://', '').replace('.supabase.co', '');

    const response = await fetch(`${SUPABASE_URL}/rest/v1/`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'apikey': SUPABASE_SERVICE_KEY,
            'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
            'Prefer': 'return=minimal'
        }
    });

    // Alternative: Use pg directly through Supabase's connection
    // This won't work through REST API, need to use different approach
    return response;
}

async function main() {
    console.log('🔧 Creating tables in Supabase...\n');
    console.log('Note: Tables must be created via Supabase Dashboard SQL Editor.');
    console.log('The REST API does not support DDL (CREATE TABLE) statements.\n');

    console.log('Please go to:');
    console.log(`https://supabase.com/dashboard/project/ihnsjocfipigwnojqsxv/sql/new\n`);

    console.log('And run this SQL:\n');
    console.log('='.repeat(60));
    console.log(`
-- Create tables for agent performance tracking

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

ALTER TABLE agent_performance ENABLE ROW LEVEL SECURITY;
ALTER TABLE branch_targets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all for authenticated" ON agent_performance FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow read for anon" ON agent_performance FOR SELECT TO anon USING (true);
CREATE POLICY "Allow all for authenticated" ON branch_targets FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow read for anon" ON branch_targets FOR SELECT TO anon USING (true);
`);
    console.log('='.repeat(60));
    console.log('\nAfter running the SQL, execute:');
    console.log('node scripts/setupAndImport.cjs');
}

main();
