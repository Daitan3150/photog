'use client';

import { useState, useRef, Suspense, useEffect } from 'react';
import { registerWithInvitation, checkInvitationCode, registerSocialUser } from '@/lib/actions/register';
import { signInWithPopup, GoogleAuthProvider, OAuthProvider } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { User, Mail, Lock, Ticket, Camera, Send, X, Instagram, Info } from 'lucide-react';
import InvitationMascot from '@/components/mascot/InvitationMascot';

function RegisterForm() {
    const searchParams = useSearchParams();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [isFlashing, setIsFlashing] = useState(false);
    const [snsLinks, setSnsLinks] = useState([{ type: 'X', value: '' }]);
    const router = useRouter();
    const formRef = useRef<HTMLFormElement>(null);

    const initialCode = searchParams.get('code') || '';
    const [code, setCode] = useState(initialCode);
    const [displayName, setDisplayName] = useState('');

    const addSnsLink = () => setSnsLinks([...snsLinks, { type: 'X', value: '' }]);
    const removeSnsLink = (index: number) => setSnsLinks(snsLinks.filter((_, i) => i !== index));
    const updateSnsLink = (index: number, key: string, val: string) => {
        const newLinks = [...snsLinks];
        (newLinks[index] as any)[key] = val;
        setSnsLinks(newLinks);
    };

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        // Trigger Shutter Flash Effect
        setIsFlashing(true);
        setTimeout(() => setIsFlashing(false), 200);

        const formData = new FormData(e.currentTarget);
        const result = await registerWithInvitation(formData);

        if (result.success) {
            router.push('/admin/login?registered=true');
        } else {
            setError(result.error || '登録に失敗しました。');
            setLoading(false);
        }
    };

    const handleSocialRegistration = async (providerName: 'google' | 'apple') => {
        setLoading(true);
        setError('');

        if (!code) {
            setError('まずは招待コードを入力してください（一番下の項目）。');
            setLoading(false);
            return;
        }

        const isValid = await checkInvitationCode(code);
        if (!isValid.success) {
            setError(isValid.error || '招待コードが無効です。');
            setLoading(false);
            return;
        }

        try {
            const provider = providerName === 'google' ? new GoogleAuthProvider() : new OAuthProvider('apple.com');
            const userCredential = await signInWithPopup(auth, provider);
            const user = userCredential.user;

            const snsLinksJson = JSON.stringify(snsLinks.filter(l => l.value.trim() !== ''));

            const result = await registerSocialUser({
                uid: user.uid,
                email: user.email || '',
                displayName: displayName || user.displayName || 'Model User',
                code,
                snsLinksJson,
            });

            if (result.success) {
                router.push('/admin/login?registered=true');
            } else {
                setError(result.error || 'ソーシャル登録に失敗しました。');
            }
        } catch (err: any) {
            console.error('Social registration error:', err);
            setError(err.message || 'ソーシャル登録に失敗しました。');
        } finally {
            setLoading(false);
        }
    };

    return (
        <main className="min-h-screen bg-[#FDFCFB] flex flex-col md:flex-row relative overflow-hidden">
            {/* Shutter Flash Overlay */}
            <AnimatePresence>
                {isFlashing && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-white z-[100] pointer-events-none"
                    />
                )}
            </AnimatePresence>

            {/* Background elements */}
            <div className="absolute top-0 left-0 w-full h-full pointer-events-none overflow-hidden">
                <div className="absolute top-[-10%] left-[-5%] w-[40%] h-[40%] bg-pink-50 rounded-full blur-[120px] opacity-40" />
                <div className="absolute bottom-[-10%] right-[-5%] w-[40%] h-[40%] bg-blue-50 rounded-full blur-[120px] opacity-40" />
            </div>

            {/* Left Column: Mascot Section */}
            <section className="w-full md:w-5/12 lg:w-1/2 flex items-center justify-center p-8 md:p-12 relative z-10">
                <div className="max-w-xl w-full">
                    <InvitationMascot className="w-full" />

                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 1, duration: 0.8 }}
                        className="mt-8 text-center md:text-left"
                    >
                        <h2 className="text-3xl font-serif font-bold text-gray-800 mb-2 tracking-widest">WELCOME MODEL!</h2>
                        <p className="text-gray-500 font-light tracking-widest leading-relaxed">
                            招待された特別なあなたを、<br className="hidden md:block" />
                            ポートフォリオの世界へ。
                        </p>
                    </motion.div>
                </div>
            </section>

            {/* Right Column: Form Section */}
            <section className="w-full md:w-7/12 lg:w-1/2 flex items-center justify-center p-4 md:p-12 relative z-20">
                <motion.div
                    initial={{ opacity: 0, x: 50 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.8, ease: "easeOut" }}
                    className="w-full max-w-lg bg-white/70 backdrop-blur-xl p-8 md:p-12 rounded-[40px] shadow-[0_20px_80px_rgba(0,0,0,0.05)] border border-white"
                >
                    <div className="mb-10 text-center md:text-left">
                        <span className="inline-block px-3 py-1 bg-pink-100 text-pink-600 rounded-full text-[10px] font-bold tracking-widest uppercase mb-4">Registration</span>
                        <h1 className="text-2xl md:text-3xl font-bold text-gray-900 flex items-center gap-3">
                            <span className="p-2 bg-gray-900 text-white rounded-2xl"><Camera size={24} /></span>
                            招待ユーザー登録
                        </h1>
                    </div>

                    {error && (
                        <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            className="bg-red-50 text-red-600 p-4 rounded-2xl mb-8 text-sm flex items-start gap-3 border border-red-100"
                        >
                            <Info size={20} className="shrink-0" />
                            <span>{error}</span>
                        </motion.div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="space-y-4">
                            <div className="relative group">
                                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-4 mb-1 block">Display Name</label>
                                <div className="relative">
                                    <User className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-pink-500 transition-colors" size={20} />
                                    <input
                                        name="displayName"
                                        type="text"
                                        placeholder="モデル名・名前"
                                        required
                                        value={displayName}
                                        onChange={(e) => setDisplayName(e.target.value)}
                                        className="w-full pl-12 pr-4 py-4 bg-gray-50/50 border border-gray-100 rounded-2xl outline-none focus:bg-white focus:ring-2 focus:ring-pink-200 transition-all text-gray-800 placeholder:text-gray-300"
                                    />
                                </div>
                            </div>

                            <div className="relative group">
                                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-4 mb-1 block">Email Address</label>
                                <div className="relative">
                                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-pink-500 transition-colors" size={20} />
                                    <input
                                        name="email"
                                        type="email"
                                        placeholder="example@mail.com (SNS登録時は不要)"
                                        className="w-full pl-12 pr-4 py-4 bg-gray-50/50 border border-gray-100 rounded-2xl outline-none focus:bg-white focus:ring-2 focus:ring-pink-200 transition-all text-gray-800 placeholder:text-gray-300"
                                    />
                                </div>
                            </div>

                            <div className="relative group">
                                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-4 mb-1 block">Password</label>
                                <div className="relative">
                                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-pink-500 transition-colors" size={20} />
                                    <input
                                        name="password"
                                        type="password"
                                        placeholder="•••••••• (SNS登録時は不要)"
                                        className="w-full pl-12 pr-4 py-4 bg-gray-50/50 border border-gray-100 rounded-2xl outline-none focus:bg-white focus:ring-2 focus:ring-pink-200 transition-all text-gray-800 placeholder:text-gray-300"
                                    />
                                </div>
                            </div>

                            <div className="relative group">
                                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-4 mb-1 block">Invitation Code</label>
                                <div className="relative">
                                    <Ticket className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-pink-500 transition-colors" size={20} />
                                    <input
                                        name="code"
                                        type="text"
                                        placeholder="管理者からの招待コード"
                                        required
                                        value={code}
                                        onChange={(e) => setCode(e.target.value)}
                                        className="w-full pl-12 pr-4 py-4 bg-gray-50/50 border border-gray-100 rounded-2xl outline-none focus:bg-white focus:ring-2 focus:ring-pink-200 transition-all text-gray-800 placeholder:text-gray-300 font-mono"
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="pt-6 border-t border-gray-100">
                            <div className="flex items-center justify-between mb-4">
                                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">SNS Registry (Optional)</label>
                                <button
                                    type="button"
                                    onClick={addSnsLink}
                                    className="text-xs text-pink-600 font-bold hover:pink-700 transition-colors"
                                >
                                    + Add New Link
                                </button>
                            </div>

                            <div className="space-y-3 max-h-48 overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-gray-200">
                                {snsLinks.map((link, index) => (
                                    <div key={index} className="flex gap-2">
                                        <select
                                            value={link.type}
                                            onChange={(e) => updateSnsLink(index, 'type', e.target.value)}
                                            className="bg-gray-50 border-none rounded-xl px-2 py-3 text-xs font-bold text-gray-600 outline-none focus:ring-1 focus:ring-pink-100 transition-all"
                                        >
                                            <option value="X">X (Twitter)</option>
                                            <option value="Instagram">Instagram</option>
                                            <option value="TikTok">TikTok</option>
                                            <option value="Threads">Threads</option>
                                            <option value="YouTube">YouTube</option>
                                            <option value="Other">Other</option>
                                        </select>
                                        <div className="relative flex-1">
                                            <input
                                                type="text"
                                                placeholder={link.type === 'Other' ? 'URL/ID' : `@id or URL`}
                                                value={link.value}
                                                onChange={(e) => updateSnsLink(index, 'value', e.target.value)}
                                                className="w-full py-3 px-4 bg-gray-50/50 border border-gray-100 rounded-xl text-xs outline-none focus:bg-white transition-all"
                                            />
                                            {snsLinks.length > 1 && (
                                                <button
                                                    type="button"
                                                    onClick={() => removeSnsLink(index)}
                                                    className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-300 hover:text-red-400"
                                                >
                                                    <X size={14} />
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <input type="hidden" name="snsLinks" value={JSON.stringify(snsLinks.filter(l => l.value.trim() !== ''))} />

                        <div className="pt-4">
                            <motion.button
                                whileHover={{ scale: 1.02, backgroundColor: '#000' }}
                                whileTap={{ scale: 0.98 }}
                                type="submit"
                                disabled={loading}
                                className="w-full bg-gray-900 text-white py-5 px-6 rounded-[24px] font-bold text-lg shadow-xl shadow-gray-200 transition-all flex items-center justify-center gap-3 disabled:opacity-50"
                            >
                                {loading ? (
                                    <motion.div
                                        animate={{ rotate: 360 }}
                                        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                                        className="w-6 h-6 border-2 border-white/20 border-t-white rounded-full"
                                    />
                                ) : (
                                    <>
                                        メールで登録を完了する
                                        <Send size={20} />
                                    </>
                                )}
                            </motion.button>

                            <div className="my-6 flex items-center gap-4">
                                <div className="h-[1px] flex-1 bg-gray-100"></div>
                                <span className="text-xs text-gray-400 font-bold uppercase tracking-widest">or register with</span>
                                <div className="h-[1px] flex-1 bg-gray-100"></div>
                            </div>

                            <div className="space-y-3">
                                <button
                                    type="button"
                                    disabled={loading}
                                    onClick={() => handleSocialRegistration('google')}
                                    className="w-full p-4 border border-gray-200 rounded-2xl bg-white hover:bg-gray-50 transition-all flex items-center justify-center gap-2 font-bold text-gray-700 shadow-sm disabled:opacity-50"
                                >
                                    <svg viewBox="0 0 24 24" width="24" height="24" xmlns="http://www.w3.org/2000/svg"><g transform="matrix(1, 0, 0, 1, 27.009001, -39.238998)"><path fill="#4285F4" d="M -3.264 51.509 C -3.264 50.719 -3.334 49.969 -3.454 49.239 L -14.754 49.239 L -14.754 53.749 L -8.284 53.749 C -8.574 55.229 -9.424 56.479 -10.684 57.329 L -10.684 60.329 L -6.824 60.329 C -4.564 58.239 -3.264 55.159 -3.264 51.509 Z" /><path fill="#34A853" d="M -14.754 63.239 C -11.514 63.239 -8.804 62.159 -6.824 60.329 L -10.684 57.329 C -11.764 58.049 -13.134 58.489 -14.754 58.489 C -17.884 58.489 -20.534 56.379 -21.484 53.529 L -25.464 53.529 L -25.464 56.619 C -23.494 60.539 -19.444 63.239 -14.754 63.239 Z" /><path fill="#FBBC05" d="M -21.484 53.529 C -21.734 52.809 -21.864 52.039 -21.864 51.239 C -21.864 50.439 -21.724 49.669 -21.484 48.949 L -21.484 45.859 L -25.464 45.859 C -26.284 47.479 -26.754 49.299 -26.754 51.239 C -26.754 53.179 -26.284 54.999 -25.464 56.619 L -21.484 53.529 Z" /><path fill="#EA4335" d="M -14.754 43.989 C -12.984 43.989 -11.404 44.599 -10.154 45.789 L -6.734 42.369 C -8.804 40.429 -11.514 39.239 -14.754 39.239 C -19.444 39.239 -23.494 41.939 -25.464 45.859 L -21.484 48.949 C -20.534 46.099 -17.884 43.989 -14.754 43.989 Z" /></g></svg>
                                    Google 登録
                                </button>
                            </div>

                            <div className="mt-8 text-center">
                                <Link href="/admin/login" className="text-sm text-gray-400 hover:underline">
                                    すでにアカウントをお持ちの方はこちら
                                </Link>
                            </div>
                        </div>
                    </form>
                </motion.div>
            </section>
        </main>
    );
}

export default function RegisterPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen bg-white flex items-center justify-center">
                <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                    className="w-8 h-8 border-2 border-pink-200 border-t-pink-500 rounded-full"
                />
            </div>
        }>
            <RegisterForm />
        </Suspense>
    );
}
