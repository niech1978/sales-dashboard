import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { Mail, Lock, LogIn, AlertCircle, Loader2, TrendingUp, Check } from 'lucide-react';

interface AuthProps {
    onPasswordUpdated?: () => void;
}

export default function Auth({ onPasswordUpdated }: AuthProps) {
    const [loading, setLoading] = useState(false);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [isForgotPassword, setIsForgotPassword] = useState(false);
    const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);
    const [message, setMessage] = useState<string | null>(null);

    useEffect(() => {
        // Detect if we came from a recovery/invite link
        const hash = window.location.hash;
        const search = window.location.search;
        const fullUrl = hash + search;

        if (fullUrl.includes('type=recovery') || fullUrl.includes('type=invite')) {
            setIsUpdatingPassword(true);
        }

        // Listen for PASSWORD_RECOVERY event from Supabase
        const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
            if (event === 'PASSWORD_RECOVERY') {
                setIsUpdatingPassword(true);
            }
        });

        return () => subscription.unsubscribe();
    }, []);

    const handleAuth = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        setMessage(null);

        try {
            if (isUpdatingPassword) {
                // Walidacja hasła
                if (password.length < 6) {
                    setError('Hasło musi mieć minimum 6 znaków');
                    return;
                }
                if (password !== confirmPassword) {
                    setError('Hasła nie są identyczne');
                    return;
                }

                const { error } = await supabase.auth.updateUser({ password });
                if (error) throw error;

                setMessage('Hasło zostało pomyślnie ustawione!');
                setIsUpdatingPassword(false);
                setIsForgotPassword(false);
                setPassword('');
                setConfirmPassword('');

                // Wyloguj — użytkownik zaloguje się nowym hasłem
                await supabase.auth.signOut();

                // Powiadom App.tsx że recovery się zakończyło
                onPasswordUpdated?.();
            } else if (isForgotPassword) {
                const { error } = await supabase.auth.resetPasswordForEmail(email, {
                    redirectTo: window.location.origin,
                });
                if (error) throw error;
                setMessage('Link do resetowania hasła został wysłany na Twój e-mail!');
            } else {
                const { error } = await supabase.auth.signInWithPassword({
                    email,
                    password,
                });
                if (error) throw error;
            }
        } catch (err: unknown) {
            const errorMessage = err instanceof Error ? err.message : 'Wystąpił błąd';
            if (errorMessage.includes('Invalid login credentials')) {
                setError('Nieprawidłowy email lub hasło');
            } else if (errorMessage.includes('Email not confirmed')) {
                setError('Email nie został potwierdzony');
            } else if (errorMessage.includes('User not found')) {
                setError('Użytkownik nie istnieje w systemie');
            } else if (errorMessage.includes('should be different')) {
                setError('Nowe hasło musi być inne niż poprzednie');
            } else {
                setError(errorMessage);
            }
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
                        background: isUpdatingPassword ? 'var(--accent-green)' : 'var(--primary)',
                        borderRadius: '16px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        margin: '0 auto 1.5rem',
                        boxShadow: isUpdatingPassword
                            ? '0 12px 24px rgba(16, 185, 129, 0.3)'
                            : '0 12px 24px rgba(99, 102, 241, 0.3)'
                    }}>
                        {isUpdatingPassword ? <Lock size={32} color="white" /> : <TrendingUp size={32} color="white" />}
                    </div>
                    <h1 style={{ fontSize: '2rem', fontWeight: 800, marginBottom: '0.5rem' }}>Freedom</h1>
                    <p style={{ color: 'var(--text-muted)' }}>
                        {isUpdatingPassword ? 'Ustaw nowe hasło' : (isForgotPassword ? 'Resetowanie hasła' : 'Panel sprzedażowy')}
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
                        fontSize: '0.875rem',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.75rem'
                    }}>
                        <Check size={18} />
                        {message}
                    </div>
                )}

                <form onSubmit={handleAuth} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                    {!isUpdatingPassword && (
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
                    )}

                    {!isForgotPassword && (
                        <div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                                <label style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--text-muted)' }}>
                                    {isUpdatingPassword ? 'Nowe hasło' : 'Hasło'}
                                </label>
                                {!isUpdatingPassword && (
                                    <button
                                        type="button"
                                        onClick={() => setIsForgotPassword(true)}
                                        style={{ background: 'none', border: 'none', color: 'var(--primary)', fontSize: '0.75rem', cursor: 'pointer' }}
                                    >
                                        Zapomniałeś?
                                    </button>
                                )}
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
                                    placeholder={isUpdatingPassword ? 'Minimum 6 znaków' : '••••••••'}
                                />
                            </div>
                        </div>
                    )}

                    {isUpdatingPassword && (
                        <div>
                            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.5rem', color: 'var(--text-muted)' }}>
                                Potwierdź hasło
                            </label>
                            <div style={{ position: 'relative' }}>
                                <Lock size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                                <input
                                    type="password"
                                    required
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    style={{
                                        width: '100%',
                                        padding: '0.75rem 1rem 0.75rem 3rem',
                                        background: 'rgba(255, 255, 255, 0.05)',
                                        border: '1px solid var(--border)',
                                        borderRadius: '8px',
                                        color: 'white'
                                    }}
                                    placeholder="Powtórz hasło"
                                />
                            </div>
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={loading}
                        className="btn btn-primary"
                        style={{
                            width: '100%',
                            padding: '1rem',
                            marginTop: '1rem',
                            justifyContent: 'center',
                            fontSize: '1rem'
                        }}
                    >
                        {loading ? <Loader2 className="animate-spin" /> : (isUpdatingPassword ? 'Zapisz nowe hasło' : (isForgotPassword ? 'Wyślij link' : 'Zaloguj się'))}
                        {!loading && <LogIn size={18} style={{ marginLeft: '0.5rem' }} />}
                    </button>
                </form>

                {(isForgotPassword || isUpdatingPassword) && !message && (
                    <div style={{ textAlign: 'center', marginTop: '1.5rem' }}>
                        <button
                            onClick={() => {
                                setIsForgotPassword(false);
                                setIsUpdatingPassword(false);
                                setError(null);
                                setMessage(null);
                                setPassword('');
                                setConfirmPassword('');
                            }}
                            style={{ background: 'none', border: 'none', color: 'var(--primary)', fontSize: '0.875rem', cursor: 'pointer', fontWeight: 600 }}
                        >
                            Powrót do logowania
                        </button>
                    </div>
                )}

                <p style={{ textAlign: 'center', marginTop: '2rem', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    Dostęp tylko dla autoryzowanych użytkowników
                </p>
            </div>
        </div>
    );
}
