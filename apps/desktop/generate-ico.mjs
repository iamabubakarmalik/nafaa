import pngToIco from 'png-to-ico';
import sharp from 'sharp';
import { writeFileSync } from 'fs';

console.log('Generating multi-resolution ICO...');

// Generate multiple PNG buffers at different sizes
const sizes = [16, 32, 48, 64, 128, 256];
const pngBuffers = await Promise.all(
  sizes.map(async (size) => {
    return await sharp('./build/icon.png')
      .resize(size, size)
      .png()
      .toBuffer();
  })
);

// Convert to ICO
const icoBuffer = await pngToIco(pngBuffers);
writeFileSync('./build/icon.ico', icoBuffer);

console.log('✅ icon.ico generated with sizes: 16, 32, 48, 64, 128, 256');
