'use client';

import { useState, useRef } from 'react';
import { registerWithInvitation } from '@/lib/actions/register';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { User, Mail, Lock, Ticket, Camera, Send, X, Instagram, Info } from 'lucide-react';
import InvitationMascot from '@/components/mascot/InvitationMascot';

export default function RegisterPage() {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [isFlashing, setIsFlashing] = useState(false);
    const [snsLinks, setSnsLinks] = useState([{ type: 'X', value: '' }]);
    const router = useRouter();
    const formRef = useRef<HTMLFormElement>(null);

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
                                        placeholder="example@mail.com"
                                        required
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
                                        placeholder="••••••••"
                                        required
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
                                        登録を完了する
                                        <Send size={20} />
                                    </>
                                )}
                            </motion.button>

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
