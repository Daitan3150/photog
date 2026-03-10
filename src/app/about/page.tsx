import Image from "next/image";
import { getProfileServer } from "@/lib/actions/profile";
import AboutContent from "@/components/about/AboutContent"; // Refactored client logic to a new component if needed, or keeping it simple
import { Metadata } from 'next';

export const metadata: Metadata = {
    title: "About | DAITAN プロフィール",
    description: "北海道小樽ベースのフォトグラファー DAITAN（ダイタン）の経歴、撮影に対するビジョン、使用機材などのプロフィール情報を紹介します。",
};

export default async function AboutPage() {
    const result = await getProfileServer();
    const profile = result.success ? result.data : null;

    return (
        <AboutContent profile={profile} />
    );
}
