'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export default function SecurityProvider({ children }: { children: React.ReactNode }) {
    const [showAlert, setShowAlert] = useState(false);
    const [alertText, setAlertText] = useState('無断コピーは禁止されています 😈');

    useEffect(() => {
        const isAdminPath = window.location.pathname.startsWith('/admin');

        const handleContextMenu = (e: MouseEvent) => {
            const target = e.target as HTMLElement;
            if (isAdminPath || target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) return;

            e.preventDefault();
            triggerAlert('右クリックは封印されています。');
        };

        const handleKeyDown = (e: KeyboardEvent) => {
            if (isAdminPath) return;

            // Block F12, Ctrl+U, Ctrl+Shift+I, Ctrl+Shift+J, Ctrl+S
            if (
                e.key === 'F12' ||
                ((e.ctrlKey || e.metaKey) && (e.key === 'u' || e.key === 's')) ||
                ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'I' || e.key === 'J' || e.key === 'C'))
            ) {
                e.preventDefault();
                triggerAlert('開発者ツールへのアクセスは拒否されました。');
            }
        };

        const handleCopy = (e: ClipboardEvent) => {
            if (isAdminPath) return;

            const target = e.target as HTMLElement;
            if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return;

            e.preventDefault();
            // Replace clipboard content with a warning
            if (e.clipboardData) {
                e.clipboardData.setData('text/plain', 'このサイトのコンテンツは保護されています。無断転載はやめましょうね :)');
            }
            triggerAlert('コピーしようとしましたね？無駄ですよ 😈');
        };

        const handleSelectStart = (e: Event) => {
            const target = e.target as HTMLElement;
            if (isAdminPath || target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) return;

            e.preventDefault();
        };

        document.addEventListener('contextmenu', handleContextMenu);
        document.addEventListener('keydown', handleKeyDown);
        document.addEventListener('copy', handleCopy);
        document.addEventListener('selectstart', handleSelectStart);

        // Console harassment (only for sensitive paths if needed, or always)
        if (!isAdminPath) {
            const consoleHarassment = setInterval(() => {
                console.clear();
                console.log('%cSTOP!', 'color: red; font-size: 50px; font-weight: bold; text-shadow: 2px 2px 0 black;');
                console.log('%cこのサイトのソースを覗いても、あなたのポートフォリオは上手くなりませんよ :)', 'font-size: 20px;');
                console.warn('警告: コンテンツの不正取得攻撃を検知しました（死ぬほど嘘ですが）。');
            }, 3000);

            return () => {
                document.removeEventListener('contextmenu', handleContextMenu);
                document.removeEventListener('keydown', handleKeyDown);
                document.removeEventListener('copy', handleCopy);
                document.removeEventListener('selectstart', handleSelectStart);
                clearInterval(consoleHarassment);
            };
        }

        return () => {
            document.removeEventListener('contextmenu', handleContextMenu);
            document.removeEventListener('keydown', handleKeyDown);
            document.removeEventListener('copy', handleCopy);
            document.removeEventListener('selectstart', handleSelectStart);
        };
    }, []);

    const triggerAlert = (text: string) => {
        setAlertText(text);
        setShowAlert(true);
        setTimeout(() => setShowAlert(false), 3000);
    };

    return (
        <>
            <div className="select-none">
                {children}
            </div>

            {/* HARASSMENT ALERT */}
            <AnimatePresence>
                {showAlert && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.8, y: 50 }}
                        animate={{
                            opacity: 1,
                            scale: 1,
                            y: 0,
                            x: [0, -10, 10, -10, 0] // Shake effect
                        }}
                        exit={{ opacity: 0, scale: 0.5, y: -50 }}
                        className="fixed bottom-10 left-1/2 -translate-x-1/2 z-[99999] bg-gray-900 border-2 border-pink-500 text-white px-8 py-4 rounded-2xl shadow-[0_20px_60px_rgba(0,0,0,0.5)] flex items-center gap-4"
                    >
                        <span className="text-3xl text-pink-500">⚠️</span>
                        <div>
                            <p className="font-bold text-lg">{alertText}</p>
                            <p className="text-xs text-gray-400 mt-1">Security System Active (v2.0)</p>
                        </div>
                        <motion.div
                            animate={{ opacity: [0, 1, 0] }}
                            transition={{ duration: 1, repeat: Infinity }}
                            className="bg-red-500 w-3 h-3 rounded-full"
                        />
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Invisibility Cloak overlay for right clicks if needed, 
                but contextmenu preventDefault is usually enough for annoyance. */}
        </>
    );
}
