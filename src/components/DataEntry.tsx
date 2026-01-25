import { useState } from 'react'
import { X, Save, Calendar, User, Building2, Home, MapPin, DollarSign, Repeat } from 'lucide-react'
import type { Transaction, Agent } from '../types'

interface DataEntryProps {
    agents: Agent[]
    availableYears: number[]
    onAdd: (transaction: Transaction) => void
    onClose: () => void
}

const DataEntry = ({ agents, availableYears, onAdd, onClose }: DataEntryProps) => {
    const [formData, setFormData] = useState<Partial<Transaction>>({
        miesiac: 1,
        rok: 2026,
        strona: 'SPRZEDAŻ',
        typNieruchomosci: 'Mieszkanie',
        prowizjaNetto: 0,
        wartoscNieruchomosci: 0,
        oddzial: 'Kraków',
        adres: ''
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
                                type="number"
                                className="input-field"
                                value={formData.wartoscNieruchomosci}
                                onChange={e => {
                                    const val = parseFloat(e.target.value) || 0;
                                    const newCommission = formData.prowizjaNetto && formData.prowizjaNetto > 0 && formData.wartoscNieruchomosci && formData.wartoscNieruchomosci > 0
                                        ? (formData.prowizjaNetto / formData.wartoscNieruchomosci) * val
                                        : formData.prowizjaNetto;
                                    setFormData({ ...formData, wartoscNieruchomosci: val, prowizjaNetto: newCommission });
                                }}
                            />
                        </div>
                        <div className="form-group">
                            <label style={{ minHeight: '2.5rem', alignItems: 'flex-end', display: 'flex' }}><Repeat size={16} /> Prowizja (%)</label>
                            <input
                                type="number"
                                step="0.01"
                                className="input-field"
                                placeholder="%"
                                value={formData.wartoscNieruchomosci && formData.prowizjaNetto ? ((formData.prowizjaNetto / formData.wartoscNieruchomosci) * 100).toFixed(2) : ''}
                                onChange={e => {
                                    const pct = parseFloat(e.target.value) || 0;
                                    if (formData.wartoscNieruchomosci) {
                                        const amount = (formData.wartoscNieruchomosci * pct) / 100;
                                        setFormData({ ...formData, prowizjaNetto: amount });
                                    }
                                }}
                            />
                        </div>
                        <div className="form-group">
                            <label style={{ minHeight: '2.5rem', alignItems: 'flex-end', display: 'flex' }}><DollarSign size={16} /> Prowizja Netto (zł)</label>
                            <input
                                type="number"
                                className="input-field"
                                required
                                value={formData.prowizjaNetto}
                                onChange={e => setFormData({ ...formData, prowizjaNetto: parseFloat(e.target.value) || 0 })}
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
