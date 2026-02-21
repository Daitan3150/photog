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
    // 分数形式 "1/125"
    if (/^1\/\d+$/.test(value)) return true;
    // 整数形式 "1", "10"
    if (/^\d+$/.test(value)) return true;
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

