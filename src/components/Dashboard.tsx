import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabaseClient'
import type { User as SupabaseUser } from '@supabase/supabase-js'
import { LayoutDashboard, Users, TrendingUp, LogOut, PlusCircle, Building2, Calendar, Filter, Database, RefreshCw, AlertCircle, User, Menu, X, Trophy, Shield, ScrollText } from 'lucide-react'
import FreedomLogo from './FreedomLogo'
import { AnimatePresence, motion } from 'framer-motion'
import { useData } from '../hooks/useData'
import { useWindowWidth } from '../hooks/useWindowWidth'
import DataEntry from './DataEntry'
import AgentEntry from './AgentEntry'
import SummaryView from './SummaryView'
import BranchesView from './BranchesView'
import AgentsView from './AgentsView'
import ReportsView from './ReportsView'
import DatabaseView from './DatabaseView'
import PerformanceView from './PerformanceView'
import UserManagement from './UserManagement'
import AuditLogView from './AuditLogView'

interface DashboardProps {
    onLogout: () => void
}

type TabType = 'summary' | 'branches' | 'agents' | 'reports' | 'database' | 'performance' | 'users' | 'audit'

const Dashboard = ({ onLogout }: DashboardProps) => {
    const {
        allTransactions,
        unfilteredTransactions,
        addTransaction,
        updateTransaction,
        deleteTransaction,
        allAgents,
        addAgent,
        toggleAgentStatus,
        dateRange,
        setDateRange,
        availableYears,
        loading,
        error,
        transactions,
        refreshData,
        tranchesByTransaction,
        getEffectiveTranches,
        saveTranches
    } = useData()

    const [activeTab, setActiveTab] = useState<TabType>('summary')
    const [isAddingData, setIsAddingData] = useState(false)
    const [isAddingAgent, setIsAddingAgent] = useState(false)
    const [user, setUser] = useState<SupabaseUser | null>(null)
    const [userRole, setUserRole] = useState<string>('agent')
    const [userOddzial, setUserOddzial] = useState<string | null>(null)
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
    const windowWidth = useWindowWidth()

    useEffect(() => {
        const getUserProfile = async () => {
            const { data: { user } } = await supabase.auth.getUser()
            if (user) {
                setUser(user)

                // Pobierz rolę i oddział z tabeli app_users (jedyne źródło uprawnień)
                const { data: appUser } = await supabase
                    .from('app_users')
                    .select('role, oddzial, name')
                    .eq('auth_user_id', user.id)
                    .eq('is_active', true)
                    .single()

                if (appUser) {
                    setUserRole(appUser.role)
                    setUserOddzial(appUser.oddzial)
                } else {
                    // Konto nie jest powiązane — spróbuj połączyć automatycznie po emailu
                    const { data: linkResult } = await supabase.rpc('link_my_account')

                    if (linkResult?.success && (linkResult.linked || linkResult.already_linked)) {
                        setUserRole(linkResult.role || 'agent')
                        setUserOddzial(linkResult.oddzial || null)
                    } else {
                        console.warn('Użytkownik nie ma przypisanych uprawnień w tabeli app_users:', user.email)
                        setUserRole('agent')
                        setUserOddzial(null)
                    }
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

    // Manager widzi tylko dane ze swojego oddziału
    const isManager = userRole === 'manager' && userOddzial
    const visibleTransactions = isManager ? allTransactions.filter(t => t.oddzial === userOddzial) : allTransactions
    const visibleUnfilteredTransactions = isManager ? unfilteredTransactions.filter(t => t.oddzial === userOddzial) : unfilteredTransactions
    const visibleAgents = isManager ? allAgents.filter(a => a.oddzial === userOddzial) : allAgents
    const visibleDbTransactions = isManager ? transactions.filter(t => t.oddzial === userOddzial) : transactions

    const renderContent = () => {
        if (loading && transactionsCount === 0) return (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
                <RefreshCw className="animate-spin" size={48} color="var(--primary)" />
            </div>
        )

        switch (activeTab) {
            case 'summary': return (
                <SummaryView
                    transactions={visibleTransactions}
                    allDbTransactions={visibleDbTransactions}
                    dateRange={dateRange}
                    getEffectiveTranches={getEffectiveTranches}
                />
            )
            case 'branches': return (
                <BranchesView
                    transactions={visibleTransactions}
                    getEffectiveTranches={getEffectiveTranches}
                    dateRange={dateRange}
                />
            )
            case 'agents': return (
                <AgentsView
                    transactions={visibleUnfilteredTransactions}
                    agents={visibleAgents}
                    onAddAgent={() => setIsAddingAgent(true)}
                    onToggleStatus={toggleAgentStatus}
                    getEffectiveTranches={getEffectiveTranches}
                    dateRange={dateRange}
                    userRole={userRole}
                    userOddzial={userOddzial}
                />
            )
            case 'reports': return (
                <ReportsView
                    transactions={visibleTransactions}
                    getEffectiveTranches={getEffectiveTranches}
                    dateRange={dateRange}
                />
            )
            case 'database': return (
                <DatabaseView
                    transactions={visibleUnfilteredTransactions.filter(t => t.rok === dateRange.year)}
                    onDelete={deleteTransaction}
                    onUpdate={updateTransaction}
                    agents={visibleAgents}
                    tranchesByTransaction={tranchesByTransaction}
                    onSaveTranches={saveTranches}
                    userRole={userRole}
                    userOddzial={userOddzial}
                />
            )
            case 'performance': return (
                <PerformanceView
                    agents={visibleAgents.map(a => ({ name: a.name, oddzial: a.oddzial }))}
                    userRole={userRole}
                    userOddzial={userOddzial}
                    transactions={visibleDbTransactions}
                    tranchesByTransaction={tranchesByTransaction}
                />
            )
            case 'users': return <UserManagement />
            case 'audit': return <AuditLogView />
            default: return (
                <SummaryView
                    transactions={visibleTransactions}
                    allDbTransactions={visibleDbTransactions}
                    dateRange={dateRange}
                    getEffectiveTranches={getEffectiveTranches}
                />
            )
        }
    }

    const getTabTitle = () => {
        switch (activeTab) {
            case 'summary': return 'Podsumowanie'
            case 'branches': return 'Analiza Oddziałów'
            case 'agents': return 'Baza Agentów'
            case 'reports': return 'Raporty i Wyniki'
            case 'database': return 'Pełna Baza Danych'
            case 'performance': return 'Aktywność Agentów'
            case 'users': return 'Zarządzanie Użytkownikami'
            case 'audit': return 'Historia Zmian'
            default: return 'Podsumowanie'
        }
    }

    const setQuarter = (q: number) => {
        const startMonth = (q - 1) * 3 + 1
        const endMonth = q * 3
        setDateRange({ ...dateRange, startMonth, endMonth })
    }

    return (
        <div style={{ display: 'flex', minHeight: '100vh', position: 'relative' }}>
            <AnimatePresence>
                {(isMobileMenuOpen || windowWidth > 1024) && (
                    <aside
                        className={`sidebar ${isMobileMenuOpen ? 'open' : ''}`}
                    >
                        <div style={{ marginBottom: '3rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <div style={{ display: 'flex', alignItems: 'center' }}>
                                <div style={{ marginRight: '0.75rem', filter: 'drop-shadow(0 4px 12px rgba(230, 0, 126, 0.4))' }}>
                                    <FreedomLogo size={40} />
                                </div>
                                <h2 style={{ fontSize: '1.5rem', fontWeight: 800, background: 'linear-gradient(to right, #fff, #94a3b8)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Freedom</h2>
                            </div>
                            <button
                                className="mobile-only btn"
                                style={{ padding: '0.5rem', background: 'transparent', color: 'var(--text-muted)' }}
                                onClick={() => setIsMobileMenuOpen(false)}
                            >
                                <X size={24} />
                            </button>
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
                            <NavItem
                                icon={<Trophy size={20} />}
                                label="Aktywność"
                                active={activeTab === 'performance'}
                                onClick={() => setActiveTab('performance')}
                            />

                            <NavItem
                                icon={<Database size={20} />}
                                label="Baza Danych"
                                active={activeTab === 'database'}
                                onClick={() => setActiveTab('database')}
                            />

                            {(userRole === 'admin' || userRole === 'superadmin') && (
                                <NavItem
                                    icon={<Shield size={20} />}
                                    label="Użytkownicy"
                                    active={activeTab === 'users'}
                                    onClick={() => setActiveTab('users')}
                                />
                            )}
                            {userRole === 'superadmin' && (
                                <NavItem
                                    icon={<ScrollText size={20} />}
                                    label="Logi"
                                    active={activeTab === 'audit'}
                                    onClick={() => setActiveTab('audit')}
                                />
                            )}

                            {(userRole === 'admin' || userRole === 'superadmin' || userRole === 'manager') && (
                                <>
                                    <div style={{ margin: '1rem 0', borderTop: '1px solid var(--border)' }} />
                                    <div onClick={(e) => { e.preventDefault(); setIsAddingData(true); }}>
                                        <NavItem icon={<PlusCircle size={20} />} label="Dodaj Transakcję" />
                                    </div>
                                </>
                            )}
                        </nav>

                        <div style={{ marginTop: 'auto', paddingTop: '1rem' }}>
                            {user && (
                                <div style={{
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: '0.5rem',
                                    padding: '0.75rem',
                                    background: 'rgba(255, 255, 255, 0.05)',
                                    borderRadius: '12px',
                                    marginBottom: '1rem',
                                    border: '1px solid var(--border)'
                                }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                        <div style={{
                                            width: '32px',
                                            height: '32px',
                                            background: userRole === 'superadmin' ? '#f59e0b' : userRole === 'admin' ? 'var(--accent-pink)' : userRole === 'manager' ? 'var(--accent-blue)' : 'var(--primary)',
                                            borderRadius: '8px',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center'
                                        }}>
                                            <User size={18} color="white" />
                                        </div>
                                        <div style={{ overflow: 'hidden', flex: 1 }}>
                                            <p style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'white', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                {user.email}
                                            </p>
                                        </div>
                                    </div>
                                    <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                                        <span style={{
                                            fontSize: '0.6875rem',
                                            padding: '0.25rem 0.5rem',
                                            borderRadius: '6px',
                                            background: userRole === 'superadmin' ? 'rgba(245, 158, 11, 0.2)' : userRole === 'admin' ? 'rgba(236, 72, 153, 0.2)' : userRole === 'manager' ? 'rgba(59, 130, 246, 0.2)' : 'rgba(99, 102, 241, 0.2)',
                                            color: userRole === 'superadmin' ? '#f59e0b' : userRole === 'admin' ? 'var(--accent-pink)' : userRole === 'manager' ? 'var(--accent-blue)' : 'var(--primary)',
                                            fontWeight: 600,
                                            textTransform: 'uppercase'
                                        }}>
                                            {userRole}
                                        </span>
                                        {userOddzial && (
                                            <span style={{
                                                fontSize: '0.6875rem',
                                                padding: '0.25rem 0.5rem',
                                                borderRadius: '6px',
                                                background: 'rgba(16, 185, 129, 0.2)',
                                                color: 'var(--accent-green)',
                                                fontWeight: 600
                                            }}>
                                                {userOddzial}
                                            </span>
                                        )}
                                        {(userRole === 'admin' || userRole === 'superadmin') && !userOddzial && (
                                            <span style={{
                                                fontSize: '0.6875rem',
                                                padding: '0.25rem 0.5rem',
                                                borderRadius: '6px',
                                                background: 'rgba(16, 185, 129, 0.2)',
                                                color: 'var(--accent-green)',
                                                fontWeight: 600
                                            }}>
                                                Wszystkie oddzialy
                                            </span>
                                        )}
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
                )}
            </AnimatePresence>

            {isMobileMenuOpen && (
                <div
                    className="mobile-only"
                    style={{
                        position: 'fixed',
                        inset: 0,
                        background: 'rgba(0,0,0,0.5)',
                        zIndex: 40,
                        backdropFilter: 'blur(4px)'
                    }}
                    onClick={() => setIsMobileMenuOpen(false)}
                />
            )}

            <main className="main-content" style={{ width: '100%' }}>
                {loading && transactionsCount === 0 && (
                    <div style={{ position: 'fixed', top: '1rem', right: '1rem', zIndex: 1100, background: 'var(--primary)', padding: '0.5rem 1rem', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
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

                <header style={{ marginBottom: '3rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', width: '100%', justifyContent: 'space-between' }}>
                        <div>
                            <h1 style={{ fontSize: '2.5rem', marginBottom: '0.5rem', fontWeight: 700 }}>{getTabTitle()}</h1>
                            {activeTab !== 'performance' && activeTab !== 'users' && activeTab !== 'audit' && (
                                <p style={{ color: 'var(--text-muted)', display: 'flex', alignItems: 'center' }}>
                                    <Calendar size={16} style={{ marginRight: '0.5rem' }} />
                                    {monthNames[dateRange.startMonth - 1]} - {monthNames[dateRange.endMonth - 1]} {dateRange.year}
                                </p>
                            )}
                        </div>
                        <div style={{ display: 'flex', gap: '0.75rem' }}>
                            {(userRole === 'admin' || userRole === 'superadmin' || userRole === 'manager') && activeTab !== 'performance' && activeTab !== 'users' && activeTab !== 'audit' && (
                                <button
                                    className="mobile-only btn btn-primary"
                                    style={{ padding: '0.75rem' }}
                                    onClick={() => setIsAddingData(true)}
                                >
                                    <PlusCircle size={24} />
                                </button>
                            )}
                            <button
                                className="mobile-only btn"
                                style={{ padding: '0.75rem', background: 'var(--bg-card)', border: '1px solid var(--border)' }}
                                onClick={() => setIsMobileMenuOpen(true)}
                            >
                                <Menu size={24} />
                            </button>
                        </div>
                    </div>

                    {activeTab !== 'performance' && activeTab !== 'users' && activeTab !== 'audit' && (
                        <div className="glass-card" style={{ padding: '1rem', display: 'flex', gap: '1rem', alignItems: 'center', marginTop: '0.5rem', flexWrap: 'wrap' }}>
                            <Filter size={18} color="var(--primary)" />
                            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
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
                    )}
                </header>

                {(activeTab === 'performance' || activeTab === 'users' || activeTab === 'audit') ? (
                    renderContent()
                ) : (
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={`${activeTab}-${dateRange.startMonth}-${dateRange.endMonth}-${dateRange.year}`}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.15 }}
                        >
                            {renderContent()}
                        </motion.div>
                    </AnimatePresence>
                )}
            </main>

            {isAddingData && (
                <DataEntry
                    agents={visibleAgents.filter(a => a.status === 'aktywny')}
                    availableYears={availableYears}
                    onAdd={addTransaction}
                    onClose={() => setIsAddingData(false)}
                    userRole={userRole}
                    userOddzial={userOddzial}
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
    <div
        onClick={(e) => {
            if (onClick) {
                e.stopPropagation();
                onClick();
            }
        }}
        style={{
            display: 'flex',
            alignItems: 'center',
            padding: '0.875rem 1rem',
            borderRadius: '0.75rem',
            cursor: 'pointer',
            background: active ? 'rgba(99, 102, 241, 0.15)' : 'transparent',
            color: active ? 'var(--text-main)' : 'var(--text-muted)',
            fontWeight: active ? 600 : 400,
            transition: 'background 0.2s ease, color 0.2s ease',
            border: active ? '1px solid rgba(99, 102, 241, 0.2)' : '1px solid transparent'
        }}
    >
        <span style={{ marginRight: '0.75rem', color: active ? 'var(--primary)' : 'inherit' }}>{icon}</span>
        {label}
    </div>
)

export default Dashboard
