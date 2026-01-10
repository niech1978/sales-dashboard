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
