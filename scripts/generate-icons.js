const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

async function main() {
  const logoPath = path.join(__dirname, '../public/logo.png');
  const size = 256;
  const logoW = 236;
  const logoH = Math.round(84 * (236 / 256)); // ~77

  const resizedLogo = await sharp(logoPath)
    .resize(logoW, logoH, { fit: 'contain' })
    .toBuffer();

  const bgSvg = Buffer.from(`
    <svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
      <rect width="${size}" height="${size}" rx="48" fill="#1c1614"/>
      <rect x="5" y="5" width="${size - 10}" height="${size - 10}" rx="43" fill="none" stroke="#b45309" stroke-width="6"/>
      <rect x="12" y="12" width="${size - 24}" height="${size - 24}" rx="36" fill="none" stroke="#f59e0b" stroke-width="2" opacity="0.6"/>
    </svg>
  `);

  const squareIcon = await sharp(bgSvg)
    .composite([
      {
        input: resizedLogo,
        top: Math.round((size - logoH) / 2),
        left: Math.round((size - logoW) / 2),
      },
    ])
    .png()
    .toBuffer();

  // Save multiple sizes
  // 1. icon.png (256x256) in src/app/icon.png
  await sharp(squareIcon).resize(256, 256).toFile(path.join(__dirname, '../src/app/icon.png'));
  
  // 2. apple-icon.png (180x180) in src/app/apple-icon.png
  await sharp(squareIcon).resize(180, 180).toFile(path.join(__dirname, '../src/app/apple-icon.png'));

  // 3. public/favicon.ico / public/favicon.png / public/icon-32.png / public/icon-192.png / public/icon-512.png
  await sharp(squareIcon).resize(32, 32).toFile(path.join(__dirname, '../public/favicon-32x32.png'));
  await sharp(squareIcon).resize(16, 16).toFile(path.join(__dirname, '../public/favicon-16x16.png'));
  await sharp(squareIcon).resize(192, 192).toFile(path.join(__dirname, '../public/icon-192.png'));
  await sharp(squareIcon).resize(512, 512).toFile(path.join(__dirname, '../public/icon-512.png'));
  await sharp(squareIcon).resize(32, 32).toFile(path.join(__dirname, '../public/favicon.ico'));
  await sharp(squareIcon).resize(32, 32).toFile(path.join(__dirname, '../src/app/favicon.ico'));

  console.log('Successfully generated all icons and favicons!');
}

main().catch(console.error);
