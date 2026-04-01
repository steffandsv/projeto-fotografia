/**
 * Gera o albums.json automaticamente escaneando pastas e subpastas.
 * 
 * Suporta 2 estruturas:
 *   - Pasta com fotos direto:     Escola Arcanjo/foto1.jpg
 *   - Pasta com subpastas:        EMEI/Pré 1 A/foto1.jpg
 * 
 * Cada grupo de fotos vira um álbum separado.
 * Execute: node generate-albums.js
 */
const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const IGNORE = ['node_modules', '.git', '.gemini', '.github', 'public'];
const PHOTO_EXT = ['.jpg', '.jpeg', '.png', '.webp'];

function isPhoto(filename) {
  return PHOTO_EXT.includes(path.extname(filename).toLowerCase());
}

function getPhotosInDir(dirPath) {
  try {
    return fs.readdirSync(dirPath)
      .filter(f => {
        const fullPath = path.join(dirPath, f);
        return fs.statSync(fullPath).isFile() && isPhoto(f);
      })
      .sort();
  } catch {
    return [];
  }
}

function getSubDirs(dirPath) {
  try {
    return fs.readdirSync(dirPath, { withFileTypes: true })
      .filter(e => e.isDirectory() && !IGNORE.includes(e.name))
      .map(e => e.name)
      .sort();
  } catch {
    return [];
  }
}

const albums = [];
const topLevelDirs = getSubDirs(ROOT);

for (const topDir of topLevelDirs) {
  const topPath = path.join(ROOT, topDir);
  
  // Check if this folder has photos directly inside
  const directPhotos = getPhotosInDir(topPath);
  
  if (directPhotos.length > 0) {
    // Case 1: Folder with photos directly inside (e.g., "Escola Arcanjo/foto.jpg")
    albums.push({
      folder: topDir,
      displayName: topDir,
      photos: directPhotos
    });
  }
  
  // Check for subfolders with photos (e.g., "EMEI/Pré 1 A/foto.jpg")
  const subDirs = getSubDirs(topPath);
  for (const subDir of subDirs) {
    const subPath = path.join(topPath, subDir);
    const subPhotos = getPhotosInDir(subPath);
    
    if (subPhotos.length > 0) {
      albums.push({
        folder: topDir + '/' + subDir,
        displayName: topDir + ' — ' + subDir,
        photos: subPhotos
      });
    }
    
    // Also check one more level deep (e.g., "Escola/Turma/Aluno/foto.jpg")
    const deepDirs = getSubDirs(subPath);
    for (const deepDir of deepDirs) {
      const deepPath = path.join(subPath, deepDir);
      const deepPhotos = getPhotosInDir(deepPath);
      
      if (deepPhotos.length > 0) {
        albums.push({
          folder: topDir + '/' + subDir + '/' + deepDir,
          displayName: topDir + ' — ' + subDir + ' — ' + deepDir,
          photos: deepPhotos
        });
      }
    }
  }
}

// Sort albums alphabetically by displayName
albums.sort((a, b) => a.displayName.localeCompare(b.displayName, 'pt-BR'));

fs.writeFileSync(
  path.join(ROOT, 'albums.json'),
  JSON.stringify(albums, null, 2),
  'utf-8'
);

console.log(`\n✅ albums.json gerado com ${albums.length} álbum(ns):\n`);
albums.forEach(a => console.log(`   📁 ${a.displayName} (${a.photos.length} fotos)`));
console.log('');
