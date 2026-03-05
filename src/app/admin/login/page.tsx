'use client';

import { useState, useEffect } from 'react';
import { auth, app } from '@/lib/firebase';
import { signInWithEmailAndPassword } from 'firebase/auth';

export default function RebuiltLoginPage() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [status, setStatus] = useState<string>('Initializing...');
    const [error, setError] = useState<string | null>(null);
    const [firebaseConfig, setFirebaseConfig] = useState<any>(null);

    useEffect(() => {
        // debug info
        if (app) {
            const config = (app as any).options;
            setFirebaseConfig({
                apiKey: config.apiKey?.substring(0, 10) + '...',
                authDomain: config.authDomain,
                projectId: config.projectId
            });
            setStatus('Firebase initialized.');
        } else {
            setStatus('Firebase FAILED to initialize.');
        }
    }, []);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setStatus('Attempting login...');

        try {
            if (!auth) throw new Error('Auth not initialized');
            await signInWithEmailAndPassword(auth, email, password);
            setStatus('Login successful! (Redirecting soon)');
        } catch (err: any) {
            console.error('Login Error:', err);
            // エラーコードを明示的に表示
            setError(`${err.code}: ${err.message}`);
            setStatus('Login attempt finished.');
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-900 text-white p-4">
            <div className="max-w-md w-full space-y-8 bg-gray-800 p-8 rounded-xl shadow-2xl">
                <div>
                    <h2 className="text-3xl font-extrabold text-center text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-500">
                        Admin Rebuild Test
                    </h2>
                    <p className="mt-2 text-center text-sm text-gray-400">
                        Status: <span className="font-mono text-yellow-400">{status}</span>
                    </p>
                </div>

                {firebaseConfig && (
                    <div className="text-xs bg-gray-950 p-3 rounded font-mono text-green-400 space-y-1">
                        <p>API Key: {firebaseConfig.apiKey}</p>
                        <p>Domain: {firebaseConfig.authDomain}</p>
                        <p>Project: {firebaseConfig.projectId}</p>
                    </div>
                )}

                <form className="mt-8 space-y-6" onSubmit={handleLogin}>
                    <div className="rounded-md shadow-sm space-y-4">
                        <input
                            type="email"
                            required
                            className="appearance-none rounded-lg relative block w-full px-3 py-3 border border-gray-700 bg-gray-700 text-white placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                            placeholder="Email address"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                        />
                        <input
                            type="password"
                            required
                            className="appearance-none rounded-lg relative block w-full px-3 py-3 border border-gray-700 bg-gray-700 text-white placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                            placeholder="Password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                        />
                    </div>

                    {error && (
                        <div className="text-red-400 text-xs bg-red-900/30 p-3 rounded border border-red-500/50">
                            <strong>ERROR:</strong> {error}
                            <p className="mt-1 opacity-70 italic text-[10px]">
                                ※ configuration-not-found が出なければ通信成功です。
                            </p>
                        </div>
                    )}

                    <div>
                        <button
                            type="submit"
                            className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
                        >
                            TEST SIGN IN
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
