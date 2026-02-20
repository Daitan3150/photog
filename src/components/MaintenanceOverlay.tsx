"use client";

import { useEffect, useState } from "react";
import { isMaintenanceMode, getBannerMessage } from "@/lib/remoteConfig";
import { motion, AnimatePresence } from "framer-motion";

export default function MaintenanceOverlay() {
    const [maintenance, setMaintenance] = useState(false);
    const [message, setMessage] = useState("");

    useEffect(() => {
        // Initial check
        setMaintenance(isMaintenanceMode());
        setMessage(getBannerMessage() || "現在メンテナンス中です。しばらくお待ちください。");

        // Remote Config is fetched and activated in firebase.ts on load
        // But we might want to check again after a short delay or periodically
        const timer = setTimeout(() => {
            setMaintenance(isMaintenanceMode());
        }, 2000);

        return () => clearTimeout(timer);
    }, []);

    if (!maintenance) return null;

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[100] bg-white flex flex-col items-center justify-center p-6 text-center"
            >
                <div className="max-w-md">
                    <motion.div
                        initial={{ scale: 0.9, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ delay: 0.2 }}
                        className="mb-8"
                    >
                        <h1 className="text-3xl font-serif tracking-widest uppercase mb-4">Under Maintenance</h1>
                        <div className="w-12 h-0.5 bg-black mx-auto" />
                    </motion.div>

                    <motion.p
                        initial={{ y: 10, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        transition={{ delay: 0.4 }}
                        className="text-gray-500 font-light leading-relaxed mb-8"
                    >
                        {message}
                    </motion.p>

                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.6 }}
                        className="text-[10px] tracking-[0.3em] uppercase opacity-30"
                    >
                        Daitan Photography Portfolio
                    </motion.div>
                </div>
            </motion.div>
        </AnimatePresence>
    );
}
