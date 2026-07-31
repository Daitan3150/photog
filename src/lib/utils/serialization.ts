/**
 * 🛠️ Data Serialization Utilities for Server Actions
 * 
 * Cloudflare Workers (and Next.js Server Actions) require that all data passed
 * between Server and Client are strictly serializable (JSON-compatible).
 * This utility ensures Firestore Timestamps and Date objects are converted to ISO strings.
 */

/**
 * Recursively serializes an object, converting Dates and Firestore Timestamps to ISO strings.
 * Safely handles arrays, nested objects, and binary data types.
 * 
 * @param obj The object or array to serialize
 * @returns A strictly serializable version of the input
 */
export function serializeData(obj: any): any {
    if (obj === undefined) {
        return null;
    }
    if (obj === null) {
        return null;
    }

    // Handle primitive types
    if (typeof obj !== 'object') {
        return obj;
    }

    // Handle Date objects
    if (obj instanceof Date) {
        return obj.toISOString();
    }

    // Handle binary data types (Uint8Array, Buffer, ArrayBuffer, etc.)
    // These are not valid Firestore values and must be skipped or converted
    if (typeof ArrayBuffer !== 'undefined' && obj instanceof ArrayBuffer) {
        return null; // Skip binary data
    }
    if (typeof Uint8Array !== 'undefined' && obj instanceof Uint8Array) {
        return null; // Skip binary data
    }
    if (typeof Buffer !== 'undefined' && Buffer.isBuffer && Buffer.isBuffer(obj)) {
        return null; // Skip binary data
    }
    // Catch all TypedArrays (Int8Array, Uint16Array, Float32Array, etc.)
    if (ArrayBuffer.isView && ArrayBuffer.isView(obj)) {
        return null; // Skip binary data
    }

    // Handle Firestore Timestamps
    if (obj && typeof obj === 'object') {
        // Method 1: has toDate function
        if (typeof obj.toDate === 'function') {
            try {
                return obj.toDate().toISOString();
            } catch (e) {
                return new Date().toISOString();
            }
        }

        // Method 2: has seconds/nanoseconds (common for firestore-admin)
        if (typeof obj.seconds === 'number') {
            return new Date(obj.seconds * 1000).toISOString();
        }
        if (typeof obj._seconds === 'number') {
            return new Date(obj._seconds * 1000).toISOString();
        }
    }

    // Handle Arrays
    if (Array.isArray(obj)) {
        return obj.map(item => serializeData(item)).filter(item => item !== null);
    }

    // Handle Regular Objects
    // Caution: Simple deep copy - doesn't handle circular refs
    const serialized: Record<string, any> = {};
    for (const key of Object.keys(obj)) {
        const val = obj[key];
        // Skip functions and complicated instances
        if (typeof val === 'function') continue;
        const serializedVal = serializeData(val);
        // Skip null values from binary data conversion
        if (serializedVal !== null) {
            serialized[key] = serializedVal;
        }
    }

    return serialized;
}

/**
 * EXIF データを Firestore 保存可能なフラットなオブジェクトに変換する。
 * exifr や Cloudinary が返す EXIF データにはネストされたオブジェクト・バイナリ値・
 * 特殊クラスインスタンスが含まれることがあり、Firestore の nested entity 制限に
 * 引っかかる。この関数はプリミティブ値（string / number / boolean）だけを保持する。
 * 
 * @param exif 生の EXIF データ
 * @returns Firestore に安全に保存できるフラットな EXIF オブジェクト
 */
export function flattenExifForFirestore(exif: any): Record<string, string | number | boolean> | null {
    if (!exif || typeof exif !== 'object') return null;

    // 保持すべき主要 EXIF フィールド（フラットなプリミティブ値のみ）
    const ALLOWED_KEYS = [
        'Make', 'Model', 'LensModel', 'LensMake', 'LensInfo',
        'FNumber', 'ExposureTime', 'ISO', 'ISOSpeedRatings',
        'FocalLength', 'FocalLengthIn35mmFormat',
        'ExposureCompensation', 'ExposureProgram', 'ExposureMode',
        'MeteringMode', 'WhiteBalance', 'Flash',
        'DateTimeOriginal', 'DateTime', 'CreateDate',
        'ImageWidth', 'ImageHeight', 'Orientation',
        'Software', 'Artist', 'Copyright',
        'latitude', 'longitude',
        'ShutterSpeedValue', 'ApertureValue', 'BrightnessValue',
        'ColorSpace', 'SceneCaptureType',
    ];

    const result: Record<string, string | number | boolean> = {};

    for (const key of Object.keys(exif)) {
        const val = exif[key];

        // null/undefined をスキップ
        if (val === null || val === undefined) continue;

        // プリミティブ値のみ受け入れ
        if (typeof val === 'string' || typeof val === 'number' || typeof val === 'boolean') {
            // 許可リストに含まれるか、未知でもプリミティブならOK
            if (ALLOWED_KEYS.includes(key)) {
                result[key] = val;
            }
            continue;
        }

        // Date → ISO文字列
        if (val instanceof Date) {
            if (ALLOWED_KEYS.includes(key)) {
                result[key] = val.toISOString();
            }
            continue;
        }

        // それ以外（オブジェクト、配列、Uint8Array等）はスキップ
    }

    return Object.keys(result).length > 0 ? result : null;
}
