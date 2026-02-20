'use server'

import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendBackupEmail(email: string) {
    try {
        if (!process.env.RESEND_API_KEY) {
            throw new Error('Resend API Key is not set');
        }

        const { data, error } = await resend.emails.send({
            from: 'onboarding@resend.dev',
            to: email,
            subject: '【Portfolio】アカウント情報バックアップ',
            html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #333;">ポートフォリオサイト情報</h1>
            <p>このメールはバックアップ用に送信されました。以下の情報を大切に保管してください。</p>
            <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;" />
            
            <h2 style="color: #555;">🌍 閲覧者用 (Public)</h2>
            <p style="font-size: 16px;">
                <a href="https://next-portfolio-9nb.pages.dev" style="color: #0070f3; text-decoration: none;">
                    https://next-portfolio-9nb.pages.dev
                </a>
            </p>
            <p style="color: #777; font-size: 14px;">誰でもアクセス可能な公開URLです。</p>
            
            <h2 style="color: #555;">🔐 管理者用 (Admin Dashboard)</h2>
            <p style="font-size: 16px;">
                <a href="https://next-portfolio-9nb.pages.dev/admin" style="color: #0070f3; text-decoration: none;">
                    https://next-portfolio-9nb.pages.dev/admin
                </a>
            </p>
             <p style="color: #777; font-size: 14px;">写真投稿・管理を行うための専用URLです（要ログイン）。</p>

            <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;" />
            
            <h3 style="color: #666;">使用サービス一覧</h3>
            <ul style="color: #555;">
                <li><strong>Cloudflare Pages</strong>: ホスティング</li>
                <li><strong>MicroCMS</strong>: ブログ管理</li>
                <li><strong>Cloudinary</strong>: 画像管理</li>
                <li><strong>Firebase</strong>: データベース・認証</li>
                <li><strong>Resend</strong>: メール配信</li>
            </ul>
            
            <p style="font-size: 12px; color: #999; margin-top: 40px;">
                ※このメールは自動送信されています。心当たりがない場合は破棄してください。
            </p>
        </div>
      `
        });

        if (error) {
            console.error('Resend Error:', error);
            return { success: false, error: error.message };
        }

        return { success: true, data };
    } catch (e: any) {
        console.error('Email Exception:', e);
        return { success: false, error: e.message };
    }
}
