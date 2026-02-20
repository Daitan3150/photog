import Image from "next/image";
import { getProfileServer } from "@/lib/actions/profile";
import AboutContent from "@/components/about/AboutContent"; // Refactored client logic to a new component if needed, or keeping it simple
import { Metadata } from 'next';

export const metadata: Metadata = {
    title: "About",
    description: "Profile, biography, and gear information of Photographer Daitan.",
};

export default async function AboutPage() {
    const result = await getProfileServer();
    const profile = result.success ? result.data : null;

    return (
        <AboutContent profile={profile} />
    );
}
