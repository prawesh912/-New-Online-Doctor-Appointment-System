import sharp from "sharp";
import fs from "fs/promises";

export const processAndSaveImage = async (tempPath, finalPath) => {
    let quality = 80;
    let buffer;

    do {
        buffer = await sharp(tempPath)
            .rotate()
            .resize({ width: 512, withoutEnlargement: true })
            .jpeg({ quality, mozjpeg: true })
            .toBuffer();

        quality -= 10;
    } while (buffer.length > 100 * 1024 && quality > 30);

    await fs.writeFile(finalPath, buffer);
    await fs.unlink(tempPath);
};