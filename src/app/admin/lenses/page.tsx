'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { CldUploadWidget } from 'next-cloudinary';
import { useAuth } from '@/components/admin/AuthProvider';
import CloudinaryScript from '@/components/admin/CloudinaryScript';
import { getProfileServer, updateProfile } from '@/lib/actions/profile';
import { LensDetail } from '@/lib/firebase/profile';
import { Plus, Trash2, Image as ImageIcon, Aperture } from 'lucide-react';

const emptyLens = (): LensDetail => ({
  name: '',
  imageUrl: '',
  manufacturer: '',
  focalLength: '',
  aperture: '',
  mount: '',
  releaseYear: '',
  lensConstruction: '',
  minimumFocusDistance: '',
  filterDiameter: '',
  comment: '',
  description: '',
  specs: [],
});

export default function AdminLensesPage() {
  const { user, role } = useAuth();
  const isAdmin = role === 'admin';
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [lenses, setLenses] = useState<LensDetail[]>([]);
  const [draft, setDraft] = useState<LensDetail>(emptyLens());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [widgetLoaded, setWidgetLoaded] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [mediaMenuOpen, setMediaMenuOpen] = useState(false);
  const [portfolioLensNames, setPortfolioLensNames] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    const load = async () => {
      if (!user) return;
      try {
        const result = await getProfileServer();
        const existing = Array.isArray((result as any)?.data?.lensDetails) ? (result as any).data.lensDetails : [];
        setLenses(existing);
        if (existing.length > 0) {
          const first = existing[0];
          setEditingId(first.id || first.name || null);
          setDraft({ ...first, specs: first.specs || [] });
        }
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [user]);

  useEffect(() => {
    const loadLensNames = async () => {
      try {
        const response = await fetch('/api/lens-models');
        const json = (await response.json()) as { lensModels?: string[] };
        if (Array.isArray(json?.lensModels)) {
          setPortfolioLensNames(json.lensModels);
        }
      } catch (error) {
        console.error('Failed to load portfolio lens names', error);
      }
    };
    loadLensNames();
  }, []);

  const selectExistingLensName = (lensName: string) => {
    const matched = lenses.find((lens) => lens.name === lensName);
    if (matched) {
      startEdit(matched);
    } else {
      setEditingId(null);
      setDraft({ ...emptyLens(), name: lensName });
    }
  };

  const startNew = () => {
    setEditingId(null);
    setDraft(emptyLens());
  };

  const startEdit = (lens: LensDetail) => {
    setEditingId(lens.id || lens.name || null);
    setDraft({ ...lens, specs: lens.specs || [] });
  };

  const saveDraft = async () => {
    if (!user || !isAdmin) return;
    const name = draft.name?.trim() || '';
    if (!name) {
      setMessage('❌ レンズ名を入力してください');
      return;
    }

    const normalized: LensDetail = {
      ...draft,
      id: editingId || `${name}-${Date.now()}`,
      name,
      description: draft.description?.trim() || '',
      comment: draft.comment?.trim() || '',
      specs: [
        draft.manufacturer ? `メーカー: ${draft.manufacturer}` : '',
        draft.focalLength ? `焦点距離: ${draft.focalLength}` : '',
        draft.aperture ? `開放F値: ${draft.aperture}` : '',
        draft.mount ? `マウント: ${draft.mount}` : '',
        draft.releaseYear ? `発売年: ${draft.releaseYear}` : '',
        draft.lensConstruction ? `レンズ構成: ${draft.lensConstruction}` : '',
        draft.minimumFocusDistance ? `最短撮影距離: ${draft.minimumFocusDistance}` : '',
        draft.filterDiameter ? `フィルター径: ${draft.filterDiameter}` : '',
        draft.comment ? `コメント: ${draft.comment}` : '',
      ].filter(Boolean),
    };

    const updatedLenses = editingId
      ? lenses.map((item) => (item.id === editingId || item.name === editingId ? normalized : item))
      : [normalized, ...lenses];

    setLenses(updatedLenses);
    setSaving(true);
    setMessage('');

    try {
      const payload = {
        lensDetails: updatedLenses,
      };
      const idToken = await user.getIdToken();
      const result = await updateProfile(payload as any, idToken);
      if (result.success) {
        setMessage('✅ 保存してポートフォリオに反映しました');
        startNew();
      } else {
        setMessage(`❌ 保存に失敗しました: ${result.error || 'Unknown error'}`);
      }
    } catch (error: any) {
      setMessage(`❌ エラー: ${error.message}`);
    } finally {
      setSaving(false);
    }
  };

  const removeLens = (targetId: string) => {
    setLenses((prev) => prev.filter((item) => (item.id || item.name) !== targetId));
  };

  const uploadImageFile = async (file: File) => {
    const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
    const uploadPreset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET || 'profile_preset';
    if (!cloudName) {
      setMessage('❌ Cloudinary の設定が不足しています');
      return;
    }
    setUploadingImage(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('upload_preset', uploadPreset);
      const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
        method: 'POST',
        body: formData,
      });
      const result = await response.json() as any;
      if (result?.secure_url) {
        setDraft((prev) => ({ ...prev, imageUrl: result.secure_url }));
      } else {
        setMessage('❌ 画像アップロードに失敗しました');
        console.error('Cloudinary upload failed', result);
      }
    } catch (error: any) {
      console.error('Upload error', error);
      setMessage('❌ 画像アップロード中にエラーが発生しました');
    } finally {
      setUploadingImage(false);
    }
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      uploadImageFile(file);
    }
  };

  const preview = useMemo(() => {
    const current = lenses.find((lens) => (lens.id || lens.name) === editingId) || draft;
    return current;
  }, [draft, editingId, lenses]);

  if (loading) return <div className="p-8">読み込み中...</div>;

  return (
    <div className="mx-auto max-w-7xl p-8">
      <CloudinaryScript onLoad={() => setWidgetLoaded(true)} />
      <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-800">レンズ管理</h1>
          <p className="mt-2 text-sm text-slate-500">レンズを複数登録して、ポートフォリオに表示できます。</p>
        </div>
        <button
          type="button"
          onClick={startNew}
          className="inline-flex items-center gap-2 rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white"
        >
          <Plus size={16} /> 新規追加
        </button>
      </div>

      {message && <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-700">{message}</div>}

      <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="space-y-4">
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-4 flex items-center gap-2">
              <Aperture size={18} className="text-amber-500" />
              <h2 className="text-lg font-bold text-slate-800">登録済みレンズ</h2>
            </div>
            <div className="space-y-3">
              {lenses.length === 0 && <div className="rounded-2xl border border-dashed border-slate-200 p-6 text-sm text-slate-500">まだ登録されていません。</div>}
              {lenses.map((lens) => (
                <div key={lens.id || lens.name} className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <div className="flex items-center gap-3">
                    {lens.imageUrl ? (
                      <img src={lens.imageUrl} alt={lens.name} className="h-12 w-12 rounded-xl object-cover" />
                    ) : (
                      <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-dashed border-slate-200 bg-white text-slate-400">
                        <ImageIcon size={18} />
                      </div>
                    )}
                    <div>
                      <div className="font-semibold text-slate-800">{lens.name || '名称未設定'}</div>
                      <div className="text-xs text-slate-500">{lens.specs?.slice(0, 2).join(' / ')}</div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button type="button" onClick={() => startEdit(lens)} className="rounded-full border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700">編集</button>
                    <button type="button" onClick={() => removeLens(lens.id || lens.name || '')} className="rounded-full border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-600">削除</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-bold text-slate-800">{editingId ? '編集' : '新規追加'}</h2>
          <div className="mt-6 space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700">レンズ名</label>
              <input value={draft.name || ''} onChange={(e) => setDraft({ ...draft, name: e.target.value })} className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm" placeholder="例: Canon RF 24-70mm F2.8L IS USM" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700">画像</label>
              <div className="flex items-start gap-4">
                {draft.imageUrl ? <img src={draft.imageUrl} alt="preview" className="h-24 w-24 rounded-2xl object-cover" /> : <div className="flex h-24 w-24 items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50 text-slate-400"><ImageIcon size={20} /></div>}
                <div className="flex flex-col gap-2">
                  <CldUploadWidget
                    uploadPreset={process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET || 'profile_preset'}
                    onSuccess={(result: any) => setDraft((prev) => ({ ...prev, imageUrl: result.info.secure_url }))}
                  >
                    {({ open }) => (
                      <div className="relative inline-flex flex-col gap-2">
                        <button
                          type="button"
                          onClick={() => setMediaMenuOpen((prev) => !prev)}
                          className="rounded-full border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm"
                          aria-expanded={mediaMenuOpen}
                        >
                          画像を選択
                        </button>
                        {mediaMenuOpen && (
                          <div className="absolute left-0 z-10 mt-2 w-[220px] overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-lg">
                            <button
                              type="button"
                              onClick={() => {
                                setMediaMenuOpen(false);
                                if (!widgetLoaded) {
                                  setMessage('Cloudinary ウィジェットを読み込み中です。少し待ってから再度押してください。');
                                  return;
                                }
                                open();
                              }}
                              className="w-full px-4 py-3 text-left text-sm font-semibold text-slate-800 hover:bg-slate-50"
                            >
                              スマホ / メディアから選択
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setMediaMenuOpen(false);
                                fileInputRef.current?.click();
                              }}
                              className="w-full px-4 py-3 text-left text-sm font-semibold text-slate-800 hover:bg-slate-50"
                            >
                              ファイルから選択
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </CldUploadWidget>
                  {uploadingImage && <p className="text-xs text-gray-500">アップロード中...</p>}
                </div>
              </div>
            </div>
            {portfolioLensNames.length > 0 && (
              <div className="space-y-2 rounded-3xl border border-slate-200 bg-slate-50 p-4">
                <div className="text-sm font-semibold text-slate-700">既存のポートフォリオレンズから選択</div>
                <div className="grid gap-2 sm:grid-cols-2">
                  {portfolioLensNames.slice(0, 8).map((lens) => (
                    <button
                      key={lens}
                      type="button"
                      onClick={() => selectExistingLensName(lens)}
                      className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-left text-sm text-slate-800 hover:border-slate-300 hover:bg-slate-100"
                    >
                      {lens}
                    </button>
                  ))}
                </div>
                <p className="text-[11px] text-slate-500">レンズ名を入力すると、既存のポートフォリオ名と一致する場合に同じページの情報を反映できます。</p>
              </div>
            )}
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700">説明</label>
              <textarea value={draft.description || ''} onChange={(e) => setDraft({ ...draft, description: e.target.value })} className="h-20 w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm" placeholder="簡単な説明" />
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2"><label className="text-sm font-semibold text-slate-700">メーカー</label><input value={draft.manufacturer || ''} onChange={(e) => setDraft({ ...draft, manufacturer: e.target.value })} className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm" /></div>
              <div className="space-y-2"><label className="text-sm font-semibold text-slate-700">焦点距離</label><input value={draft.focalLength || ''} onChange={(e) => setDraft({ ...draft, focalLength: e.target.value })} className="w-full rounded-2xl border border-slate-200 bg-slate-200/50 px-3 py-2 text-sm" /></div>
              <div className="space-y-2"><label className="text-sm font-semibold text-slate-700">開放F値</label><input value={draft.aperture || ''} onChange={(e) => setDraft({ ...draft, aperture: e.target.value })} className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm" /></div>
              <div className="space-y-2"><label className="text-sm font-semibold text-slate-700">マウント</label><input value={draft.mount || ''} onChange={(e) => setDraft({ ...draft, mount: e.target.value })} className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm" /></div>
              <div className="space-y-2"><label className="text-sm font-semibold text-slate-700">発売年</label><input value={draft.releaseYear || ''} onChange={(e) => setDraft({ ...draft, releaseYear: e.target.value })} className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm" /></div>
              <div className="space-y-2"><label className="text-sm font-semibold text-slate-700">レンズ構成</label><input value={draft.lensConstruction || ''} onChange={(e) => setDraft({ ...draft, lensConstruction: e.target.value })} className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm" /></div>
              <div className="space-y-2"><label className="text-sm font-semibold text-slate-700">最短撮影距離</label><input value={draft.minimumFocusDistance || ''} onChange={(e) => setDraft({ ...draft, minimumFocusDistance: e.target.value })} className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm" /></div>
              <div className="space-y-2"><label className="text-sm font-semibold text-slate-700">フィルター径</label><input value={draft.filterDiameter || ''} onChange={(e) => setDraft({ ...draft, filterDiameter: e.target.value })} className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm" /></div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700">コメント</label>
              <textarea value={draft.comment || ''} onChange={(e) => setDraft({ ...draft, comment: e.target.value })} className="h-24 w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm" placeholder="補足コメント" />
            </div>
            <div className="flex gap-3 pt-2">
              <button type="button" onClick={saveDraft} disabled={saving} className="rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white">{saving ? '保存中...' : '保存'}</button>
              <button type="button" onClick={() => { startNew(); setMessage(''); }} className="rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700">キャンセル</button>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-8 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <h3 className="text-lg font-bold text-slate-800">プレビュー</h3>
        <div className="mt-4 rounded-[28px] border border-slate-200 bg-slate-50 p-4">
          <div className="grid gap-6 md:grid-cols-[180px_minmax(0,1fr)]">
            <div className="flex items-center justify-center rounded-3xl border border-slate-200 bg-white p-4">
              {preview.imageUrl ? <img src={preview.imageUrl} alt={preview.name} className="aspect-square w-full max-w-[160px] object-cover" /> : <div className="flex aspect-square w-full max-w-[160px] items-center justify-center rounded-2xl border border-dashed border-slate-200 text-slate-400">No Image</div>}
            </div>
            <div className="flex min-w-0 flex-col justify-between gap-3">
              <div>
                <h4 className="text-xl font-black text-slate-900">{preview.name || 'レンズ名'}</h4>
                <p className="mt-2 text-sm leading-6 text-slate-600">{preview.description || preview.comment || '説明が入ります。'}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                {(preview.specs || []).map((spec) => <span key={spec} className="rounded-full border border-slate-200 bg-white px-3 py-1 text-[11px] leading-5 text-slate-600">{spec}</span>)}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
