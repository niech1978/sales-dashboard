# Freedom Sales Dashboard 📊

Nowoczesny panel analityczny do zarzadzania sprzedażą nieruchomości, zintegrowany z chmurą Supabase.

## 🚀 Główne Funkcje

- **Analiza Sprzedaży**: Interaktywne wykresy i statystyki dotyczące oddziałów i agentów.
- **Zabezpieczenie GitHub**: Skonfigurowano `.gitignore`, aby klucze API nie wyciekły do sieci.
- **Odzyskiwanie Hasła**: Wdrożono pełny przepływ resetowania hasła prosto z aplikacji.
- **Zarządzanie Agentami**: Dodawanie, usuwanie i śledzenie statusu agentów (Aktywny/Nieaktywny).
- **Relacyjne Dane**: Wszystkie transakcje i agenci są przechowywani w czasie rzeczywistym w bazie danych Supabase.
- **Autoryzacja (Auth)**: Profesjonalny system logowania z podziałem na role (Admin/Agent).
- **Filtrowanie Danych**: Możliwość analizy danych według lat, kwartałów i konkretnych miesięcy.
- **Responsywny Design**: Nowoczesny interfejs (Glassmorphism) działający na każdym urządzeniu.

## 🛠️ Stack Technologiczny

- **Frontend**: React.js + TypeScript
- **Stylizacja**: Vanilla CSS (Custom UI/UX)
- **Backend/DB**: Supabase (PostgreSQL)
- **Ikony**: Lucide React
- **Animacje**: Framer Motion

## 🏗️ Instalacja i Uruchomienie

1. Sklonuj repozytorium:
   ```bash
   git clone <twoj-url-repozytorium>
   ```

2. Zainstaluj zależności:
   ```bash
   npm install
   ```

3. Skonfiguruj zmienne środowiskowe:
   Utwórz plik `.env` w głównym katalogu i dodaj:
   ```env
   VITE_SUPABASE_URL=twoj_url_supabase
   VITE_SUPABASE_ANON_KEY=twoj_klucz_anon
   ```

4. Uruchom projekt lokalnie:
   ```bash
   npm run dev
   ```

## 🔐 Bezpieczeństwo

Aplikacja wykorzystuje **Row Level Security (RLS)** w Supabase, co gwarantuje, że dane są bezpieczne i dostępne tylko dla zalogowanych użytkowników z odpowiednimi uprawnieniami.

---
© 2025 Freedom Sales Dashboard
