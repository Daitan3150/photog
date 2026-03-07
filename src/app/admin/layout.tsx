'use client';

import { useState, useEffect } from 'react';
import { AuthProvider } from '@/components/admin/AuthProvider';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { signOut } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { useRouter } from 'next/navigation';
import { ChevronLeft, ChevronRight, Menu, Camera, Home, User, Mail, AlertTriangle, Globe, LogOut, FileText, Settings, ClipboardList, CheckSquare } from 'lucide-react';
import { useAuth } from '@/components/admin/AuthProvider';


function AdminSidebar({ isCollapsed, toggleSidebar }: { isCollapsed: boolean; toggleSidebar: () => void }) {
    const pathname = usePathname();
    const router = useRouter();
    const { role } = useAuth();

    if (pathname === '/admin/login') return null;

    const handleLogout = async () => {
        await signOut(auth);
        router.push('/admin/login');
    };

    const isAdmin = role === 'admin';
    const isModel = role === 'model';

    // Theme based on role
    const sidebarBg = isAdmin ? 'bg-slate-900' : 'bg-[#0f0c29]'; // Midnight Blue/Purple for model
    const accentColor = isAdmin ? 'bg-blue-600' : 'bg-fuchsia-600'; // Fuchsia for model
    const glowClass = !isAdmin ? 'shadow-[0_0_15px_rgba(192,38,211,0.3)]' : 'shadow-lg shadow-blue-900/50';

    return (
        <aside
            className={`${sidebarBg} h-dvh overflow-y-auto text-white fixed left-0 top-0 shadow-2xl z-50 transition-all duration-500 
                ${isCollapsed ? '-translate-x-full md:translate-x-0 md:w-20' : 'translate-x-0 w-64 md:w-64'}
                ${isCollapsed ? 'p-4' : 'p-6'}
                ${!isAdmin ? 'border-r border-fuchsia-500/20' : ''}
                custom-scrollbar
            `}
        >
            <div className="flex flex-col min-h-full">
                {/* Header: Logo & Toggle */}
                <div className={`mb-10 pt-2 flex items-center justify-between relative shrink-0`}>
                    {!isCollapsed && (
                        <div className="relative w-32 h-32 mx-auto transition-opacity duration-300">
                            <img
                                src="/logo.png"
                                alt="DAITAN Logo"
                                className={`w-full h-full object-contain filter drop-shadow-lg brightness-0 invert ${!isAdmin ? 'hue-rotate-[280deg] saturate-[2]' : ''}`}
                            />
                        </div>
                    )}
                    {isCollapsed && (
                        <div className={`w-10 h-10 mx-auto transition-opacity duration-300 flex items-center justify-center font-bold text-2xl hidden md:flex ${!isAdmin ? 'text-fuchsia-400' : ''}`}>
                            DT
                        </div>
                    )}

                    {/* Mobile Close Button */}
                    {!isCollapsed && (
                        <button
                            onClick={toggleSidebar}
                            className="md:hidden p-2 text-slate-400 hover:text-white transition-colors"
                        >
                            <ChevronLeft size={24} />
                        </button>
                    )}

                    {/* Desktop Toggle Button */}
                    <button
                        onClick={toggleSidebar}
                        className={`absolute -right-3 top-0 ${accentColor} text-white p-1 rounded-full shadow-lg hover:opacity-80 transition-all z-50 hidden md:flex`}
                        style={isCollapsed ? { right: '-12px', top: '20px' } : { right: '-32px', top: '20px' }}
                    >
                        {isCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
                    </button>
                </div>

                <nav className="space-y-2 flex-grow mb-8">
                    {!isCollapsed && <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 mt-6 transition-opacity duration-300">Main Menu</div>}

                    <Link
                        href="/admin"
                        className={`flex items-center gap-3 p-3 rounded-lg transition-all duration-200 group ${pathname === '/admin'
                            ? `${accentColor} text-white ${glowClass}`
                            : 'text-slate-300 hover:bg-slate-800/50 hover:text-white'
                            } ${isCollapsed ? 'justify-center' : ''}`}
                    >
                        <Home size={20} className={pathname === '/admin' ? '' : 'text-slate-400 group-hover:text-white'} />
                        {!isCollapsed && <span className="font-medium whitespace-nowrap overflow-hidden">スタジオ</span>}
                    </Link>

                    <Link
                        href="/admin/photos"
                        className={`flex items-center gap-3 p-3 rounded-lg transition-all duration-200 group ${pathname.startsWith('/admin/photos')
                            ? `${accentColor} text-white ${glowClass}`
                            : 'text-slate-300 hover:bg-slate-800/50 hover:text-white'
                            } ${isCollapsed ? 'justify-center' : ''}`}
                    >
                        <Camera size={20} className={pathname.startsWith('/admin/photos') ? '' : 'text-slate-400 group-hover:text-white'} />
                        {!isCollapsed && <span className="font-medium whitespace-nowrap overflow-hidden">写真管理</span>}
                    </Link>

                    <Link
                        href="/admin/blog"
                        className={`flex items-center gap-3 p-3 rounded-lg transition-all duration-200 group ${pathname.startsWith('/admin/blog')
                            ? `${accentColor} text-white ${glowClass}`
                            : 'text-slate-300 hover:bg-slate-800/50 hover:text-white'
                            } ${isCollapsed ? 'justify-center' : ''}`}
                    >
                        <FileText size={20} className={pathname.startsWith('/admin/blog') ? '' : 'text-slate-400 group-hover:text-white'} />
                        {!isCollapsed && <span className="font-medium whitespace-nowrap overflow-hidden">ブログ管理</span>}
                    </Link>

                    {/* Admin Only Menus */}
                    {isAdmin && (
                        <>
                            <Link
                                href="/admin/invite"
                                className={`flex items-center gap-3 p-3 rounded-lg transition-all duration-200 group ${pathname.startsWith('/admin/invite')
                                    ? `${accentColor} text-white ${glowClass}`
                                    : 'text-slate-300 hover:bg-slate-800/50 hover:text-white'
                                    } ${isCollapsed ? 'justify-center' : ''}`}
                            >
                                <Mail size={20} className={pathname.startsWith('/admin/invite') ? '' : 'text-slate-400 group-hover:text-white'} />
                                {!isCollapsed && <span className="font-medium whitespace-nowrap overflow-hidden">招待管理</span>}
                            </Link>

                            <Link
                                href="/admin/users"
                                className={`flex items-center gap-3 p-3 rounded-lg transition-all duration-200 group ${pathname.startsWith('/admin/users')
                                    ? `${accentColor} text-white ${glowClass}`
                                    : 'text-slate-300 hover:bg-slate-800/50 hover:text-white'
                                    } ${isCollapsed ? 'justify-center' : ''}`}
                            >
                                <User size={20} className={pathname.startsWith('/admin/users') ? '' : 'text-slate-400 group-hover:text-white'} />
                                {!isCollapsed && <span className="font-medium whitespace-nowrap overflow-hidden">ユーザー管理</span>}
                            </Link>

                            <Link
                                href="/admin/requests"
                                className={`flex items-center gap-3 p-3 rounded-lg transition-all duration-200 group ${pathname.startsWith('/admin/requests')
                                    ? `${accentColor} text-white ${glowClass}`
                                    : 'text-slate-300 hover:bg-slate-800/50 hover:text-white'
                                    } ${isCollapsed ? 'justify-center' : ''}`}
                            >
                                <AlertTriangle size={20} className={pathname.startsWith('/admin/requests') ? '' : 'text-slate-400 group-hover:text-white'} />
                                {!isCollapsed && <span className="font-medium whitespace-nowrap overflow-hidden">削除依頼</span>}
                            </Link>

                            <Link
                                href="/admin/settings/covers"
                                className={`flex items-center gap-3 p-3 rounded-lg transition-all duration-200 group ${pathname.startsWith('/admin/settings/covers')
                                    ? `${accentColor} text-white ${glowClass}`
                                    : 'text-slate-300 hover:bg-slate-800/50 hover:text-white'
                                    } ${isCollapsed ? 'justify-center' : ''}`}
                            >
                                <Settings size={20} className={pathname.startsWith('/admin/settings') ? '' : 'text-slate-400 group-hover:text-white'} />
                                {!isCollapsed && <span className="font-medium whitespace-nowrap overflow-hidden">サイト設定</span>}
                            </Link>
                        </>
                    )}

                    {/* Common / Model Menus */}
                    <Link
                        href="/admin/profile"
                        className={`flex items-center gap-3 p-3 rounded-lg transition-all duration-200 group ${pathname.startsWith('/admin/profile')
                            ? `${accentColor} text-white ${glowClass}`
                            : 'text-slate-300 hover:bg-slate-800/50 hover:text-white'
                            } ${isCollapsed ? 'justify-center' : ''}`}
                    >
                        <User size={20} className={pathname.startsWith('/admin/profile') ? '' : 'text-slate-400 group-hover:text-white'} />
                        {!isCollapsed && <span className="font-medium whitespace-nowrap overflow-hidden">プロフィール</span>}
                    </Link>

                    <div className={`h-px ${isAdmin ? 'bg-slate-800' : 'bg-fuchsia-500/30'} my-4 mx-2 text-transparent`}>.</div>

                    <Link
                        href="/"
                        target="_blank"
                        className={`flex items-center gap-3 p-3 rounded-lg text-slate-400 hover:bg-slate-800/50 hover:text-white transition-all duration-200 group ${isCollapsed ? 'justify-center' : ''}`}
                    >
                        <Globe size={20} className="text-slate-400 group-hover:text-white transition-transform group-hover:rotate-12" />
                        {!isCollapsed && <span className="font-medium whitespace-nowrap overflow-hidden">サイトを見る ↗</span>}
                    </Link>
                    <Link
                        href="/admin/tasks"
                        className={`flex items-center gap-3 p-3 rounded-lg transition-all duration-200 group ${pathname.startsWith('/admin/tasks')
                            ? `${accentColor} text-white ${glowClass}`
                            : 'text-slate-300 hover:bg-slate-800/50 hover:text-white'
                            } ${isCollapsed ? 'justify-center' : ''}`}
                    >
                        <ClipboardList size={20} className={pathname.startsWith('/admin/tasks') ? '' : 'text-slate-400 group-hover:text-white'} />
                        {!isCollapsed && <span className="font-medium whitespace-nowrap overflow-hidden">タスク管理</span>}
                    </Link>
                </nav>

                <div className={`mt-auto pt-6 pb-6 shrink-0 ${isCollapsed ? 'w-full flex justify-center' : 'w-full'}`}>
                    <button
                        onClick={handleLogout}
                        className={`${isAdmin ? 'bg-slate-800' : 'bg-fuchsia-950/40 border border-fuchsia-500/30'} hover:bg-red-600/80 text-slate-300 hover:text-white p-3 rounded-lg transition-all duration-300 flex items-center justify-center gap-2 font-bold group ${isCollapsed ? 'w-12 h-12 rounded-full' : 'w-full'}`}
                    >
                        <LogOut size={20} />
                        {!isCollapsed && <span className="group-hover:translate-x-1 transition-transform whitespace-nowrap overflow-hidden">ログアウト</span>}
                    </button>
                </div>
            </div>

        </aside>
    );
}

function AdminTopBar() {
    const { role, user } = useAuth();
    const isAdmin = role === 'admin';
    const accentColor = isAdmin ? 'bg-blue-600' : 'bg-fuchsia-600';

    return (
        <header className="h-16 border-b border-gray-100 bg-white/80 backdrop-blur-md sticky top-0 z-40 px-6 flex items-center justify-between shadow-sm">
            <div className="flex items-center gap-4">
                <div className="md:hidden w-8" /> {/* Placeholder for mobile toggle spacing */}
                <h2 className="text-xs font-black text-gray-400 uppercase tracking-[0.3em] hidden sm:block">
                    {isAdmin ? 'DAITAN ADMIN' : 'MODEL STUDIO'}
                </h2>
            </div>

            <div className="flex items-center gap-2 md:gap-4">
                <Link
                    href="/admin/tasks"
                    className="flex items-center gap-2 px-3 py-1.5 rounded-full hover:bg-gray-100 transition-all group relative border border-transparent hover:border-gray-200"
                >
                    <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest hidden md:block group-hover:text-gray-900 transition-colors">
                        Tasks
                    </span>
                    <div className="relative">
                        <CheckSquare size={18} className="text-gray-400 group-hover:text-amber-500 transition-colors" />
                        <span className="absolute -top-1.5 -right-1.5 w-3.5 h-3.5 bg-red-500 text-[8px] text-white flex items-center justify-center rounded-full font-black ring-2 ring-white">
                            3
                        </span>
                    </div>
                </Link>

                <div className="h-6 w-px bg-gray-200 mx-1 md:mx-2"></div>

                <div className="flex items-center gap-2 md:gap-3 pl-2">
                    <div className="flex flex-col items-end hidden md:flex">
                        <span className="text-xs font-black text-gray-900 leading-none mb-0.5">
                            {user?.displayName || 'User'}
                        </span>
                        <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest leading-none">
                            {role === 'admin' ? 'Super Admin' : 'Model'}
                        </span>
                    </div>
                    <div className={`w-8 h-8 md:w-9 md:h-9 rounded-full ${accentColor} flex items-center justify-center text-white font-black text-xs md:text-sm shadow-lg shadow-blue-500/10 active:scale-95 transition-all cursor-pointer ring-2 ring-offset-2 ring-transparent hover:ring-blue-100`}>
                        {user?.displayName?.charAt(0) || 'U'}
                    </div>
                </div>
            </div>
        </header>
    );
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const isPublicPage = ['/admin/login', '/admin/register', '/admin/reset-password'].some(path => pathname.startsWith(path));
    const [isCollapsed, setIsCollapsed] = useState(true);

    const toggleSidebar = () => setIsCollapsed(!isCollapsed);

    useEffect(() => {
        const toggleLock = () => {
            if (!isCollapsed && window.innerWidth < 768) {
                document.body.style.overflow = 'hidden';
            } else {
                document.body.style.overflow = '';
            }
        };
        toggleLock();
        window.addEventListener('resize', toggleLock);
        return () => {
            document.body.style.overflow = '';
            window.removeEventListener('resize', toggleLock);
        };
    }, [isCollapsed]);

    return (
        <AuthProvider>
            <div className="min-h-screen bg-gray-100 flex transition-all duration-300">
                {!isPublicPage && (
                    <>
                        <AdminSidebar isCollapsed={isCollapsed} toggleSidebar={toggleSidebar} />

                        {/* Mobile Menu Button - Floating when collapsed */}
                        {isCollapsed && (
                            <button
                                onClick={toggleSidebar}
                                className="md:hidden fixed left-4 top-4 bg-slate-900 text-white p-3 rounded-2xl shadow-2xl z-[60] flex items-center justify-center border border-white/10 active:scale-95 transition-transform"
                                aria-label="Open Menu"
                            >
                                <Menu size={24} />
                            </button>
                        )}

                        {/* Overlay to close sidebar on Mobile */}
                        {!isCollapsed && (
                            <div
                                className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden transition-opacity duration-300"
                                onClick={toggleSidebar}
                            />
                        )}
                    </>
                )}
                <div className={`flex-1 flex flex-col min-w-0 transition-all duration-300 ${!isPublicPage
                    ? (isCollapsed ? 'ml-0 md:ml-20' : 'ml-0 md:ml-64')
                    : ''
                    }`}>
                    {!isPublicPage && <AdminTopBar />}
                    <main className="flex-1 p-4 md:p-8">
                        {children}
                    </main>
                </div>
            </div>
        </AuthProvider>
    );
}
