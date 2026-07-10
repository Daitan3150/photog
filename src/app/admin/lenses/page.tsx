'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { CldUploadWidget } from 'next-cloudinary';
import { useAuth } from '@/components/admin/AuthProvider';
import CloudinaryScript from '@/components/admin/CloudinaryScript';
import { getProfileServer, updateProfile } from '@/lib/actions/profile';
import { LensDetail, Profile } from '@/lib/firebase/profile';
import { getSimilarLensNames, normalizeLensName } from '@/lib/utils/lensSuggestions';
import { Plus, Image as ImageIcon, Aperture } from 'lucide-react';

type CloudinaryUploadSuccess = {
  info?: {
    secure_url?: string;
  } | string;
};

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
  const [profile, setProfile] = useState<Profile | null>(null);
  const [lenses, setLenses] = useState<LensDetail[]>([]);
  const [draft, setDraft] = useState<LensDetail>(emptyLens());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [widgetLoaded, setWidgetLoaded] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [portfolioLensNames, setPortfolioLensNames] = useState<string[]>([]);
  const [portfolioLensFilter, setPortfolioLensFilter] = useState('');
  const [isPortfolioLensSelectorOpen, setIsPortfolioLensSelectorOpen] = useState(false);
  const [isRegisteredLensesOpen, setIsRegisteredLensesOpen] = useState(false);
  const [dismissedMergeCandidates, setDismissedMergeCandidates] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    const load = async () => {
      if (!user) return;
      try {
        const result = await getProfileServer();
        const payload = result as { data?: Profile | null } | null;
        const existingProfile = payload?.data ?? null;
        setProfile(existingProfile);
        const existing = Array.isArray(existingProfile?.lensDetails) ? existingProfile.lensDetails : [];
        setLenses(existing);
        const ignored = Array.isArray(existingProfile?.ignoredLensMergeCandidates)
          ? existingProfile.ignoredLensMergeCandidates
          : [];
        setDismissedMergeCandidates(ignored.map(normalizeLensName).filter(Boolean));
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
      const payload: Profile = {
        ...(profile ?? {
          name: '',
          role: '',
          location: '',
          bio: '',
          gear: [],
        }),
        lensDetails: updatedLenses,
      };
      const idToken = await user.getIdToken();
      const result = await updateProfile(payload, idToken);
      setProfile(payload);
      if (result.success) {
        setMessage('✅ 保存してポートフォリオに反映しました');
        startNew();
      } else {
        setMessage(`❌ 保存に失敗しました: ${result.error || 'Unknown error'}`);
      }
    } catch (error: unknown) {
      setMessage(`❌ エラー: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setSaving(false);
    }
  };

  const deleteLens = async (targetId: string) => {
    if (!user || !isAdmin) return;

    const targetLens = lenses.find((item) => (item.id || item.name) === targetId);
    if (!targetLens) return;

    const confirmed = window.confirm(`「${targetLens.name}」を削除しますか？`);
    if (!confirmed) return;

    const updatedLenses = lenses.filter((item) => (item.id || item.name) !== targetId);
    const updatedProfile: Profile = {
      ...(profile ?? {
        name: '',
        role: '',
        location: '',
        bio: '',
        gear: [],
      }),
      lensDetails: updatedLenses,
      ignoredLensMergeCandidates: profile?.ignoredLensMergeCandidates ?? [],
    };

    setSaving(true);
    setMessage(`「${targetLens.name}」を削除しています...`);

    try {
      const token = await user.getIdToken();
      const result = await updateProfile(updatedProfile, token);
      if (result.success) {
        setProfile(updatedProfile);
        setLenses(updatedLenses);
        if (editingId === targetId) {
          startNew();
        }
        setMessage(`✅ 「${targetLens.name}」を削除しました。`);
      } else {
        setMessage(`❌ 削除に失敗しました: ${result.error || 'Unknown error'}`);
      }
    } catch (error: unknown) {
      setMessage(`❌ 削除中にエラーが発生しました: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setSaving(false);
    }
  };

  const dismissMergeCandidate = async (candidateName: string) => {
    if (!user || !isAdmin) return;
    const normalizedCandidate = normalizeLensName(candidateName);
    if (!normalizedCandidate) return;
    if (dismissedMergeCandidates.includes(normalizedCandidate)) return;

    const updatedCandidates = [...dismissedMergeCandidates, normalizedCandidate];
    const updatedProfile: Profile = {
      ...(profile ?? {
        name: '',
        role: '',
        location: '',
        bio: '',
        gear: [],
      }),
      lensDetails: lenses,
      ignoredLensMergeCandidates: updatedCandidates,
    };

    setSaving(true);
    setMessage(`「${candidateName}」を候補から非表示にしています...`);

    try {
      const token = await user.getIdToken();
      const result = await updateProfile(updatedProfile, token);
      if (result.success) {
        setProfile(updatedProfile);
        setDismissedMergeCandidates(updatedCandidates);
        setMessage(`✅ 「${candidateName}」は今後の候補から表示されません。`);
      } else {
        setMessage(`❌ 保存に失敗しました: ${result.error || 'Unknown error'}`);
      }
    } catch (error: unknown) {
      setMessage(`❌ 保存中にエラーが発生しました: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setSaving(false);
    }
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
      const result = await response.json() as { secure_url?: string };
      if (result?.secure_url) {
        setDraft((prev) => ({ ...prev, imageUrl: result.secure_url }));
      } else {
        setMessage('❌ 画像アップロードに失敗しました');
        console.error('Cloudinary upload failed', result);
      }
    } catch (error: unknown) {
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

  const handleImageSelectClick = (open: () => void) => {
    if (!widgetLoaded) {
      setMessage('Cloudinary ウィジェットを読み込み中です。少し待ってから再度押してください。');
      fileInputRef.current?.click();
      return;
    }

    open();
  };

  const filteredPortfolioLensNames = useMemo(() => {
    const filter = portfolioLensFilter.trim().toLowerCase();
    if (!filter) return portfolioLensNames;
    return portfolioLensNames.filter((lens) => lens.toLowerCase().includes(filter));
  }, [portfolioLensNames, portfolioLensFilter]);

  const mergeCandidates = useMemo(() => {
    if (!editingId || !draft.name?.trim()) return [];
    const currentName = draft.name.trim();
    const otherNames = lenses
      .filter((lens) => (lens.id || lens.name) !== editingId)
      .map((lens) => lens.name || '')
      .filter(Boolean);
    return getSimilarLensNames(currentName, otherNames, 5)
      .filter((name) => !dismissedMergeCandidates.includes(normalizeLensName(name)));
  }, [draft.name, editingId, lenses, dismissedMergeCandidates]);

  const updateLensModelForPhotos = async (oldLensModel: string, newLensModel: string, idToken: string) => {
    const response = await fetch('/api/photos/bulk-lens-model', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${idToken}`,
      },
      body: JSON.stringify({ oldLensModel, newLensModel }),
    });

    return response.json() as Promise<{ success: boolean; count?: number; error?: string }>;
  };

  const confirmSimilarLens = async (lensName: string) => {
    const currentName = draft.name?.trim();
    if (!currentName || currentName === lensName) return;

    const confirmed = window.confirm(
      `「${lensName}」と「${currentName}」は同じレンズですか？\n同じレンズであれば、既存の写真データのLensModel（型番）を「${currentName}」（正しい型番）に置き換えます。`
    );
    if (!confirmed) return;

    if (!user) {
      setMessage('ログインユーザーが見つかりません。再度ログインしてください。');
      return;
    }

    setMessage(`写真の型番「${lensName}」を「${currentName}」に統一しています...`);
    try {
      const token = await user.getIdToken();
      // 写真データ内の古い名前(lensName)を新しい名前(currentName)に一括置換する
      const result = await updateLensModelForPhotos(lensName, currentName, token);
      if (result.success) {
        setMessage(`✅ ${result.count ?? 0}件の写真のLensModelを「${currentName}」に更新しました。`);
        
        // 登録済みレンズ(lenses)の中に古い名前(lensName)の登録データがあれば、現在のdraftとマージして古いデータを削除する
        const matchedIndex = lenses.findIndex((lens) => lens.name === lensName);
        let updatedLenses = [...lenses];
        let finalLens: LensDetail = { ...draft, name: currentName };

        if (matchedIndex !== -1) {
          const oldLens = lenses[matchedIndex];
          const mergedLens: LensDetail = {
            ...oldLens,
            ...draft,
            name: currentName,
            imageUrl: draft.imageUrl || oldLens.imageUrl,
            manufacturer: draft.manufacturer || oldLens.manufacturer,
            focalLength: draft.focalLength || oldLens.focalLength,
            aperture: draft.aperture || oldLens.aperture,
            mount: draft.mount || oldLens.mount,
            releaseYear: draft.releaseYear || oldLens.releaseYear,
            lensConstruction: draft.lensConstruction || oldLens.lensConstruction,
            minimumFocusDistance: draft.minimumFocusDistance || oldLens.minimumFocusDistance,
            filterDiameter: draft.filterDiameter || oldLens.filterDiameter,
            comment: draft.comment || oldLens.comment,
            description: draft.description || oldLens.description,
            specs: Array.from(new Set([...(draft.specs || []), ...(oldLens.specs || [])].filter(Boolean))),
          };
          updatedLenses.splice(matchedIndex, 1); // 古いレンズ情報を削除
          
          const newId = editingId || oldLens.id || `${currentName}-${Date.now()}`;
          finalLens = { ...mergedLens, id: newId };
          
          const existingIndex = updatedLenses.findIndex((lens) => lens.id === newId || lens.name === currentName);
          if (existingIndex !== -1) {
            updatedLenses[existingIndex] = finalLens;
          } else {
            updatedLenses = [finalLens, ...updatedLenses];
          }
        } else {
          // 古いレンズがない場合でも、現在のdraftに新しい名前を反映したものを追加または更新用にする
          const newId = editingId || `${currentName}-${Date.now()}`;
          finalLens = { ...draft, name: currentName, id: newId };
          
          const existingIndex = updatedLenses.findIndex((lens) => lens.id === newId || lens.name === currentName);
          if (existingIndex !== -1) {
            updatedLenses[existingIndex] = finalLens;
          } else {
            updatedLenses = [finalLens, ...updatedLenses];
          }
        }

        // プロフィール全体の機材テキスト内の古い名前(lensName)を新しい名前(currentName)に置換する
        const updatedProfile: Profile = {
          ...(profile ?? {
            name: '',
            role: '',
            location: '',
            bio: '',
            gear: [],
          }),
          lensDetails: updatedLenses,
        };

        const replaceString = (value: string | { manufacturer?: string; modelName?: string } | null | undefined) => {
          if (!value) return value;
          if (typeof value === 'object') {
            return {
              manufacturer: value.manufacturer ? value.manufacturer.replace(new RegExp(lensName.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&'), 'gi'), currentName) : value.manufacturer,
              modelName: value.modelName ? value.modelName.replace(new RegExp(lensName.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&'), 'gi'), currentName) : value.modelName,
            };
          }

          const escapedOld = lensName.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
          const regex = new RegExp(escapedOld, 'gi');
          return value.replace(regex, currentName);
        };

        if (Array.isArray(updatedProfile.lenses)) {
          updatedProfile.lenses = updatedProfile.lenses.map(replaceString) as Profile['lenses'];
        }
        if (Array.isArray(updatedProfile.gear)) {
          updatedProfile.gear = updatedProfile.gear.map(replaceString) as Profile['gear'];
        }
        if (Array.isArray(updatedProfile.mainGear)) {
          updatedProfile.mainGear = updatedProfile.mainGear.map(replaceString) as Profile['mainGear'];
        }
        if (Array.isArray(updatedProfile.subGear)) {
          updatedProfile.subGear = updatedProfile.subGear.map(replaceString) as Profile['subGear'];
        }
        if (Array.isArray(updatedProfile.otherGear)) {
          updatedProfile.otherGear = updatedProfile.otherGear.map(replaceString) as Profile['otherGear'];
        }

        // プロフィールを Firebase に即時保存する
        setSaving(true);
        try {
          const updateResult = await updateProfile(updatedProfile, token);
          if (updateResult.success) {
            setProfile(updatedProfile);
            setLenses(updatedLenses);
            setEditingId(finalLens.id || finalLens.name || null);
            setDraft({ ...finalLens, specs: finalLens.specs || [] });
            setMessage(`✅ ${result.count ?? 0}件の写真のLensModelを更新し、プロフィールの機材リストも統合しました。`);
          } else {
            setMessage(`❌ プロフィールの保存に失敗しました: ${updateResult.error || 'Unknown error'}`);
          }
        } catch (error: unknown) {
          setMessage(`❌ 保存エラー: ${error instanceof Error ? error.message : 'Unknown error'}`);
        } finally {
          setSaving(false);
        }
      } else {
        setMessage(`❌ 写真のLensModel置換に失敗しました: ${result.error || '不明なエラー'}`);
      }
    } catch (error: unknown) {
      setMessage(`❌ 実行中にエラーが発生しました: ${error instanceof Error ? error.message : '不明なエラー'}`);
    }
  };

  const mergeLensInto = async (targetName: string) => {
    const targetLens = lenses.find((lens) => lens.name === targetName);
    const sourceLens = lenses.find((lens) => (lens.id || lens.name) === editingId);
    if (!targetLens || !sourceLens || targetLens === sourceLens) return;

    const confirmed = window.confirm(
      `「${sourceLens.name}」を「${targetName}」に統合しますか？\n登録情報だけでなく、既存の写真データのLensModelも「${targetName}」に置き換えます。`
    );
    if (!confirmed) return;

    if (!user) {
      setMessage('ログインユーザーが見つかりません。再度ログインしてください。');
      return;
    }

    setMessage(`「${sourceLens.name}」の写真を「${targetName}」に統合しています...`);
    try {
      const token = await user.getIdToken();
      // 写真データ内の古い名前(sourceLens.name)をマージ先(targetLens.name)に一括置換する
      const result = await updateLensModelForPhotos(sourceLens.name || '', targetName, token);
      if (!result.success) {
        setMessage(`❌ 写真のLensModel置換に失敗しました: ${result.error || '不明なエラー'}`);
        return;
      }

      // lensesリストのマージ処理
      const mergedLens: LensDetail = {
        ...targetLens,
        imageUrl: targetLens.imageUrl || sourceLens.imageUrl,
        manufacturer: targetLens.manufacturer || sourceLens.manufacturer,
        focalLength: targetLens.focalLength || sourceLens.focalLength,
        aperture: targetLens.aperture || sourceLens.aperture,
        mount: targetLens.mount || sourceLens.mount,
        releaseYear: targetLens.releaseYear || sourceLens.releaseYear,
        lensConstruction: targetLens.lensConstruction || sourceLens.lensConstruction,
        minimumFocusDistance: targetLens.minimumFocusDistance || sourceLens.minimumFocusDistance,
        filterDiameter: targetLens.filterDiameter || sourceLens.filterDiameter,
        comment: targetLens.comment || sourceLens.comment,
        description: targetLens.description || sourceLens.description,
        specs: Array.from(new Set([...(targetLens.specs || []), ...(sourceLens.specs || [])].filter(Boolean))),
      };

      const updatedLenses = lenses
        .filter((lens) => lens !== sourceLens && lens !== targetLens)
        .concat(mergedLens);

      // プロフィール全体の機材テキスト内の古い名前(sourceLens.name)を新しい名前(targetName)に置換する
      const updatedProfile: Profile = {
        ...(profile ?? {
          name: '',
          role: '',
          location: '',
          bio: '',
          gear: [],
        }),
        lensDetails: updatedLenses,
      };

      const replaceString = (value: string | { manufacturer?: string; modelName?: string } | null | undefined) => {
        if (!value) return value;
        if (typeof value === 'object') {
          return {
            manufacturer: value.manufacturer ? value.manufacturer.replace(new RegExp((sourceLens.name || '').replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&'), 'gi'), targetName) : value.manufacturer,
            modelName: value.modelName ? value.modelName.replace(new RegExp((sourceLens.name || '').replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&'), 'gi'), targetName) : value.modelName,
          };
        }

        const escapedOld = (sourceLens.name || '').replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
        const regex = new RegExp(escapedOld, 'gi');
        return value.replace(regex, targetName);
      };

      if (Array.isArray(updatedProfile.lenses)) {
        updatedProfile.lenses = updatedProfile.lenses.map(replaceString) as Profile['lenses'];
      }
      if (Array.isArray(updatedProfile.gear)) {
        updatedProfile.gear = updatedProfile.gear.map(replaceString) as Profile['gear'];
      }
      if (Array.isArray(updatedProfile.mainGear)) {
        updatedProfile.mainGear = updatedProfile.mainGear.map(replaceString) as Profile['mainGear'];
      }
      if (Array.isArray(updatedProfile.subGear)) {
        updatedProfile.subGear = updatedProfile.subGear.map(replaceString) as Profile['subGear'];
      }
      if (Array.isArray(updatedProfile.otherGear)) {
        updatedProfile.otherGear = updatedProfile.otherGear.map(replaceString) as Profile['otherGear'];
      }

      // マージされた結果をデータベースに即時反映・保存する
      setSaving(true);
      try {
        const updateResult = await updateProfile(updatedProfile, token);
        if (updateResult.success) {
          setProfile(updatedProfile);
          setLenses(updatedLenses);
          setEditingId(mergedLens.id || mergedLens.name || null);
          setDraft({ ...mergedLens, specs: mergedLens.specs || [] });
          setMessage(`✅ 「${sourceLens.name}」を「${targetLens.name}」に統合し、${result.count ?? 0}件の写真のLensModelとプロフィールの機材リストを更新しました。`);
        } else {
          setMessage(`❌ プロフィールの保存に失敗しました: ${updateResult.error || 'Unknown error'}`);
        }
      } catch (error: unknown) {
        setMessage(`❌ 保存エラー: ${error instanceof Error ? error.message : 'Unknown error'}`);
      } finally {
        setSaving(false);
      }
    } catch (error: unknown) {
      setMessage(`❌ 実行中にエラーが発生しました: ${error instanceof Error ? error.message : '不明なエラー'}`);
    }
  };

  const preview = useMemo(() => {
    const current = lenses.find((lens) => (lens.id || lens.name) === editingId) || draft;
    return current;
  }, [draft, editingId, lenses]);

  if (loading) return <div className="p-8">読み込み中...</div>;

  return (
    <div className="mx-auto max-w-7xl p-4 sm:p-6 lg:p-8">
      <CloudinaryScript onLoad={() => setWidgetLoaded(true)} />
      <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
      <div className="mb-6 flex flex-col gap-3 sm:mb-8 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-black text-slate-800 sm:text-3xl">レンズ管理</h1>
          <p className="mt-2 text-sm text-slate-500">レンズを複数登録して、ポートフォリオに表示できます。</p>
        </div>
        <button
          type="button"
          onClick={startNew}
          className="inline-flex items-center justify-center gap-2 rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white"
        >
          <Plus size={16} /> 新規追加
        </button>
      </div>

      {message && <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-700">{message}</div>}

      <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr] lg:gap-8">
        <div className="space-y-4">
          <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
            <button
              type="button"
              onClick={() => setIsRegisteredLensesOpen((prev) => !prev)}
              className="mb-4 flex w-full items-center justify-between gap-2 text-left"
            >
              <div className="flex items-center gap-2">
                <Aperture size={18} className="text-amber-500" />
                <h2 className="text-lg font-bold text-slate-800">登録済みレンズ</h2>
              </div>
              <span className="text-xs font-semibold text-slate-500">{isRegisteredLensesOpen ? '閉じる' : '開く'}</span>
            </button>
            {isRegisteredLensesOpen && (
              <div className="space-y-3">
                {lenses.length === 0 && <div className="rounded-2xl border border-dashed border-slate-200 p-6 text-sm text-slate-500">まだ登録されていません。</div>}
                {lenses.map((lens) => (
                  <div key={lens.id || lens.name} className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 sm:flex-row sm:items-center sm:justify-between">
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
                    <div className="flex flex-wrap gap-2 sm:flex-nowrap">
                      <button type="button" onClick={() => startEdit(lens)} className="rounded-full border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700">編集</button>
                      <button type="button" onClick={() => deleteLens(lens.id || lens.name || '')} className="rounded-full border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-600">削除</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
          <h2 className="text-lg font-bold text-slate-800">{editingId ? '編集' : '新規追加'}</h2>
          <div className="mt-6 space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700">レンズ名</label>
              <input
                value={draft.name || ''}
                onChange={(e) => {
                  setDraft({ ...draft, name: e.target.value });
                }}
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm"
                placeholder="例: Canon RF 24-70mm F2.8L IS USM"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700">画像</label>
              <div className="flex items-start gap-4">
                {draft.imageUrl ? <img src={draft.imageUrl} alt="preview" className="h-24 w-24 rounded-2xl object-cover" /> : <div className="flex h-24 w-24 items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50 text-slate-400"><ImageIcon size={20} /></div>}
                <div className="flex flex-col gap-2">
                  <CldUploadWidget
                    uploadPreset={process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET || 'profile_preset'}
                    onSuccess={(result: CloudinaryUploadSuccess) => {
                      const secureUrl = typeof result.info === 'string'
                        ? result.info
                        : result.info?.secure_url || '';
                      setDraft((prev) => ({ ...prev, imageUrl: secureUrl }));
                    }}
                  >
                    {({ open }) => (
                      <button
                        type="button"
                        onClick={() => handleImageSelectClick(open)}
                        className="rounded-full border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm"
                      >
                        画像を選択
                      </button>
                    )}
                  </CldUploadWidget>
                  {uploadingImage && <p className="text-xs text-gray-500">アップロード中...</p>}
                </div>
              </div>
            </div>
            {portfolioLensNames.length > 0 && (
              <div className="space-y-2 rounded-3xl border border-slate-200 bg-slate-50 p-4">
                <button
                  type="button"
                  onClick={() => setIsPortfolioLensSelectorOpen((prev) => !prev)}
                  className="flex w-full items-center justify-between gap-2 text-left"
                >
                  <div className="text-sm font-semibold text-slate-700">既存のポートフォリオレンズから選択</div>
                  <span className="text-xs font-semibold text-slate-500">{isPortfolioLensSelectorOpen ? '閉じる' : '開く'}</span>
                </button>
                {isPortfolioLensSelectorOpen && (
                  <div className="space-y-3 pt-1">
                    <div className="space-y-2">
                      <input
                        type="text"
                        value={portfolioLensFilter}
                        onChange={(e) => setPortfolioLensFilter(e.target.value)}
                        placeholder="検索: 例) Canon, RF 24-70..."
                        className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm"
                      />
                      <p className="text-[11px] text-slate-500">
                        フィルターを使うと、登録済みレンズ名を絞り込めます。
                      </p>
                    </div>
                    <div className="max-h-[320px] overflow-y-auto rounded-3xl border border-slate-200 bg-slate-50 p-3 shadow-inner">
                      <div className="grid gap-2 grid-cols-1 sm:grid-cols-2">
                        {filteredPortfolioLensNames.map((lens) => (
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
                    </div>
                    <p className="text-[11px] text-slate-500">レンズ名を入力すると、既存のポートフォリオ名と一致する場合に同じページの情報を反映できます。</p>
                  </div>
                )}
              </div>
            )}
            <div className="space-y-3">
              {editingId && mergeCandidates.length > 0 && (
                <div className="rounded-2xl border border-slate-300 bg-slate-50 p-4 text-sm text-slate-700">
                  <p className="mb-2 font-semibold">このレンズは他の登録済みレンズと似ていますか？</p>
                  <div className="flex flex-wrap gap-2">
                    {mergeCandidates.map((name) => (
                      <div key={name} className="flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          onClick={() => mergeLensInto(name)}
                          className="rounded-full border border-slate-300 bg-white px-3 py-1 text-xs font-semibold text-slate-800 hover:bg-slate-100"
                        >
                          これと結合: {name}
                        </button>
                        <button
                          type="button"
                          onClick={() => dismissMergeCandidate(name)}
                          className="rounded-full border border-red-200 bg-white px-3 py-1 text-xs font-semibold text-red-600 hover:bg-red-50"
                        >
                          削除
                        </button>
                      </div>
                    ))}
                  </div>
                  <p className="mt-2 text-xs text-slate-500">重複しているレンズを統合すると、同じレンズ名で管理できます。</p>
                </div>
              )}
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
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700">レンズの特徴・コメント</label>
              <textarea value={draft.comment || ''} onChange={(e) => setDraft({ ...draft, comment: e.target.value })} className="h-24 w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm" placeholder="特徴や補足コメントを入力" />
            </div>
            <div className="flex gap-3 pt-2">
              <button type="button" onClick={saveDraft} disabled={saving} className="rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white">{saving ? '保存中...' : '保存'}</button>
              <button type="button" onClick={() => { startNew(); setMessage(''); }} className="rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700">キャンセル</button>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-6 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm sm:mt-8 sm:p-6">
        <h3 className="text-lg font-bold text-slate-800">プレビュー</h3>
        <div className="mt-4 rounded-[28px] border border-slate-200 bg-slate-50 p-4">
          <div className="grid gap-4 sm:gap-6 md:grid-cols-[180px_minmax(0,1fr)]">
            <div className="flex items-center justify-center rounded-3xl border border-slate-200 bg-white p-4">
              {preview.imageUrl ? <img src={preview.imageUrl} alt={preview.name} className="aspect-square w-full max-w-[140px] object-cover sm:max-w-[160px]" /> : <div className="flex aspect-square w-full max-w-[140px] items-center justify-center rounded-2xl border border-dashed border-slate-200 text-slate-400 sm:max-w-[160px]">No Image</div>}
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
