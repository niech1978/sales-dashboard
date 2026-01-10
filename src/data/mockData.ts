import type { Transaction } from '../types'

export const mockTransactions: Transaction[] = [
    {
        oddzial: 'Kraków',
        miesiac: 1,
        rok: 2025,
        agent: 'Justyna Guca',
        typNieruchomosci: 'Działka',
        strona: 'SPRZEDAŻ',
        transakcja: 1,
        adres: 'Wężerów',
        prowizjaNetto: 9756.10,
        wartoscNieruchomosci: 304000
    },
    {
        oddzial: 'Kraków',
        miesiac: 1,
        rok: 2025,
        agent: 'Łukasz Walczyk',
        typNieruchomosci: 'Mieszkanie',
        strona: 'SPRZEDAŻ',
        transakcja: 1,
        adres: 'Heleny 16/59',
        prowizjaNetto: 13315.04,
        wartoscNieruchomosci: 692000
    },
    {
        oddzial: 'Warszawa',
        miesiac: 1,
        rok: 2025,
        agent: 'Marek Jankowski',
        typNieruchomosci: 'Dom',
        strona: 'SPRZEDAŻ',
        transakcja: 1,
        adres: 'Złota 44',
        prowizjaNetto: 25000.00,
        wartoscNieruchomosci: 1200000
    },
    {
        oddzial: 'Olsztyn',
        miesiac: 2,
        rok: 2025,
        agent: 'Anna Mazur',
        typNieruchomosci: 'Mieszkanie',
        strona: 'SPRZEDAŻ',
        transakcja: 1,
        adres: 'Kościuszki 12',
        prowizjaNetto: 8500.00,
        wartoscNieruchomosci: 450000
    }
]
