/**
 * Gera o albums.json automaticamente escaneando subpastas.
 * Execute: node generate-albums.js
 */
const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const IGNORE = ['node_modules', 'public', '.git', '.gemini', '.github'];
const PHOTO_EXT = ['.jpg', '.jpeg', '.png', '.webp'];

const entries = fs.readdirSync(ROOT, { withFileTypes: true });

const albums = entries
  .filter(e => e.isDirectory() && !IGNORE.includes(e.name))
  .map(e => {
    const dir = path.join(ROOT, e.name);
    const photos = fs.readdirSync(dir)
      .filter(f => PHOTO_EXT.includes(path.extname(f).toLowerCase()))
      .sort();

    if (photos.length === 0) return null;

    // Format display name: "pascoa2026" → "Páscoa 2026"
    const displayName = e.name
      .replace(/[-_]/g, ' ')
      .replace(/(\d{4})/, ' $1')
      .replace(/\s+/g, ' ')
      .trim()
      .split(' ')
      .map(w => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ');

    return {
      folder: e.name,
      displayName: displayName,
      photos: photos
    };
  })
  .filter(Boolean);

fs.writeFileSync(
  path.join(ROOT, 'albums.json'),
  JSON.stringify(albums, null, 2),
  'utf-8'
);

console.log(`✅ albums.json gerado com ${albums.length} álbum(ns):`);
albums.forEach(a => console.log(`   📁 ${a.displayName} (${a.photos.length} fotos)`));
