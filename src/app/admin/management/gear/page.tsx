'use client';

import { Aperture, Camera } from 'lucide-react';
import { useAuth } from '@/components/admin/AuthProvider';
import AdminLensesPage from '@/app/admin/lenses/page';
import AdminCamerasPage from '@/app/admin/cameras/page';

export default function GearManagementPage() {
  const { role } = useAuth();
  const isAdmin = role === 'admin';

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
        <div className="rounded-[2rem] border border-slate-200 bg-white p-4 shadow-sm md:p-6">
          <div className="mb-6 flex items-center gap-3 rounded-[1.5rem] border border-amber-200 bg-amber-50 p-4">
            <div className="rounded-2xl bg-amber-100 p-3 text-amber-700">
              <Aperture size={20} />
            </div>
            <div>
              <h2 className="text-lg font-black text-slate-900">レンズ管理</h2>
              <p className="text-sm text-slate-600">レンズの登録・編集・候補の統合をまとめて行います。</p>
            </div>
          </div>
          <AdminLensesPage />
        </div>

        <div className="rounded-[2rem] border border-slate-200 bg-white p-4 shadow-sm md:p-6">
          <div className="mb-6 flex items-center gap-3 rounded-[1.5rem] border border-slate-200 bg-slate-50 p-4">
            <div className="rounded-2xl bg-slate-100 p-3 text-slate-700">
              <Camera size={20} />
            </div>
            <div>
              <h2 className="text-lg font-black text-slate-900">カメラ管理</h2>
              <p className="text-sm text-slate-600">カメラマスタ登録と未登録カメラ補正を同じ画面で扱います。</p>
            </div>
          </div>
          <AdminCamerasPage />
        </div>
      </div>
    </div>
  );
}
