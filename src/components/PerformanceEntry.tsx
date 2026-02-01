import { useState } from 'react'
import { X, Trophy, Users, Calendar, Building2 } from 'lucide-react'
import { motion } from 'framer-motion'
import { supabase } from '../lib/supabaseClient'
import type { AgentPerformance } from '../types'

interface PerformanceEntryProps {
    agents: { name: string; oddzial: string }[]
    year: number
    onAdd: (data: AgentPerformance) => void
    onClose: () => void
}

const PerformanceEntry = ({ agents, year, onAdd, onClose }: PerformanceEntryProps) => {
    const [formData, setFormData] = useState<Partial<AgentPerformance>>({
        agent_name: '',
        oddzial: 'Warszawa',
        rok: year,
        miesiac: null,
        prowizja_netto_kredyt: 0,
        spotkania_pozyskowe: 0,
        nowe_umowy: 0,
        prezentacje: 0,
        mieszkania: 0,
        domy: 0,
        dzialki: 0,
        inne: 0,
        suma_nieruchomosci: 0
    })
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setError(null)

        // Calculate suma_nieruchomosci
        const suma = (formData.mieszkania || 0) + (formData.domy || 0) +
                     (formData.dzialki || 0) + (formData.inne || 0)

        const dataToInsert = {
            ...formData,
            suma_nieruchomosci: suma
        }

        const { data, error: insertError } = await supabase
            .from('agent_performance')
            .upsert([dataToInsert], {
                onConflict: 'agent_name,oddzial,rok,miesiac'
            })
            .select()

        if (insertError) {
            setError(insertError.message)
            setLoading(false)
            return
        }

        if (data && data[0]) {
            onAdd(data[0] as AgentPerformance)
        }
        setLoading(false)
        onClose()
    }

    const handleChange = (field: keyof AgentPerformance, value: string | number | null) => {
        setFormData(prev => ({ ...prev, [field]: value }))
    }

    // Get unique agents for dropdown
    const uniqueAgents = Array.from(new Set(agents.map(a => a.name))).sort()

    return (
        <div className="modal-overlay" onClick={onClose}>
            <motion.div
                className="glass-card modal-card"
                style={{ maxWidth: '600px', width: '100%', maxHeight: '90vh', overflow: 'auto' }}
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                onClick={e => e.stopPropagation()}
            >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                    <h2 className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <Trophy size={28} color="var(--primary)" />
                        Dodaj Wydajność
                    </h2>
                    <button
                        onClick={onClose}
                        className="btn"
                        style={{ padding: '0.5rem', background: 'rgba(255,255,255,0.1)' }}
                    >
                        <X size={20} />
                    </button>
                </div>

                {error && (
                    <div style={{
                        background: 'rgba(236, 72, 153, 0.1)',
                        border: '1px solid var(--accent-pink)',
                        borderRadius: '8px',
                        padding: '1rem',
                        marginBottom: '1.5rem',
                        color: 'var(--accent-pink)'
                    }}>
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
                        {/* Agent */}
                        <div className="form-group">
                            <label><Users size={14} /> Agent</label>
                            <select
                                className="input-field"
                                value={formData.agent_name}
                                onChange={e => {
                                    const agent = agents.find(a => a.name === e.target.value)
                                    handleChange('agent_name', e.target.value)
                                    if (agent) handleChange('oddzial', agent.oddzial)
                                }}
                                required
                            >
                                <option value="">Wybierz agenta...</option>
                                {uniqueAgents.map(name => (
                                    <option key={name} value={name}>{name}</option>
                                ))}
                                <option value="__new__">+ Nowy agent...</option>
                            </select>
                        </div>

                        {/* Manual agent name if new */}
                        {formData.agent_name === '__new__' && (
                            <div className="form-group">
                                <label>Imię i Nazwisko</label>
                                <input
                                    type="text"
                                    className="input-field"
                                    placeholder="Jan Kowalski"
                                    onChange={e => handleChange('agent_name', e.target.value)}
                                    required
                                />
                            </div>
                        )}

                        {/* Oddział */}
                        <div className="form-group">
                            <label><Building2 size={14} /> Oddział</label>
                            <select
                                className="input-field"
                                value={formData.oddzial}
                                onChange={e => handleChange('oddzial', e.target.value)}
                                required
                            >
                                <option value="Kraków">Kraków</option>
                                <option value="Warszawa">Warszawa</option>
                                <option value="Olsztyn">Olsztyn</option>
                            </select>
                        </div>

                        {/* Rok */}
                        <div className="form-group">
                            <label><Calendar size={14} /> Rok</label>
                            <select
                                className="input-field"
                                value={formData.rok}
                                onChange={e => handleChange('rok', parseInt(e.target.value))}
                                required
                            >
                                <option value={2025}>2025</option>
                                <option value={2026}>2026</option>
                                <option value={2027}>2027</option>
                            </select>
                        </div>

                        {/* Miesiąc */}
                        <div className="form-group">
                            <label><Calendar size={14} /> Miesiąc (opcjonalnie)</label>
                            <select
                                className="input-field"
                                value={formData.miesiac || ''}
                                onChange={e => handleChange('miesiac', e.target.value ? parseInt(e.target.value) : null)}
                            >
                                <option value="">Cały rok</option>
                                {['Styczeń', 'Luty', 'Marzec', 'Kwiecień', 'Maj', 'Czerwiec',
                                  'Lipiec', 'Sierpień', 'Wrzesień', 'Październik', 'Listopad', 'Grudzień']
                                    .map((m, i) => (
                                        <option key={i} value={i + 1}>{m}</option>
                                    ))}
                            </select>
                        </div>
                    </div>

                    {/* Prowizja */}
                    <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                        <label><Trophy size={14} /> Prowizja netto + kredyt (zł)</label>
                        <input
                            type="number"
                            className="input-field"
                            value={formData.prowizja_netto_kredyt || ''}
                            onChange={e => handleChange('prowizja_netto_kredyt', parseFloat(e.target.value) || 0)}
                            step="0.01"
                            min="0"
                            placeholder="0.00"
                        />
                    </div>

                    {/* Aktywności */}
                    <h4 style={{ marginBottom: '1rem', color: 'var(--text-muted)' }}>Aktywności</h4>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
                        <div className="form-group">
                            <label>Spotkania pozyskowe</label>
                            <input
                                type="number"
                                className="input-field"
                                value={formData.spotkania_pozyskowe || ''}
                                onChange={e => handleChange('spotkania_pozyskowe', parseInt(e.target.value) || 0)}
                                min="0"
                            />
                        </div>
                        <div className="form-group">
                            <label>Nowe umowy</label>
                            <input
                                type="number"
                                className="input-field"
                                value={formData.nowe_umowy || ''}
                                onChange={e => handleChange('nowe_umowy', parseInt(e.target.value) || 0)}
                                min="0"
                            />
                        </div>
                        <div className="form-group">
                            <label>Prezentacje</label>
                            <input
                                type="number"
                                className="input-field"
                                value={formData.prezentacje || ''}
                                onChange={e => handleChange('prezentacje', parseInt(e.target.value) || 0)}
                                min="0"
                            />
                        </div>
                    </div>

                    {/* Nieruchomości */}
                    <h4 style={{ marginBottom: '1rem', color: 'var(--text-muted)' }}>Nieruchomości</h4>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '1rem', marginBottom: '2rem' }}>
                        <div className="form-group">
                            <label>Mieszkania</label>
                            <input
                                type="number"
                                className="input-field"
                                value={formData.mieszkania || ''}
                                onChange={e => handleChange('mieszkania', parseInt(e.target.value) || 0)}
                                min="0"
                            />
                        </div>
                        <div className="form-group">
                            <label>Domy</label>
                            <input
                                type="number"
                                className="input-field"
                                value={formData.domy || ''}
                                onChange={e => handleChange('domy', parseInt(e.target.value) || 0)}
                                min="0"
                            />
                        </div>
                        <div className="form-group">
                            <label>Działki</label>
                            <input
                                type="number"
                                className="input-field"
                                value={formData.dzialki || ''}
                                onChange={e => handleChange('dzialki', parseInt(e.target.value) || 0)}
                                min="0"
                            />
                        </div>
                        <div className="form-group">
                            <label>Inne</label>
                            <input
                                type="number"
                                className="input-field"
                                value={formData.inne || ''}
                                onChange={e => handleChange('inne', parseInt(e.target.value) || 0)}
                                min="0"
                            />
                        </div>
                    </div>

                    <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
                        <button
                            type="button"
                            onClick={onClose}
                            className="btn"
                            style={{ background: 'rgba(255,255,255,0.1)' }}
                        >
                            Anuluj
                        </button>
                        <button
                            type="submit"
                            className="btn btn-primary"
                            disabled={loading || !formData.agent_name}
                        >
                            {loading ? 'Zapisywanie...' : 'Zapisz'}
                        </button>
                    </div>
                </form>
            </motion.div>
        </div>
    )
}

export default PerformanceEntry
