'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/admin/AuthProvider';
import { savePhoto } from '@/lib/actions/photos';
import { getSubjects, Subject } from '@/lib/actions/subjects';
import { CldUploadWidget } from 'next-cloudinary';
import Image from 'next/image';
import CloudinaryScript from '@/components/admin/CloudinaryScript';

export default function NewPhotoPage() {
    const { user } = useAuth();
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [widgetLoaded, setWidgetLoaded] = useState(false);
    const [imageUrl, setImageUrl] = useState('');
    const [publicId, setPublicId] = useState('');

    // Form States
    const [title, setTitle] = useState('');
    const [subjectName, setSubjectName] = useState('');
    const [location, setLocation] = useState('');
    const [shotAt, setShotAt] = useState(new Date().toISOString().split('T')[0]);
    const [snsUrl, setSnsUrl] = useState('');
    const [displayMode, setDisplayMode] = useState<'title' | 'character'>('title');
    const [message, setMessage] = useState('');
    const [subjects, setSubjects] = useState<Subject[]>([]);

    useEffect(() => {
        const loadInitialData = async () => {
            if (!user) {
                router.push('/admin/login');
                return;
            }

            try {
                // Fetch subjects for autocomplete
                const subResult = await getSubjects();
                if (subResult.success) setSubjects(subResult.data);

                // [AUTO-POPULATE] Fetch my profile to set subjectName and snsUrl
                const idToken = await user.getIdToken();
                const { getMyProfile } = await import('@/lib/actions/users');
                const profileResult = await getMyProfile(idToken);

                if (profileResult.success && profileResult.data) {
                    const profileData = profileResult.data;
                    // Set displayName as subjectName
                    if (profileData.displayName) {
                        setSubjectName(profileData.displayName);
                    }
                    // Set first SNS link
                    if (profileData.snsLinks && profileData.snsLinks.length > 0) {
                        setSnsUrl(profileData.snsLinks[0].value);
                    }
                }
            } catch (error) {
                console.error('Error loading initial dashboard data:', error);
            }
        };

        if (user) {
            loadInitialData();
        }
    }, [user, router]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!imageUrl || !user) return;

        setLoading(true);
        setMessage('');
        try {
            const idToken = await user.getIdToken();
            const result = await savePhoto({
                url: imageUrl,
                publicId: publicId,
                title: title || '',
                subjectName: subjectName || '',
                location: location || '',
                shotAt: shotAt,
                snsUrl: snsUrl || '',
                categoryId: '', // Models don't need to select category
                displayMode: displayMode
            }, idToken);

            if (result.success) {
                setMessage('✅ 写真を保存しました！一覧ページに移動します...');
                setTimeout(() => {
                    router.push('/dashboard/photos');
                }, 1500);
            } else {
                setMessage('❌ 保存に失敗しました: ' + result.error);
            }
        } catch (error) {
            console.error(error);
            setMessage('エラーが発生しました。');
        }
        setLoading(false);
    };

    const openWidget = () => {
        if (!(window as any).cloudinary || !widgetLoaded) {
            alert('アップロードウィジェットがまだ準備できていません。少しお待ちください。');
            return;
        }

        const widget = (window as any).cloudinary.createUploadWidget(
            {
                cloudName: 'ds4prfv5z',
                uploadPreset: 'portfolio_upload',
                sources: ['local', 'camera', 'url'],
                defaultSource: 'local',
                multiple: false,
                maxFiles: 1,
                // Image optimization
                clientAllowedFormats: ['jpg', 'jpeg', 'png', 'webp'],
                maxImageFileSize: 30000000, // 30MB max
                maxImageWidth: 2500,
                maxImageHeight: 2500,
                cropping: true,
                croppingAspectRatio: 2 / 3,
                croppingShowDimensions: true,
                showSkipCropButton: false,
                folder: 'model_photos',
                language: 'ja',
                styles: {
                    palette: {
                        window: "#0F172A",
                        sourceBg: "#1E293B",
                        windowBorder: "#334155",
                        tabIcon: "#38BDF8",
                        inactiveTabIcon: "#94A3B8",
                        menuIcons: "#F1F5F9",
                        link: "#38BDF8",
                        action: "#3B82F6",
                        inProgress: "#0EA5E9",
                        complete: "#10B981",
                        error: "#EF4444",
                        textLight: "#F1F5F9",
                        textDark: "#0F172A"
                    },
                    fonts: {
                        default: null,
                        "'Outfit', sans-serif": "https://fonts.googleapis.com/css2?family=Outfit:wght@400;600&display=swap"
                    }
                }
            },
            (error: any, result: any) => {
                if (!error && result && result.event === 'success') {
                    setImageUrl(result.info.secure_url);
                    setPublicId(result.info.public_id);
                }
            }
        );
        widget.open();
    };

    return (
        <div className="max-w-4xl mx-auto py-10 px-4">
            <CloudinaryScript onLoad={() => setWidgetLoaded(true)} />

            <h1 className="text-2xl font-bold mb-6">新しい写真を投稿</h1>

            <form onSubmit={handleSubmit} className="space-y-6 bg-white p-6 rounded-lg shadow">
                {/* Image Upload */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">写真 (必須)</label>
                    <div
                        onClick={openWidget}
                        className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center cursor-pointer hover:bg-gray-50 transition"
                    >
                        {imageUrl ? (
                            <div className="relative aspect-[2/3] w-full max-w-xs mx-auto">
                                <Image
                                    src={imageUrl}
                                    alt="Preview"
                                    fill
                                    className="object-cover rounded"
                                />
                            </div>
                        ) : (
                            <div className="py-10 text-gray-400">
                                <span className="text-4xl block mb-2">📷</span>
                                <span>クリックして写真を選択</span>
                            </div>
                        )}
                    </div>
                </div>

                {/* Display Mode Selection */}
                <div className="space-y-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
                    <label className="block text-sm font-bold text-gray-700 mb-2">表示モードの選択 (A または B)</label>
                    <div className="flex gap-4">
                        <label className={`flex-1 flex items-center justify-center gap-2 p-3 rounded-lg border-2 cursor-pointer transition-all ${displayMode === 'title' ? 'bg-blue-50 border-blue-500 text-blue-700' : 'bg-white border-gray-200 text-gray-400'}`}>
                            <input
                                type="radio"
                                name="displayMode"
                                value="title"
                                checked={displayMode === 'title'}
                                onChange={() => setDisplayMode('title')}
                                className="hidden"
                            />
                            <span className="font-bold text-sm">A: タイトルを表示</span>
                        </label>
                        <label className={`flex-1 flex items-center justify-center gap-2 p-3 rounded-lg border-2 cursor-pointer transition-all ${displayMode === 'character' ? 'bg-indigo-50 border-indigo-500 text-indigo-700' : 'bg-white border-gray-200 text-gray-400'}`}>
                            <input
                                type="radio"
                                name="displayMode"
                                value="character"
                                checked={displayMode === 'character'}
                                onChange={() => setDisplayMode('character')}
                                className="hidden"
                            />
                            <span className="font-bold text-sm">B: キャラクター名を表示</span>
                        </label>
                    </div>
                </div>

                {/* Title */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">タイトル (任意)</label>
                    <input
                        type="text"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        placeholder="写真のタイトルやコメント"
                        className="w-full border p-2 rounded"
                    />
                </div>

                {/* Subject Name */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">モデル名 (任意)</label>
                    <input
                        type="text"
                        list="subject-candidates"
                        value={subjectName}
                        onChange={(e) => {
                            const newValue = e.target.value;
                            setSubjectName(newValue);
                            // Auto-populate SNS URL if exact match
                            const matchedSubject = subjects.find(s => s.name === newValue);
                            if (matchedSubject?.snsUrl) {
                                setSnsUrl(matchedSubject.snsUrl);
                            }
                        }}
                        placeholder="モデル名"
                        className="w-full border p-2 rounded"
                    />
                    <datalist id="subject-candidates">
                        {subjects.map((s) => (
                            <option key={s.id} value={s.name} />
                        ))}
                    </datalist>
                </div>

                {/* Location */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">撮影場所 (任意)</label>
                    <input
                        type="text"
                        value={location}
                        onChange={(e) => setLocation(e.target.value)}
                        placeholder="撮影場所"
                        className="w-full border p-2 rounded"
                    />
                </div>

                {/* Shot Date */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">撮影日 (任意)</label>
                    <input
                        type="date"
                        value={shotAt}
                        onChange={(e) => setShotAt(e.target.value)}
                        className="w-full border p-2 rounded"
                    />
                </div>

                {/* SNS URL */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">SNS URL (任意)</label>
                    <input
                        type="url"
                        value={snsUrl}
                        onChange={(e) => setSnsUrl(e.target.value)}
                        placeholder="https://instagram.com/..."
                        className="w-full border p-2 rounded"
                    />
                </div>

                {message && (
                    <div className={`p-3 rounded ${message.includes('✅') ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                        {message}
                    </div>
                )}

                <div className="flex gap-4 pt-4">
                    <button
                        type="button"
                        onClick={() => router.back()}
                        className="flex-1 bg-gray-200 text-gray-800 py-3 rounded font-bold hover:bg-gray-300 transition"
                    >
                        キャンセル
                    </button>
                    <button
                        type="submit"
                        disabled={loading || !imageUrl}
                        className="flex-1 bg-blue-600 text-white py-3 rounded font-bold hover:bg-blue-700 transition disabled:opacity-50"
                    >
                        {loading ? '送信中...' : '投稿する'}
                    </button>
                </div>
            </form>
        </div>
    );
}
