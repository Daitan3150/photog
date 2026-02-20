export default function ContactPage() {
    return (
        <div className="min-h-screen pt-32 px-6 pb-20 max-w-2xl mx-auto text-center">
            <h1 className="text-4xl md:text-6xl font-serif mb-8 tracking-widest uppercase">Contact</h1>

            <p className="mb-12 leading-relaxed text-gray-600">
                撮影のご依頼、ご相談はお気軽にInstagramのDM、<br className="hidden md:inline" />
                または以下のメールアドレスまでご連絡ください。
            </p>

            <div className="space-y-8">
                <div>
                    <h2 className="text-sm font-bold tracking-widest uppercase mb-6">SNS</h2>
                    <div className="flex flex-col md:flex-row justify-center gap-6">
                        <a
                            href="https://instagram.com"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="bg-black text-white px-8 py-4 rounded-full text-lg hover:bg-gray-800 transition-all shadow-lg hover:shadow-xl flex items-center justify-center gap-2"
                        >
                            <span>Follow on Instagram</span>
                        </a>
                        <a
                            href="https://twitter.com"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="bg-black text-white px-8 py-4 rounded-full text-lg hover:bg-gray-800 transition-all shadow-lg hover:shadow-xl flex items-center justify-center gap-2"
                        >
                            <span>Follow on X</span>
                        </a>
                    </div>
                </div>

                <div className="mt-12 pt-12 border-t border-gray-100">
                    <p className="text-sm text-gray-400">
                        ※ お仕事のご依頼はSNSのDMにてお待ちしております。
                    </p>
                </div>
            </div>
        </div>
    );
}
