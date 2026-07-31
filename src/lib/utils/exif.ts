/**
 * 📸 シャッタースピードを分数または整数の形式に変換するユーティリティ
 * 
 * @param exposureTime 数値（例: 0.004, 0.5, 1.0）
 * @returns 文字列（例: "1/250", "1/2", "1"）
 */
export function formatShutterSpeed(exposureTime: number | string | null | undefined): string {
    if (exposureTime === null || exposureTime === undefined || exposureTime === '') return '';

    // 既に分数（1/x）の形式である場合はそのまま返す
    if (typeof exposureTime === 'string' && exposureTime.includes('/')) {
        return exposureTime;
    }

    const num = typeof exposureTime === 'string' ? parseFloat(exposureTime) : exposureTime;
    if (isNaN(num) || num <= 0) return String(exposureTime);

    // 1秒以上の整数の場合
    if (num >= 1 && Number.isInteger(num)) {
        return num.toString();
    }

    // 1秒未満の場合、分数（1/x）に変換を試みる
    if (num < 1) {
        const reciprocal = 1 / num;
        // 逆数がほぼ整数の場合（誤差を許容）
        if (Math.abs(reciprocal - Math.round(reciprocal)) < 0.01) {
            return `1/${Math.round(reciprocal)}`;
        }
        // それ以外は小数点第3位まで（通常は起こりにくいがフォールバック）
        return num.toFixed(3).replace(/\.?0+$/, '');
    }

    // 1秒以上の小数の場合（例: 1.5s）
    return num.toString();
}

/**
 * シャッタースピードの入力バリデーション
 * 許可される形式: "1/250", "1", "13" など
 */
export function validateShutterSpeed(value: string): boolean {
    if (!value) return true;
    // 分数形式 "1/250", "1/1.3", "13/10" など
    if (/^\d+(\.\d+)?\/\d+(\.\d+)?$/.test(value)) return true;
    // 小数・整数形式 "1", "0.5", "10" など
    if (/^\d+(\.\d+)?$/.test(value)) return true;
    return false;
}

/**
 * 標準的なF値リスト (1/3段刻み)
 */
export const STANDARD_APERTURES = [
    '0.95', '1.0', '1.1', '1.2', '1.4', '1.6', '1.8', '2.0',
    '2.2', '2.5', '2.8', '3.2', '3.5', '4.0', '4.5', '5.0',
    '5.6', '6.3', '7.1', '8.0', '9.0', '10', '11', '13',
    '14', '16', '18', '20', '22'
];

/**
 * レンズ名から最小F値（開放F値）を推測する
 * 例: "FE 35mm F1.4 GM" -> 1.4, "50mm 1:1.8" -> 1.8
 */
export function getMinApertureFromLens(lensModel: string | null | undefined): number {
    if (!lensModel) return 0.95; // デフォルトは最小の0.95を返す（すべて表示）

    // F値らしいパターンを抽出 (例: F1.4, f/2.8, 1:1.8, F 1.4)
    const match = lensModel.match(/(?:[Ff]\/?\s*|1:)(\d+(?:\.\d+)?)/);

    if (match && match[1]) {
        const minAperture = parseFloat(match[1]);
        if (!isNaN(minAperture)) {
            // STANDARD_APERTURES の中で、抽出した値に最も近い(または等しい)値を下限とする
            // 多少のパース誤差を考慮
            return minAperture;
        }
    }

    return 0.95; // 判別できない場合はデフォルト
}

/**
 * 📅 EXIF の日付（YYYY:MM:DD HH:MM:SS や Date オブジェクト、ISO文字列）を安全に Date にパースする
 * 
 * @param rawDate EXIFから取得した生の日付データ
 * @returns 有効な Date オブジェクト、パース不可時は null
 */
export function parseExifDate(rawDate: any): Date | null {
    if (!rawDate) return null;

    if (rawDate instanceof Date) {
        return isNaN(rawDate.getTime()) ? null : rawDate;
    }

    if (typeof rawDate === 'number') {
        const d = new Date(rawDate);
        return isNaN(d.getTime()) ? null : d;
    }

    if (typeof rawDate !== 'string') return null;

    const str = rawDate.trim();
    if (!str) return null;

    // 1. "YYYY:MM:DD HH:MM:SS" または "YYYY:MM:DD" フォーマットをハイフン区切りに置換
    // 例: "2026:07:31 20:00:00" -> "2026-07-31T20:00:00"
    let normalized = str;
    const exifDateMatch = str.match(/^(\d{4}):(\d{2}):(\d{2})(?:\s+(\d{2}):(\d{2}):(\d{2}))?/);
    if (exifDateMatch) {
        const [, year, month, day, hour = '12', minute = '00', second = '00'] = exifDateMatch;
        normalized = `${year}-${month}-${day}T${hour}:${minute}:${second}.000Z`;
    } else if (str.includes(' ') && !str.includes('T')) {
        normalized = str.replace(' ', 'T');
    }

    const d = new Date(normalized);
    if (!isNaN(d.getTime())) return d;

    // ハイフン単純置換での再試行
    const fallback = new Date(str.replace(/:/g, '-'));
    return isNaN(fallback.getTime()) ? null : fallback;
}


