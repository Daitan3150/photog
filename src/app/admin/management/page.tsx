'use client';

import { useEffect, useMemo, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/components/admin/AuthProvider';
import AdminLensesPage from '@/app/admin/lenses/page';
import AdminCamerasPage from '@/app/admin/cameras/page';
import InvitePage from '@/app/admin/invite/page';
import SubjectsPage from '@/app/admin/subjects/page';
import { Aperture, Camera, Sparkles, Star, UserPlus } from 'lucide-react';

type SectionKey = 'lenses' | 'cameras' | 'invite' | 'subjects';
type ModeKey = 'gear' | 'access';

const gearSections: Array<{ key: SectionKey; title: string; description: string; icon: typeof Aperture; accent: string }> = [
  {
    key: 'lenses',
    title: 'レンズ管理',
    description: 'レンズの登録・編集・候補の統合をまとめて行います。',
    icon: Aperture,
    accent: 'from-amber-500/10 to-orange-500/10 text-amber-600',
  },
  {
    key: 'cameras',
    title: 'カメラ管理',
    description: 'カメラマスタ登録と未登録カメラ補正を同じ画面で扱います。',
    icon: Camera,
    accent: 'from-slate-500/10 to-slate-700/10 text-slate-700',
  },
];

const accessSections: Array<{ key: SectionKey; title: string; description: string; icon: typeof Aperture; accent: string }> = [
  {
    key: 'invite',
    title: '招待管理',
    description: '招待コードの発行・コピー・削除をそのまま一つの流れで管理します。',
    icon: UserPlus,
    accent: 'from-pink-500/10 to-rose-500/10 text-pink-600',
  },
  {
    key: 'subjects',
    title: 'モデル管理',
    description: '被写体・モデル・連携アカウントをまとめて管理します。',
    icon: Star,
    accent: 'from-indigo-500/10 to-violet-500/10 text-indigo-600',
  },
];

export default function AdminManagementPage() {
  const { role } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const isAdmin = role === 'admin';
  const [activeMode, setActiveMode] = useState<ModeKey>('gear');
  const [activeSection, setActiveSection] = useState<SectionKey>('lenses');

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const mode = params.get('mode') === 'access' ? 'access' : 'gear';
    const tab = params.get('tab');
    const nextSection: SectionKey = mode === 'access'
      ? (tab === 'subjects' ? 'subjects' : 'invite')
      : (tab === 'cameras' ? 'cameras' : 'lenses');
    setActiveMode(mode);
    setActiveSection(nextSection);
  }, []);

  const visibleSections = activeMode === 'access' ? accessSections : gearSections;
  const sectionMeta = useMemo(() => visibleSections.find((section) => section.key === activeSection), [activeSection, visibleSections]);

  const handleSectionChange = (nextMode: ModeKey, nextSection: SectionKey) => {
    setActiveMode(nextMode);
    setActiveSection(nextSection);

    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    params.set('mode', nextMode);
    params.set('tab', nextSection);
    router.replace(`${pathname}?${params.toString()}`);
  };

  if (!isAdmin) {
    return (
      <div className="rounded-3xl border border-amber-200 bg-amber-50 p-8 text-sm text-amber-700">
        この管理領域は管理者権限でのみ利用できます。
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl space-y-8 px-4 py-6 md:px-8 md:py-8">
      <header className="rounded-[2rem] border border-slate-200 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-700 p-8 text-white shadow-xl">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.3em] text-slate-200">
              <Sparkles size={14} />
              Admin Management
            </div>
            <div>
              <h1 className="text-3xl font-black tracking-tight">管理画面</h1>
              <p className="mt-2 max-w-2xl text-sm text-slate-300">
                レンズ・カメラ管理と招待・モデル管理を切り替えながら、必要な項目をそのまま扱えます。
              </p>
            </div>
          </div>
        </div>
      </header>

      <div className="flex flex-wrap gap-2">
        {activeMode === 'gear' ? (
          <button
            onClick={() => handleSectionChange('gear', 'lenses')}
            className="rounded-full border border-slate-900 bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-slate-100"
          >
            レンズ・カメラ管理
          </button>
        ) : null}

        {activeMode === 'access' ? (
          <button
            onClick={() => handleSectionChange('access', 'invite')}
            className="rounded-full border border-slate-900 bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-slate-100"
          >
            招待・モデル管理
          </button>
        ) : null}
      </div>

      {activeMode === 'gear' ? (
        <div className="flex flex-wrap gap-2">
          {gearSections.map(({ key, title, icon: Icon }) => {
            const isActive = activeSection === key;
            return (
              <button
                key={key}
                onClick={() => handleSectionChange('gear', key)}
                className={`flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold transition-all ${
                  isActive
                    ? 'border-slate-900 bg-slate-900 text-white shadow-lg shadow-slate-100'
                    : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:text-slate-900'
                }`}
              >
                <Icon size={16} />
                {title}
              </button>
            );
          })}
        </div>
      ) : null}

      {activeMode === 'access' ? (
        <div className="flex flex-wrap gap-2">
          {accessSections.map(({ key, title, icon: Icon }) => {
            const isActive = activeSection === key;
            return (
              <button
                key={key}
                onClick={() => handleSectionChange('access', key)}
                className={`flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold transition-all ${
                  isActive
                    ? 'border-slate-900 bg-slate-900 text-white shadow-lg shadow-slate-100'
                    : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:text-slate-900'
                }`}
              >
                <Icon size={16} />
                {title}
              </button>
            );
          })}
        </div>
      ) : null}

      <div className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm md:p-6">
        <div className="mb-6 flex flex-col gap-2 rounded-[1.5rem] border border-slate-200 bg-slate-50 p-5 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm font-semibold text-slate-500">現在の管理対象</p>
            <h2 className="text-xl font-black text-slate-900">{sectionMeta?.title}</h2>
            <p className="mt-1 text-sm text-slate-500">{sectionMeta?.description}</p>
          </div>
          <div className={`rounded-2xl bg-gradient-to-br ${sectionMeta?.accent} px-4 py-3`}>
            {sectionMeta && <sectionMeta.icon size={22} />}
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-[1.75rem] border border-slate-200 bg-white p-2 shadow-sm md:p-4">
            {activeSection === 'lenses' ? <AdminLensesPage /> : null}
            {activeSection === 'cameras' ? <AdminCamerasPage /> : null}
            {activeSection === 'invite' ? <InvitePage /> : null}
            {activeSection === 'subjects' ? <SubjectsPage /> : null}
          </div>
        </div>
      </div>
    </div>
  );
}
