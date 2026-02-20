'use client';

import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';
import { useState, useEffect } from 'react';

interface IssuanceMascotProps {
    isIssuing: boolean;
    lastCode?: string;
}

export default function IssuanceMascot({ isIssuing, lastCode }: IssuanceMascotProps) {
    const [phase, setPhase] = useState<'idle' | 'focus' | 'shot' | 'result'>('idle');

    useEffect(() => {
        if (isIssuing) {
            setPhase('focus');
            const shotTimer = setTimeout(() => {
                setPhase('shot');
                setTimeout(() => setPhase('result'), 400);
            }, 800);
            return () => clearTimeout(shotTimer);
        } else {
            // Wait a bit before returning to idle to show result
            const idleTimer = setTimeout(() => setPhase('idle'), 5000);
            return () => clearTimeout(idleTimer);
        }
    }, [isIssuing]);

    return (
        <div className="relative w-full max-w-[450px] mx-auto aspect-square flex items-center justify-center overflow-visible">

            {/* 1. FOCUS LINES (Anime style speed lines) */}
            <AnimatePresence>
                {phase === 'focus' && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 0.3 }}
                        exit={{ opacity: 0 }}
                        className="absolute inset-x-[-50%] inset-y-[-50%] z-0 pointer-events-none"
                    >
                        {[...Array(24)].map((_, i) => (
                            <motion.div
                                key={i}
                                initial={{ scaleX: 0 }}
                                animate={{ scaleX: [0, 1, 0] }}
                                transition={{ duration: 0.2, repeat: Infinity, delay: i * 0.05 }}
                                style={{
                                    rotate: i * 15,
                                    transformOrigin: 'left center'
                                }}
                                className="absolute left-1/2 top-1/2 w-[100%] h-[2px] bg-gradient-to-r from-pink-300 to-transparent"
                            />
                        ))}
                    </motion.div>
                )}
            </AnimatePresence>

            {/* 2. MAIN MASCOT */}
            <motion.div
                animate={
                    phase === 'focus' ? { scale: 1.05, y: -5 } :
                        phase === 'shot' ? { scale: 0.95, y: 10 } :
                            { scale: 1, y: [0, -5, 0] }
                }
                transition={phase === 'idle' ? { duration: 3, repeat: Infinity, ease: "easeInOut" } : { duration: 0.2 }}
                className="relative z-10"
            >
                <div className="relative">
                    <Image
                        src="/assets/mascot/photo_boy.png"
                        alt="Issuance Mascot"
                        width={500}
                        height={500}
                        className="w-full h-auto drop-shadow-[0_20px_60px_rgba(255,182,193,0.3)]"
                    />

                    {/* EYE BLINK / WINK OVERLAY (Simulated) */}
                    <AnimatePresence>
                        {phase === 'result' && (
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                className="absolute top-[40%] left-[38%] w-[25%] h-[15%] z-20 pointer-events-none"
                            >
                                {/* Mischievous Wink: Masking one eye with a curved line */}
                                <svg viewBox="0 0 100 40" className="w-full h-full fill-none stroke-[#FFD1DC] stroke-[8]" style={{ filter: 'drop-shadow(0 0 2px white)' }}>
                                    <path d="M10,25 Q50,5 90,25" strokeLinecap="round" />
                                </svg>
                                <motion.div
                                    animate={{ scale: [1, 1.5, 1], opacity: [0, 1, 0] }}
                                    transition={{ duration: 1, repeat: Infinity }}
                                    className="absolute -top-4 -right-4 text-2xl"
                                >
                                    ✨
                                </motion.div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                {/* FLASH (Sequential explosive flash) */}
                <AnimatePresence>
                    {phase === 'shot' && (
                        <motion.div
                            initial={{ scale: 0.1, opacity: 0 }}
                            animate={{
                                scale: [0.1, 4, 10],
                                opacity: [0, 1, 0],
                                rotate: [0, 45, 90]
                            }}
                            className="absolute top-[65%] left-[55%] w-20 h-20 bg-white rounded-full blur-[2px] z-50 flex items-center justify-center overflow-visible"
                        >
                            <div className="w-full h-full bg-white blur-3xl rounded-full" />
                            <div className="absolute inset-x-[-200%] h-1 bg-white" />
                            <div className="absolute inset-y-[-200%] w-1 bg-white" />
                        </motion.div>
                    )}
                </AnimatePresence>
            </motion.div>

            {/* 3. POLAROID CODE (The result) */}
            <AnimatePresence>
                {phase === 'result' && lastCode && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.2, y: 100, rotate: -30 }}
                        animate={{ opacity: 1, scale: 1, y: -200, rotate: -5 }}
                        exit={{ opacity: 0, scale: 0.5, y: -250 }}
                        transition={{ type: "spring", damping: 10, stiffness: 120 }}
                        className="absolute z-[100] pointer-events-none"
                    >
                        {/* Polaroid Case */}
                        <div className="bg-white p-3 pb-8 rounded-sm shadow-[0_25px_60px_rgba(0,0,0,0.15)] border border-gray-100 flex flex-col items-center">
                            <div className="bg-gray-900 w-64 aspect-square rounded-[2px] mb-3 flex items-center justify-center p-4 relative overflow-hidden group">
                                {/* Inner glow */}
                                <div className="absolute inset-0 bg-gradient-to-tr from-pink-500/20 to-purple-500/20" />
                                <div className="text-4xl font-black text-white tracking-[0.2em] relative z-10 font-serif shadow-pink-500">
                                    {lastCode}
                                </div>
                                <motion.div
                                    animate={{ opacity: [0, 0.5, 0], x: ['-100%', '200%'] }}
                                    transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
                                    className="absolute inset-x-0 h-40 bg-white/20 -skew-x-45"
                                />
                            </div>
                            <div className="w-full flex justify-between items-center px-1">
                                <span className="text-[10px] font-bold text-gray-300 tracking-widest uppercase italic">#Special_Invite</span>
                                <div className="flex gap-1 text-[8px] text-pink-300">💖 📸 ✨</div>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* 4. ON-SCREEN TEXT (KASHA!!) */}
            <AnimatePresence>
                {phase === 'shot' && (
                    <motion.div
                        initial={{ opacity: 0, scale: 2, x: 100 }}
                        animate={{ opacity: 1, scale: 1, x: 0 }}
                        exit={{ opacity: 0, y: -50 }}
                        className="absolute z-[60] top-10 right-[-10%] select-none pointer-events-none"
                    >
                        <h2 className="text-7xl font-black text-pink-600 italic tracking-tighter drop-shadow-[0_10px_0_rgba(255,255,255,1)]">KASHA!!</h2>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Extra Glow behind everything */}
            <div className={`absolute inset-[-20%] bg-pink-100/30 rounded-full blur-[120px] transition-all duration-700 ${phase !== 'idle' ? 'opacity-100 scale-110' : 'opacity-40 scale-100'}`} />
        </div>
    );
}
