import { useState } from 'react'
import { X, Save, Calendar, User, Building2, Home, MapPin, DollarSign, Repeat, MinusCircle, CreditCard } from 'lucide-react'
import type { Transaction, Agent } from '../types'

interface DataEntryProps {
    agents: Agent[]
    availableYears: number[]
    onAdd: (transaction: Transaction) => void
    onClose: () => void
    userRole?: string
    userOddzial?: string | null
}

const DataEntry = ({ agents, availableYears, onAdd, onClose, userRole = 'admin', userOddzial = null }: DataEntryProps) => {
    // Manager może dodawać tylko do swojego oddziału
    const defaultOddzial = userRole === 'manager' && userOddzial ? userOddzial : 'Kraków'

    const [prowizjaMode, setProwizjaMode] = useState<'netto' | 'brutto'>('netto')
    const [prowizjaInput, setProwizjaInput] = useState('')
    const [pctInput, setPctInput] = useState('')

    const [formData, setFormData] = useState<Partial<Transaction>>({
        miesiac: 1,
        rok: 2026,
        strona: 'SPRZEDAŻ',
        typNieruchomosci: 'Mieszkanie',
        prowizjaNetto: 0,
        wartoscNieruchomosci: 0,
        oddzial: defaultOddzial,
        adres: '',
        koszty: 0,
        kredyt: 0
    })

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        if (!formData.agent || !formData.prowizjaNetto) {
            alert('Proszę wypełnić wymagane pola (Agent, Prowizja)')
            return
        }

        onAdd({
            ...formData,
            transakcja: '1'
        } as Transaction)
        onClose()
    }

    // Filter agents by selected branch
    const filteredAgents = agents.filter(a => a.oddzial === formData.oddzial)

    return (
        <div className="modal-overlay">
            <div className="glass-card modal-card" style={{
                width: '100%',
                maxWidth: '600px',
                position: 'relative',
                maxHeight: '90vh',
                overflowY: 'auto'
            }}>
                <button onClick={onClose} style={{ position: 'absolute', top: '1.5rem', right: '1.5rem', background: 'transparent', color: 'var(--text-muted)', zIndex: 10 }}>
                    <X size={24} />
                </button>

                <h2 className="modal-title" style={{ fontWeight: 700, marginBottom: '2rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <PlusCircleIcon /> Nowa Transakcja
                </h2>

                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                        <div className="form-group">
                            <label><Building2 size={16} /> Oddział</label>
                            <select
                                className="input-field"
                                value={formData.oddzial}
                                onChange={e => setFormData({ ...formData, oddzial: e.target.value })}
                                disabled={userRole === 'manager'}
                                style={userRole === 'manager' ? { opacity: 0.7, cursor: 'not-allowed' } : {}}
                            >
                                <option value="Kraków">Kraków</option>
                                <option value="Warszawa">Warszawa</option>
                                <option value="Olsztyn">Olsztyn</option>
                            </select>
                        </div>

                        <div className="form-group">
                            <label><User size={16} /> Agent</label>
                            <select
                                className="input-field"
                                required
                                value={formData.agent}
                                onChange={e => setFormData({ ...formData, agent: e.target.value })}
                            >
                                <option value="">Wybierz agenta...</option>
                                {filteredAgents.map(a => (
                                    <option key={a.id} value={a.name}>{a.name}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
                        <div className="form-group">
                            <label><Calendar size={16} /> Rok</label>
                            <select
                                className="input-field"
                                value={formData.rok}
                                onChange={e => setFormData({ ...formData, rok: parseInt(e.target.value) })}
                            >
                                {availableYears.map(year => (
                                    <option key={year} value={year}>{year}</option>
                                ))}
                            </select>
                        </div>
                        <div className="form-group">
                            <label><Calendar size={16} /> Miesiąc</label>
                            <select
                                className="input-field"
                                value={formData.miesiac}
                                onChange={e => setFormData({ ...formData, miesiac: parseInt(e.target.value) })}
                            >
                                {Array.from({ length: 12 }, (_, i) => (
                                    <option key={i + 1} value={i + 1}>{i + 1}</option>
                                ))}
                            </select>
                        </div>
                        <div className="form-group">
                            <label><Repeat size={16} /> Strona</label>
                            <select
                                className="input-field"
                                value={formData.strona}
                                onChange={e => setFormData({ ...formData, strona: e.target.value as Transaction['strona'] })}
                            >
                                <option value="SPRZEDAŻ">SPRZEDAŻ</option>
                                <option value="KUPNO">KUPNO</option>
                                <option value="WYNAJEM">WYNAJEM</option>
                                <option value="NAJEM">NAJEM</option>
                            </select>
                        </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr', gap: '1rem' }}>
                        <div className="form-group">
                            <label><Home size={16} /> Typ</label>
                            <select
                                className="input-field"
                                value={formData.typNieruchomosci}
                                onChange={e => setFormData({ ...formData, typNieruchomosci: e.target.value })}
                            >
                                <option value="Mieszkanie">Mieszkanie</option>
                                <option value="Dom">Dom</option>
                                <option value="Działka">Działka</option>
                                <option value="Lokal">Lokal</option>
                            </select>
                        </div>
                        <div className="form-group">
                            <label><MapPin size={16} /> Adres</label>
                            <input
                                type="text"
                                className="input-field"
                                placeholder="np. ul. Floriańska 10"
                                value={formData.adres}
                                onChange={e => setFormData({ ...formData, adres: e.target.value })}
                            />
                        </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr 1.5fr', gap: '1rem' }}>
                        <div className="form-group">
                            <label style={{ minHeight: '2.5rem', alignItems: 'flex-end', display: 'flex' }}><DollarSign size={16} /> Wartość Nieruchomości (zł)</label>
                            <input
                                type="text"
                                inputMode="decimal"
                                className="input-field"
                                value={formData.wartoscNieruchomosci || ''}
                                onFocus={e => e.target.select()}
                                onChange={e => {
                                    const val = parseFloat(e.target.value) || 0;
                                    const netto = formData.prowizjaNetto && formData.prowizjaNetto > 0 && formData.wartoscNieruchomosci && formData.wartoscNieruchomosci > 0
                                        ? (formData.prowizjaNetto / formData.wartoscNieruchomosci) * val
                                        : formData.prowizjaNetto;
                                    setFormData({ ...formData, wartoscNieruchomosci: val, prowizjaNetto: netto });
                                    if (netto) {
                                        setProwizjaInput(prowizjaMode === 'brutto' ? (netto * 1.23).toFixed(2) : String(Math.round(netto * 100) / 100));
                                    }
                                }}
                                placeholder="0"
                            />
                        </div>
                        <div className="form-group">
                            <label style={{ minHeight: '2.5rem', alignItems: 'flex-end', display: 'flex' }}><Repeat size={16} /> Prowizja (%)</label>
                            <input
                                type="text"
                                inputMode="decimal"
                                className="input-field"
                                placeholder="%"
                                value={pctInput}
                                onFocus={e => e.target.select()}
                                onChange={e => {
                                    const raw = e.target.value.replace(',', '.');
                                    if (raw === '' || /^\d*\.?\d{0,2}$/.test(raw)) {
                                        setPctInput(raw);
                                        const pct = parseFloat(raw) || 0;
                                        if (formData.wartoscNieruchomosci) {
                                            const amount = (formData.wartoscNieruchomosci * pct) / 100;
                                            setFormData(prev => ({ ...prev, prowizjaNetto: amount }));
                                            setProwizjaInput(prowizjaMode === 'brutto' ? (amount * 1.23).toFixed(2) : String(Math.round(amount * 100) / 100));
                                        }
                                    }
                                }}
                            />
                        </div>
                        <div className="form-group">
                            <label style={{ minHeight: '2.5rem', alignItems: 'flex-end', display: 'flex' }}>
                                <DollarSign size={16} />
                                <span style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                                    Prowizja
                                    <span style={{ display: 'inline-flex', borderRadius: '6px', overflow: 'hidden', border: '1px solid var(--border)', fontSize: '0.7rem' }}>
                                        <button type="button" onClick={() => {
                                            if (prowizjaMode !== 'netto') {
                                                setProwizjaMode('netto');
                                                const netto = formData.prowizjaNetto || 0;
                                                setProwizjaInput(netto ? String(Math.round(netto * 100) / 100) : '');
                                            }
                                        }} style={{
                                            padding: '0.15rem 0.4rem', border: 'none', cursor: 'pointer',
                                            background: prowizjaMode === 'netto' ? 'var(--primary)' : 'transparent',
                                            color: prowizjaMode === 'netto' ? '#fff' : 'var(--text-muted)', fontWeight: 600
                                        }}>Netto</button>
                                        <button type="button" onClick={() => {
                                            if (prowizjaMode !== 'brutto') {
                                                setProwizjaMode('brutto');
                                                const netto = formData.prowizjaNetto || 0;
                                                setProwizjaInput(netto ? (netto * 1.23).toFixed(2) : '');
                                            }
                                        }} style={{
                                            padding: '0.15rem 0.4rem', border: 'none', cursor: 'pointer',
                                            background: prowizjaMode === 'brutto' ? 'var(--accent-pink)' : 'transparent',
                                            color: prowizjaMode === 'brutto' ? '#fff' : 'var(--text-muted)', fontWeight: 600
                                        }}>Brutto</button>
                                    </span>
                                    (zł)
                                </span>
                            </label>
                            <input
                                type="text"
                                inputMode="decimal"
                                className="input-field"
                                required
                                value={prowizjaInput}
                                onFocus={e => e.target.select()}
                                onChange={e => {
                                    const raw = e.target.value.replace(',', '.');
                                    if (raw === '' || /^\d*\.?\d{0,2}$/.test(raw)) {
                                        setProwizjaInput(raw);
                                        const val = parseFloat(raw) || 0;
                                        const netto = prowizjaMode === 'brutto' ? val / 1.23 : val;
                                        setFormData(prev => ({ ...prev, prowizjaNetto: netto }));
                                        if (formData.wartoscNieruchomosci && formData.wartoscNieruchomosci > 0) {
                                            setPctInput(((netto / formData.wartoscNieruchomosci) * 100).toFixed(2));
                                        }
                                    }
                                }}
                                placeholder="0"
                            />
                            {prowizjaMode === 'brutto' && formData.prowizjaNetto ? (
                                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                                    Netto: {formData.prowizjaNetto.toFixed(2)} zł (VAT 23%)
                                </span>
                            ) : prowizjaMode === 'netto' && formData.prowizjaNetto ? (
                                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                                    Brutto: {(formData.prowizjaNetto * 1.23).toFixed(2)} zł
                                </span>
                            ) : null}
                        </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
                        <div className="form-group">
                            <label style={{ minHeight: '2.5rem', alignItems: 'flex-end', display: 'flex' }}><MinusCircle size={16} /> Koszty (zł)</label>
                            <input
                                type="text"
                                inputMode="decimal"
                                className="input-field"
                                placeholder="0"
                                value={formData.koszty || ''}
                                onFocus={e => e.target.select()}
                                onChange={e => setFormData({ ...formData, koszty: parseFloat(e.target.value) || 0 })}
                            />
                        </div>
                        <div className="form-group">
                            <label style={{ minHeight: '2.5rem', alignItems: 'flex-end', display: 'flex' }}><CreditCard size={16} /> Kredyt (zł)</label>
                            <input
                                type="text"
                                inputMode="decimal"
                                className="input-field"
                                placeholder="0"
                                value={formData.kredyt || ''}
                                onFocus={e => e.target.select()}
                                onChange={e => setFormData({ ...formData, kredyt: parseFloat(e.target.value) || 0 })}
                            />
                        </div>
                        <div className="form-group">
                            <label style={{ minHeight: '2.5rem', alignItems: 'flex-end', display: 'flex' }}><DollarSign size={16} /> Wykonanie {prowizjaMode === 'brutto' ? '(brutto)' : '(netto)'}</label>
                            <input
                                type="text"
                                className="input-field"
                                disabled
                                value={(((formData.prowizjaNetto || 0) * (prowizjaMode === 'brutto' ? 1.23 : 1)) - (formData.koszty || 0) + (formData.kredyt || 0)).toFixed(2)}
                                style={{ background: 'rgba(16, 185, 129, 0.1)', color: 'var(--accent-green)', fontWeight: 700 }}
                            />
                        </div>
                    </div>

                    <button type="submit" className="btn btn-primary" style={{ marginTop: '1rem', height: '3.5rem', fontSize: '1.125rem' }}>
                        <Save size={20} style={{ marginRight: '0.75rem' }} />
                        Zapisz Transakcję
                    </button>
                </form>
            </div>
        </div>
    )
}

const PlusCircleIcon = () => (
    <div style={{ background: 'var(--primary)', padding: '0.4rem', borderRadius: '8px', display: 'flex' }}>
        <Calendar size={20} color="white" />
    </div>
)

export default DataEntry
