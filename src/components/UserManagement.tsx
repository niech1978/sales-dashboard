import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabaseClient'
import { Users, UserPlus, Edit2, Trash2, Check, X, Shield, Building2, Mail, RefreshCw, AlertCircle, Save, Send, Loader2, Link } from 'lucide-react'

interface AppUser {
    id: string
    auth_user_id: string | null
    email: string
    name: string | null
    role: 'superadmin' | 'admin' | 'manager' | 'agent'
    oddzial: string | null
    is_active: boolean
    created_at: string
}

const UserManagement = () => {
    const [users, setUsers] = useState<AppUser[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [editingUser, setEditingUser] = useState<string | null>(null)
    const [editForm, setEditForm] = useState<Partial<AppUser>>({})
    const [showAddForm, setShowAddForm] = useState(false)
    const [newUser, setNewUser] = useState({
        email: '',
        name: '',
        role: 'agent' as const,
        oddzial: '' as string
    })

    const branches = ['Kraków', 'Warszawa', 'Olsztyn']
    const roles = [
        { value: 'superadmin', label: 'Superadmin', color: '#f59e0b' },
        { value: 'admin', label: 'Admin', color: 'var(--accent-pink)' },
        { value: 'manager', label: 'Manager', color: 'var(--accent-blue)' },
        { value: 'agent', label: 'Agent', color: 'var(--primary)' }
    ]

    // Role dostępne do wyboru w formularzach (superadmin nie może być przypisany ręcznie)
    const assignableRoles = roles.filter(r => r.value !== 'superadmin')

    const [invitingUser, setInvitingUser] = useState<string | null>(null)
    const [successMessage, setSuccessMessage] = useState<string | null>(null)

    const isSuperadmin = (user: AppUser) => user.role === 'superadmin'

    useEffect(() => {
        fetchUsers()
    }, [])

    const fetchUsers = async () => {
        setLoading(true)
        setError(null)

        try {
            // Pobierz użytkowników z app_users
            const { data: appUsers, error: appError } = await supabase
                .from('app_users')
                .select('*')
                .order('created_at', { ascending: false })

            if (appError) throw appError
            setUsers(appUsers || [])

        } catch (err: any) {
            setError(err.message)
        } finally {
            setLoading(false)
        }
    }

    const handleAddUser = async () => {
        if (!newUser.email) {
            setError('Email jest wymagany')
            return
        }

        try {
            setError(null)
            setSuccessMessage(null)

            // 1. Dodaj do app_users (trigger auto_link_app_user spróbuje połączyć z auth.users)
            const { data, error } = await supabase
                .from('app_users')
                .insert({
                    email: newUser.email,
                    name: newUser.name || null,
                    role: newUser.role,
                    oddzial: newUser.oddzial || null,
                    is_active: true
                })
                .select()
                .single()

            if (error) throw error

            // 2. Jeśli konto auth nie istnieje — utwórz je i wyślij link do ustawienia hasła
            if (!data.auth_user_id) {
                const tempPassword = crypto.randomUUID() + 'Aa1!'
                const { error: signUpError } = await supabase.auth.signUp({
                    email: newUser.email,
                    password: tempPassword
                })

                if (signUpError && !signUpError.message.includes('already registered')) {
                    // Konto app_users dodane, ale auth się nie udało — nie blokujemy
                    console.warn('Nie udało się utworzyć konta auth:', signUpError.message)
                }

                // Wyślij link do ustawienia hasła
                await supabase.auth.resetPasswordForEmail(newUser.email, {
                    redirectTo: window.location.origin
                })

                setSuccessMessage(`Użytkownik dodany! Link do ustawienia hasła wysłany na ${newUser.email}`)

                // Odśwież listę (trigger mógł połączyć konto)
                await fetchUsers()
            } else {
                setSuccessMessage(`Użytkownik dodany i automatycznie powiązany z istniejącym kontem`)
                setUsers([data, ...users])
            }

            setShowAddForm(false)
            setNewUser({ email: '', name: '', role: 'agent', oddzial: '' })
        } catch (err: any) {
            setError(err.message)
        }
    }

    const handleInviteUser = async (user: AppUser) => {
        setInvitingUser(user.id)
        setError(null)
        setSuccessMessage(null)

        try {
            if (!user.auth_user_id) {
                // Utwórz konto auth jeśli nie istnieje
                const tempPassword = crypto.randomUUID() + 'Aa1!'
                const { error: signUpError } = await supabase.auth.signUp({
                    email: user.email,
                    password: tempPassword
                })
                if (signUpError && !signUpError.message.includes('already registered')) {
                    throw signUpError
                }
            }

            // Wyślij link do ustawienia/resetowania hasła
            const { error: resetError } = await supabase.auth.resetPasswordForEmail(user.email, {
                redirectTo: window.location.origin
            })
            if (resetError) throw resetError

            setSuccessMessage(`Link do ustawienia hasła wysłany na ${user.email}`)

            // Odśwież listę (mogło się połączyć)
            await fetchUsers()
        } catch (err: any) {
            setError(err.message)
        } finally {
            setInvitingUser(null)
        }
    }

    const handleLinkAccount = async (_user: AppUser) => {
        setError(null)
        setSuccessMessage(null)

        try {
            // Odświeżamy listę — trigger przy loginie użytkownika połączy konto automatycznie
            await fetchUsers()
            setSuccessMessage('Lista odświeżona. Konto zostanie powiązane automatycznie przy następnym logowaniu użytkownika.')
        } catch (err: any) {
            setError(err.message)
        }
    }

    const handleUpdateUser = async (userId: string) => {
        try {
            setError(null)
            const { error } = await supabase
                .from('app_users')
                .update({
                    name: editForm.name,
                    role: editForm.role,
                    oddzial: editForm.oddzial || null,
                    is_active: editForm.is_active
                })
                .eq('id', userId)

            if (error) throw error

            setUsers(users.map(u => u.id === userId ? { ...u, ...editForm } : u))
            setEditingUser(null)
            setEditForm({})
        } catch (err: any) {
            setError(err.message)
        }
    }

    const handleDeleteUser = async (userId: string, email: string) => {
        if (!confirm(`Czy na pewno chcesz usunąć użytkownika ${email}?`)) return

        try {
            setError(null)
            const { error } = await supabase
                .from('app_users')
                .delete()
                .eq('id', userId)

            if (error) throw error
            setUsers(users.filter(u => u.id !== userId))
        } catch (err: any) {
            setError(err.message)
        }
    }

    const toggleUserActive = async (userId: string, currentStatus: boolean) => {
        try {
            setError(null)
            const { error } = await supabase
                .from('app_users')
                .update({ is_active: !currentStatus })
                .eq('id', userId)

            if (error) throw error
            setUsers(users.map(u => u.id === userId ? { ...u, is_active: !currentStatus } : u))
        } catch (err: any) {
            setError(err.message)
        }
    }

    const startEditing = (user: AppUser) => {
        setEditingUser(user.id)
        setEditForm({
            name: user.name,
            role: user.role,
            oddzial: user.oddzial,
            is_active: user.is_active
        })
    }

    const getRoleStyle = (role: string) => {
        const r = roles.find(r => r.value === role)
        return {
            background: `${r?.color}20`,
            color: r?.color,
            padding: '0.25rem 0.75rem',
            borderRadius: '6px',
            fontSize: '0.75rem',
            fontWeight: 600,
            textTransform: 'uppercase' as const
        }
    }

    if (loading) {
        return (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
                <RefreshCw className="animate-spin" size={48} color="var(--primary)" />
            </div>
        )
    }

    return (
        <div>
            {error && (
                <div className="glass-card" style={{
                    background: 'rgba(236, 72, 153, 0.1)',
                    borderColor: 'var(--accent-pink)',
                    marginBottom: '1.5rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '1rem'
                }}>
                    <AlertCircle color="var(--accent-pink)" />
                    <p>{error}</p>
                    <button className="btn" style={{ marginLeft: 'auto', padding: '0.5rem 1rem' }} onClick={() => setError(null)}>
                        <X size={16} />
                    </button>
                </div>
            )}

            {successMessage && (
                <div className="glass-card" style={{
                    background: 'rgba(16, 185, 129, 0.1)',
                    borderColor: 'var(--accent-green)',
                    marginBottom: '1.5rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '1rem'
                }}>
                    <Check color="var(--accent-green)" />
                    <p style={{ color: 'var(--accent-green)' }}>{successMessage}</p>
                    <button className="btn" style={{ marginLeft: 'auto', padding: '0.5rem 1rem' }} onClick={() => setSuccessMessage(null)}>
                        <X size={16} />
                    </button>
                </div>
            )}

            {/* Header z przyciskiem dodawania */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <div style={{
                        background: 'var(--primary)',
                        padding: '0.75rem',
                        borderRadius: '12px',
                        display: 'flex'
                    }}>
                        <Users size={24} color="white" />
                    </div>
                    <div>
                        <h2 style={{ fontSize: '1.25rem', fontWeight: 700 }}>Zarządzanie Użytkownikami</h2>
                        <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                            {users.length} użytkowników w systemie
                        </p>
                    </div>
                </div>
                <div style={{ display: 'flex', gap: '0.75rem' }}>
                    <button
                        className="btn"
                        onClick={fetchUsers}
                        style={{ padding: '0.75rem' }}
                    >
                        <RefreshCw size={20} />
                    </button>
                    <button
                        className="btn btn-primary"
                        onClick={() => setShowAddForm(true)}
                        style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                    >
                        <UserPlus size={20} />
                        Dodaj Użytkownika
                    </button>
                </div>
            </div>

            {/* Formularz dodawania */}
            {showAddForm && (
                <div className="glass-card" style={{ marginBottom: '1.5rem', border: '1px solid var(--primary)' }}>
                    <h3 style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <UserPlus size={20} color="var(--primary)" />
                        Nowy Użytkownik
                    </h3>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                        <div className="form-group">
                            <label><Mail size={14} /> Email</label>
                            <input
                                type="email"
                                className="input-field"
                                placeholder="email@firma.pl"
                                value={newUser.email}
                                onChange={e => setNewUser({ ...newUser, email: e.target.value })}
                            />
                        </div>
                        <div className="form-group">
                            <label><Users size={14} /> Imię i nazwisko</label>
                            <input
                                type="text"
                                className="input-field"
                                placeholder="Jan Kowalski"
                                value={newUser.name}
                                onChange={e => setNewUser({ ...newUser, name: e.target.value })}
                            />
                        </div>
                        <div className="form-group">
                            <label><Shield size={14} /> Rola</label>
                            <select
                                className="input-field"
                                value={newUser.role}
                                onChange={e => setNewUser({ ...newUser, role: e.target.value as any })}
                            >
                                {assignableRoles.map(r => (
                                    <option key={r.value} value={r.value}>{r.label}</option>
                                ))}
                            </select>
                        </div>
                        <div className="form-group">
                            <label><Building2 size={14} /> Oddział</label>
                            <select
                                className="input-field"
                                value={newUser.oddzial}
                                onChange={e => setNewUser({ ...newUser, oddzial: e.target.value })}
                            >
                                <option value="">Wszystkie (tylko admin)</option>
                                {branches.map(b => (
                                    <option key={b} value={b}>{b}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                    <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1rem' }}>
                        <button className="btn btn-primary" onClick={handleAddUser}>
                            <Check size={18} style={{ marginRight: '0.5rem' }} />
                            Dodaj
                        </button>
                        <button className="btn" onClick={() => setShowAddForm(false)}>
                            <X size={18} style={{ marginRight: '0.5rem' }} />
                            Anuluj
                        </button>
                    </div>
                    <p style={{ marginTop: '1rem', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        * Po dodaniu, użytkownik otrzyma email z linkiem do ustawienia hasła. Konto zostanie automatycznie powiązane.
                    </p>
                </div>
            )}

            {/* Tabela użytkowników */}
            <div className="glass-card table-container" style={{ padding: 0 }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '700px' }}>
                    <thead>
                        <tr style={{ background: 'rgba(255,255,255,0.05)' }}>
                            <th style={{ padding: '1rem', textAlign: 'left', fontWeight: 600, fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Użytkownik</th>
                            <th style={{ padding: '1rem', textAlign: 'left', fontWeight: 600, fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Rola</th>
                            <th style={{ padding: '1rem', textAlign: 'left', fontWeight: 600, fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Oddział</th>
                            <th style={{ padding: '1rem', textAlign: 'center', fontWeight: 600, fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Status</th>
                            <th style={{ padding: '1rem', textAlign: 'center', fontWeight: 600, fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Powiązane</th>
                            <th style={{ padding: '1rem', textAlign: 'right', fontWeight: 600, fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Akcje</th>
                        </tr>
                    </thead>
                    <tbody>
                        {users.map(user => (
                            <tr
                                key={user.id}
                                style={{
                                    borderTop: '1px solid var(--border)',
                                    opacity: user.is_active ? 1 : 0.5
                                }}
                            >
                                {editingUser === user.id ? (
                                    // Tryb edycji
                                    <>
                                        <td style={{ padding: '0.75rem 1rem' }}>
                                            <input
                                                type="text"
                                                className="input-field"
                                                style={{ margin: 0, padding: '0.5rem' }}
                                                value={editForm.name || ''}
                                                onChange={e => setEditForm({ ...editForm, name: e.target.value })}
                                                placeholder="Imię i nazwisko"
                                            />
                                            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>{user.email}</p>
                                        </td>
                                        <td style={{ padding: '0.75rem 1rem' }}>
                                            <select
                                                className="input-field"
                                                style={{ margin: 0, padding: '0.5rem', ...(isSuperadmin(user) ? { opacity: 0.7, cursor: 'not-allowed' } : {}) }}
                                                value={editForm.role}
                                                onChange={e => setEditForm({ ...editForm, role: e.target.value as any })}
                                                disabled={isSuperadmin(user)}
                                            >
                                                {isSuperadmin(user)
                                                    ? <option value="superadmin">Superadmin</option>
                                                    : assignableRoles.map(r => (
                                                        <option key={r.value} value={r.value}>{r.label}</option>
                                                    ))
                                                }
                                            </select>
                                        </td>
                                        <td style={{ padding: '0.75rem 1rem' }}>
                                            <select
                                                className="input-field"
                                                style={{ margin: 0, padding: '0.5rem' }}
                                                value={editForm.oddzial || ''}
                                                onChange={e => setEditForm({ ...editForm, oddzial: e.target.value || null })}
                                            >
                                                <option value="">Wszystkie</option>
                                                {branches.map(b => (
                                                    <option key={b} value={b}>{b}</option>
                                                ))}
                                            </select>
                                        </td>
                                        <td style={{ padding: '0.75rem 1rem', textAlign: 'center' }}>
                                            <button
                                                className="btn"
                                                style={{
                                                    padding: '0.25rem 0.5rem',
                                                    background: editForm.is_active ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)',
                                                    color: editForm.is_active ? 'var(--accent-green)' : '#ef4444'
                                                }}
                                                onClick={() => setEditForm({ ...editForm, is_active: !editForm.is_active })}
                                            >
                                                {editForm.is_active ? 'Aktywny' : 'Nieaktywny'}
                                            </button>
                                        </td>
                                        <td style={{ padding: '0.75rem 1rem', textAlign: 'center' }}>
                                            {user.auth_user_id ? (
                                                <Check size={18} color="var(--accent-green)" />
                                            ) : (
                                                <X size={18} color="var(--text-muted)" />
                                            )}
                                        </td>
                                        <td style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>
                                            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                                                <button
                                                    className="btn btn-primary"
                                                    style={{ padding: '0.5rem' }}
                                                    onClick={() => handleUpdateUser(user.id)}
                                                >
                                                    <Save size={16} />
                                                </button>
                                                <button
                                                    className="btn"
                                                    style={{ padding: '0.5rem' }}
                                                    onClick={() => { setEditingUser(null); setEditForm({}) }}
                                                >
                                                    <X size={16} />
                                                </button>
                                            </div>
                                        </td>
                                    </>
                                ) : (
                                    // Tryb wyświetlania
                                    <>
                                        <td style={{ padding: '0.75rem 1rem' }}>
                                            <p style={{ fontWeight: 600 }}>{user.name || '(brak nazwy)'}</p>
                                            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{user.email}</p>
                                        </td>
                                        <td style={{ padding: '0.75rem 1rem' }}>
                                            <span style={getRoleStyle(user.role)}>{user.role}</span>
                                        </td>
                                        <td style={{ padding: '0.75rem 1rem' }}>
                                            {user.oddzial ? (
                                                <span style={{
                                                    background: 'rgba(16, 185, 129, 0.2)',
                                                    color: 'var(--accent-green)',
                                                    padding: '0.25rem 0.75rem',
                                                    borderRadius: '6px',
                                                    fontSize: '0.75rem',
                                                    fontWeight: 600
                                                }}>
                                                    {user.oddzial}
                                                </span>
                                            ) : (
                                                <span style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Wszystkie</span>
                                            )}
                                        </td>
                                        <td style={{ padding: '0.75rem 1rem', textAlign: 'center' }}>
                                            {isSuperadmin(user) ? (
                                                <span style={{
                                                    padding: '0.25rem 0.5rem',
                                                    fontSize: '0.75rem',
                                                    background: 'rgba(16, 185, 129, 0.2)',
                                                    color: 'var(--accent-green)',
                                                    borderRadius: '6px',
                                                    fontWeight: 600
                                                }}>
                                                    Chroniony
                                                </span>
                                            ) : (
                                                <button
                                                    className="btn"
                                                    style={{
                                                        padding: '0.25rem 0.5rem',
                                                        fontSize: '0.75rem',
                                                        background: user.is_active ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)',
                                                        color: user.is_active ? 'var(--accent-green)' : '#ef4444'
                                                    }}
                                                    onClick={() => toggleUserActive(user.id, user.is_active)}
                                                >
                                                    {user.is_active ? 'Aktywny' : 'Nieaktywny'}
                                                </button>
                                            )}
                                        </td>
                                        <td style={{ padding: '0.75rem 1rem', textAlign: 'center' }}>
                                            {user.auth_user_id ? (
                                                <span title="Konto powiązane">
                                                    <Check size={18} color="var(--accent-green)" />
                                                </span>
                                            ) : (
                                                <button
                                                    className="btn"
                                                    style={{
                                                        padding: '0.25rem 0.5rem',
                                                        fontSize: '0.7rem',
                                                        background: 'rgba(245, 158, 11, 0.2)',
                                                        color: '#f59e0b'
                                                    }}
                                                    onClick={() => handleLinkAccount(user)}
                                                    title="Spróbuj połączyć konto"
                                                >
                                                    <Link size={12} style={{ marginRight: '0.25rem' }} />
                                                    Połącz
                                                </button>
                                            )}
                                        </td>
                                        <td style={{ padding: '0.75rem 0.5rem', textAlign: 'right' }}>
                                            <div className="user-actions" style={{ display: 'flex', gap: '0.25rem', justifyContent: 'flex-end' }}>
                                                {!user.auth_user_id && (
                                                    <button
                                                        className="btn"
                                                        style={{
                                                            padding: '0.35rem',
                                                            color: 'var(--accent-blue)',
                                                            opacity: invitingUser === user.id ? 0.5 : 1
                                                        }}
                                                        onClick={() => handleInviteUser(user)}
                                                        disabled={invitingUser === user.id}
                                                        title="Wyślij zaproszenie (link do ustawienia hasła)"
                                                    >
                                                        {invitingUser === user.id ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                                                    </button>
                                                )}
                                                <button
                                                    className="btn"
                                                    style={{ padding: '0.35rem' }}
                                                    onClick={() => startEditing(user)}
                                                    title="Edytuj"
                                                >
                                                    <Edit2 size={14} />
                                                </button>
                                                {!isSuperadmin(user) && (
                                                    <button
                                                        className="btn"
                                                        style={{ padding: '0.35rem', color: '#ef4444' }}
                                                        onClick={() => handleDeleteUser(user.id, user.email)}
                                                        title="Usuń"
                                                    >
                                                        <Trash2 size={14} />
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </>
                                )}
                            </tr>
                        ))}
                    </tbody>
                </table>

                {users.length === 0 && (
                    <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                        <Users size={48} style={{ opacity: 0.3, marginBottom: '1rem' }} />
                        <p>Brak użytkowników w systemie</p>
                        <p style={{ fontSize: '0.875rem' }}>Dodaj pierwszego użytkownika klikając przycisk powyżej</p>
                    </div>
                )}
            </div>

            {/* Legenda */}
            <div className="glass-card" style={{ marginTop: '1.5rem' }}>
                <h4 style={{ marginBottom: '1rem', fontSize: '0.875rem', fontWeight: 600 }}>Legenda ról:</h4>
                <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap' }}>
                    <div>
                        <span style={getRoleStyle('superadmin')}>Superadmin</span>
                        <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>
                            Pełny dostęp + ochrona przed usunięciem i degradacją
                        </p>
                    </div>
                    <div>
                        <span style={getRoleStyle('admin')}>Admin</span>
                        <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>
                            Pełny dostęp do wszystkich oddziałów i ustawień
                        </p>
                    </div>
                    <div>
                        <span style={getRoleStyle('manager')}>Manager</span>
                        <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>
                            Widzi i edytuje tylko dane ze swojego oddziału
                        </p>
                    </div>
                    <div>
                        <span style={getRoleStyle('agent')}>Agent</span>
                        <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>
                            Widzi tylko dane ze swojego oddziału (bez edycji)
                        </p>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default UserManagement
