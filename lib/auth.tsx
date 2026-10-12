"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import type { UserSession } from './session-types';
export type { UserSession } from './session-types';

export function getSession(): UserSession | null {
    if (typeof window === 'undefined') return null;
    try {
        const stored = localStorage.getItem('coolpro_user');
        return stored ? JSON.parse(stored) as UserSession : null;
    } catch {
        localStorage.removeItem('coolpro_user');
        return null;
    }
}

async function postLogin(body: Record<string, string>): Promise<UserSession> {
    const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        credentials: 'include',
    });
    if (!res.ok) {
        const data = await res.json().catch(() => ({})) as { error?: string };
        throw new Error(data.error ?? `Login failed (${res.status})`);
    }
    const data = await res.json() as { user: UserSession };
    if (typeof window !== 'undefined') {
        localStorage.setItem('coolpro_user', JSON.stringify(data.user));
    }
    return data.user;
}

export async function loginByEmail(email: string, password?: string): Promise<UserSession> {
    const body: Record<string, string> = { email };
    if (password) body.password = password;
    return postLogin(body);
}

export async function logout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    if (typeof window !== 'undefined') {
        // Saved offline pages belong to the person who was signed in; do not leave them for the next user of this device.
        if ('caches' in window) {
            try {
                const keys = await caches.keys();
                await Promise.all(keys.filter((key) => key.startsWith('coolpro-pages-')).map((key) => caches.delete(key)));
            } catch { /* the cache is not available: nothing to clear */ }
        }
        localStorage.removeItem('coolpro_user');
        window.location.href = '/login';
    }
}

interface AuthContextType {
    user: UserSession | null;
    login: (email: string, password?: string) => Promise<void>;
    logout: () => void;
    isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<UserSession | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        fetch('/api/auth/session')
            .then(r => r.json())
            .then((data: { user: UserSession | null }) => {
                if (data.user) {
                    setUser(data.user);
                    localStorage.setItem('coolpro_user', JSON.stringify(data.user));
                } else {
                    // A browser cache is never an authority for identity or role. Keeping it
                    // here could resurrect a previous demo user after their cookie expires.
                    localStorage.removeItem('coolpro_user');
                    setUser(null);
                }
            })
            .catch(() => {
                // Do not render a cached role when the session cannot be verified.
                localStorage.removeItem('coolpro_user');
                setUser(null);
            })
            .finally(() => setIsLoading(false));
    }, []);

    // Renew the short-lived session cookie while the tab is in use, so long tasks
    // (e.g. nameplate scans) do not fail with 401 after 15 minutes.
    useEffect(() => {
        if (!user) return;
        const renew = () => { fetch('/api/auth/session').catch(() => {}); };
        const timer = setInterval(() => {
            if (document.visibilityState === 'visible') renew();
        }, 5 * 60 * 1000);
        const onVisible = () => { if (document.visibilityState === 'visible') renew(); };
        document.addEventListener('visibilitychange', onVisible);
        return () => {
            clearInterval(timer);
            document.removeEventListener('visibilitychange', onVisible);
        };
    }, [user]);

    const handleLogin =async (email: string, password?: string) => {
        const session = await loginByEmail(email, password);
        setUser(session);
    };

    const handleLogout = async () => {
        await logout();
        setUser(null);
    };

    return (
        <AuthContext.Provider value={{ user, login: handleLogin, logout: handleLogout, isLoading }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}
