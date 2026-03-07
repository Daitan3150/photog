'use client';

import { useState, useEffect } from 'react';
import { createInvitationCode, getInvitationCodes, deleteInvitationCode, deleteUsedInvitationCodes } from '@/lib/actions/invitation';
import { motion, AnimatePresence } from 'framer-motion';
import { Copy, Check, Sparkles, RefreshCw, ArrowRight, Trash2, ChevronDown, ChevronUp } from 'lucide-react';
import IssuanceMascot from '@/components/admin/IssuanceMascot';
import { useAuth } from '@/components/admin/AuthProvider';

type Invitation = {
    id: string;
    code: string;
    isUsed: boolean;
    createdAt: string;
    usedBy?: string;
};

export default function InvitePage() {
    const [invitations, setInvitations] = useState<Invitation[]>([]);
    const [loading, setLoading] = useState(false);
    const [isIssuing, setIsIssuing] = useState(false);
    const [lastIssuedCode, setLastIssuedCode] = useState<string | undefined>();
    const [copiedId, setCopiedId] = useState<string | null>(null);
    const [isShaking, setIsShaking] = useState(false);
    const [isUsedExpanded, setIsUsedExpanded] = useState(false);
    const { user } = useAuth();

    useEffect(() => {
        loadInvitations();
    }, []);

    const loadInvitations = async () => {
        const codes = await getInvitationCodes();
        setInvitations(codes);
    };

    const handleGenerate = async () => {
        if (isIssuing) return;

        setIsIssuing(true);
        setLoading(true);

        // Phase 1: Focus (managed in Mascot via isIssuing)
        await new Promise(r => setTimeout(r, 800));

        // Phase 2: Shot (Trigger Screen Shake)
        setIsShaking(true);
        setTimeout(() => setIsShaking(false), 200);

        const result = await createInvitationCode();
        if (result.success) {
            setLastIssuedCode(result.code);
            await loadInvitations();

            // Keep the "Issuing" state for a bit for the Polaroid to be visible
            setTimeout(() => {
                setIsIssuing(false);
                setLoading(false);
            }, 3500);
        } else {
            alert('コードの発行に失敗しました: ' + result.error);
            setIsIssuing(false);
            setLoading(false);
        }
    };

    const copyToClipboard = async (code: string, id: string) => {
        try {
            await navigator.clipboard.writeText(code);
            setCopiedId(id);
            setTimeout(() => setCopiedId(null), 2000);
        } catch (err) {
            console.error('Failed to copy!', err);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('この招待コードを削除してもよろしいですか？')) return;
        if (!user) return;

        try {
            const idToken = await user.getIdToken();
            const result = await deleteInvitationCode(id, idToken);
            if (result.success) {
                await loadInvitations();
            } else {
                alert('削除に失敗しました: ' + result.error);
            }
        } catch (error) {
            console.error('Delete error:', error);
            alert('削除エラーが発生しました。');
        }
    };

    const handleDeleteUsed = async () => {
        if (!confirm('使用済み招待コードをすべて削除してもよろしいですか？\nこの操作は取り消せません。')) return;
        if (!user) return;

        try {
            const idToken = await user.getIdToken();
            const result = await deleteUsedInvitationCodes(idToken);
            if (result.success) {
                await loadInvitations();
            } else {
                alert('一括削除に失敗しました: ' + result.error);
            }
        } catch (error) {
            console.error('Delete used error:', error);
            alert('削除エラーが発生しました。');
        }
    };

    const unusedInvitations = invitations.filter(i => !i.isUsed);
    const usedInvitations = invitations.filter(i => i.isUsed);

    return (
        <motion.div
            animate={isShaking ? { x: [-10, 10, -10, 10, 0], y: [-5, 5, -5, 5, 0] } : {}}
            transition={{ duration: 0.2 }}
            className="max-w-6xl mx-auto px-4 py-8"
        >
            <header className="flex flex-col md:flex-row justify-between items-start md:items-end mb-12 gap-6">
                <div className="space-y-2">
                    <span className="text-pink-500 font-bold tracking-[0.3em] text-xs uppercase">Administration</span>
                    <h1 className="text-4xl md:text-5xl font-black text-gray-900 tracking-tight">
                        招待コード発行
                    </h1>
                    <p className="text-gray-400 font-medium">モデル・レイヤー向けの特別なアクセスキーを発行します。</p>
                </div>

                <div className="flex items-center gap-4">
                    <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={handleGenerate}
                        disabled={loading}
                        className="relative group bg-gray-900 text-white pl-8 pr-12 py-5 rounded-[2rem] font-bold shadow-2xl overflow-hidden disabled:opacity-50"
                    >
                        <span className="relative z-10 flex items-center gap-3 text-lg">
                            {loading ? <RefreshCw className="animate-spin" /> : <Sparkles className="text-yellow-400" />}
                            {loading ? 'コードを生成中...' : '新規招待コードを発行'}
                        </span>
                        <div className="absolute right-4 top-1/2 -translate-y-1/2 bg-white/20 p-2 rounded-full">
                            <ArrowRight size={20} />
                        </div>
                        {/* Shimmer Effect */}
                        <motion.div
                            animate={{ x: ['100%', '-100%'] }}
                            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                            className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent skew-x-12"
                        />
                    </motion.button>
                </div>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
                {/* Left: Mascot & Issuance Visual */}
                <div className="lg:col-span-5 flex flex-col items-center">
                    <div className="w-full bg-white rounded-[3rem] p-8 shadow-[0_30px_100px_rgba(0,0,0,0.03)] border border-gray-50 relative overflow-hidden">
                        {/* Shutter Sound Visuals */}
                        <AnimatePresence>
                            {isIssuing && (
                                <motion.div
                                    initial={{ opacity: 0, scale: 0.5 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0 }}
                                    className="absolute top-10 right-10 z-20 pointer-events-none"
                                >
                                    <span className="text-4xl font-black text-pink-500 italic drop-shadow-md">KASHA!!</span>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        <IssuanceMascot isIssuing={isIssuing} lastCode={lastIssuedCode} />

                        <div className="mt-8 text-center px-4 relative z-10">
                            <h3 className="text-xl font-bold text-gray-800">シャッターを切って発行！</h3>
                            <p className="text-sm text-gray-400 mt-2 leading-relaxed">
                                上のボタンを押すと、マスコットがコードを撮影して発行します。飛び出したコードをコピーしてシェアしてください。
                            </p>
                        </div>

                        {/* Background subtle grid */}
                        <div className="absolute inset-0 grid grid-cols-8 grid-rows-8 opacity-[0.03] pointer-events-none">
                            {[...Array(64)].map((_, i) => (
                                <div key={i} className="border-[0.5px] border-black" />
                            ))}
                        </div>
                    </div>
                </div>

                {/* Right: History & List */}
                <div className="lg:col-span-7 space-y-6">
                    <div className="flex items-center justify-between px-2">
                        <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                            発行履歴
                            <span className="text-xs bg-gray-100 text-gray-500 px-2.5 py-1 rounded-full">{invitations.length} codes</span>
                        </h2>
                    </div>

                    <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
                        <AnimatePresence initial={false}>
                            {invitations.length === 0 ? (
                                <motion.div
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    className="text-center py-20 bg-white rounded-3xl border border-dashed border-gray-200"
                                >
                                    <p className="text-gray-400">履歴がまだありません。</p>
                                </motion.div>
                            ) : (
                                <>
                                    {/* Unused Invitations */}
                                    {unusedInvitations.map((invite) => (
                                        <motion.div
                                            key={invite.id}
                                            layout
                                            initial={{ opacity: 0, y: 20 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            className="group relative flex items-center justify-between p-5 rounded-3xl transition-all border bg-white border-gray-100 hover:border-pink-200 hover:shadow-xl hover:shadow-pink-500/5"
                                        >
                                            <div className="flex items-center gap-5">
                                                <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl transition-all bg-pink-50 text-pink-500 group-hover:rotate-6">
                                                    🎟️
                                                </div>
                                                <div>
                                                    <div className="flex items-center gap-3">
                                                        <span className="font-mono text-2xl font-black tracking-tight text-gray-800">
                                                            {invite.code}
                                                        </span>
                                                    </div>
                                                    <div className="flex items-center gap-2 mt-1">
                                                        <span className="text-[10px] text-gray-400 uppercase font-bold tracking-widest leading-none">
                                                            {new Date(invite.createdAt).toLocaleDateString()}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-2">
                                                <motion.button
                                                    whileHover={{ scale: 1.05 }}
                                                    whileTap={{ scale: 0.95 }}
                                                    onClick={() => {
                                                        const url = `${window.location.origin}/invite/claim?code=${invite.code}`;
                                                        navigator.clipboard.writeText(url);
                                                        setCopiedId(`${invite.id}-url`);
                                                        setTimeout(() => setCopiedId(null), 2000);
                                                    }}
                                                    className={`px-4 py-2.5 rounded-2xl font-bold text-xs transition-all flex items-center gap-2 ${copiedId === `${invite.id}-url`
                                                        ? 'bg-blue-500 text-white shadow-lg shadow-blue-200'
                                                        : 'bg-white border border-gray-200 text-gray-700 hover:border-blue-200'
                                                        }`}
                                                >
                                                    {copiedId === `${invite.id}-url` ? <Check size={14} /> : <Sparkles size={14} className="text-blue-400" />}
                                                    {copiedId === `${invite.id}-url` ? 'Link Copied' : 'Copy Link'}
                                                </motion.button>

                                                <motion.button
                                                    whileHover={{ scale: 1.05 }}
                                                    whileTap={{ scale: 0.95 }}
                                                    onClick={() => copyToClipboard(invite.code, invite.id)}
                                                    className={`px-5 py-2.5 rounded-2xl font-bold text-sm transition-all flex items-center gap-2 ${copiedId === invite.id
                                                        ? 'bg-green-500 text-white shadow-lg shadow-green-200'
                                                        : 'bg-gray-900 text-white group-hover:bg-pink-600'
                                                        }`}
                                                >
                                                    {copiedId === invite.id ? (
                                                        <Check size={16} />
                                                    ) : (
                                                        <Copy size={16} />
                                                    )}
                                                    {copiedId === invite.id ? 'Copied' : 'Copy Code'}
                                                </motion.button>

                                                <motion.button
                                                    whileHover={{ scale: 1.1, color: '#ef4444' }}
                                                    whileTap={{ scale: 0.9 }}
                                                    onClick={() => handleDelete(invite.id)}
                                                    className="p-2.5 text-gray-300 hover:bg-red-50 rounded-xl transition-all"
                                                    title="削除"
                                                >
                                                    <Trash2 size={18} />
                                                </motion.button>
                                            </div>
                                        </motion.div>
                                    ))}

                                    {/* Used Invitations Collapsible */}
                                    {usedInvitations.length > 0 && (
                                        <div className="mt-8 border border-gray-200 rounded-3xl overflow-hidden bg-white shadow-sm">
                                            <div
                                                className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50 transition-colors"
                                                onClick={() => setIsUsedExpanded(!isUsedExpanded)}
                                            >
                                                <div className="flex items-center gap-3">
                                                    <span className="text-lg font-bold text-gray-700">使用済みコード</span>
                                                    <span className="text-xs font-bold bg-gray-100 text-gray-500 px-3 py-1 rounded-full">
                                                        {usedInvitations.length} 件
                                                    </span>
                                                </div>
                                                <div className="flex items-center gap-4">
                                                    {isUsedExpanded && (
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); handleDeleteUsed(); }}
                                                            className="text-xs font-bold bg-red-50 hover:bg-red-100 text-red-500 px-4 py-2 rounded-xl border border-red-100 transition-colors flex items-center gap-2"
                                                        >
                                                            <Trash2 size={14} />一括削除
                                                        </button>
                                                    )}
                                                    <div className="p-2 rounded-full bg-gray-100 text-gray-500">
                                                        {isUsedExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                                                    </div>
                                                </div>
                                            </div>

                                            <AnimatePresence>
                                                {isUsedExpanded && (
                                                    <motion.div
                                                        initial={{ opacity: 0, height: 0 }}
                                                        animate={{ opacity: 1, height: 'auto' }}
                                                        exit={{ opacity: 0, height: 0 }}
                                                        className="border-t border-gray-100 bg-gray-50/30"
                                                    >
                                                        <div className="p-4 space-y-3">
                                                            {usedInvitations.map((invite) => (
                                                                <div
                                                                    key={invite.id}
                                                                    className="flex items-center justify-between p-4 rounded-2xl bg-gray-50 border border-gray-100 opacity-70"
                                                                >
                                                                    <div className="flex items-center gap-4">
                                                                        <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-gray-200 text-xl">
                                                                            🔒
                                                                        </div>
                                                                        <div>
                                                                            <div className="flex items-center gap-3">
                                                                                <span className="font-mono text-lg font-bold text-gray-400 line-through">
                                                                                    {invite.code}
                                                                                </span>
                                                                                <span className="text-[10px] font-bold bg-gray-200 text-gray-500 px-2 py-0.5 rounded-md uppercase">Used</span>
                                                                            </div>
                                                                            <div className="flex items-center gap-2 mt-1">
                                                                                <span className="text-[10px] text-gray-400 uppercase font-bold tracking-widest leading-none">
                                                                                    {new Date(invite.createdAt).toLocaleDateString()}
                                                                                </span>
                                                                                {invite.usedBy && (
                                                                                    <>
                                                                                        <span className="text-gray-300">•</span>
                                                                                        <span className="text-[10px] text-blue-500 font-bold uppercase truncate max-w-[150px]">
                                                                                            {invite.usedBy}
                                                                                        </span>
                                                                                    </>
                                                                                )}
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                    {/* Note: Individual delete button is removed since used codes can be deleted via "Delete All" or individually if we wanted but you asked for bundle delete */}
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </motion.div>
                                                )}
                                            </AnimatePresence>
                                        </div>
                                    )}
                                </>
                            )}
                        </AnimatePresence>
                    </div>
                </div>
            </div>

            <style dangerouslySetInnerHTML={{
                __html: `
                .custom-scrollbar::-webkit-scrollbar {
                    width: 4px;
                }
                .custom-scrollbar::-webkit-scrollbar-track {
                    background: transparent;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb {
                    background: #F3F4F6;
                    border-radius: 10px;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                    background: #E5E7EB;
                }
            ` }} />
        </motion.div>
    );
}
