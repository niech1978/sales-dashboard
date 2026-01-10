import React, { useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { Mail, Lock, LogIn, AlertCircle, Loader2, TrendingUp } from 'lucide-react';

export default function Auth() {
    const [loading, setLoading] = useState(false);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [isSignUp, setIsSignUp] = useState(false);
    const [isForgotPassword, setIsForgotPassword] = useState(false);
    const [message, setMessage] = useState<string | null>(null);

    const handleAuth = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        setMessage(null);

        try {
            if (isForgotPassword) {
                const { error } = await supabase.auth.resetPasswordForEmail(email, {
                    redirectTo: window.location.origin,
                });
                if (error) throw error;
                setMessage('Link do resetowania hasła został wysłany na Twój e-mail!');
            } else if (isSignUp) {
                const { error } = await supabase.auth.signUp({
                    email,
                    password,
                    options: {
                        data: { full_name: email.split('@')[0] },
                        emailRedirectTo: window.location.origin
                    }
                });
                if (error) throw error;
                setMessage('Sprawdź e-mail, aby potwierdzić rejestrację!');
            } else {
                const { error } = await supabase.auth.signInWithPassword({
                    email,
                    password,
                });
                if (error) throw error;
            }
        } catch (err: any) {
            setError(err.message || 'Wystąpił błąd');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="auth-container" style={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'radial-gradient(circle at top left, #1e293b, #0f172a)',
            padding: '1rem'
        }}>
            <div className="glass-card" style={{
                width: '100%',
                maxWidth: '400px',
                padding: '2.5rem',
                animation: 'fadeIn 0.5s ease-out'
            }}>
                <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
                    <div style={{
                        width: '64px',
                        height: '64px',
                        background: 'var(--primary)',
                        borderRadius: '16px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        margin: '0 auto 1.5rem',
                        boxShadow: '0 12px 24px rgba(99, 102, 241, 0.3)'
                    }}>
                        <TrendingUp size={32} color="white" />
                    </div>
                    <h1 style={{ fontSize: '2rem', fontWeight: 800, marginBottom: '0.5rem' }}>Freedom</h1>
                    <p style={{ color: 'var(--text-muted)' }}>
                        {isForgotPassword ? 'Resetowanie hasła' : (isSignUp ? 'Utwórz nowe konto' : 'Analiza Sprzedaży 2025')}
                    </p>
                </div>

                {error && (
                    <div style={{
                        background: 'rgba(236, 72, 153, 0.1)',
                        border: '1px solid var(--accent-pink)',
                        padding: '0.75rem 1rem',
                        borderRadius: '8px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.75rem',
                        marginBottom: '1.5rem',
                        color: 'var(--accent-pink)',
                        fontSize: '0.875rem'
                    }}>
                        <AlertCircle size={18} />
                        {error}
                    </div>
                )}

                {message && (
                    <div style={{
                        background: 'rgba(16, 185, 129, 0.1)',
                        border: '1px solid #10b981',
                        padding: '0.75rem 1rem',
                        borderRadius: '8px',
                        marginBottom: '1.5rem',
                        color: '#10b981',
                        fontSize: '0.875rem'
                    }}>
                        {message}
                    </div>
                )}

                <form onSubmit={handleAuth} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                    <div>
                        <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.5rem', color: 'var(--text-muted)' }}>
                            E-mail
                        </label>
                        <div style={{ position: 'relative' }}>
                            <Mail size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                            <input
                                type="email"
                                required
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                style={{
                                    width: '100%',
                                    padding: '0.75rem 1rem 0.75rem 3rem',
                                    background: 'rgba(255, 255, 255, 0.05)',
                                    border: '1px solid var(--border)',
                                    borderRadius: '8px',
                                    color: 'white'
                                }}
                                placeholder="twoj@email.pl"
                            />
                        </div>
                    </div>

                    {!isForgotPassword && (
                        <div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                                <label style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--text-muted)' }}>
                                    Hasło
                                </label>
                                <button
                                    type="button"
                                    onClick={() => setIsForgotPassword(true)}
                                    style={{ background: 'none', border: 'none', color: 'var(--primary)', fontSize: '0.75rem', cursor: 'pointer' }}
                                >
                                    Zapomniałeś?
                                </button>
                            </div>
                            <div style={{ position: 'relative' }}>
                                <Lock size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                                <input
                                    type="password"
                                    required
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    style={{
                                        width: '100%',
                                        padding: '0.75rem 1rem 0.75rem 3rem',
                                        background: 'rgba(255, 255, 255, 0.05)',
                                        border: '1px solid var(--border)',
                                        borderRadius: '8px',
                                        color: 'white'
                                    }}
                                    placeholder="••••••••"
                                />
                            </div>
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={loading}
                        className="btn"
                        style={{
                            width: '100%',
                            padding: '1rem',
                            marginTop: '1rem',
                            justifyContent: 'center',
                            fontSize: '1rem'
                        }}
                    >
                        {loading ? <Loader2 className="animate-spin" /> : (isForgotPassword ? 'Wyślij link' : (isSignUp ? 'Zarejestruj się' : 'Zaloguj się'))}
                        {!loading && <LogIn size={18} style={{ marginLeft: '0.5rem' }} />}
                    </button>
                </form>

                <div style={{ textAlign: 'center', marginTop: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    {isForgotPassword ? (
                        <button
                            onClick={() => setIsForgotPassword(false)}
                            style={{ background: 'none', border: 'none', color: 'var(--primary)', fontSize: '0.875rem', cursor: 'pointer', fontWeight: 600 }}
                        >
                            Powrót do logowania
                        </button>
                    ) : (
                        <button
                            onClick={() => {
                                setIsSignUp(!isSignUp);
                                setError(null);
                                setMessage(null);
                            }}
                            style={{
                                background: 'none',
                                border: 'none',
                                color: 'var(--primary)',
                                fontSize: '0.875rem',
                                cursor: 'pointer',
                                fontWeight: 600
                            }}
                        >
                            {isSignUp ? 'Masz już konto? Zaloguj się' : 'Nie masz konta? Zarejestruj się'}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
