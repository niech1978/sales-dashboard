import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabaseClient'
import { LayoutDashboard, Users, TrendingUp, LogOut, PlusCircle, Building2, Calendar, Filter, Database, RefreshCw, AlertCircle, User } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useData } from '../hooks/useData'
import DataEntry from './DataEntry'
import AgentEntry from './AgentEntry'
import SummaryView from './SummaryView'
import BranchesView from './BranchesView'
import AgentsView from './AgentsView'
import ReportsView from './ReportsView'
import DatabaseView from './DatabaseView'

interface DashboardProps {
    onLogout: () => void
}

type TabType = 'summary' | 'branches' | 'agents' | 'reports' | 'database'

const Dashboard = ({ onLogout }: DashboardProps) => {
    const {
        allTransactions,
        unfilteredTransactions,
        addTransaction,
        deleteTransaction,
        allAgents,
        addAgent,
        toggleAgentStatus,
        dateRange,
        setDateRange,
        availableYears,
        loading,
        error,
        refreshData
    } = useData()

    const [activeTab, setActiveTab] = useState<TabType>('summary')
    const [isAddingData, setIsAddingData] = useState(false)
    const [isAddingAgent, setIsAddingAgent] = useState(false)
    const [user, setUser] = useState<any>(null)
    const [userRole, setUserRole] = useState<string>('agent')

    useEffect(() => {
        const getUserProfile = async () => {
            const { data: { user } } = await supabase.auth.getUser()
            if (user) {
                setUser(user)
                const { data: profile } = await supabase
                    .from('profiles')
                    .select('role')
                    .eq('id', user.id)
                    .single()

                if (profile) {
                    setUserRole(profile.role)
                }
            }
        }
        getUserProfile()
    }, [])

    const monthNames = [
        'Styczeń', 'Luty', 'Marzec', 'Kwiecień', 'Maj', 'Czerwiec',
        'Lipiec', 'Sierpień', 'Wrzesień', 'Październik', 'Listopad', 'Grudzień'
    ]


    const transactionsCount = unfilteredTransactions.length

    const renderContent = () => {
        if (loading && transactionsCount === 0) return (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
                <RefreshCw className="animate-spin" size={48} color="var(--primary)" />
            </div>
        )

        switch (activeTab) {
            case 'summary': return <SummaryView transactions={allTransactions} />
            case 'branches': return <BranchesView transactions={allTransactions} />
            case 'agents': return (
                <AgentsView
                    transactions={allTransactions}
                    agents={allAgents}
                    onAddAgent={() => setIsAddingAgent(true)}
                    onToggleStatus={toggleAgentStatus}
                />
            )
            case 'reports': return <ReportsView transactions={allTransactions} />
            case 'database': return (
                <DatabaseView
                    transactions={unfilteredTransactions.filter(t => t.rok === dateRange.year)}
                    onDelete={deleteTransaction}
                />
            )
            default: return <SummaryView transactions={allTransactions} />
        }
    }

    const getTabTitle = () => {
        switch (activeTab) {
            case 'summary': return 'Podsumowanie'
            case 'branches': return 'Analiza Oddziałów'
            case 'agents': return 'Baza Agentów'
            case 'reports': return 'Raporty i Wyniki'
            case 'database': return 'Pełna Baza Danych'
            default: return 'Podsumowanie'
        }
    }

    const setQuarter = (q: number) => {
        const startMonth = (q - 1) * 3 + 1
        const endMonth = q * 3
        setDateRange({ ...dateRange, startMonth, endMonth })
    }

    return (
        <div style={{ display: 'flex' }}>
            <aside className="sidebar">
                <div style={{ marginBottom: '3rem', display: 'flex', alignItems: 'center' }}>
                    <div style={{
                        width: '40px',
                        height: '40px',
                        background: 'var(--primary)',
                        borderRadius: '12px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginRight: '1rem',
                        boxShadow: '0 8px 16px rgba(99, 102, 241, 0.4)'
                    }}>
                        <TrendingUp size={24} color="white" />
                    </div>
                    <h2 style={{ fontSize: '1.5rem', fontWeight: 800, background: 'linear-gradient(to right, #fff, #94a3b8)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Freedom</h2>
                </div>

                <nav style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <NavItem
                        icon={<LayoutDashboard size={20} />}
                        label="Podsumowanie"
                        active={activeTab === 'summary'}
                        onClick={() => setActiveTab('summary')}
                    />
                    <NavItem
                        icon={<Building2 size={20} />}
                        label="Oddziały"
                        active={activeTab === 'branches'}
                        onClick={() => setActiveTab('branches')}
                    />
                    <NavItem
                        icon={<Users size={20} />}
                        label="Agenci"
                        active={activeTab === 'agents'}
                        onClick={() => setActiveTab('agents')}
                    />
                    <NavItem
                        icon={<TrendingUp size={20} />}
                        label="Raporty"
                        active={activeTab === 'reports'}
                        onClick={() => setActiveTab('reports')}
                    />

                    {userRole === 'admin' && (
                        <>
                            <NavItem
                                icon={<Database size={20} />}
                                label="Baza Danych"
                                active={activeTab === 'database'}
                                onClick={() => setActiveTab('database')}
                            />
                            <div style={{ margin: '1rem 0', borderTop: '1px solid var(--border)' }} />
                            <div onClick={() => setIsAddingData(true)}>
                                <NavItem icon={<PlusCircle size={20} />} label="Dodaj Transakcję" />
                            </div>
                        </>
                    )}
                </nav>

                <div style={{ marginTop: 'auto', paddingTop: '1rem' }}>
                    {user && (
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.75rem',
                            padding: '0.75rem',
                            background: 'rgba(255, 255, 255, 0.05)',
                            borderRadius: '12px',
                            marginBottom: '1rem',
                            border: '1px solid var(--border)'
                        }}>
                            <div style={{
                                width: '32px',
                                height: '32px',
                                background: 'var(--primary)',
                                borderRadius: '8px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                            }}>
                                <User size={18} color="white" />
                            </div>
                            <div style={{ overflow: 'hidden' }}>
                                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '2px' }}>Zalogowany jako</p>
                                <p style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'white', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                    {user.email}
                                </p>
                            </div>
                        </div>
                    )}

                    <button
                        onClick={onLogout}
                        className="btn"
                        style={{
                            width: '100%',
                            justifyContent: 'flex-start',
                            color: 'var(--text-muted)',
                            padding: '1rem',
                            background: 'transparent'
                        }}
                    >
                        <LogOut size={20} style={{ marginRight: '0.75rem' }} />
                        Wyloguj
                    </button>
                </div>
            </aside>

            <main className="main-content" style={{ width: '100%' }}>
                {loading && transactionsCount === 0 && (
                    <div style={{ position: 'fixed', top: '1rem', right: '1rem', zIndex: 100, background: 'var(--primary)', padding: '0.5rem 1rem', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <RefreshCw className="animate-spin" size={16} />
                        <span>Ładowanie danych...</span>
                    </div>
                )}


                {error && (
                    <div className="glass-card" style={{ background: 'rgba(236, 72, 153, 0.1)', borderColor: 'var(--accent-pink)', marginBottom: '2rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <AlertCircle color="var(--accent-pink)" />
                        <p>Błąd bazy danych: {error}</p>
                        <button className="btn" style={{ marginLeft: 'auto', padding: '0.5rem 1rem' }} onClick={refreshData}>Odśwież</button>
                    </div>
                )}

                <header style={{ marginBottom: '3rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                        <h1 style={{ fontSize: '2.5rem', marginBottom: '0.5rem', fontWeight: 700 }}>{getTabTitle()}</h1>
                        <p style={{ color: 'var(--text-muted)', display: 'flex', alignItems: 'center' }}>
                            <Calendar size={16} style={{ marginRight: '0.5rem' }} />
                            {monthNames[dateRange.startMonth - 1]} - {monthNames[dateRange.endMonth - 1]} {dateRange.year}
                        </p>
                    </div>

                    <div className="glass-card" style={{ padding: '1rem', display: 'flex', gap: '1rem', alignItems: 'center', marginTop: '0.5rem' }}>
                        <Filter size={18} color="var(--primary)" />
                        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                            <select
                                className="input-field"
                                style={{ margin: 0, padding: '0.5rem', width: '100px', fontWeight: 700, borderColor: 'var(--primary)' }}
                                value={dateRange.year}
                                onChange={e => setDateRange({ ...dateRange, year: parseInt(e.target.value) })}
                            >
                                {availableYears.map(year => <option key={year} value={year}>{year}</option>)}
                            </select>
                            <div style={{ width: '1px', height: '24px', background: 'var(--border)', margin: '0 0.5rem' }} />
                            <select
                                className="input-field"
                                style={{ margin: 0, padding: '0.5rem', width: '130px' }}
                                value={dateRange.startMonth}
                                onChange={e => setDateRange({ ...dateRange, startMonth: parseInt(e.target.value) })}
                            >
                                {monthNames.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
                            </select>
                            <span style={{ color: 'var(--text-muted)' }}>do</span>
                            <select
                                className="input-field"
                                style={{ margin: 0, padding: '0.5rem', width: '130px' }}
                                value={dateRange.endMonth}
                                onChange={e => setDateRange({ ...dateRange, endMonth: parseInt(e.target.value) })}
                            >
                                {monthNames.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
                            </select>
                        </div>
                        <div style={{ borderLeft: '1px solid var(--border)', paddingLeft: '1rem', display: 'flex', gap: '0.5rem' }}>
                            {[1, 2, 3, 4].map(q => (
                                <button
                                    key={q}
                                    className="btn"
                                    style={{
                                        padding: '0.4rem 0.8rem',
                                        fontSize: '0.75rem',
                                        background: (dateRange.startMonth === (q - 1) * 3 + 1 && dateRange.endMonth === q * 3) ? 'var(--primary)' : 'rgba(255,255,255,0.05)'
                                    }}
                                    onClick={() => setQuarter(q)}
                                >
                                    Q{q}
                                </button>
                            ))}
                            <button
                                className="btn"
                                style={{
                                    padding: '0.4rem 0.8rem',
                                    fontSize: '0.75rem',
                                    background: (dateRange.startMonth === 1 && dateRange.endMonth === 12) ? 'var(--primary)' : 'rgba(255,255,255,0.05)'
                                }}
                                onClick={() => setDateRange({ ...dateRange, startMonth: 1, endMonth: 12, year: dateRange.year })}
                            >
                                Cały Rok
                            </button>
                        </div>
                    </div>
                </header>

                <AnimatePresence mode="wait">
                    <motion.div
                        key={`${activeTab}-${dateRange.startMonth}-${dateRange.endMonth}-${dateRange.year}`}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ duration: 0.2 }}
                    >
                        {renderContent()}
                    </motion.div>
                </AnimatePresence>
            </main>

            {isAddingData && (
                <DataEntry
                    agents={allAgents.filter(a => a.status === 'aktywny')}
                    availableYears={availableYears}
                    onAdd={addTransaction}
                    onClose={() => setIsAddingData(false)}
                />
            )}

            {isAddingAgent && (
                <AgentEntry
                    onAdd={addAgent}
                    onClose={() => setIsAddingAgent(false)}
                />
            )}
        </div>
    )
}

const NavItem = ({ icon, label, active = false, onClick }: { icon: React.ReactNode, label: string, active?: boolean, onClick?: () => void }) => (
    <motion.div
        whileHover={{ x: 5 }}
        onClick={onClick}
        style={{
            display: 'flex',
            alignItems: 'center',
            padding: '0.875rem 1rem',
            borderRadius: '0.75rem',
            cursor: 'pointer',
            background: active ? 'rgba(99, 102, 241, 0.15)' : 'transparent',
            color: active ? 'var(--text-main)' : 'var(--text-muted)',
            fontWeight: active ? 600 : 400,
            transition: 'all 0.2s ease',
            border: active ? '1px solid rgba(99, 102, 241, 0.2)' : '1px solid transparent'
        }}
    >
        <span style={{ marginRight: '0.75rem', color: active ? 'var(--primary)' : 'inherit' }}>{icon}</span>
        {label}
    </motion.div>
)

export default Dashboard
