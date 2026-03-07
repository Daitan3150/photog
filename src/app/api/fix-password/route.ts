import { getAdminAuth } from '@/lib/firebaseAdmin';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
    try {
        const auth = getAdminAuth();
        const email = 'admin@daitan.com';
        const newPassword = 'mivxin-tegmo4-xottuM';

        let user;
        try {
            user = await auth.getUserByEmail(email);
        } catch (e: any) {
            if (e.code === 'auth/user-not-found') {
                user = await auth.createUser({ email, password: newPassword });
            } else {
                throw e;
            }
        }

        await auth.updateUser(user.uid, { password: newPassword, emailVerified: true });

        // Set admin role
        const { getAdminFirestore } = await import('@/lib/firebaseAdmin');
        const db = getAdminFirestore();
        await db.collection('users').doc(user.uid).set({
            email, role: 'admin', displayName: 'Admin'
        }, { merge: true });
        await auth.setCustomUserClaims(user.uid, { role: 'admin', admin: true });

        return NextResponse.json({
            success: true,
            message: `パスワードの強制上書きに成功しました！ email: ${email} は、指定された新しいパスワードでログイン可能です。`
        });
    } catch (e: any) {
        return NextResponse.json({ success: false, error: e.message });
    }
}
