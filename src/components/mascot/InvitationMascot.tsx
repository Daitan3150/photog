'use client';

import { motion } from 'framer-motion';
import Image from 'next/image';

interface InvitationMascotProps {
    className?: string;
}

export default function InvitationMascot({ className }: InvitationMascotProps) {
    return (
        <div className={`relative ${className}`}>
            {/* Main Character Image */}
            <motion.div
                initial={{ opacity: 0, x: -50 }}
                animate={{
                    opacity: 1,
                    x: 0,
                    y: [0, -10, 0],
                }}
                transition={{
                    opacity: { duration: 0.8 },
                    x: { duration: 0.8 },
                    y: { duration: 4, repeat: Infinity, ease: "easeInOut" }
                }}
                className="relative z-10"
            >
                <motion.div
                    animate={{ scale: [1, 1.01, 1] }}
                    transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                >
                    <Image
                        src="/assets/mascot/photo_boy.png"
                        alt="Photography Club Mascot"
                        width={800}
                        height={800}
                        className="w-full h-auto drop-shadow-[0_20px_50px_rgba(0,0,0,0.1)]"
                        priority
                    />
                </motion.div>

                {/* Simulated Blink Layer (Simple overlay over eye area) */}
                <motion.div
                    animate={{
                        opacity: [0, 0, 1, 0, 0],
                        scaleY: [0, 0, 1, 0, 0]
                    }}
                    transition={{
                        duration: 5,
                        repeat: Infinity,
                        times: [0, 0.45, 0.46, 0.47, 1],
                        repeatDelay: 2
                    }}
                    className="absolute top-[40%] left-[38%] w-[25%] h-[2px] bg-[#FFD1DC] blur-[1px] z-20 pointer-events-none origin-center"
                />
            </motion.div>

            {/* Background Decor */}
            <motion.div
                animate={{
                    rotate: 360,
                    scale: [1, 1.1, 1]
                }}
                transition={{
                    rotate: { duration: 20, repeat: Infinity, ease: "linear" },
                    scale: { duration: 8, repeat: Infinity, ease: "easeInOut" }
                }}
                className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[120%] h-[120%] border border-pink-100 rounded-full opacity-20 pointer-events-none"
            />

            <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-pink-100 rounded-full blur-3xl opacity-30" />
            <div className="absolute -top-10 -right-10 w-40 h-40 bg-blue-100 rounded-full blur-3xl opacity-20" />
        </div>
    );
}
