import { writeFile, mkdir, access } from "fs/promises";
import { join } from "path";
import { randomUUID } from "crypto";

const IMAGE_DIR = join(process.cwd(), "public", "listing-images");

// Detect if filesystem is writable (Vercel serverless is read-only except /tmp)
let _fsWritable: boolean | null = null;
async function isFsWritable() {
  if (_fsWritable !== null) return _fsWritable;
  try {
    await access(IMAGE_DIR);
    await mkdir(IMAGE_DIR, { recursive: true });
    // Try a write test
    const testFile = join(IMAGE_DIR, `.write-test-${Date.now()}`);
    await writeFile(testFile, "test");
    const { unlink } = await import("fs/promises");
    await unlink(testFile);
    _fsWritable = true;
  } catch {
    _fsWritable = false;
  }
  return _fsWritable;
}

/**
 * Save a single base64 data URL to a local file.
 * Returns the public path like "/listing-images/abc123.jpg".
 * If the input is already a local path (starts with "/"), returns it as-is.
 * If the input is an external URL, downloads and saves locally.
 * On read-only filesystems (Vercel), keeps the original input (base64 or URL).
 */
export async function saveImageToLocal(input: string): Promise<string> {
  if (!input) return "";

  // Already a local path
  if (input.startsWith("/listing-images/") || input.startsWith("/cat-icons/")) {
    return input;
  }

  const writable = await isFsWritable();

  // Base64 data URL: "data:image/jpeg;base64,/9j/4AAQ..."
  if (input.startsWith("data:")) {
    if (!writable) return input; // Vercel: keep base64 as-is
    await mkdir(IMAGE_DIR, { recursive: true });
    const match = input.match(/^data:(image\/\w+);base64,(.+)$/);
    if (!match) return input;

    const mime = match[1];
    const base64 = match[2];
    const ext = mimeToExt(mime);
    const filename = `${randomUUID().slice(0, 12)}.${ext}`;
    const filepath = join(IMAGE_DIR, filename);

    const buffer = Buffer.from(base64, "base64");
    await writeFile(filepath, buffer);

    return `/listing-images/${filename}`;
  }

  // External URL (https://...): keep as-is (already hosted)
  if (input.startsWith("https://") || input.startsWith("http://")) {
    return input;
  }

  // Unknown format — return as-is
  return input;
}

/**
 * Save multiple images to local storage.
 * Handles mixed input: base64, external URLs, and local paths.
 */
export async function saveImagesToLocal(images: string[]): Promise<string[]> {
  const results = await Promise.all(images.map(saveImageToLocal));
  return results.filter(Boolean);
}

function mimeToExt(mime: string): string {
  if (mime.includes("png")) return "png";
  if (mime.includes("webp")) return "webp";
  if (mime.includes("gif")) return "gif";
  return "jpg";
}
