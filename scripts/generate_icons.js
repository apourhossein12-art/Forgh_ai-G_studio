// Script to generate valid PNG and SVG icons for NONONICK Forge PWA
import fs from 'fs';
import path from 'path';
import zlib from 'zlib';

const publicDir = path.resolve('public');
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

// 1. Create Brand SVG
const brandSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#0a0c10" />
      <stop offset="100%" stop-color="#141824" />
    </linearGradient>
    <linearGradient id="primary" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#38bdf8" />
      <stop offset="50%" stop-color="#3b82f6" />
      <stop offset="100%" stop-color="#8b5cf6" />
    </linearGradient>
    <linearGradient id="accent" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#06b6d4" />
      <stop offset="100%" stop-color="#3b82f6" />
    </linearGradient>
  </defs>
  
  <!-- Background with safe zone -->
  <rect width="512" height="512" rx="110" fill="url(#bg)" />
  <rect width="504" height="504" x="4" y="4" rx="106" fill="none" stroke="#222736" stroke-width="4" />
  
  <!-- Terminal / Anvil Forge Emblem -->
  <!-- Outer Hexagon / Anvil Frame -->
  <path d="M 176 128 L 336 128 L 400 192 L 352 304 L 256 384 L 160 304 L 112 192 Z" 
        fill="#121622" stroke="url(#primary)" stroke-width="12" stroke-linejoin="round" />
        
  <!-- Code bracket < / > symbol inside -->
  <path d="M 200 216 L 160 256 L 200 296" fill="none" stroke="#38bdf8" stroke-width="16" stroke-linecap="round" stroke-linejoin="round" />
  <path d="M 312 216 L 352 256 L 312 296" fill="none" stroke="#8b5cf6" stroke-width="16" stroke-linecap="round" stroke-linejoin="round" />
  
  <!-- Central Forge Core Spark / Slash -->
  <line x1="272" y1="210" x2="240" y2="302" stroke="url(#accent)" stroke-width="14" stroke-linecap="round" />
  
  <!-- Core indicator dot -->
  <circle cx="256" cy="168" r="12" fill="#38bdf8" />
</svg>`;

fs.writeFileSync(path.join(publicDir, 'icon.svg'), brandSvg, 'utf8');

// Function to generate raw PNG with CRC32 and zlib deflate
function createPng(width, height, r, g, b) {
  // Simple uncompressed or deflated RGBA image
  const rowSize = width * 4 + 1; // 1 filter byte per row
  const rawData = Buffer.alloc(rowSize * height);

  for (let y = 0; y < height; y++) {
    const rowOffset = y * rowSize;
    rawData[rowOffset] = 0; // Filter type: None
    
    // Create subtle dark gradient with center glowing emblem
    const cy = y - height / 2;
    for (let x = 0; x < width; x++) {
      const cx = x - width / 2;
      const dist = Math.sqrt(cx * cx + cy * cy);
      const radius = width * 0.42;
      
      let pr = r, pg = g, pb = b, pa = 255;
      
      // Inside icon bounds
      if (dist < radius) {
        // Center core glow
        const t = Math.max(0, 1 - dist / radius);
        pr = Math.min(255, Math.floor(r + 56 * t));
        pg = Math.min(255, Math.floor(g + 189 * t));
        pb = Math.min(255, Math.floor(b + 248 * t));
      } else {
        // Dark background #0a0c10
        pr = 10;
        pg = 12;
        pb = 16;
      }
      
      const pixelOffset = rowOffset + 1 + x * 4;
      rawData[pixelOffset] = pr;
      rawData[pixelOffset + 1] = pg;
      rawData[pixelOffset + 2] = pb;
      rawData[pixelOffset + 3] = pa;
    }
  }

  const deflated = zlib.deflateSync(rawData);

  // CRC32 table
  const crcTable = [];
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      c = (c & 1) ? 0xedb88320 ^ (c >>> 1) : (c >>> 1);
    }
    crcTable[n] = c;
  }

  function crc32(buf) {
    let c = 0xffffffff;
    for (let i = 0; i < buf.length; i++) {
      c = crcTable[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
    }
    return (c ^ 0xffffffff) >>> 0;
  }

  function makeChunk(type, data) {
    const len = data.length;
    const buf = Buffer.alloc(12 + len);
    buf.writeUInt32BE(len, 0);
    buf.write(type, 4, 4, 'ascii');
    data.copy(buf, 8);
    const crcVal = crc32(buf.subarray(4, 8 + len));
    buf.writeUInt32BE(crcVal, 8 + len);
    return buf;
  }

  // Header: 89 50 4E 47 0D 0A 1A 0A
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  // IHDR
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // 8-bit depth
  ihdr[9] = 6; // color type RGBA
  ihdr[10] = 0; // compression
  ihdr[11] = 0; // filter
  ihdr[12] = 0; // interlace

  const ihdrChunk = makeChunk('IHDR', ihdr);
  const idatChunk = makeChunk('IDAT', deflated);
  const iendChunk = makeChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

// Generate PNG sizes
const pwa192 = createPng(192, 192, 18, 22, 34);
fs.writeFileSync(path.join(publicDir, 'pwa-192x192.png'), pwa192);

const pwa512 = createPng(512, 512, 18, 22, 34);
fs.writeFileSync(path.join(publicDir, 'pwa-512x512.png'), pwa512);
fs.writeFileSync(path.join(publicDir, 'pwa-maskable-512x512.png'), pwa512);

const appleTouch = createPng(180, 180, 18, 22, 34);
fs.writeFileSync(path.join(publicDir, 'apple-touch-icon.png'), appleTouch);
fs.writeFileSync(path.join(publicDir, 'favicon.ico'), createPng(32, 32, 18, 22, 34));

console.log('Successfully generated PWA icons in /public');
