'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { User, onAuthStateChanged } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { useRouter, usePathname } from 'next/navigation';
import { UserRole, getUserRole } from '@/lib/firebase/user';

type AuthContextType = {
    user: User | null;
    role: UserRole | null;
    loading: boolean;
};

const AuthContext = createContext<AuthContextType>({
    user: null,
    role: null,
    loading: true,
});

export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [role, setRole] = useState<UserRole | null>(null);
    const [loading, setLoading] = useState(true);
    const router = useRouter();
    const pathname = usePathname();

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
            setUser(fbUser);
            if (fbUser) {
                // Try checking cache immediately for faster rendering
                const cacheKey = `user-role-${fbUser.uid}`;
                const cachedRole = typeof window !== 'undefined' ? sessionStorage.getItem(cacheKey) : null;

                if (cachedRole) {
                    setRole(cachedRole as UserRole);
                    setLoading(false);
                }

                const userRole = await getUserRole(fbUser.uid);
                setRole(userRole);
                setLoading(false);

                // Redirect if authenticated on login page
                if (pathname === '/admin/login') {
                    router.push('/admin');
                }
            } else {
                setRole(null);
                setLoading(false);

                // Redirect if unauthenticated on protected page
                const publicPaths = ['/admin/login', '/admin/register', '/admin/reset-password', '/register'];
                const isPublicPath = publicPaths.some(path => pathname.startsWith(path));
                if (pathname.startsWith('/admin') && !isPublicPath) {
                    router.push('/admin/login');
                }
            }
        });

        return () => unsubscribe();
    }, [router, pathname, loading]);

    return (
        <AuthContext.Provider value={{ user, role, loading }}>
            {!loading && children}
        </AuthContext.Provider>
    );
}
