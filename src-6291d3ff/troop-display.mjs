// Display only. Personnel ledgers, damage and supply always use internal counts.
export const TROOP_DISPLAY_SCALE = 10;
export const troopText = n => (Number(n) * TROOP_DISPLAY_SCALE).toLocaleString('en-US');
export const troopDelta = n => `${n > 0 ? '+' : ''}${troopText(n === 0 ? 0 : n)}`;
