import fs from 'fs';
import path from 'path';
import zlib from 'zlib';

function createChunk(type, data) {
  const typeBuf = Buffer.from(type, 'ascii');
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);

  const toCrc = Buffer.concat([typeBuf, data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(zlib.crc32(toCrc), 0);

  return Buffer.concat([len, toCrc, crc]);
}

function generatePngBuffer(size) {
  // Generate RGBA pixels
  const width = size;
  const height = size;
  const rawData = Buffer.alloc((width * 4 + 1) * height);

  const cx = width / 2;
  const cy = height / 2;
  const radius = width * 0.46;
  const innerRadius = width * 0.42;

  // Colors
  const bgTeal = [15, 118, 110, 255]; // #0f766e
  const darkTeal = [17, 94, 89, 255]; // #115e59
  const accentTeal = [45, 212, 191, 255]; // #2dd4bf
  const white = [255, 255, 255, 255];
  const warmGold = [245, 158, 11, 255]; // #f59e0b

  for (let y = 0; y < height; y++) {
    const rowOffset = y * (width * 4 + 1);
    rawData[rowOffset] = 0; // Filter byte: 0 (None)

    for (let x = 0; x < width; x++) {
      const pxOffset = rowOffset + 1 + x * 4;

      // Distance from center for rounded squircle / circular icon
      const dx = Math.abs(x - cx);
      const dy = Math.abs(y - cy);
      // Squircle formula: (x/r)^4 + (y/r)^4 <= 1
      const normalizedDist = Math.pow(dx / (width * 0.44), 4) + Math.pow(dy / (height * 0.44), 4);

      if (normalizedDist > 1.0) {
        // Transparent outside
        rawData[pxOffset] = 0;
        rawData[pxOffset + 1] = 0;
        rawData[pxOffset + 2] = 0;
        rawData[pxOffset + 3] = 0;
        continue;
      }

      // Default background: smooth teal gradient
      const gradT = y / height;
      const rBg = Math.round(bgTeal[0] * (1 - gradT * 0.25));
      const gBg = Math.round(bgTeal[1] * (1 - gradT * 0.25));
      const bBg = Math.round(bgTeal[2] * (1 - gradT * 0.25));
      let pixelColor = [rBg, gBg, bBg, 255];

      // Subtle hexagon / hive ring
      const distFromCenter = Math.sqrt((x - cx) ** 2 + (y - cy) ** 2);
      if (Math.abs(distFromCenter - innerRadius * 0.95) < (width * 0.015)) {
        pixelColor = [accentTeal[0], accentTeal[1], accentTeal[2], 180];
      }

      // Storefront Icon Graphics (relative coords from 0.0 to 1.0)
      const nx = x / width;
      const ny = y / height;

      // Awning / Roof triangle / trapezoid: y between 0.24 and 0.38
      // Awning top: 0.24, Awning bottom: 0.38
      if (ny >= 0.24 && ny <= 0.38) {
        const awningLeft = 0.20 + (ny - 0.24) * 0.2;
        const awningRight = 0.80 - (ny - 0.24) * 0.2;
        if (nx >= 0.22 && nx <= 0.78) {
          // Scalloped / striped awning
          const stripe = Math.floor(nx * 14) % 2;
          if (stripe === 0) {
            pixelColor = white;
          } else {
            pixelColor = warmGold;
          }
        }
      }

      // Awning bottom shadow bar: y between 0.38 and 0.42
      if (ny >= 0.38 && ny <= 0.42 && nx >= 0.22 && nx <= 0.78) {
        pixelColor = darkTeal;
      }

      // Store pillars / windows: y between 0.42 and 0.72
      if (ny >= 0.42 && ny <= 0.72 && nx >= 0.24 && nx <= 0.76) {
        // Walls background
        pixelColor = [240, 253, 250, 255]; // light mint tint

        // Door in middle: nx between 0.43 and 0.57, ny between 0.48 and 0.72
        if (nx >= 0.43 && nx <= 0.57 && ny >= 0.48 && ny <= 0.72) {
          // Door frame
          if (nx <= 0.45 || nx >= 0.55 || ny <= 0.50) {
            pixelColor = darkTeal;
          } else {
            // Glass door
            pixelColor = [153, 246, 228, 255]; // bright teal glass
            // Door handle
            if (Math.abs(nx - 0.53) < 0.012 && Math.abs(ny - 0.61) < 0.025) {
              pixelColor = warmGold;
            }
          }
        }

        // Left window: nx between 0.28 and 0.40, ny between 0.48 and 0.64
        if (nx >= 0.28 && nx <= 0.40 && ny >= 0.48 && ny <= 0.64) {
          if (nx <= 0.29 || nx >= 0.39 || ny <= 0.49 || ny >= 0.63) {
            pixelColor = darkTeal;
          } else {
            pixelColor = [204, 251, 241, 255];
          }
        }

        // Right window: nx between 0.60 and 0.72, ny between 0.48 and 0.64
        if (nx >= 0.60 && nx <= 0.72 && ny >= 0.48 && ny <= 0.64) {
          if (nx <= 0.61 || nx >= 0.71 || ny <= 0.49 || ny >= 0.63) {
            pixelColor = darkTeal;
          } else {
            pixelColor = [204, 251, 241, 255];
          }
        }

        // Left pillar and Right pillar
        if (nx <= 0.26 || nx >= 0.74) {
          pixelColor = white;
        }
      }

      // Store base: ny between 0.72 and 0.76, nx between 0.20 and 0.80
      if (ny >= 0.72 && ny <= 0.76 && nx >= 0.20 && nx <= 0.80) {
        pixelColor = white;
      }

      // Small "LH" indicator badge at top center
      if (ny >= 0.17 && ny <= 0.23 && Math.abs(nx - 0.5) < 0.07) {
        pixelColor = warmGold;
      }

      rawData[pxOffset] = pixelColor[0];
      rawData[pxOffset + 1] = pixelColor[1];
      rawData[pxOffset + 2] = pixelColor[2];
      rawData[pxOffset + 3] = pixelColor[3];
    }
  }

  // Header
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  // IHDR chunk
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // color type: RGBA
  ihdr[10] = 0; // compression
  ihdr[11] = 0; // filter
  ihdr[12] = 0; // interlace
  const ihdrChunk = createChunk('IHDR', ihdr);

  // IDAT chunk
  const compressedData = zlib.deflateSync(rawData);
  const idatChunk = createChunk('IDAT', compressedData);

  // IEND chunk
  const iendChunk = createChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

const publicDir = path.resolve('public');

// Generate 192x192
const buf192 = generatePngBuffer(192);
fs.writeFileSync(path.join(publicDir, 'pwa-192x192.png'), buf192);
console.log('Created public/pwa-192x192.png (' + buf192.length + ' bytes)');

// Generate 512x512
const buf512 = generatePngBuffer(512);
fs.writeFileSync(path.join(publicDir, 'pwa-512x512.png'), buf512);
console.log('Created public/pwa-512x512.png (' + buf512.length + ' bytes)');

// Generate Apple Touch Icon (180x180)
const buf180 = generatePngBuffer(180);
fs.writeFileSync(path.join(publicDir, 'apple-touch-icon.png'), buf180);
console.log('Created public/apple-touch-icon.png (' + buf180.length + ' bytes)');
