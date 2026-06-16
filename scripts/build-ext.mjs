/**
 * ============================================
 * 浏览器扩展打包脚本
 * ============================================
 *
 * 使用: node scripts/build-ext.mjs
 * 或: npm run build:ext
 *
 * 流程:
 *   1. Vite 构建（vite.config.ext.ts）
 *   2. 复制 manifest.json / newtab.html 到产物目录
 *   3. 生成/复制扩展图标
 */

import { copyFile, writeFile } from "node:fs/promises";
import { existsSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";
import { execSync } from "node:child_process";

// 使用 process.cwd() 获取项目根目录（更可靠）
const ROOT = resolve(process.cwd());
const DIST = resolve(ROOT, "dist-ext");
const PUBLIC = resolve(ROOT, "public");

console.log("📦 Terminal Startpage - 浏览器扩展打包\n");

// --- Step 1: 确保输出目录存在 ---
function ensureDir(dir) {
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
}

ensureDir(DIST);
ensureDir(resolve(DIST, "icons"));

// --- Step 2: 运行 Vite 构建 ---
console.log("▶ 正在构建...");
try {
  execSync("npx vite build --config vite.config.ext.ts", {
    cwd: ROOT,
    stdio: "inherit",
    shell: true,
  });
} catch {
  console.error("\n❌ Vite 构建失败");
  process.exit(1);
}

// --- Step 3: 复制扩展必需文件 ---
console.log("\n▶ 复制扩展文件...");

await copyFile(
  resolve(PUBLIC, "manifest.json"),
  resolve(DIST, "manifest.json"),
);
console.log("  ✓ manifest.json");

await copyFile(resolve(PUBLIC, "newtab.html"), resolve(DIST, "newtab.html"));
console.log("  ✓ newtab.html");

// --- Step 4: 图标处理 ---
// Vite emptyOutDir 可能已删除子目录，重新创建
ensureDir(resolve(DIST, "icons"));
const iconSizes = [16, 48, 128];
for (const size of iconSizes) {
  const srcPath = resolve(PUBLIC, `icons/icon-${size}.png`);
  if (existsSync(srcPath)) {
    await copyFile(srcPath, resolve(DIST, `icons/icon-${size}.png`));
  } else {
    // 自动生成终端风格 PNG 图标（纯绿色方块 + T 字母）
    await generatePngIcon(size);
  }
}
console.log("  ✓ icons/ (icon-16.png, icon-48.png, icon-128.png)");

// --- Step 5: 验证产物 ---
console.log("\n▶ 验证产物结构...");
const requiredFiles = [
  "manifest.json",
  "newtab.html",
  "icons/icon-16.png",
  "icons/icon-48.png",
  "icons/icon-128.png",
];

let allOk = true;
for (const file of requiredFiles) {
  if (!existsSync(resolve(DIST, file))) {
    console.error(`  ✗ 缺少: ${file}`);
    allOk = false;
  }
}

if (!allOk) {
  console.error("\n❌ 构建不完整！");
  process.exit(1);
}

console.log("  ✓ 所有必需文件就绪\n");

// --- 完成 ---
console.log(`╔══════════════════════════════════════════╗`);
console.log(`║                                          ║`);
console.log(`║  ✅ 扩展打包完成！                       ║`);
console.log(`║                                          ║`);
console.log(`║  📁 产物目录: dist-ext/                  ║`);
console.log(`║                                          ║`);
console.log(`║  安装步骤:                               ║`);
console.log(`║  1. 打开 chrome://extensions/            ║`);
console.log(`║  2. 开启右上角"开发者模式"               ║`);
console.log(`║  3. 点击"加载已解压的扩展程序"           ║`);
console.log(`║  4. 选择 dist-ext 目录                   ║`);
console.log(`║  5. 打开新标签页即可使用                 ║`);
console.log(`║                                          ║`);
console.log(`╚══════════════════════════════════════════╝`);

// ============================================
// PNG 图标生成器（无外部依赖）
// 生成终端风格的绿色方块图标
// ============================================
async function generatePngIcon(size) {
  const outPath = resolve(DIST, `icons/icon-${size}.png`);

  const pixels = new Uint8Array(size * size * 4);
  const bgR = 10,
    bgG = 10,
    bgB = 10; // #0a0a0a 深色背景
  const fgR = 0,
    fgG = 255,
    fgB = 0; // #00ff00 终端绿
  const borderR = 0,
    borderG = 180,
    borderB = 0; // 边框深绿

  const radius = Math.floor(size * 0.18);
  const borderW = Math.max(1, Math.floor(size * 0.04));

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const idx = (y * size + x) * 4;

      const inRect = isInRoundedRect(x, y, size, size, radius);
      const inInnerRect = isInRoundedRect(
        x,
        y,
        size - borderW * 2,
        size - borderW * 2,
        radius - borderW,
      );

      if (!inRect) {
        pixels[idx] = pixels[idx + 1] = pixels[idx + 2] = pixels[idx + 3] = 0;
      } else if (!inInnerRect) {
        pixels[idx] = borderR;
        pixels[idx + 1] = borderG;
        pixels[idx + 2] = borderB;
        pixels[idx + 3] = 255;
      } else {
        const cx = size / 2,
          cy = size / 2;
        const isText = drawT(x, y, cx, cy, size);

        if (isText) {
          pixels[idx] = fgR;
          pixels[idx + 1] = fgG;
          pixels[idx + 2] = fgB;
          pixels[idx + 3] = 255;
        } else {
          pixels[idx] = bgR;
          pixels[idx + 1] = bgG;
          pixels[idx + 2] = bgB;
          pixels[idx + 3] = 255;
        }
      }
    }
  }

  const pngData = encodePNG(pixels, size, size);
  await writeFile(outPath, Buffer.from(pngData));
}

function isInRoundedRect(px, py, w, h, r) {
  const ox = w % 2 === 0 ? 0 : 0.5;
  const oy = h % 2 === 0 ? 0 : 0.5;
  const x = px - w / 2 + ox;
  const y = py - h / 2 + oy;

  if (x < 0 && y < 0) return x * x + y * y <= r * r;
  if (x > 0 && y < 0) return x * x + y * y <= r * r;
  if (x < 0 && y > 0) return x * x + y * y <= r * r;
  if (x > 0 && y > 0) return x * x + y * y <= r * r;

  return Math.abs(x) <= w / 2 && Math.abs(y) <= h / 2;
}

function drawT(px, py, cx, cy, size) {
  const thickness = Math.max(1, Math.floor(size * 0.15));
  const height = Math.floor(size * 0.45);
  const width = Math.floor(size * 0.35);
  const topY = cy - height / 2;

  if (
    py >= topY &&
    py <= topY + thickness &&
    px >= cx - width / 2 &&
    px <= cx + width / 2
  ) {
    return true;
  }
  if (
    py >= topY &&
    py <= topY + height &&
    px >= cx - thickness / 2 &&
    px <= cx + thickness / 2
  ) {
    return true;
  }
  return false;
}

/** 最小化 PNG 编码器 */
function encodePNG(pixels, width, height) {
  const signature = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]);

  const ihdrData = new Uint8Array(13);
  const dv = new DataView(ihdrData.buffer);
  dv.setUint32(0, width);
  dv.setUint32(4, height);
  ihdrData[8] = 8;
  ihdrData[9] = 6;
  ihdrData[10] = 0;
  ihdrData[11] = 0;
  ihdrData[12] = 0;

  const ihdrChunk = makeChunk("IHDR", ihdrData);

  const rawData = new Uint8Array(height * (1 + width * 4));
  for (let y = 0; y < height; y++) {
    rawData[y * (1 + width * 4)] = 0;
    for (let x = 0; x < width * 4; x++) {
      rawData[y * (1 + width * 4) + 1 + x] = pixels[y * width * 4 + x];
    }
  }

  const compressed = deflate(rawData);
  const idatChunk = makeChunk("IDAT", compressed);
  const iendChunk = makeChunk("IEND", new Uint8Array(0));

  const result = new Uint8Array(
    signature.length + ihdrChunk.length + idatChunk.length + iendChunk.length,
  );
  let offset = 0;
  result.set(signature, offset);
  offset += signature.length;
  result.set(ihdrChunk, offset);
  offset += ihdrChunk.length;
  result.set(idatChunk, offset);
  offset += idatChunk.length;
  result.set(iendChunk, offset);

  return result;
}

function makeChunk(type, data) {
  const typeBytes = new TextEncoder().encode(type);
  const length = data.length;
  const totalLength = 12 + length;

  const chunk = new Uint8Array(totalLength);
  const dv = new DataView(chunk.buffer);
  dv.setUint32(0, length);
  chunk.set(typeBytes, 4);
  chunk.set(data, 8);

  const crc = crc32(new Uint8Array([...typeBytes, ...data]));
  dv.setUint32(8 + length, crc);

  return chunk;
}

function crc32(data) {
  let crc = 0xffffffff;
  const table = makeCRCTable();

  for (let i = 0; i < data.length; i++) {
    crc = table[(crc ^ data[i]) & 0xff] ^ (crc >>> 8);
  }

  return (crc ^ 0xffffffff) >>> 0;
}

function makeCRCTable() {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[n] = c;
  }
  return table;
}

function deflate(data) {
  const blocks = [];
  let offset = 0;

  while (offset < data.length) {
    const blockSize = Math.min(65535, data.length - offset);
    const block = new Uint8Array(blockSize + 5);

    block[0] = offset + blockSize >= data.length ? 0x01 : 0x00;
    block[1] = blockSize & 0xff;
    block[2] = (blockSize >> 8) & 0xff;
    block[3] = ~blockSize & 0xff;
    block[4] = (~blockSize >> 8) & 0xff;
    block.set(data.subarray(offset, offset + blockSize), 5);
    blocks.push(block);
    offset += blockSize;
  }

  const totalLen = blocks.reduce((sum, b) => sum + b.length, 0) + 6;
  const result = new Uint8Array(totalLen);

  result[0] = 0x78;
  result[1] = 0x01;

  let pos = 2;
  for (const block of blocks) {
    result.set(block, pos);
    pos += block.length;
  }

  const checksum = adler32(data);
  result[pos++] = (checksum >>> 24) & 0xff;
  result[pos++] = (checksum >>> 16) & 0xff;
  result[pos++] = (checksum >>> 8) & 0xff;
  result[pos++] = checksum & 0xff;

  return result;
}

function adler32(data) {
  let a = 1,
    b = 0;
  const MOD = 65521;

  for (let i = 0; i < data.length; i++) {
    a = (a + data[i]) % MOD;
    b = (b + a) % MOD;
  }

  return ((b << 16) | a) >>> 0;
}
