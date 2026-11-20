export const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

export type AllowedImageType = "image/jpeg" | "image/png" | "image/webp";

export const ALLOWED_MIME_TYPES: readonly string[] = [
    "image/jpeg",
    "image/png",
    "image/webp",
];

export const ALLOWED_EXTENSIONS: readonly string[] = [
    ".jpg",
    ".jpeg",
    ".png",
    ".webp",
];

export const EXPECTED_MIMES_FOR_EXT: Record<string, AllowedImageType> = {
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".png": "image/png",
    ".webp": "image/webp",
};

/**
 * Validates file buffer magic bytes against allowed image formats (JPEG, PNG, WebP).
 * Explicitly rejects SVG (XML) and any non-image or disguised content.
 */
export function detectImageFormat(buffer: Buffer): AllowedImageType | null {
    if (!buffer || buffer.length < 12) {
        return null;
    }

    // PNG: 89 50 4E 47 0D 0A 1A 0A
    if (
        buffer[0] === 0x89 &&
        buffer[1] === 0x50 &&
        buffer[2] === 0x4e &&
        buffer[3] === 0x47 &&
        buffer[4] === 0x0d &&
        buffer[5] === 0x0a &&
        buffer[6] === 0x1a &&
        buffer[7] === 0x0a
    ) {
        return "image/png";
    }

    // JPEG: FF D8 FF
    if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
        return "image/jpeg";
    }

    // WebP: RIFF (bytes 0-3) + WEBP (bytes 8-11)
    if (
        buffer[0] === 0x52 &&
        buffer[1] === 0x49 &&
        buffer[2] === 0x46 &&
        buffer[3] === 0x46 &&
        buffer[8] === 0x57 &&
        buffer[9] === 0x45 &&
        buffer[10] === 0x42 &&
        buffer[11] === 0x50
    ) {
        return "image/webp";
    }

    return null;
}
