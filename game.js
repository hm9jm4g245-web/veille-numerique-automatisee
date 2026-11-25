const STARTING_BALANCE = 1000;
const SYMBOLS = [
  { icon: '🍒', name: 'Cerises', multiplier: 3 },
  { icon: '🍋', name: 'Citrons', multiplier: 4 },
  { icon: '🔔', name: 'Cloches', multiplier: 6 },
  { icon: '⭐', name: 'Étoiles', multiplier: 10 },
  { icon: '💎', name: 'Diamants', multiplier: 20 },
];
const STORAGE_KEY = 'neon-slots-demo-balance';
const balanceElement = document.querySelector('#balance');
const messageElement = document.querySelector('#message');
const spinButton = document.querySelector('#spin-button');
const betSelect = document.querySelector('#bet-select');
const reels = [0, 1, 2].map((index) => document.querySelector(`#reel-${index}`));

function loadBalance() {
  const saved = Number(localStorage.getItem(STORAGE_KEY));
  return Number.isFinite(saved) && saved >= 0 ? saved : STARTING_BALANCE;
}
let balance = loadBalance();

function renderBalance() {
  balanceElement.textContent = balance.toLocaleString('fr-FR');
  localStorage.setItem(STORAGE_KEY, String(balance));
}

function setMessage(text, kind = '') {
  messageElement.textContent = text;
  messageElement.className = `game-message ${kind}`.trim();
}

function randomSymbol() {
  return SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)];
}

function spin() {
  const bet = Number(betSelect.value);
  if (balance < bet) {
    setMessage('Solde fictif insuffisant. Réinitialisez-le pour continuer.');
    return;
  }

  balance -= bet;
  renderBalance();
  spinButton.disabled = true;
  betSelect.disabled = true;
  setMessage('Les rouleaux tournent…');
  reels.forEach((reel) => reel.classList.add('spinning'));

  const outcome = [randomSymbol(), randomSymbol(), randomSymbol()];
  let ticks = 0;
  const animation = window.setInterval(() => {
    reels.forEach((reel) => { reel.textContent = randomSymbol().icon; });
    ticks += 1;
    if (ticks >= 12) {
      window.clearInterval(animation);
      outcome.forEach((symbol, index) => {
        reels[index].textContent = symbol.icon;
        reels[index].classList.remove('spinning');
      });
      finishSpin(outcome, bet);
    }
  }, 85);
}

function finishSpin(outcome, bet) {
  const centerLine = outcome.map((symbol) => symbol.name);
  if (centerLine.every((name) => name === centerLine[0])) {
    const multiplier = outcome[0].multiplier;
    const winnings = bet * multiplier;
    balance += winnings;
    renderBalance();
    setMessage(`Jackpot ! ${outcome[0].icon} Vous gagnez ${winnings.toLocaleString('fr-FR')} crédits fictifs (×${multiplier}).`, 'win');
  } else {
    setMessage(`Pas de combinaison cette fois — mise de ${bet} crédits fictifs jouée.`, 'loss');
  }
  spinButton.disabled = false;
  betSelect.disabled = false;
}

spinButton.addEventListener('click', spin);
document.querySelector('#reset-button').addEventListener('click', () => {
  balance = STARTING_BALANCE;
  renderBalance();
  setMessage('Solde fictif réinitialisé à 1 000 crédits.');
});

renderBalance();
