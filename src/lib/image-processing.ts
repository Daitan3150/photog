import sharp from 'sharp';

export async function resizeImage(inputPath: string, outputPath: string, maxWidth: number = 2500, maxHeight: number = 2500): Promise<void> {
    await sharp(inputPath)
        .resize({
            width: maxWidth,
            height: maxHeight,
            fit: 'inside',
            withoutEnlargement: true,
        })
        .jpeg({ quality: 90, progressive: true })
        .toFile(outputPath);
}

export async function resizeImageBuffer(buffer: Buffer, maxWidth: number = 2500, maxHeight: number = 2500): Promise<Buffer> {
    return await sharp(buffer)
        .resize({
            width: maxWidth,
            height: maxHeight,
            fit: 'inside',
            withoutEnlargement: true,
        })
        .toBuffer();
}
