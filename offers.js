const STORES = {
  darty: {
    name: 'Darty',
    page: 'https://www.darty.com/black-friday',
    reader: 'https://r.jina.ai/http://www.darty.com/black-friday',
  },
  electro: {
    name: 'Électro Dépôt',
    page: 'https://www.electrodepot.fr/black-friday',
    reader: 'https://r.jina.ai/http://www.electrodepot.fr/black-friday',
  },
};

const grid = document.querySelector('#offers-grid');
const loading = document.querySelector('#loading');
const statusText = document.querySelector('#update-status');
const statusDot = document.querySelector('.status-dot');
const refreshButton = document.querySelector('#refresh-button');
const searchInput = document.querySelector('#search');
const tabs = [...document.querySelectorAll('.tab')];

let selectedStore = 'all';
let allOffers = [];

function setStatus(text, state = '') {
  statusText.textContent = text;
  statusDot.className = `status-dot ${state}`.trim();
}

function iconFor(title) {
  const value = title.toLowerCase();
  if (/télé|tv|oled|qled/.test(value)) return '📺';
  if (/lave|linge|réfrig|froid|four|fourchette|cuis/.test(value)) return '🏠';
  if (/ordinateur|portable|pc |tablette|mac/.test(value)) return '💻';
  if (/smartphone|téléphone|iphone|samsung/.test(value)) return '📱';
  if (/casque|enceinte|son|audio/.test(value)) return '🔊';
  if (/aspirateur|robot/.test(value)) return '🧹';
  if (/console|gaming|playstation|xbox/.test(value)) return '🎮';
  return '🛍️';
}

function cleanTitle(line) {
  let title = line
    .replace(/^[-*#>\d.\s]+/, '')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, '')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/[*`]/g, '')
    .replace(/\s+/g, ' ')
    .trim();

  const priceIndex = title.search(/\d+[.,]?\d*\s*(?:€|euros)/i);
  if (priceIndex > 8) title = title.slice(0, priceIndex).replace(/[|:,-]+$/, '').trim();
  return title;
}

function extractPrice(line) {
  const match = line.match(/(\d+(?:[.,]\d+)?)\s*€/);
  if (!match) return null;
  return `${match[1].replace('.', ',')} €`;
}

function parseOffers(markdown, storeKey) {
  const lines = markdown.split('\n');
  const offers = [];
  const seen = new Set();

  for (const line of lines) {
    const price = extractPrice(line);
    if (!price) continue;

    let title = cleanTitle(line);
    if (title.length < 6) continue;
    if (/livraison|paiement|garanti|conditions|jusqu.?|black friday|voir plus/i.test(title)) continue;

    const key = title.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);

    const markdownLink = line.match(/\[([^\]]+)\]\(([^)]+)\)/);
    let url = STORES[storeKey].page;
    if (markdownLink?.[2]) {
      try { url = new URL(markdownLink[2], STORES[storeKey].page).href; } catch (_) {}
    }

    offers.push({
      title: title.slice(0, 110),
      price,
      store: storeKey,
      storeName: STORES[storeKey].name,
      url,
      icon: iconFor(title),
    });
    if (offers.length >= 24) break;
  }
  return offers;
}

function loadCachedOffers() {
  try {
    const saved = JSON.parse(localStorage.getItem('offers-cache-v1'));
    if (Array.isArray(saved) && saved.length) allOffers = saved;
  } catch (_) {}
}

async function fetchStore(storeKey) {
  const store = STORES[storeKey];
  const response = await fetch(store.reader, { cache: 'no-store' });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const markdown = await response.text();
  return parseOffers(markdown, storeKey);
}

async function refreshOffers() {
  refreshButton.disabled = true;
  loading.classList.remove('hidden');
  grid.replaceChildren();
  setStatus('Actualisation des offres…', 'loading');

  const results = await Promise.allSettled([
    fetchStore('darty'),
    fetchStore('electro'),
  ]);

  const detected = results
    .filter((result) => result.status === 'fulfilled')
    .flatMap((result) => result.value);

  const successfulStores = results.filter((result) => result.status === 'fulfilled').length;
  if (detected.length) {
    allOffers = detected;
    localStorage.setItem('offers-cache-v1', JSON.stringify(detected));
  } else if (!allOffers.length) {
    allOffers = [];
  }

  loading.classList.add('hidden');
  refreshButton.disabled = false;
  render();

  if (detected.length) {
    setStatus(`Offres mises à jour le ${new Intl.DateTimeFormat('fr-FR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date())}`);
  } else if (allOffers.length) {
    setStatus(`Affichage des dernières offres enregistrées · ${new Intl.DateTimeFormat('fr-FR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date())}`, 'error');
  } else {
    setStatus('Lecture automatique indisponible. Consultez les pages officielles ci-dessous.', 'error');
  }

  if (successfulStores === 0) {
    grid.innerHTML = `<div class="empty-state"><strong>Aucune offre détectée automatiquement</strong><br><br>Les magasins peuvent bloquer les robots de lecture. Utilisez les boutons officiels ci-dessous.</div>`;
  }
}

function render() {
  const query = searchInput.value.trim().toLowerCase();
  const filtered = allOffers.filter((offer) => {
    const storeMatches = selectedStore === 'all' || offer.store === selectedStore;
    const searchMatches = !query || `${offer.title} ${offer.storeName}`.toLowerCase().includes(query);
    return storeMatches && searchMatches;
  });

  if (!filtered.length) {
    if (!allOffers.length) return;
    grid.innerHTML = `<div class="empty-state">Aucune offre ne correspond à cette recherche.</div>`;
    return;
  }

  grid.innerHTML = filtered.map((offer) => `
    <article class="offer-card">
      <div class="offer-head">
        <span class="store-badge ${offer.store}">${offer.storeName}</span>
        <time>Actualisé maintenant</time>
      </div>
      <div class="offer-icon" aria-hidden="true">${offer.icon}</div>
      <h2>${escapeHtml(offer.title)}</h2>
      <p>Promotion détectée sur la page officielle du magasin.</p>
      <div class="offer-footer">
        <div class="offer-price">${escapeHtml(offer.price)}<small>voir les conditions</small></div>
        <a class="offer-link" href="${escapeAttribute(offer.url)}" target="_blank" rel="noopener noreferrer" aria-label="Voir l’offre chez ${offer.storeName}">↗</a>
      </div>
    </article>
  `).join('');
}

function escapeHtml(value) {
  const div = document.createElement('div');
  div.textContent = value;
  return div.innerHTML;
}

function escapeAttribute(value) {
  return String(value).replaceAll('&', '&amp;').replaceAll('"', '&quot;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
}

tabs.forEach((tab) => tab.addEventListener('click', () => {
  tabs.forEach((item) => item.classList.remove('active'));
  tab.classList.add('active');
  selectedStore = tab.dataset.store;
  render();
}));

searchInput.addEventListener('input', render);
refreshButton.addEventListener('click', refreshOffers);

loadCachedOffers();
if (allOffers.length) render();
refreshOffers();
