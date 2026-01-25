import { useState } from 'react'
import { motion } from 'framer-motion'
import { Save, X, UserPlus } from 'lucide-react'
import type { Agent } from '../types'

interface AgentEntryProps {
    onAdd: (agent: Agent) => void
    onClose: () => void
}

const AgentEntry = ({ onAdd, onClose }: AgentEntryProps) => {
    const [formData, setFormData] = useState<Partial<Agent>>({
        name: '',
        oddzial: 'Kraków',
        email: '',
        telefon: '',
        status: 'aktywny',
    })

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        if (formData.name && formData.oddzial) {
            const newAgent: Omit<Agent, 'id'> & { id?: string } = {
                name: formData.name,
                oddzial: formData.oddzial,
                email: formData.email,
                telefon: formData.telefon,
                status: formData.status || 'aktywny',
            }
            onAdd(newAgent as Agent)
            onClose()
        }
    }

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                background: 'rgba(0,0,0,0.8)',
                zIndex: 100,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '2rem'
            }}
        >
            <motion.div
                initial={{ scale: 0.9, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                className="glass-card"
                style={{ width: '100%', maxWidth: '500px' }}
            >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <UserPlus size={24} color="var(--primary)" />
                        <h2 style={{ fontSize: '1.5rem', fontWeight: 700 }}>Dodaj Nowego Agenta</h2>
                    </div>
                    <button onClick={onClose} className="btn" style={{ padding: '0.5rem', background: 'transparent' }}>
                        <X size={24} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    <div>
                        <label>Imię i Nazwisko</label>
                        <input
                            type="text" className="input-field" placeholder="Jan Kowalski"
                            value={formData.name}
                            onChange={e => setFormData({ ...formData, name: e.target.value })}
                            required
                        />
                    </div>

                    <div>
                        <label>Oddział</label>
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

                    <div>
                        <label>Email (opcjonalnie)</label>
                        <input
                            type="email" className="input-field" placeholder="agent@freedom.pl"
                            value={formData.email}
                            onChange={e => setFormData({ ...formData, email: e.target.value })}
                        />
                    </div>

                    <div>
                        <label>Telefon (opcjonalnie)</label>
                        <input
                            type="text" className="input-field" placeholder="+48 000 000 000"
                            value={formData.telefon}
                            onChange={e => setFormData({ ...formData, telefon: e.target.value })}
                        />
                    </div>

                    <button type="submit" className="btn btn-primary" style={{ width: '100%', height: '3.5rem', marginTop: '1rem' }}>
                        <Save size={20} style={{ marginRight: '0.75rem' }} />
                        Zapisz Agenta
                    </button>
                </form>
            </motion.div>
        </motion.div>
    )
}

export default AgentEntry
