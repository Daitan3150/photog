'use server';

import { getAdminAuth } from '@/lib/firebaseAdmin';
import { Resend } from 'resend';

const SUPER_ADMIN_EMAILS = ['daitan10618@icloud.com', 'daitan10618@gmail.com', 'new.sasuke.sakura@gmail.com'];
const SUPER_ADMIN_EMAIL = process.env.SUPER_ADMIN_EMAIL || 'daitan10618@icloud.com';

/**
 * メールアドレスのヒント取得（セキュリティのため完全なメールアドレスの推測を防ぎます）
 */
export async function getEmailHint(_partialEmail: string): Promise<{ success: boolean; hint?: string; error?: string }> {
    return {
        success: false,
        error: 'セキュリティ保護のため、メールアドレスのヒント機能は現在無効化されています。管理者にお問い合わせください。'
    };
}

/**
 * パスワード再設定メールをサーバーサイドから送信します。
 * ユーザー列挙攻撃を防ぐため、ユーザーが存在しない場合でも一貫したレスポンスを返します。
 */
export async function requestPasswordResetServer(email: string) {
    try {
        const auth = getAdminAuth();

        // ユーザーが存在するか確認
        try {
            await auth.getUserByEmail(email);
        } catch (e: any) {
            if (e.code === 'auth/user-not-found') {
                // セキュリティ対策（ユーザー列挙防止）: 存在しない場合でも成功扱いとして同一メッセージを返す
                return { success: true, method: 'email' };
            }
            throw e;
        }

        // リセットリンクを生成 (Firebase Admin SDK)
        const resetLink = await auth.generatePasswordResetLink(email, {
            url: `${process.env.NEXT_PUBLIC_APP_URL || 'https://next-portfolio-lime-one.vercel.app'}/admin/login`,
        });

        // Resendを使用してメール送信
        const apiKey = process.env.RESEND_API_KEY;
        if (apiKey && apiKey.startsWith('re_')) {
            const resend = new Resend(apiKey);
            const { error } = await resend.emails.send({
                from: process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev',
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
            console.warn('[Password Reset] RESEND_API_KEY is not configured.');
            return {
                success: true,
                method: 'debug',
                message: 'メール送信設定を確認してください。'
            };
        }
    } catch (e: any) {
        console.error('Password Reset Error:', e);
        return { success: false, error: 'パスワード再設定処理中にエラーが発生しました。' };
    }
}

/**
 * 緊急ログイン用サーバーアクション。
 * 環境変数 EMERGENCY_ADMIN_KEY が明示的に設定されている場合のみ動作します。
 * ソースコード上に固定パスワードは保持しません。
 */
export async function emergencySignIn(email: string, secretKey: string) {
    try {
        console.log(`[EmergencySignIn] Attempting emergency login for: ${email}`);

        const emergencyKey = process.env.EMERGENCY_ADMIN_KEY;
        if (!emergencyKey || emergencyKey.length < 16) {
            console.error('[EmergencySignIn] EMERGENCY_ADMIN_KEY is not configured or too short.');
            return { success: false, error: '緊急ログイン機能は無効化されています。' };
        }

        const isSuperAdmin = SUPER_ADMIN_EMAILS.includes(email) || email === SUPER_ADMIN_EMAIL;
        if (!isSuperAdmin || secretKey !== emergencyKey) {
            return { success: false, error: '認証情報が一致しません。' };
        }

        const { getAdminAuth } = await import('@/lib/firebaseAdmin');
        const auth = getAdminAuth();

        let user;
        try {
            user = await auth.getUserByEmail(email);
        } catch (e: any) {
            if (e.code === 'auth/user-not-found') {
                return { success: false, error: '対象の管理者アカウントが見つかりません。' };
            }
            throw e;
        }

        const customToken = await auth.createCustomToken(user.uid);
        return { success: true, token: customToken };
    } catch (e: any) {
        console.error('Emergency Sign-in Error Detail:', e);
        return { success: false, error: 'サーバーエラーが発生しました。' };
    }
}
