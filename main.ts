// Ember Phoenix — ai-excited-01 entry.
//
// The image lives in this repository as entry.png. This program's only job
// is to place an exact copy of it at <output>/entry.png, where <output> is
// the directory named by MAKEFUN_OUTPUT_DIR, or /output when that variable
// is not set. The copy is byte for byte, so every run writes the same file.
//
// Node 22, standard library only. No network, no input besides the image
// file sitting next to this program.

import { copyFileSync, existsSync, mkdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const IMAGE_NAME = "entry.png";
const MAX_BYTES = 1_048_576;

// A whole JPEG starts with SOI (FF D8) and ends with EOI (FF D9). The gate
// only accepts a whole image, so refuse to copy a truncated file rather
// than ship a broken entry.
function isWholeJpeg(data: Buffer): boolean {
  if (data.length < 4) return false;
  const starts = data[0] === 0xff && data[1] === 0xd8;
  const ends = data[data.length - 2] === 0xff && data[data.length - 1] === 0xd9;
  return starts && ends;
}

function resolveOutputDir(): string {
  const envDir = process.env.MAKEFUN_OUTPUT_DIR;
  if (envDir !== undefined && envDir.trim() !== "") {
    return envDir;
  }
  return "/output";
}

function main(): void {
  const here = dirname(fileURLToPath(import.meta.url));
  const sourcePath = join(here, IMAGE_NAME);

  if (!existsSync(sourcePath)) {
    throw new Error(`entry image not found beside this program: ${sourcePath}`);
  }

  const image = readFileSync(sourcePath);
  if (image.length > MAX_BYTES) {
    throw new Error(`entry image is ${image.length} bytes, over the 1 MiB cap`);
  }
  if (!isWholeJpeg(image)) {
    throw new Error(`entry image is not a whole JPEG file: ${sourcePath}`);
  }

  const outDir = resolveOutputDir();
  mkdirSync(outDir, { recursive: true });

  const destination = join(outDir, IMAGE_NAME);
  copyFileSync(sourcePath, destination);

  const copied = statSync(destination);
  if (copied.size !== image.length) {
    throw new Error(`copied ${copied.size} bytes, expected ${image.length}`);
  }

  // Re-read the destination and confirm it is still a whole JPEG: a copy
  // that silently truncated would pass the size check above only by luck,
  // so verify the markers on the file that actually ships.
  const shipped = readFileSync(destination);
  if (!isWholeJpeg(shipped)) {
    throw new Error(`copied file is not a whole JPEG: ${destination}`);
  }
  console.log(`wrote ${destination} (${copied.size} bytes)`);
}

main();
