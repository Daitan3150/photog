export type CameraType = 'mirrorless' | 'dslr' | 'compact' | 'film' | 'other';

export const CAMERA_TYPE_LABELS: Record<CameraType, string> = {
    mirrorless: 'ミラーレス一眼',
    dslr: 'デジタル一眼レフ',
    compact: 'コンパクトカメラ',
    film: 'フィルムカメラ',
    other: 'その他'
};

export function inferCameraType(model: string, make?: string): CameraType {
    const modelLower = (model || '').toLowerCase().trim();
    const makeLower = (make || '').toLowerCase().trim();

    if (!modelLower) return 'other';

    // 1. コンパクトカメラ (RICOH GR, Sony RX100 シリーズ, Canon PowerShot, Fuji X100/X30/X20/X10, Lumix LX100 等)
    if (
        modelLower.includes('gr iii') ||
        modelLower.includes('gr ii') ||
        modelLower.includes('gr 3') ||
        modelLower.includes('gr 2') ||
        modelLower.includes('rx100') ||
        modelLower.includes('dsc-rx1') || // RX1 / RX1R / RX1R II (Full Frame Compact)
        modelLower.includes('powershot') ||
        modelLower.includes('coolpix') ||
        modelLower.includes('finepix') ||
        modelLower.includes('x100') ||    // X100F, X100V, X100VI 等はコンパクトカメラ
        modelLower.includes('x30') ||
        modelLower.includes('x20') ||
        modelLower.includes('x10') ||
        modelLower.includes('lx100')
    ) {
        return 'compact';
    }

    // 2. ミラーレス一眼 (Sony ILCE/ZV-E/NEX, Canon EOS R/Kiss M, Nikon Z, Fujifilm X/GFX (X100を除く), Lumix DC-G/S)
    if (
        modelLower.startsWith('ilce-') || // Sony α シリーズ
        modelLower.startsWith('zv-e') ||   // Sony ZV-E10, ZV-E1 等
        modelLower.startsWith('nex-') ||   // Sony NEX
        modelLower.startsWith('eos r') ||   // Canon EOS R シリーズ
        modelLower.startsWith('eos kiss m') ||
        modelLower.startsWith('eos m') ||
        (makeLower.includes('nikon') && modelLower.startsWith('z')) || // Nikon Z
        modelLower.includes('gfx') ||      // Fujifilm 中判
        (makeLower.includes('fujifilm') && (
            modelLower.startsWith('x-') || 
            modelLower.includes('xt') || 
            modelLower.includes('xh') || 
            modelLower.includes('pro3') || 
            modelLower.includes('pro2') || 
            modelLower.includes('xe') ||
            modelLower.includes('xs10') ||
            modelLower.includes('xs20')
        )) ||
        modelLower.startsWith('dc-g') ||   // Lumix G
        modelLower.startsWith('dc-s') ||   // Lumix S
        modelLower.startsWith('dmc-g') ||  // Lumix G (旧)
        modelLower.startsWith('pen ') ||    // Olympus PEN
        modelLower.startsWith('om-d') ||   // Olympus OM-D
        modelLower.startsWith('e-m')       // Olympus E-M
    ) {
        return 'mirrorless';
    }

    // 3. デジタル一眼レフ (Canon EOS *D, Nikon D*)
    if (
        modelLower.includes('eos 5d') ||
        modelLower.includes('eos 6d') ||
        modelLower.includes('eos 7d') ||
        modelLower.includes('eos 80d') ||
        modelLower.includes('eos 90d') ||
        modelLower.includes('eos kiss x') ||
        (makeLower.includes('nikon') && /^d[0-9]{3,4}/.test(modelLower)) // Nikon D750, D850, D5600 など
    ) {
        return 'dslr';
    }

    // 4. フィルムカメラ
    if (
        modelLower.includes('film') ||
        modelLower.includes('f3') ||
        modelLower.includes('f2') ||
        modelLower.includes('fm2') ||
        modelLower.includes('ae-1') ||
        modelLower.includes('autoboy') ||
        modelLower.includes('compact film')
    ) {
        return 'film';
    }

    return 'other';
}
