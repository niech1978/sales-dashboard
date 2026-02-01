export interface Transaction {
    id?: string;
    oddzial: string;
    miesiac: number;
    rok: number;
    agent: string;
    typNieruchomosci: string;
    strona: 'SPRZEDAŻ' | 'KUPNO' | 'WYNAJEM' | 'NAJEM' | string;
    transakcja: number | string;
    adres: string;
    prowizjaNetto: number;
    wartoscNieruchomosci: number;
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

export interface BranchTarget {
    id?: string;
    oddzial: string;
    rok: number;
    miesiac: number;
    plan_kwota: number;
    wykonanie_kwota: number;
}
