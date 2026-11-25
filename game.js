const STARTING_BALANCE = 1000;
const BONUS_SPINS = 5;
const BONUS_MULTIPLIER = 2;
const STORAGE_KEY = 'neon-slots-demo-balance';
const SYMBOLS = [
  { icon: '🍒', name: 'Cerises', multiplier: 3, weight: 20 },
  { icon: '🍋', name: 'Citrons', multiplier: 4, weight: 20 },
  { icon: '🔔', name: 'Cloches', multiplier: 6, weight: 18 },
  { icon: '⭐', name: 'Étoiles', multiplier: 10, weight: 17 },
  { icon: '💎', name: 'Diamants', multiplier: 20, weight: 15 },
  // 10% par rouleau donne environ 1 chance sur 1 000 d'un triple Scatter.
  { icon: '🌌', name: 'Scatter', multiplier: 0, weight: 10, scatter: true },
];
const balanceElement = document.querySelector('#balance');
const messageElement = document.querySelector('#message');
const spinButton = document.querySelector('#spin-button');
const betSelect = document.querySelector('#bet-select');
const resetButton = document.querySelector('#reset-button');
const reelsFrame = document.querySelector('#reels-frame');
const sparkleLayer = document.querySelector('#sparkle-layer');
const bonusOverlay = document.querySelector('#bonus-overlay');
const bonusButton = document.querySelector('#bonus-button');
const bonusMeter = document.querySelector('#bonus-meter');
const bonusResult = document.querySelector('#bonus-result');
const reels = [0, 1, 2].map((index) => document.querySelector(`#reel-${index}`));
let balance = loadBalance();
let isSpinning = false;
let bonusPending = false;
let bonusSpinsLeft = 0;
let bonusWinnings = 0;

function loadBalance() {
  const saved = Number(localStorage.getItem(STORAGE_KEY));
  return Number.isFinite(saved) && saved >= 0 ? saved : STARTING_BALANCE;
}

function renderBalance() {
  balanceElement.textContent = balance.toLocaleString('fr-FR');
  localStorage.setItem(STORAGE_KEY, String(balance));
}

function setMessage(text, kind = '') {
  messageElement.textContent = text;
  messageElement.className = `game-message ${kind}`.trim();
}

function randomSymbol(includeScatter = true) {
  const pool = includeScatter ? SYMBOLS : SYMBOLS.filter((symbol) => !symbol.scatter);
  const totalWeight = pool.reduce((sum, symbol) => sum + symbol.weight, 0);
  let ticket = Math.random() * totalWeight;
  for (const symbol of pool) {
    ticket -= symbol.weight;
    if (ticket < 0) return symbol;
  }
  return pool[pool.length - 1];
}

function burstSparkles(count = 22) {
  sparkleLayer.replaceChildren();
  for (let i = 0; i < count; i += 1) {
    const particle = document.createElement('span');
    particle.className = 'sparkle';
    particle.textContent = Math.random() > 0.5 ? '✦' : '✧';
    particle.style.left = `${Math.random() * 96}%`;
    particle.style.top = `${Math.random() * 40}%`;
    particle.style.animationDelay = `${Math.random() * 0.35}s`;
    sparkleLayer.append(particle);
    window.setTimeout(() => particle.remove(), 1500);
  }
}

function showBonus() {
  bonusPending = true;
  bonusSpinsLeft = BONUS_SPINS;
  bonusWinnings = 0;
  bonusMeter.textContent = `${BONUS_SPINS} tours gratuits`;
  bonusResult.textContent = 'Bonne chance !';
  bonusButton.textContent = 'JOUER LE BONUS ✨';
  bonusButton.disabled = false;
  bonusOverlay.hidden = false;
  bonusButton.focus();
}

function spin() {
  if (isSpinning || bonusPending) return;
  const bet = Number(betSelect.value);
  if (balance < bet) {
    setMessage('Solde fictif insuffisant. Réinitialisez-le pour continuer.');
    return;
  }
  balance -= bet;
  renderBalance();
  runReels([randomSymbol(), randomSymbol(), randomSymbol()], { bet, isBonus: false });
}

function runReels(outcome, { bet = 0, isBonus = false } = {}) {
  isSpinning = true;
  spinButton.disabled = true;
  betSelect.disabled = true;
  resetButton.disabled = true;
  bonusButton.disabled = true;
  reelsFrame.classList.remove('scatter-hit');
  reelsFrame.classList.add('spinning-frame');
  setMessage(isBonus ? `Tour bonus… (${bonusSpinsLeft} restant${bonusSpinsLeft > 1 ? 's' : ''})` : 'Les rouleaux tournent…');
  reels.forEach((reel) => { reel.classList.remove('stopped', 'scatter-reel'); reel.classList.add('spinning'); });

  let ticks = 0;
  const animation = window.setInterval(() => {
    reels.forEach((reel) => { reel.textContent = randomSymbol(!isBonus).icon; });
    ticks += 1;
    if (ticks >= 12) {
      window.clearInterval(animation);
      outcome.forEach((symbol, index) => {
        reels[index].textContent = symbol.icon;
        reels[index].classList.remove('spinning');
        reels[index].classList.add('stopped');
        if (symbol.scatter) reels[index].classList.add('scatter-reel');
      });
      reelsFrame.classList.remove('spinning-frame');
      isSpinning = false;
      if (isBonus) finishBonusSpin(outcome);
      else finishSpin(outcome, bet);
    }
  }, 85);
}

function finishSpin(outcome, bet) {
  const scatterCount = outcome.filter((symbol) => symbol.scatter).length;
  if (scatterCount === 3) {
    reelsFrame.classList.add('scatter-hit');
    burstSparkles(42);
    setMessage('PORTAIL SCATTER ! Le jeu bonus est débloqué !', 'win');
    showBonus();
    return;
  }
  const regularSymbols = outcome.filter((symbol) => !symbol.scatter);
  if (regularSymbols.length === 3 && regularSymbols.every((symbol) => symbol.name === regularSymbols[0].name)) {
    const winnings = bet * regularSymbols[0].multiplier;
    balance += winnings;
    renderBalance();
    burstSparkles(24);
    setMessage(`Jackpot ! ${regularSymbols[0].icon} Vous gagnez ${winnings.toLocaleString('fr-FR')} crédits fictifs (×${regularSymbols[0].multiplier}).`, 'win');
  } else if (scatterCount === 2) {
    setMessage(`Deux Scatter 🌌🌌 — encore un pour débloquer le jeu bonus !`, 'loss');
  } else {
    setMessage(`Pas de combinaison cette fois — mise de ${bet} crédits fictifs jouée.`, 'loss');
  }
  spinButton.disabled = false;
  betSelect.disabled = false;
  resetButton.disabled = false;
}

function playBonusTurn() {
  if (!bonusPending || isSpinning || bonusSpinsLeft <= 0) return;
  bonusSpinsLeft -= 1;
  bonusMeter.textContent = `${bonusSpinsLeft} tour${bonusSpinsLeft === 1 ? '' : 's'} gratuit${bonusSpinsLeft === 1 ? '' : 's'} restant${bonusSpinsLeft === 1 ? '' : 's'}`;
  const outcome = [randomSymbol(false), randomSymbol(false), randomSymbol(false)];
  runReels(outcome, { isBonus: true });
}

function finishBonusSpin(outcome) {
  const isMatch = outcome.every((symbol) => symbol.name === outcome[0].name);
  if (isMatch) {
    const winnings = outcome[0].multiplier * BONUS_MULTIPLIER;
    bonusWinnings += winnings;
    bonusResult.textContent = `✨ ${outcome[0].icon} Combinaison ! +${winnings} crédits fictifs (×${BONUS_MULTIPLIER}).`;
    burstSparkles(28);
  } else {
    bonusResult.textContent = 'Pas de combinaison — le prochain tour bonus arrive !';
  }

  if (bonusSpinsLeft > 0) {
    bonusButton.textContent = 'TOUR BONUS SUIVANT →';
    bonusButton.disabled = false;
  } else {
    balance += bonusWinnings;
    renderBalance();
    bonusMeter.textContent = 'Bonus terminé';
    bonusResult.textContent = `Total du bonus : ${bonusWinnings.toLocaleString('fr-FR')} crédits fictifs.`;
    bonusButton.textContent = 'FERMER';
    bonusButton.disabled = false;
  }
}

bonusButton.addEventListener('click', () => {
  if (isSpinning) return;
  if (bonusSpinsLeft > 0) {
    playBonusTurn();
    return;
  }
  bonusPending = false;
  bonusOverlay.hidden = true;
  spinButton.disabled = false;
  betSelect.disabled = false;
  resetButton.disabled = false;
  setMessage(`Bonus terminé ! Vous avez remporté ${bonusWinnings.toLocaleString('fr-FR')} crédits fictifs.`, bonusWinnings ? 'win' : '');
  spinButton.focus();
});

spinButton.addEventListener('click', spin);
resetButton.addEventListener('click', () => {
  if (isSpinning || bonusPending) return;
  balance = STARTING_BALANCE;
  renderBalance();
  setMessage('Solde fictif réinitialisé à 1 000 crédits.');
});

renderBalance();
