export interface Camera {
    id?: string;
    make: string;        // メーカー (Sony, Canon, etc.)
    name: string;        // 名前/型番 (ILCE-7M4, GR III, etc.)
    type: 'mirrorless' | 'dslr' | 'compact' | 'film' | 'other'; // 種類
    sensorSize: string;  // センサーサイズ (フルサイズ, APS-C, マイクロフォーサーズ, 1インチ, 中判, 35mmフィルム, etc.)
    releasedYear?: number | null; // 発売年
    isRegistered: boolean; // 正式登録済みフラグ
    createdAt?: Date;
    updatedAt?: Date;
}

export type CameraFormData = Omit<Camera, 'id' | 'createdAt' | 'updatedAt'>;
