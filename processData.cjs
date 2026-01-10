const fs = require('fs');
const path = require('path');

const files = [
    'Copy of Nowe rozliczenie 2025 - Dane_Kraków.csv',
    'Copy of Nowe rozliczenie 2025 - Dane_Olsztyn.csv',
    'Copy of Nowe rozliczenie 2025 - Dane_Warszawa.csv'
];

const basePath = '/Users/jarekniechwiadowicz15/Desktop/freedom sprzedaz';
const outputDir = path.join(basePath, 'sales-dashboard/src/data');

if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
}

function parseCurrency(str) {
    if (!str) return 0;
    // Remove non-breaking spaces, spaces, currency symbols, and convert comma to dot
    const cleaned = str.replace(/[^\d,.-]/g, '').replace(',', '.');
    const num = parseFloat(cleaned);
    return isNaN(num) ? 0 : num;
}

const allTransactions = [];

files.forEach(file => {
    const filePath = path.join(basePath, file);
    const content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.split('\n');
    const headers = lines[0].split(',');

    for (let i = 1; i < lines.length; i++) {
        const line = lines[i];
        if (!line.trim() || line.startsWith(',,,,,,')) continue;

        // Improved CSV line split to handle empty fields and quotes
        const row = [];
        let current = '';
        let inQuotes = false;
        for (let charIndex = 0; charIndex < line.length; charIndex++) {
            const char = line[charIndex];
            if (char === '"') inQuotes = !inQuotes;
            else if (char === ',' && !inQuotes) {
                row.push(current.trim());
                current = '';
            } else {
                current += char;
            }
        }
        row.push(current.trim());

        if (!row || row.length < 10) continue;

        const transaction = {
            oddzial: headers[0] ? row[0] : '',
            miesiac: parseInt(row[2]) || 0,
            rok: parseInt(row[3]) || 2025,
            agent: row[5] ? row[5].replace(/"/g, '') : '',
            typNieruchomosci: row[7] || '',
            strona: row[8] || '',
            transakcja: row[9] || '',
            adres: row[10] ? row[10].replace(/"/g, '') : '',
            prowizjaNetto: parseCurrency(row[12]),
            wartoscNieruchomosci: parseCurrency(row[15])
        };

        if (transaction.agent && transaction.prowizjaNetto > 0) {
            allTransactions.push(transaction);
        }
    }
});

const outputContent = `import type { Transaction } from '../types';

export const initialTransactions: Transaction[] = ${JSON.stringify(allTransactions, null, 2)};
`;

fs.writeFileSync(path.join(outputDir, 'initialData.ts'), outputContent);
console.log(`Processed ${allTransactions.length} transactions into initialData.ts`);
