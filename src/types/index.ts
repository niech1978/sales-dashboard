export interface Transaction {
    id?: string;
    oddzial: string;
    miesiac: number;
    rok: number;
    agent: string;
    typNieruchomosci: string;
    strona: 'SPRZEDAŻ' | 'KUPNO' | 'WYNAJEM' | 'NAJEM' | 'KREDYT' | string;
    transakcja: number | string;
    adres: string;
    prowizjaNetto: number;
    wartoscNieruchomosci: number;
    koszty?: number;       // Koszty transakcji - obniżają prowizję (domyślnie 0)
    kredyt?: number;       // DEPRECATED - zachowane dla starych danych, nowe transakcje kredytowe to strona='KREDYT'
    statusTransakcji?: 'zrealizowana' | 'prognozowana';  // Status transakcji (domyślnie 'zrealizowana')
}

export interface Activity {
    agent: string;
    miesiac: number;
    tydzien: string;
    spotkaniaPozyskowe: number;
    noweUmowy: number;
    prezentacje: number;
}

export interface BranchStats {
    name: string;
    totalSales: number;
    totalCommission: number;
    transactionCount: number;
}

export interface Agent {
    id: string;
    name: string;
    oddzial: string;
    email?: string;
    telefon?: string;
    status: 'aktywny' | 'nieaktywny';
}

export interface AgentPerformance {
    id?: string;
    agent_name: string;
    oddzial: string;
    rok: number;
    miesiac: number | null;
    prowizja_netto_kredyt: number;
    spotkania_pozyskowe: number;
    nowe_umowy: number;
    prezentacje: number;
    mieszkania: number;
    domy: number;
    dzialki: number;
    inne: number;
    suma_nieruchomosci: number;
}

export interface TransactionTranche {
    id?: string;
    transaction_id: string;
    miesiac: number;
    rok: number;
    kwota: number;
    status: 'zrealizowana' | 'prognoza';
    prawdopodobienstwo: number;
    notatka?: string;
    created_at?: string;
    updated_at?: string;
}

export interface EffectiveTranche {
    transactionId: string;
    transaction: Transaction;
    miesiac: number;
    rok: number;
    kwota: number;
    status: 'zrealizowana' | 'prognoza';
    prawdopodobienstwo: number;
    kwotaZrealizowana: number;      // kwota jesli zrealizowana, 0 jesli prognoza
    kwotaPrognozaWazona: number;    // kwota * prawdopodobienstwo/100 (0 jesli zrealizowana)
    kwotaPrognozaPelna: number;     // kwota jesli prognoza, 0 jesli zrealizowana
    // Proporcjonalny rozklad kosztow/kredytu
    udzial: number;                 // kwota / prowizjaNetto
    kosztyProporcjonalne: number;
    kredytProporcjonalny: number;
    wykonanie: number;              // kwota - kosztyProporcjonalne + kredytProporcjonalny (wazone prawdopodobienstwem dla prognoz)
}

export interface BranchTarget {
    id?: string;
    oddzial: string;
    rok: number;
    miesiac: number;
    plan_kwota: number;
    wykonanie_kwota: number;
}
