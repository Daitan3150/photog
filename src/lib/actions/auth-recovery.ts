'use server';

import { getAdminAuth, getAdminFirestore } from '@/lib/firebaseAdmin';
import { Resend } from 'resend';


const SUPER_ADMIN_EMAILS = ['daitan10618@icloud.com', 'daitan10618@gmail.com', 'new.sasuke.sakura@gmail.com'];
const SUPER_ADMIN_EMAIL = process.env.SUPER_ADMIN_EMAIL || 'daitan10618@icloud.com';

/**
 * 忘れ去られたメールアドレス（ID）のヒントを、登録されている予備メール（もしあれば）に送信するか、
 * 部分的なヒントとして返します。
 */
export async function getEmailHint(partialEmail: string) {
    try {
        // セキュリティのため、完全な一致ではなく部分的なチェックや、
        // 既知のスーパーアドミンとの照合を行います。
        const matchedEmail = SUPER_ADMIN_EMAILS.find(e => e.includes(partialEmail) && partialEmail.length >= 3);
        if (matchedEmail) {
            const parts = matchedEmail.split('@');
            const hint = `${parts[0].substring(0, 3)}***@${parts[1]}`;
            return { success: true, hint };
        }
        return { success: false, error: '一致するユーザーが見つかりませんでした。' };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
}

/**
 * パスワードリセットメールをサーバーサイドから送信します。
 * クライアントサイドSDKの制約（リファラー制限など）を回避できます。
 */
export async function requestPasswordResetServer(email: string) {
    try {
        const auth = getAdminAuth();

        // ユーザーが存在するか確認
        try {
            await auth.getUserByEmail(email);
        } catch (e: any) {
            if (e.code === 'auth/user-not-found') {
                return { success: false, error: 'このメールアドレスは登録されていません。' };
            }
            throw e;
        }

        // リセットリンクを生成 (Firebase Admin SDK)
        // 注意: プロジェクト設定で「アクションURL」が正しく設定されている必要があります。
        const resetLink = await auth.generatePasswordResetLink(email, {
            url: `${process.env.NEXT_PUBLIC_APP_URL || 'https://next-portfolio-lime-one.vercel.app'}/admin/login`,
        });

        // Resendを使用してメール送信
        const apiKey = process.env.RESEND_API_KEY;
        if (apiKey && apiKey.startsWith('re_')) {
            const resend = new Resend(apiKey);
            const { error } = await resend.emails.send({
                from: 'onboarding@resend.dev',
                to: email,
                subject: '【Portfolio】パスワード再設定のご案内',
                html: `
                    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #eee; padding: 20px; border-radius: 10px;">
                        <h2 style="color: #333;">パスワードの再設定</h2>
                        <p>こんにちは、</p>
                        <p>あなたのアカウントでパスワードのリセットがリクエストされました。以下のボタンをクリックして、新しいパスワードを設定してください。</p>
                        <div style="text-align: center; margin: 30px 0;">
                            <a href="${resetLink}" style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; rounded: 5px; font-weight: bold; display: inline-block;">パスワードを再設定する</a>
                        </div>
                        <p style="color: #666; font-size: 14px;">このリンクは一定時間のみ有効です。心当たりがない場合は、このメールを無視してください。</p>
                        <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;" />
                        <p style="font-size: 12px; color: #999;">※このメールはサーバーサイドから直接送信されています。</p>
                    </div>
                `
            });

            if (error) throw new Error(error.message);
            return { success: true, method: 'email' };
        } else {
            // Resend API Keyがない場合はデバッグ用にリンクを返す（開発環境または緊急用）
            // 実際の本番環境ではセキュリティ上リンクをそのまま返すべきではありませんが、
            // ユーザーが「対策を作っておいて」と言っているので、APIキーがない場合のフォールバックとして
            // ヒントを提供します。
            console.log('Password Reset Link (Fallback):', resetLink);
            return {
                success: true,
                method: 'debug',
                message: 'API Keyが設定されていないため、管理パネルのコンソール、または代替の連絡手段を確認してください。'
            };
        }
    } catch (e: any) {
        console.error('Password Reset Error:', e);
        return { success: false, error: e.message };
    }
}

/**
 * 緊急ログイン用サーバーアクション。
 * クライアントサイドでの認証がブロックされる場合（リファラー制限など）、
 * サーバー側で認証を行い、カスタムトークンを発行します。
 */
export async function emergencySignIn(email: string, password: string) {
    try {
        console.log(`[EmergencySignIn] Attempting login for: ${email}`);

        const isSuperAdmin = SUPER_ADMIN_EMAILS.includes(email) || email === SUPER_ADMIN_EMAIL;
        if (isSuperAdmin && password === 'daiki725412') {
            const { getAdminAuth } = await import('@/lib/firebaseAdmin');
            const auth = getAdminAuth();

            let user;
            try {
                user = await auth.getUserByEmail(email);
            } catch (e: any) {
                if (e.code === 'auth/user-not-found') {
                    console.log('[EmergencySignIn] User not found, creating emergency admin user...');
                    // ユーザーがいない場合は作成を試みる
                    user = await auth.createUser({
                        email: email,
                        password: password,
                        emailVerified: true
                    });

                    // Firestoreにも追加
                    const { getAdminFirestore } = await import('@/lib/firebaseAdmin');
                    const db = getAdminFirestore();
                    await db.collection('users').doc(user.uid).set({
                        email: email,
                        role: 'admin',
                        createdAt: new Date().toISOString()
                    });
                } else {
                    throw e;
                }
            }

            const customToken = await auth.createCustomToken(user.uid);
            return { success: true, token: customToken };
        }

        return { success: false, error: '認証情報が一致しません。' };
    } catch (e: any) {
        console.error('Emergency Sign-in Error Detail:', e);
        // エラーコードをフロントに返す
        return { success: false, error: `サーバーエラー: ${e.code || e.message}` };
    }
}
