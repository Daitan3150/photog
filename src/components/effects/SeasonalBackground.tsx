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
}

const SeasonalBackground: React.FC = () => {
    const [effect, setEffect] = useState<EffectType>('none');
    const [windowSize, setWindowSize] = useState({ width: 0, height: 0 });

    useEffect(() => {
        // Determine the current effect based on date
        const now = new Date();
        const month = now.getMonth() + 1; // 1-12
        const day = now.getDate();

        const getEffect = (): EffectType => {
            // Christmas: Dec 20 - Dec 25
            if (month === 12 && day >= 20 && day <= 25) return 'christmas';

            // Winter: Dec 1 - Feb 28/29
            if (month === 12 || month === 1 || month === 2) return 'snow';

            // Sakura (Spring): March 1 - May 20
            if (month === 3 || month === 4 || (month === 5 && day <= 20)) return 'sakura';

            // Tanabata: July 1 - July 8
            if (month === 7 && day >= 1 && day <= 8) return 'tanabata';

            // Summer: June 1 - Aug 31
            if (month === 6 || month === 7 || month === 8) return 'bubbles';

            // Halloween: Oct 20 - Oct 31
            if (month === 10 && day >= 20) return 'halloween';

            // Autumn: Sept 15 - Nov 30
            if ((month === 9 && day >= 15) || month === 10 || month === 11) return 'leaves';

            return 'none';
        };

        setEffect(getEffect());

        // Window size for particle distribution
        const handleResize = () => {
            setWindowSize({ width: window.innerWidth, height: window.innerHeight });
        };
        handleResize();
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const particles = useMemo(() => {
        if (effect === 'none') return [];

        // Create fixed number of particles based on effect
        const count = effect === 'tanabata' ? 40 : 25;
        return Array.from({ length: count }).map((_, i) => ({
            id: i,
            x: Math.random() * 100, // percentage
            y: Math.random() * 100, // percentage
            size: Math.random() * (effect === 'sakura' ? 15 : 10) + 5,
            duration: Math.random() * 10 + 10,
            delay: Math.random() * 15,
            rotate: Math.random() * 360,
        }));
    }, [effect]);

    if (effect === 'none') return null;

    const renderParticle = (p: Particle) => {
        switch (effect) {
            case 'sakura':
                return (
                    <motion.div
                        key={p.id}
                        initial={{ y: -20, x: `${p.x}%`, opacity: 0, rotate: 0 }}
                        animate={{
                            y: '110vh',
                            x: [`${p.x}%`, `${p.x + (Math.random() * 10 - 5)}%`, `${p.x}%`],
                            opacity: [0, 1, 1, 0],
                            rotate: p.rotate + 360
                        }}
                        transition={{
                            duration: p.duration,
                            repeat: Infinity,
                            delay: p.delay,
                            ease: "linear"
                        }}
                        className="fixed pointer-events-none z-[1]"
                        style={{ width: p.size, height: p.size }}
                    >
                        <svg viewBox="0 0 100 100" fill="#ffb7c5" className="w-full h-full drop-shadow-sm opacity-60">
                            <path d="M50 0 C60 30 90 40 100 50 C90 60 60 70 50 100 C40 70 10 60 0 50 C10 40 40 30 50 0" />
                        </svg>
                    </motion.div>
                );

            case 'snow':
            case 'christmas':
                return (
                    <motion.div
                        key={p.id}
                        initial={{ y: -20, x: `${p.x}%`, opacity: 0 }}
                        animate={{
                            y: '110vh',
                            x: [`${p.x}%`, `${p.x + (Math.random() * 4 - 2)}%`],
                            opacity: [0, 0.8, 0.8, 0],
                        }}
                        transition={{
                            duration: p.duration * 0.7,
                            repeat: Infinity,
                            delay: p.delay,
                            ease: "linear"
                        }}
                        className="fixed pointer-events-none z-[1]"
                    >
                        <div
                            className={`rounded-full bg-white blur-[1px] ${effect === 'christmas' ? 'shadow-[0_0_8px_white]' : ''}`}
                            style={{ width: p.size * 0.5, height: p.size * 0.5 }}
                        />
                    </motion.div>
                );

            case 'leaves':
                const leafColor = p.id % 2 === 0 ? '#cc5500' : '#8b0000';
                return (
                    <motion.div
                        key={p.id}
                        initial={{ y: -20, x: `${p.x}%`, opacity: 0, rotate: 0 }}
                        animate={{
                            y: '110vh',
                            x: [`${p.x}%`, `${p.x + (Math.random() * 20 - 10)}%`],
                            opacity: [0, 0.7, 0.7, 0],
                            rotate: p.rotate + 720
                        }}
                        transition={{
                            duration: p.duration * 1.2,
                            repeat: Infinity,
                            delay: p.delay,
                            ease: "linear"
                        }}
                        className="fixed pointer-events-none z-[1]"
                        style={{ width: p.size, height: p.size }}
                    >
                        <svg viewBox="0 0 100 100" fill={leafColor} className="w-full h-full opacity-40">
                            <path d="M50 0 C70 20 100 0 90 50 C100 100 70 80 50 100 C30 80 0 100 10 50 C0 0 30 20 50 0" />
                        </svg>
                    </motion.div>
                );

            case 'bubbles':
                return (
                    <motion.div
                        key={p.id}
                        initial={{ y: '110vh', x: `${p.x}%`, opacity: 0 }}
                        animate={{
                            y: '-10vh',
                            x: [`${p.x}%`, `${p.x + (Math.random() * 10 - 5)}%`],
                            opacity: [0, 0.3, 0.3, 0],
                            scale: [1, 1.2, 1]
                        }}
                        transition={{
                            duration: p.duration * 0.8,
                            repeat: Infinity,
                            delay: p.delay,
                            ease: "linear"
                        }}
                        className="fixed pointer-events-none z-[1]"
                    >
                        <div
                            className="rounded-full border border-blue-200/30 bg-blue-100/10"
                            style={{ width: p.size, height: p.size }}
                        />
                    </motion.div>
                );

            case 'tanabata':
                return (
                    <motion.div
                        key={p.id}
                        initial={{ opacity: 0, scale: 0 }}
                        animate={{
                            opacity: [0, 0.8, 0],
                            scale: [0, 1.2, 0],
                        }}
                        transition={{
                            duration: 3 + Math.random() * 4,
                            repeat: Infinity,
                            delay: p.delay,
                        }}
                        className="fixed pointer-events-none z-[1]"
                        style={{ left: `${p.x}%`, top: `${p.y}%` }}
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
                        initial={{ x: '-10vw', y: `${p.y}%`, opacity: 0 }}
                        animate={{
                            x: '110vw',
                            y: [`${p.y}%`, `${p.y + (Math.random() * 20 - 10)}%`, `${p.y}%`],
                            opacity: [0, 0.4, 0.4, 0],
                        }}
                        transition={{
                            duration: p.duration * 0.5,
                            repeat: Infinity,
                            delay: p.delay,
                            ease: "linear"
                        }}
                        className="fixed pointer-events-none z-[1]"
                        style={{ width: p.size * 2, height: p.size }}
                    >
                        <svg viewBox="0 0 100 50" fill={p.id % 2 === 0 ? "#4b0082" : "#ff8c00"} className="w-full h-full opacity-30">
                            <path d="M10 25 C10 10 30 10 40 25 C50 10 70 10 90 25 C70 40 50 40 40 25 C30 40 10 40 10 25" />
                        </svg>
                    </motion.div>
                );

            default:
                return null;
        }
    };

    return (
        <div className="fixed inset-0 pointer-events-none z-[1] overflow-hidden">
            <AnimatePresence>
                {particles.map(renderParticle)}
            </AnimatePresence>
        </div>
    );
};

export default SeasonalBackground;
