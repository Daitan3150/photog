"use client";

import { Instagram, Twitter, Mail } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { getProfile } from "@/lib/firebase/profile";

export default function Footer() {
    const { t } = useLanguage();
    const [snsUrls, setSnsUrls] = useState({
        instagram: "https://instagram.com",
        x: "https://x.com"
    });

    useEffect(() => {
        const fetchProfile = async () => {
            const profile = await getProfile();
            if (profile) {
                setSnsUrls({
                    instagram: profile.instagramUrl || "https://instagram.com",
                    x: profile.xUrl || "https://x.com"
                });
            }
        };
        fetchProfile();
    }, []);

    return (
        <footer className="w-full py-12 px-6 flex flex-col items-center justify-center bg-white text-gray-500 text-sm font-sans tracking-widest border-t border-gray-100">
            <div className="flex gap-8 mb-6">
                <a
                    href={snsUrls.instagram}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-3 rounded-full hover:bg-gray-50 hover:text-pink-600 transition-all duration-300 group"
                    aria-label="Instagram"
                >
                    <Instagram size={24} strokeWidth={1.5} className="group-hover:scale-110 transition-transform" />
                </a>
                <a
                    href={snsUrls.x}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-3 rounded-full hover:bg-gray-50 hover:text-blue-400 transition-all duration-300 group"
                    aria-label="Twitter"
                >
                    <Twitter size={24} strokeWidth={1.5} className="group-hover:scale-110 transition-transform" />
                </a>
                <Link
                    href="/contact"
                    className="p-3 rounded-full hover:bg-gray-50 hover:text-gray-900 transition-all duration-300 group"
                    aria-label="Contact"
                >
                    <Mail size={24} strokeWidth={1.5} className="group-hover:scale-110 transition-transform" />
                </Link>
            </div>
            <p className="opacity-60 text-xs">&copy; {new Date().getFullYear()} {t.common.rightsReserved}</p>
        </footer>
    );
}
