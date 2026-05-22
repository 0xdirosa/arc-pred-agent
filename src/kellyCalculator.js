/**
 * Kelly Criterion Calculator
 * Menentukan optimal bet size berdasarkan edge
 */

/**
 * Full Kelly
 * f = (bp - q) / b
 * b = odds - 1, p = true prob, q = 1 - p
 */
export function kellyFraction(trueProb, marketPrice, fraction = 0.25) {
  const b = (1 / marketPrice) - 1; // desimal odds
  const p = trueProb;
  const q = 1 - trueProb;

  const kelly = (b * p - q) / b;

  // Pakai fractional kelly (default 25%) untuk safety
  const safeBet = Math.max(0, kelly * fraction);

  return {
    fullKelly: parseFloat((kelly * 100).toFixed(2)),
    fractionalKelly: parseFloat((safeBet * 100).toFixed(2)),
    isPositive: kelly > 0,
  };
}

/**
 * Hitung bet size dalam USD
 */
export function calculateBetSize(bankrollUSD, trueProb, marketPrice, maxBetUSD = 50) {
  const kelly = kellyFraction(trueProb, marketPrice);

  if (!kelly.isPositive) {
    return { betSize: 0, reason: "Negative EV — skip" };
  }

  const rawBet = bankrollUSD * (kelly.fractionalKelly / 100);
  const betSize = Math.min(rawBet, maxBetUSD);

  return {
    betSize: parseFloat(betSize.toFixed(2)),
    fullKelly: kelly.fullKelly,
    fractionalKelly: kelly.fractionalKelly,
    reason: `Kelly ${kelly.fractionalKelly}% of bankroll`,
  };
}
