// Gen 3 capture formula (Ruby/Sapphire/Emerald/FRLG).
// a = floor((3M − 2H) · rate · ball / 3M) · status; catch guaranteed when a ≥ 255,
// otherwise four shake checks each passing with probability b/65536.

export const STATUSES = [
  { id: 'none', label: 'Healthy', mult: 1 },
  { id: 'par', label: 'PAR / PSN / BRN', mult: 1.5 },
  { id: 'slp', label: 'SLP / FRZ', mult: 2 },
]

export const BALLS = [
  { id: 'poke', label: 'Poké Ball', mult: () => 1, color: '#e3350d' },
  { id: 'great', label: 'Great Ball', mult: () => 1.5, color: '#3b6ee0' },
  { id: 'ultra', label: 'Ultra Ball', mult: () => 2, color: '#f3d23b' },
  { id: 'net', label: 'Net Ball', mult: (t) => (t.includes('bug') || t.includes('water') ? 3 : 1), color: '#74cec0', note: '×3 vs Bug/Water' },
  { id: 'repeat', label: 'Repeat Ball', mult: () => 3, color: '#eb9c46', note: '×3 if already in dex' },
  { id: 'timer', label: 'Timer Ball', mult: () => 4, color: '#9aa3bd', note: '×4 after 30+ turns' },
  { id: 'dive', label: 'Dive Ball', mult: () => 3.5, color: '#4d90d5', note: '×3.5 underwater only' },
]

/**
 * Probability of capture per throw.
 * @param rate     species catch rate (1–255)
 * @param hpFrac   current HP as a fraction of max (0–1]
 * @param ballMult ball multiplier
 * @param statusMult status multiplier
 */
export function catchChance(rate, hpFrac, ballMult, statusMult) {
  const a = Math.min(255, Math.floor((3 - 2 * hpFrac) * rate * ballMult / 3) * statusMult)
  if (a >= 255) return 1
  if (a < 1) return 0
  const b = Math.floor(1048560 / Math.sqrt(Math.sqrt(16711680 / a)))
  return Math.pow(Math.min(65535, b + 1) / 65536, 4)
}
