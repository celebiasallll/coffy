/**
 * CoinSystem.ts
 * Manages Coffy Coin currency.
 * Coins are earned by completing quests, tasks, and interactions.
 * Call earnCoins() from QuestSystem / DialogSystem when rewarding the player.
 */

let _coins = 0;
let _amountEl:  HTMLElement | null = null;
let _popupEl:   HTMLElement | null = null;
let _popupTO:   ReturnType<typeof setTimeout> | null = null;

export function initCoinSystem(): void {
  _amountEl = document.getElementById('coin-amount');
  _popupEl  = document.getElementById('coin-popup');
  _render();
}

/** Award coins to the player with an optional reason label */
export function earnCoins(amount: number, reason?: string): void {
  if (amount <= 0) return;
  _coins += amount;
  _render();
  _showPopup(`+${amount} ☕${reason ? '  ' + reason : ''}`);
}

/** Spend coins — returns false if not enough */
export function spendCoins(amount: number): boolean {
  if (_coins < amount) return false;
  _coins -= amount;
  _render();
  return true;
}

export function getCoins(): number { return _coins; }

export function hasCoins(amount: number): boolean { return _coins >= amount; }

// ── Internal ──────────────────────────────────────────────────────────────────
function _render(): void {
  if (!_amountEl) return;
  _amountEl.textContent = _coins.toLocaleString();

  // Pop animation
  _amountEl.classList.remove('pop');
  void (_amountEl as HTMLElement).offsetWidth; // reflow to restart
  _amountEl.classList.add('pop');
  setTimeout(() => _amountEl?.classList.remove('pop'), 200);
}

function _showPopup(msg: string): void {
  if (!_popupEl) return;
  if (_popupTO) clearTimeout(_popupTO);

  _popupEl.textContent = msg;
  _popupEl.classList.remove('show');
  void (_popupEl as HTMLElement).offsetWidth;
  _popupEl.classList.add('show');

  _popupTO = setTimeout(() => {
    if (_popupEl) _popupEl.classList.remove('show');
  }, 2200);
}
