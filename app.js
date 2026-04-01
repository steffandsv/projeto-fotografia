/* ═══════════════════════════════════════════════════════════════
   PROJETO MÁGICO ✨ APP.JS — FULL FRONTEND EDITION
   No backend required! PDF generation runs in the browser via pdf-lib.
   ═══════════════════════════════════════════════════════════════ */

// ── State ────────────────────────────────────────────────────
let albumsData = [];
let hierarchicalData = {};
let currentSchool = null;
let currentAlbum = null;
let photos = [];
let lightboxIndex = -1;
let cardSelectedPhoto = null;
let selectedPhotos = new Set();
let isSelectMode = false;

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
  $('#btn-back-to-schools').addEventListener('click', showSchoolsView);
  $('#btn-back-to-classes').addEventListener('click', () => {
    if (currentSchool && currentSchool.classes && currentSchool.classes.length > 0) {
      showClassesView(currentSchool.name);
    } else {
      showSchoolsView();
    }
  });
  $('#btn-card').addEventListener('click', openCardModal);
  
  // Multi-select
  $('#btn-select-mode').addEventListener('click', toggleSelectMode);
  $('#btn-cancel-selection').addEventListener('click', cancelSelectMode);
  $('#btn-share-whatsapp').addEventListener('click', shareSelectedWhatsApp);

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
  const grid = $('#schools-grid');
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

    // Parse hierarchy: School -> Class -> Photos
    albumsData.forEach(album => {
      const parts = album.folder.split('/');
      const schoolName = parts[0];
      const className = parts.length > 1 ? parts.slice(1).join('/') : null;

      if (!hierarchicalData[schoolName]) {
        hierarchicalData[schoolName] = { name: schoolName, classes: [], directAlbum: null };
      }

      if (className) {
        hierarchicalData[schoolName].classes.push({ ...album, className: className });
      } else {
        hierarchicalData[schoolName].directAlbum = album;
      }
    });

    renderSchools();

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
// NESTED NAVIGATION (School -> Classes -> Gallery)
// ═══════════════════════════════════════════════════════════════

function renderSchools() {
  const grid = $('#schools-grid');
  const schools = Object.keys(hierarchicalData);

  grid.innerHTML = schools.map((schoolName, i) => {
    const school = hierarchicalData[schoolName];
    // Determine a cover image representing the school
    let coverPath = '';
    let totalPhotos = 0;
    if (school.classes.length > 0) {
      coverPath = school.classes[0].folder + '/' + school.classes[0].photos[0];
      totalPhotos = school.classes.reduce((sum, c) => sum + c.photos.length, 0);
    } else if (school.directAlbum) {
      coverPath = school.directAlbum.folder + '/' + school.directAlbum.photos[0];
      totalPhotos = school.directAlbum.photos.length;
    }

    return `
      <div class="album-card" style="animation-delay:${i * 0.12}s" onclick="handleSchoolClick('${schoolName}')">
        <div class="album-cover-wrap">
          <img class="album-cover" src="${coverPath}" alt="${schoolName}" loading="lazy">
          <div class="album-badge">📷 ${totalPhotos}</div>
        </div>
        <div class="album-info">
          <span class="album-name">${schoolName}</span>
          <span class="album-arrow">→</span>
        </div>
      </div>`;
  }).join('');
}

function handleSchoolClick(schoolName) {
  currentSchool = hierarchicalData[schoolName];
  if (currentSchool.classes.length > 0) {
    showClassesView(schoolName);
  } else if (currentSchool.directAlbum) {
    // Escolas como Arcanjo sem turmas, vai direto para a galeria
    openGallery(currentSchool.directAlbum.folder, currentSchool.name);
  }
}

function showSchoolsView() {
  $('#gallery-section').classList.add('hidden');
  $('#classes-section').classList.add('hidden');
  $('#hero').classList.remove('hidden');
  $('#albums-section').classList.remove('hidden');
  currentSchool = null;
  currentAlbum = null;
  photos = [];
  cancelSelectMode();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function showClassesView(schoolName) {
  const school = hierarchicalData[schoolName];
  $('#hero').classList.add('hidden');
  $('#albums-section').classList.add('hidden');
  $('#gallery-section').classList.add('hidden');
  $('#classes-section').classList.remove('hidden');
  cancelSelectMode();
  
  $('#classes-title').textContent = `Turmas - ${schoolName}`;

  const grid = $('#classes-grid');
  grid.innerHTML = school.classes.map((cls, i) => {
    const coverPath = cls.folder + '/' + cls.photos[0];
    return `
      <div class="album-card" style="animation-delay:${i * 0.12}s" onclick="openGallery('${cls.folder}', '${schoolName} > ${cls.className}')">
        <div class="album-cover-wrap">
          <img class="album-cover" src="${coverPath}" alt="${cls.className}" loading="lazy">
          <div class="album-badge">📷 ${cls.photos.length}</div>
        </div>
        <div class="album-info">
          <span class="album-name">${cls.className}</span>
          <span class="album-arrow">→</span>
        </div>
      </div>`;
  }).join('');
  
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function openGallery(folderName, navTitle) {
  const album = albumsData.find(a => a.folder === folderName);
  if (!album) return;

  currentAlbum = album;
  photos = album.photos.map(fname => ({
    name: fname,
    url: album.folder + '/' + fname
  }));

  $('#hero').classList.add('hidden');
  $('#albums-section').classList.add('hidden');
  $('#classes-section').classList.add('hidden');
  $('#gallery-section').classList.remove('hidden');
  $('#gallery-title').textContent = navTitle || album.displayName;

  cancelSelectMode();
  renderPhotoGrid();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function renderPhotoGrid() {
  const grid = $('#photo-grid');
  grid.innerHTML = photos.map((photo, i) => `
    <div class="photo-card" id="photo-card-${i}" style="animation-delay:${i * 0.04}s" onclick="handlePhotoClick(${i})">
      <div class="photo-checkbox">✓</div>
      <img class="photo-thumb" src="${photo.url}" alt="Foto ${i + 1}" loading="lazy">
      <div class="photo-download-hint">📥</div>
    </div>
  `).join('');
}

// ═══════════════════════════════════════════════════════════════
// MULTI-SELECT & SHARE
// ═══════════════════════════════════════════════════════════════

function toggleSelectMode() {
  isSelectMode = !isSelectMode;
  const grid = $('#photo-grid');
  if (isSelectMode) {
    grid.classList.add('select-mode-active');
    $('#btn-select-mode').innerHTML = '<span class="btn-emoji">✖</span><span>Cancelar Seleção</span>';
    $('#btn-card').classList.add('hidden');
    updateFab();
  } else {
    cancelSelectMode();
  }
}

function cancelSelectMode() {
  isSelectMode = false;
  selectedPhotos.clear();
  $('#photo-grid').classList.remove('select-mode-active');
  $('#btn-select-mode').innerHTML = '<span class="btn-emoji">✓</span><span>Selecionar</span>';
  $('#btn-card').classList.remove('hidden');
  $$('#photo-grid .photo-card').forEach(el => el.classList.remove('selected'));
  $('#fab-bar').classList.add('hidden');
}

function handlePhotoClick(index) {
  if (isSelectMode) {
    const card = $(`#photo-card-${index}`);
    if (selectedPhotos.has(index)) {
      selectedPhotos.delete(index);
      card.classList.remove('selected');
    } else {
      selectedPhotos.add(index);
      card.classList.add('selected');
    }
    updateFab();
  } else {
    openLightbox(index);
  }
}

function updateFab() {
  const count = selectedPhotos.size;
  const fab = $('#fab-bar');
  if (count > 0) {
    fab.classList.remove('hidden');
    $('#fab-count').textContent = count === 1 ? '1 foto selecionada' : `${count} fotos selecionadas`;
  } else {
    fab.classList.add('hidden');
  }
}

async function shareSelectedWhatsApp() {
  if (selectedPhotos.size === 0) return;
  const filesArray = [];
  
  // Show Loading feedback on button
  const shareBtn = $('#btn-share-whatsapp');
  const oldHTML = shareBtn.innerHTML;
  shareBtn.innerHTML = '<span class="btn-emoji">⏳</span><span>Preparando...</span>';
  shareBtn.disabled = true;

  try {
    for (const index of selectedPhotos) {
      const p = photos[index];
      const response = await fetch(p.url);
      const blob = await response.blob();
      const file = new File([blob], p.name, { type: blob.type });
      filesArray.push(file);
    }

    if (navigator.share && navigator.canShare && navigator.canShare({ files: filesArray })) {
      await navigator.share({
        files: filesArray,
        title: 'Fotos - Projeto Mágico',
        text: 'Veja as fotos do Projeto Mágico! ✨'
      });
      showToast('Compartilhado com sucesso! 💖', 'success');
    } else {
      showToast('Seu navegador não suporta envio direto de várias fotos 😿. Baixe-as primeiro.', 'error');
    }
  } catch (error) {
    console.error('Compartilhamento falhou', error);
    if (error.name !== 'AbortError') {
      showToast('Erro ao tentar compartilhar as imagens.', 'error');
    }
  } finally {
    shareBtn.innerHTML = oldHTML;
    shareBtn.disabled = false;
    cancelSelectMode();
  }
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

// Utils para cortar a imagem para 1:1 se for formato retrato (altura > largura)
function getPreparedImageBlob(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'Anonymous';
    img.onload = () => {
      // Se for retrato (altura > largura), criamos um canvas quadrado para cortar o meio
      if (img.height > img.width) {
        const size = img.width;
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');
        
        // Ponto de corte Y para centralizar (pega o meio da altura maior)
        const srcY = (img.height - size) / 2;
        ctx.drawImage(img, 0, srcY, size, size, 0, 0, size, size);
        
        canvas.toBlob(blob => resolve({ blob, format: 'image/jpeg' }), 'image/jpeg', 0.95);
      } else {
        // Usa a imagem original sem cortes
        fetch(url).then(r => r.blob()).then(blob => resolve({ blob, format: blob.type })).catch(reject);
      }
    };
    img.onerror = reject;
    img.src = url;
  });
}

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

    // 2. Prepare the photo (square crop if portrait)
    const { blob: imgBlob, format } = await getPreparedImageBlob(cardSelectedPhoto.url);
    const imgBytes = await imgBlob.arrayBuffer();

    // 3. Embed in PDF
    const { PDFDocument } = PDFLib;
    const pdfDoc = await PDFDocument.load(pdfBytes);

    let image;
    // O canvas exporta jpeg. Caso traga a original, pode ser png ou jpeg
    if (format === 'image/png' || cardSelectedPhoto.name.toLowerCase().endsWith('.png')) {
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
    const pdfBlob = new Blob([modifiedPdfBytes], { type: 'application/pdf' });
    const url = URL.createObjectURL(pdfBlob);

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
