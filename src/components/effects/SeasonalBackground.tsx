'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

type EffectType = 'sakura' | 'tanabata' | 'bubbles' | 'leaves' | 'halloween' | 'snow' | 'christmas' | 'none';

interface Particle {
    id: number;
    x: number;
    y: number;
    size: number;
    duration: number;
    delay: number;
    rotate: number;
    opacity: number;
}

// 季節ごとの背景グラデーション色
const seasonGradients: Record<EffectType, string[]> = {
    sakura: ['rgba(255,183,197,0.08)', 'rgba(255,218,233,0.05)', 'rgba(255,240,245,0.03)'],
    snow: ['rgba(200,220,255,0.06)', 'rgba(230,240,255,0.04)', 'rgba(245,248,255,0.02)'],
    christmas: ['rgba(180,30,30,0.05)', 'rgba(0,100,0,0.04)', 'rgba(255,215,0,0.03)'],
    leaves: ['rgba(204,85,0,0.06)', 'rgba(139,0,0,0.04)', 'rgba(255,165,0,0.03)'],
    bubbles: ['rgba(135,206,250,0.06)', 'rgba(173,216,230,0.04)', 'rgba(224,255,255,0.02)'],
    tanabata: ['rgba(75,0,130,0.06)', 'rgba(138,43,226,0.04)', 'rgba(251,191,36,0.03)'],
    halloween: ['rgba(75,0,130,0.06)', 'rgba(255,140,0,0.04)', 'rgba(0,0,0,0.02)'],
    none: [],
};

const SeasonalBackground: React.FC = () => {
    const [effect, setEffect] = useState<EffectType>('none');

    useEffect(() => {
        const now = new Date();
        const month = now.getMonth() + 1;
        const day = now.getDate();

        const getEffect = (): EffectType => {
            if (month === 12 && day >= 20 && day <= 25) return 'christmas';
            if (month === 12 || month === 1 || month === 2) return 'snow';
            if (month === 3 || month === 4 || (month === 5 && day <= 20)) return 'sakura';
            if (month === 7 && day >= 1 && day <= 8) return 'tanabata';
            if (month === 6 || month === 7 || month === 8) return 'bubbles';
            if (month === 10 && day >= 20) return 'halloween';
            if ((month === 9 && day >= 15) || month === 10 || month === 11) return 'leaves';
            return 'none';
        };

        setEffect(getEffect());
    }, []);

    // パーティクル（画面全体に均等分散）
    const particles = useMemo(() => {
        if (effect === 'none') return [];
        const count = effect === 'tanabata' ? 50 : 35;
        return Array.from({ length: count }).map((_, i) => ({
            id: i,
            x: (i % 7) * 14 + Math.random() * 10,  // 7列に分散
            y: Math.random() * 100,
            size: Math.random() * (effect === 'sakura' ? 16 : 12) + 6,
            duration: Math.random() * 12 + 12,
            delay: Math.random() * 20,
            rotate: Math.random() * 360,
            opacity: 0.15 + Math.random() * 0.25,
        }));
    }, [effect]);

    // 背景の光のオーブ
    const orbs = useMemo(() => {
        if (effect === 'none') return [];
        const colors = seasonGradients[effect];
        return Array.from({ length: 6 }).map((_, i) => ({
            id: i,
            x: Math.random() * 80 + 10,
            y: Math.random() * 80 + 10,
            size: 200 + Math.random() * 400,
            color: colors[i % colors.length],
            duration: 20 + Math.random() * 15,
            delay: i * 3,
        }));
    }, [effect]);

    if (effect === 'none') return null;

    const renderParticle = (p: Particle) => {
        switch (effect) {
            case 'sakura':
                return (
                    <motion.div
                        key={p.id}
                        initial={{ y: -30, x: `${p.x}vw`, opacity: 0, rotate: 0 }}
                        animate={{
                            y: '110vh',
                            x: [`${p.x}vw`, `${p.x + (Math.random() * 8 - 4)}vw`, `${p.x + (Math.random() * 6 - 3)}vw`],
                            opacity: [0, p.opacity, p.opacity, 0],
                            rotate: p.rotate + 360,
                        }}
                        transition={{
                            duration: p.duration,
                            repeat: Infinity,
                            delay: p.delay,
                            ease: 'linear',
                        }}
                        className="fixed pointer-events-none"
                        style={{ width: p.size, height: p.size, zIndex: 0 }}
                    >
                        <svg viewBox="0 0 100 100" fill="#ffb7c5" className="w-full h-full drop-shadow-sm" style={{ opacity: p.opacity * 2 }}>
                            <path d="M50 0 C60 30 90 40 100 50 C90 60 60 70 50 100 C40 70 10 60 0 50 C10 40 40 30 50 0" />
                        </svg>
                    </motion.div>
                );

            case 'snow':
            case 'christmas':
                return (
                    <motion.div
                        key={p.id}
                        initial={{ y: -20, x: `${p.x}vw`, opacity: 0 }}
                        animate={{
                            y: '110vh',
                            x: [`${p.x}vw`, `${p.x + (Math.random() * 6 - 3)}vw`],
                            opacity: [0, p.opacity, p.opacity, 0],
                        }}
                        transition={{
                            duration: p.duration * 0.7,
                            repeat: Infinity,
                            delay: p.delay,
                            ease: 'linear',
                        }}
                        className="fixed pointer-events-none"
                        style={{ zIndex: 0 }}
                    >
                        <div
                            className={`rounded-full bg-white blur-[1px] ${effect === 'christmas' ? 'shadow-[0_0_8px_rgba(255,255,255,0.8)]' : ''}`}
                            style={{ width: p.size * 0.5, height: p.size * 0.5 }}
                        />
                    </motion.div>
                );

            case 'leaves':
                const leafColor = p.id % 3 === 0 ? '#cc5500' : p.id % 3 === 1 ? '#8b0000' : '#d4a017';
                return (
                    <motion.div
                        key={p.id}
                        initial={{ y: -30, x: `${p.x}vw`, opacity: 0, rotate: 0 }}
                        animate={{
                            y: '110vh',
                            x: [`${p.x}vw`, `${p.x + (Math.random() * 15 - 7)}vw`],
                            opacity: [0, p.opacity * 0.8, p.opacity * 0.8, 0],
                            rotate: p.rotate + 720,
                        }}
                        transition={{
                            duration: p.duration * 1.2,
                            repeat: Infinity,
                            delay: p.delay,
                            ease: 'linear',
                        }}
                        className="fixed pointer-events-none"
                        style={{ width: p.size, height: p.size, zIndex: 0 }}
                    >
                        <svg viewBox="0 0 100 100" fill={leafColor} className="w-full h-full" style={{ opacity: p.opacity * 1.5 }}>
                            <path d="M50 0 C70 20 100 0 90 50 C100 100 70 80 50 100 C30 80 0 100 10 50 C0 0 30 20 50 0" />
                        </svg>
                    </motion.div>
                );

            case 'bubbles':
                return (
                    <motion.div
                        key={p.id}
                        initial={{ y: '110vh', x: `${p.x}vw`, opacity: 0 }}
                        animate={{
                            y: '-10vh',
                            x: [`${p.x}vw`, `${p.x + (Math.random() * 8 - 4)}vw`],
                            opacity: [0, p.opacity * 0.6, p.opacity * 0.6, 0],
                            scale: [1, 1.3, 1],
                        }}
                        transition={{
                            duration: p.duration * 0.8,
                            repeat: Infinity,
                            delay: p.delay,
                            ease: 'linear',
                        }}
                        className="fixed pointer-events-none"
                        style={{ zIndex: 0 }}
                    >
                        <div
                            className="rounded-full border border-blue-200/30 bg-blue-100/10"
                            style={{ width: p.size * 1.2, height: p.size * 1.2 }}
                        />
                    </motion.div>
                );

            case 'tanabata':
                return (
                    <motion.div
                        key={p.id}
                        initial={{ opacity: 0, scale: 0 }}
                        animate={{
                            opacity: [0, p.opacity, 0],
                            scale: [0, 1.2, 0],
                        }}
                        transition={{
                            duration: 3 + Math.random() * 4,
                            repeat: Infinity,
                            delay: p.delay,
                        }}
                        className="fixed pointer-events-none"
                        style={{ left: `${p.x}vw`, top: `${p.y}vh`, zIndex: 0 }}
                    >
                        <svg viewBox="0 0 100 100" className="w-4 h-4 text-amber-200 fill-current drop-shadow-[0_0_8px_rgba(251,191,36,0.6)]">
                            <path d="M50 0 L61 35 L98 35 L68 57 L79 91 L50 70 L21 91 L32 57 L2 35 L39 35 Z" />
                        </svg>
                    </motion.div>
                );

            case 'halloween':
                return (
                    <motion.div
                        key={p.id}
                        initial={{ x: '-10vw', y: `${p.y}vh`, opacity: 0 }}
                        animate={{
                            x: '110vw',
                            y: [`${p.y}vh`, `${p.y + (Math.random() * 15 - 7)}vh`, `${p.y}vh`],
                            opacity: [0, p.opacity * 0.6, p.opacity * 0.6, 0],
                        }}
                        transition={{
                            duration: p.duration * 0.5,
                            repeat: Infinity,
                            delay: p.delay,
                            ease: 'linear',
                        }}
                        className="fixed pointer-events-none"
                        style={{ width: p.size * 2, height: p.size, zIndex: 0 }}
                    >
                        <svg viewBox="0 0 100 50" fill={p.id % 2 === 0 ? '#4b0082' : '#ff8c00'} className="w-full h-full" style={{ opacity: p.opacity }}>
                            <path d="M10 25 C10 10 30 10 40 25 C50 10 70 10 90 25 C70 40 50 40 40 25 C30 40 10 40 10 25" />
                        </svg>
                    </motion.div>
                );

            default:
                return null;
        }
    };

    return (
        <>
            {/* 背景の大きな光のオーブ（ゆっくり移動） */}
            <div className="fixed inset-0 pointer-events-none overflow-hidden" style={{ zIndex: 0 }}>
                {orbs.map((orb) => (
                    <motion.div
                        key={`orb-${orb.id}`}
                        animate={{
                            x: [
                                `${orb.x}vw`,
                                `${orb.x + 15}vw`,
                                `${orb.x - 10}vw`,
                                `${orb.x + 5}vw`,
                                `${orb.x}vw`,
                            ],
                            y: [
                                `${orb.y}vh`,
                                `${orb.y - 12}vh`,
                                `${orb.y + 8}vh`,
                                `${orb.y - 5}vh`,
                                `${orb.y}vh`,
                            ],
                            scale: [1, 1.2, 0.9, 1.1, 1],
                        }}
                        transition={{
                            duration: orb.duration,
                            repeat: Infinity,
                            ease: 'easeInOut',
                            delay: orb.delay,
                        }}
                        className="absolute rounded-full blur-3xl"
                        style={{
                            width: orb.size,
                            height: orb.size,
                            background: `radial-gradient(circle, ${orb.color} 0%, transparent 70%)`,
                        }}
                    />
                ))}
            </div>

            {/* パーティクル（画面全体に分散） */}
            <div className="fixed inset-0 pointer-events-none overflow-hidden" style={{ zIndex: 0 }}>
                <AnimatePresence>
                    {particles.map(renderParticle)}
                </AnimatePresence>
            </div>
        </>
    );
};

export default SeasonalBackground;
