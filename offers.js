const STORES = {
  darty: { name: 'Darty', page: 'https://www.darty.com/black-friday', reader: 'https://r.jina.ai/http://www.darty.com/black-friday' },
  electro: { name: 'Électro Dépôt', page: 'https://www.electrodepot.fr/black-friday', reader: 'https://r.jina.ai/http://www.electrodepot.fr/black-friday' },
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
  if (/lave|linge|réfrig|froid|four|cuis/.test(value)) return '🏠';
  if (/ordinateur|portable|pc |tablette|mac/.test(value)) return '💻';
  if (/smartphone|téléphone|iphone|samsung/.test(value)) return '📱';
  if (/casque|enceinte|son|audio/.test(value)) return '🔊';
  if (/aspirateur|robot/.test(value)) return '🧹';
  if (/console|gaming|playstation|xbox/.test(value)) return '🎮';
  return '🛍️';
}
function cleanTitle(line) {
  let title = line.replace(/^[-*#>\d.\s]+/, '').replace(/!\[[^\]]*\]\([^)]*\)/g, '')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1').replace(/[*`]/g, '').replace(/\s+/g, ' ').trim();
  const priceIndex = title.search(/\d+[.,]?\d*\s*(?:€|euros)/i);
  if (priceIndex > 8) title = title.slice(0, priceIndex).replace(/[|:,-]+$/, '').trim();
  return title;
}
function extractPrice(line) {
  const match = line.match(/(\d+(?:[.,]\d+)?)\s*€/);
  return match ? `${match[1].replace('.', ',')} €` : null;
}
function parseOffers(markdown, storeKey, source) {
  const lines = markdown.split('\n');
  const offers = [];
  const seen = new Set();
  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    const price = extractPrice(line);
    if (!price) continue;
    let title = cleanTitle(line);
    let linkLine = line;
    if (title.length < 8) {
      for (let offset = 1; offset <= 2 && i - offset >= 0; offset += 1) {
        const candidate = cleanTitle(lines[i - offset]);
        if (candidate.length > title.length && candidate.length >= 8) {
          title = candidate;
          linkLine = lines[i - offset];
        }
      }
    }
    if (title.length < 8 || /livraison|paiement|garanti|conditions|voir plus|économisez/i.test(title)) continue;
    const key = `${storeKey}:${title.toLowerCase()}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const markdownLink = linkLine.match(/\[([^\]]+)\]\(([^)]+)\)/) || line.match(/\[([^\]]+)\]\(([^)]+)\)/);
    let url = source.url;
    if (markdownLink?.[2]) {
      try { url = new URL(markdownLink[2], source.url).href; } catch (_) {}
    }
    offers.push({ title: title.slice(0, 110), price, store: storeKey, storeName: source.name, source: source.label, url, icon: iconFor(title) });
    if (offers.length >= 18) break;
  }
  return offers;
}
function loadCachedOffers() {
  try {
    const saved = JSON.parse(localStorage.getItem('offers-cache-v2'));
    if (Array.isArray(saved) && saved.length) allOffers = saved;
  } catch (_) {}
}
async function readPublicPage(url) {
  const response = await fetch(url, { cache: 'no-store' });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.text();
}
async function fetchStoreOffers(storeKey) {
  const store = STORES[storeKey];
  const text = await readPublicPage(store.reader);
  return parseOffers(text, storeKey, { name: store.name, label: 'Page magasin', url: store.page });
}
async function fetchDealabs(storeKey, term) {
  const searchUrl = `https://www.dealabs.com/search?q=${encodeURIComponent(term)}`;
  const readerUrl = `https://r.jina.ai/http://www.dealabs.com/search?q=${encodeURIComponent(term)}`;
  const text = await readPublicPage(readerUrl);
  return parseOffers(text, storeKey, { name: 'Dealabs · ' + STORES[storeKey].name, label: 'Dealabs', url: searchUrl });
}
async function refreshOffers() {
  refreshButton.disabled = true;
  loading.classList.remove('hidden');
  grid.replaceChildren();
  setStatus('Actualisation des boutiques et de Dealabs…', 'loading');

  const results = await Promise.allSettled([
    fetchStoreOffers('darty'), fetchStoreOffers('electro'),
    fetchDealabs('darty', 'Darty'), fetchDealabs('electro', 'Electro Dépôt'),
  ]);
  const successful = results.filter((result) => result.status === 'fulfilled');
  const detected = successful.flatMap((result) => result.value);
  const unique = [...new Map(detected.map((offer) => [`${offer.store}:${offer.title.toLowerCase()}:${offer.price}`, offer])).values()];
  if (unique.length) {
    allOffers = unique;
    localStorage.setItem('offers-cache-v2', JSON.stringify(unique));
    localStorage.setItem('offers-cache-v2-time', new Date().toISOString());
  }
  loading.classList.add('hidden');
  refreshButton.disabled = false;
  render();

  if (unique.length) {
    const successCount = successful.length;
    setStatus(`${unique.length} offre(s) repérée(s) · ${successCount}/4 sources consultées · ${new Intl.DateTimeFormat('fr-FR', { timeStyle: 'short' }).format(new Date())}`);
  } else if (allOffers.length) {
    const savedAt = localStorage.getItem('offers-cache-v2-time');
    const savedDate = savedAt ? new Intl.DateTimeFormat('fr-FR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(savedAt)) : 'date inconnue';
    setStatus(`Sources indisponibles · affichage du dernier cache (${savedDate})`, 'error');
  } else {
    setStatus('Aucune offre lisible automatiquement. Utilisez les liens de recherche ci-dessous.', 'error');
    grid.innerHTML = '<div class="empty-state"><strong>Aucune offre n’a pu être récupérée automatiquement.</strong><br>Les sources peuvent bloquer la lecture depuis un site statique. Ouvrez les recherches Dealabs ou les pages officielles ci-dessous pour voir les offres à jour.</div>';
  }
}
function render() {
  const query = searchInput.value.trim().toLowerCase();
  const filtered = allOffers.filter((offer) => (selectedStore === 'all' || offer.store === selectedStore)
    && (!query || `${offer.title} ${offer.storeName} ${offer.source}`.toLowerCase().includes(query)));
  if (!filtered.length) {
    if (!allOffers.length) return;
    grid.innerHTML = '<div class="empty-state">Aucune offre ne correspond à cette recherche.</div>';
    return;
  }
  grid.innerHTML = filtered.map((offer) => `
    <article class="offer-card">
      <div class="offer-head"><span class="store-badge ${offer.source === 'Dealabs' ? 'dealabs' : offer.store}">${escapeHtml(offer.storeName)}</span><time>${escapeHtml(offer.source)}</time></div>
      <div class="offer-icon" aria-hidden="true">${offer.icon}</div>
      <h2>${escapeHtml(offer.title)}</h2>
      <p>Prix repéré dans le contenu public de la source. Vérifiez le prix et la disponibilité sur la page liée.</p>
      <div class="offer-footer"><div class="offer-price">${escapeHtml(offer.price)}<small>prix à vérifier</small></div><a class="offer-link" href="${escapeAttribute(offer.url)}" target="_blank" rel="noopener noreferrer" aria-label="Vérifier l’offre">↗</a></div>
    </article>`).join('');
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
