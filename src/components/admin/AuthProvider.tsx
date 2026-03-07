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
        const unsubscribe = onAuthStateChanged(auth, async (fbUser: any) => {
            setUser(fbUser);
            if (fbUser) {
                // Try checking cache immediately for faster rendering
                const cacheKey = `user-role-${fbUser.uid}`;
                const cachedRole = typeof window !== 'undefined' ? sessionStorage.getItem(cacheKey) : null;

                if (cachedRole) {
                    setRole(cachedRole as UserRole);
                    setLoading(false);
                }

                let userRole = await getUserRole(fbUser.uid);

                // [AUTO-GRANT ADMIN] for specific emails
                const SUPER_ADMIN_EMAILS = ['daitan10618@gmail.com', 'daitan10618@icloud.com', 'new.sasuke.sakura@gmail.com'];
                if (!userRole && SUPER_ADMIN_EMAILS.includes(fbUser.email || '')) {
                    userRole = 'admin';
                }

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
    }, [router, pathname]);

    return (
        <AuthContext.Provider value={{ user, role, loading }}>
            {!loading && children}
        </AuthContext.Provider>
    );
}
