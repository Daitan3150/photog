'use client';

import { useState } from 'react';
import { UserPlus, Star } from 'lucide-react';
import { useAuth } from '@/components/admin/AuthProvider';
import InvitePage from '@/app/admin/invite/page';
import SubjectsPage from '@/app/admin/subjects/page';

export default function AccessManagementPage() {
  const { role } = useAuth();
  const isAdmin = role === 'admin';
  const [showInvite, setShowInvite] = useState(false);

  if (!isAdmin) {
    return (
      <div className="rounded-3xl border border-amber-200 bg-amber-50 p-8 text-sm text-amber-700">
        この管理領域は管理者権限でのみ利用できます。
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl space-y-8 px-4 py-6 md:px-8 md:py-8">
      <div className="space-y-6">
        {showInvite ? (
          <div className="rounded-[2rem] border border-slate-200 bg-white p-4 shadow-sm md:p-6">
            <div className="mb-6 flex items-center gap-3 rounded-[1.5rem] border border-pink-200 bg-pink-50 p-4">
              <div className="rounded-2xl bg-pink-100 p-3 text-pink-700">
                <UserPlus size={20} />
              </div>
              <div>
                <h2 className="text-lg font-black text-slate-900">招待管理</h2>
                <p className="text-sm text-slate-600">招待コードの発行・コピー・削除をそのまま一つの流れで管理します。</p>
              </div>
            </div>
            <InvitePage />
          </div>
        ) : null}

        <div className="rounded-[2rem] border border-slate-200 bg-white p-4 shadow-sm md:p-6">
          <div className="mb-6 flex items-center gap-3 rounded-[1.5rem] border border-indigo-200 bg-indigo-50 p-4">
            <div className="rounded-2xl bg-indigo-100 p-3 text-indigo-700">
              <Star size={20} />
            </div>
            <div>
              <h2 className="text-lg font-black text-slate-900">モデル管理</h2>
              <p className="text-sm text-slate-600">被写体・モデル・連携アカウントをまとめて管理します。</p>
            </div>
          </div>
          <SubjectsPage />
        </div>
      </div>
    </div>
  );
}
