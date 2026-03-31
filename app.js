/* ═══════════════════════════════════════════════════════════════
   PROJETO MÁGICO ✨ APP.JS — FULL FRONTEND EDITION
   No backend required! PDF generation runs in the browser via pdf-lib.
   ═══════════════════════════════════════════════════════════════ */

// ── State ────────────────────────────────────────────────────
let albumsData = [];
let currentAlbum = null;
let photos = [];
let lightboxIndex = -1;
let cardSelectedPhoto = null;

// ── DOM ──────────────────────────────────────────────────────
const $ = (s) => document.querySelector(s);
const $$ = (s) => document.querySelectorAll(s);

// ── Init ─────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  createFloatingDecorations();
  loadAlbums();
  bindEvents();
});

// ═══════════════════════════════════════════════════════════════
// FLOATING DECORATIONS (background eye candy)
// ═══════════════════════════════════════════════════════════════
function createFloatingDecorations() {
  const container = $('#floating-decorations');
  const emojis = ['🌸', '🐣', '♡', '✦', '🥚', '🌷', '💖', '✧', '🎀', '🐰'];
  const count = 15;

  for (let i = 0; i < count; i++) {
    const el = document.createElement('div');
    el.className = 'float-item';
    el.textContent = emojis[i % emojis.length];
    el.style.left = Math.random() * 100 + '%';
    el.style.top = Math.random() * 100 + '%';
    el.style.animationDelay = (Math.random() * 10) + 's';
    el.style.animationDuration = (15 + Math.random() * 15) + 's';
    el.style.fontSize = (14 + Math.random() * 14) + 'px';
    container.appendChild(el);
  }
}

// ═══════════════════════════════════════════════════════════════
// EVENT BINDING
// ═══════════════════════════════════════════════════════════════
function bindEvents() {
  $('#btn-back').addEventListener('click', showAlbumsView);
  $('#btn-card').addEventListener('click', openCardModal);

  // Lightbox
  $('#lightbox-close').addEventListener('click', closeLightbox);
  $('#lightbox-backdrop').addEventListener('click', closeLightbox);
  $('#lb-prev').addEventListener('click', () => navLightbox(-1));
  $('#lb-next').addEventListener('click', () => navLightbox(1));

  // Card modal
  $('#modal-close').addEventListener('click', closeCardModal);
  $('#modal-backdrop').addEventListener('click', closeCardModal);
  $('#btn-generate').addEventListener('click', generateCard);

  // Keyboard
  document.addEventListener('keydown', (e) => {
    if (!$('#lightbox').classList.contains('hidden')) {
      if (e.key === 'Escape') closeLightbox();
      if (e.key === 'ArrowLeft') navLightbox(-1);
      if (e.key === 'ArrowRight') navLightbox(1);
    }
    if (!$('#card-modal').classList.contains('hidden')) {
      if (e.key === 'Escape') closeCardModal();
    }
  });

  // Touch swipe on lightbox
  let touchStartX = 0;
  const lightboxBody = $('.lightbox-body');
  lightboxBody.addEventListener('touchstart', (e) => {
    touchStartX = e.touches[0].clientX;
  }, { passive: true });
  lightboxBody.addEventListener('touchend', (e) => {
    const diff = touchStartX - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 50) {
      navLightbox(diff > 0 ? 1 : -1);
    }
  }, { passive: true });
}

// ═══════════════════════════════════════════════════════════════
// LOAD ALBUMS (from static albums.json)
// ═══════════════════════════════════════════════════════════════
async function loadAlbums() {
  const grid = $('#albums-grid');
  grid.innerHTML = '<div class="skeleton" style="height:200px;"></div>';

  try {
    const res = await fetch('albums.json');
    albumsData = await res.json();

    if (albumsData.length === 0) {
      grid.innerHTML = `
        <div style="text-align:center; padding:40px 0; color:var(--text-light);">
          <p style="font-size:2.5rem; margin-bottom:8px;">📂</p>
          <p>Nenhum álbum ainda</p>
        </div>`;
      return;
    }

    grid.innerHTML = albumsData.map((album, i) => {
      const coverPath = album.folder + '/' + album.photos[0];
      return `
        <div class="album-card" style="animation-delay:${i * 0.12}s" onclick="openAlbum('${album.folder}')">
          <div class="album-cover-wrap">
            <img class="album-cover" src="${coverPath}" alt="${album.displayName}" loading="lazy">
            <div class="album-badge">📷 ${album.photos.length}</div>
          </div>
          <div class="album-info">
            <span class="album-name">${album.displayName}</span>
            <span class="album-arrow">→</span>
          </div>
        </div>`;
    }).join('');

  } catch (err) {
    console.error('Error loading albums:', err);
    grid.innerHTML = `
      <div style="text-align:center; padding:40px 0; color:var(--text-light);">
        <p style="font-size:2.5rem; margin-bottom:8px;">😿</p>
        <p>Erro ao carregar álbuns</p>
      </div>`;
  }
}

// ═══════════════════════════════════════════════════════════════
// ALBUM VIEW
// ═══════════════════════════════════════════════════════════════
function openAlbum(folderName) {
  const album = albumsData.find(a => a.folder === folderName);
  if (!album) return;

  currentAlbum = album;
  photos = album.photos.map(fname => ({
    name: fname,
    url: album.folder + '/' + fname
  }));

  // Switch views
  $('#hero').classList.add('hidden');
  $('#albums-section').classList.add('hidden');
  $('#gallery-section').classList.remove('hidden');
  $('#gallery-title').textContent = album.displayName;

  renderPhotoGrid();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function renderPhotoGrid() {
  const grid = $('#photo-grid');
  grid.innerHTML = photos.map((photo, i) => `
    <div class="photo-card" style="animation-delay:${i * 0.04}s" onclick="openLightbox(${i})">
      <img class="photo-thumb" src="${photo.url}" alt="Foto ${i + 1}" loading="lazy">
      <div class="photo-download-hint">📥</div>
    </div>
  `).join('');
}

function showAlbumsView() {
  $('#gallery-section').classList.add('hidden');
  $('#hero').classList.remove('hidden');
  $('#albums-section').classList.remove('hidden');
  currentAlbum = null;
  photos = [];
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ═══════════════════════════════════════════════════════════════
// LIGHTBOX (with individual download)
// ═══════════════════════════════════════════════════════════════
function openLightbox(index) {
  lightboxIndex = index;
  updateLightboxPhoto();
  $('#lightbox').classList.remove('hidden');
  document.body.style.overflow = 'hidden';
}

function closeLightbox() {
  $('#lightbox').classList.add('hidden');
  document.body.style.overflow = '';
}

function navLightbox(dir) {
  lightboxIndex = (lightboxIndex + dir + photos.length) % photos.length;
  updateLightboxPhoto();
}

function updateLightboxPhoto() {
  const photo = photos[lightboxIndex];
  const img = $('#lightbox-img');
  img.style.animation = 'none';
  img.offsetHeight; // reflow
  img.style.animation = 'zoomIn 0.3s ease-out';
  img.src = photo.url;

  // Update download link
  const dl = $('#lightbox-download');
  dl.href = photo.url;
  dl.download = photo.name;
}

// ═══════════════════════════════════════════════════════════════
// EASTER CARD MODAL
// ═══════════════════════════════════════════════════════════════
function openCardModal() {
  cardSelectedPhoto = null;
  $('#btn-generate').disabled = true;
  $('#modal-preview').classList.add('hidden');
  $('#modal-loading').classList.add('hidden');
  $('#btn-generate').classList.remove('hidden');

  const grid = $('#modal-grid');
  grid.innerHTML = photos.map((photo, i) => `
    <div class="modal-photo-item" data-index="${i}" onclick="selectCardPhoto(${i}, this)">
      <img src="${photo.url}" alt="Foto ${i + 1}" loading="lazy">
      <div class="modal-photo-check">✓</div>
    </div>
  `).join('');

  $('#card-modal').classList.remove('hidden');
  document.body.style.overflow = 'hidden';
}

function closeCardModal() {
  $('#card-modal').classList.add('hidden');
  document.body.style.overflow = '';
}

function selectCardPhoto(index, el) {
  // Deselect all
  $$('.modal-photo-item').forEach(p => p.classList.remove('selected'));
  // Select this
  el.classList.add('selected');
  cardSelectedPhoto = photos[index];
  $('#btn-generate').disabled = false;

  // Show preview
  $('#preview-thumb').src = cardSelectedPhoto.url;
  $('#modal-preview').classList.remove('hidden');
}

// ═══════════════════════════════════════════════════════════════
// GENERATE EASTER CARD (100% client-side with pdf-lib!)
// ═══════════════════════════════════════════════════════════════
async function generateCard() {
  if (!cardSelectedPhoto) return;

  // Show loading
  $('#modal-loading').classList.remove('hidden');
  $('#btn-generate').classList.add('hidden');

  try {
    // 1. Load the PDF template
    const pdfUrl = 'pascoa.pdf';
    const pdfResponse = await fetch(pdfUrl);
    const pdfBytes = await pdfResponse.arrayBuffer();

    // 2. Load the selected photo
    const imgResponse = await fetch(cardSelectedPhoto.url);
    const imgBytes = await imgResponse.arrayBuffer();

    // 3. Determine image type and embed
    const { PDFDocument } = PDFLib;
    const pdfDoc = await PDFDocument.load(pdfBytes);

    let image;
    const fileName = cardSelectedPhoto.name.toLowerCase();
    if (fileName.endsWith('.png')) {
      image = await pdfDoc.embedPng(imgBytes);
    } else {
      image = await pdfDoc.embedJpg(imgBytes);
    }

    // 4. Get page 2
    const page = pdfDoc.getPages()[1];
    const pageWidth = page.getWidth();   // 595.5
    const pageHeight = page.getHeight(); // 842.25

    // 5. Define the photo area (below title, above footer)
    const margin = 40;
    const topOffset = 160;
    const bottomOffset = 60;
    const availableWidth = pageWidth - (margin * 2);
    const availableHeight = pageHeight - topOffset - bottomOffset;

    // 6. Calculate dimensions keeping aspect ratio
    const imgDims = image.scale(1);
    const photoAspect = imgDims.width / imgDims.height;
    const areaAspect = availableWidth / availableHeight;

    let drawWidth, drawHeight;
    if (photoAspect > areaAspect) {
      drawWidth = availableWidth;
      drawHeight = availableWidth / photoAspect;
    } else {
      drawHeight = availableHeight;
      drawWidth = availableHeight * photoAspect;
    }

    // 7. Center in the area
    const x = margin + (availableWidth - drawWidth) / 2;
    const y = bottomOffset + (availableHeight - drawHeight) / 2;

    // 8. Draw!
    page.drawImage(image, {
      x: x,
      y: y,
      width: drawWidth,
      height: drawHeight
    });

    // 9. Save and download
    const modifiedPdfBytes = await pdfDoc.save();
    const blob = new Blob([modifiedPdfBytes], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = 'Cartao de Pascoa.pdf';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    showToast('🐰 Cartão de Páscoa pronto! ✨', 'success');
    closeCardModal();

  } catch (err) {
    console.error('Error generating card:', err);
    showToast('Ops! Erro ao gerar o cartão 😿', 'error');
    $('#modal-loading').classList.add('hidden');
    $('#btn-generate').classList.remove('hidden');
  }
}

// ═══════════════════════════════════════════════════════════════
// TOAST
// ═══════════════════════════════════════════════════════════════
function showToast(message, type = '') {
  const container = $('#toast-container');
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.textContent = message;
  container.appendChild(toast);

  setTimeout(() => {
    toast.classList.add('leaving');
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}
