import axios from "axios";

const GAMMA_API = "https://gamma-api.polymarket.com";

export async function getActiveMarkets({ limit = 50, offset = 0 } = {}) {
  const res = await axios.get(`${GAMMA_API}/markets`, {
    params: { active: true, closed: false, limit, offset },
  });
  return res.data;
}

export async function searchMarkets(keyword, limit = 20) {
  const res = await axios.get(`${GAMMA_API}/markets`, {
    params: { active: true, closed: false, limit, _c: keyword },
  });
  return res.data;
}

/**
 * Hitung EV (Expected Value)
 * @param {number} marketPrice  - harga pasar YES (0-1)
 * @param {number} trueProb     - estimasi probabilitas sebenarnya (0-1)
 * @param {number} stake        - jumlah yang dipertaruhkan
 */
export function calculateEV(marketPrice, trueProb, stake) {
  const loseProb  = 1 - trueProb;
  const profit    = stake * (1 / marketPrice - 1);
  const ev        = (trueProb * profit) - (loseProb * stake);
  const evPercent = (ev / stake) * 100;

  return {
    ev,
    evPercent:   parseFloat(evPercent.toFixed(2)),
    isPositiveEV: ev > 0,
    impliedProb: parseFloat((marketPrice * 100).toFixed(2)),
    trueProb:    parseFloat((trueProb * 100).toFixed(2)),
    edge:        parseFloat(((trueProb - marketPrice) * 100).toFixed(2)),
  };
}

/**
 * Analisis satu market — parse outcomePrices dengan benar
 */
export function analyzeMarket(market) {
  // outcomePrices adalah string JSON: "[\"0.535\", \"0.465\"]"
  let prices = [];
  let tokens = [];
  let outcomes = [];

  try {
    prices   = JSON.parse(market.outcomePrices ?? "[]");
    tokens   = JSON.parse(market.clobTokenIds  ?? "[]");
    outcomes = JSON.parse(market.outcomes       ?? "[]");
  } catch {
    return null;
  }

  if (prices.length < 2 || tokens.length < 2) return null;

  const yesPrice = parseFloat(prices[0]);
  const noPrice  = parseFloat(prices[1]);

  if (isNaN(yesPrice) || isNaN(noPrice)) return null;

  const total    = yesPrice + noPrice;
  const vig      = parseFloat(((total - 1) * 100).toFixed(2));
  const spread   = parseFloat((market.spread ?? 0) * 100).toFixed(2);

  // Deteksi peluang: pasar dengan liquidity tinggi + spread rendah
  const isOpportunity =
    parseFloat(market.liquidityNum ?? market.liquidity ?? 0) > 5000 &&
    parseFloat(market.spread ?? 1) < 0.05 &&
    market.acceptingOrders === true;

  return {
    question:      market.question,
    conditionId:   market.conditionId,
    yesPrice,
    noPrice,
    yesTokenId:    tokens[0],
    noTokenId:     tokens[1],
    yesOutcome:    outcomes[0] ?? "Yes",
    noOutcome:     outcomes[1] ?? "No",
    total,
    vig,
    spread,
    volume:        parseFloat(market.volumeNum ?? market.volume ?? 0),
    volume24hr:    parseFloat(market.volume24hr ?? 0),
    liquidity:     parseFloat(market.liquidityNum ?? market.liquidity ?? 0),
    lastTradePrice: market.lastTradePrice ?? yesPrice,
    bestBid:       market.bestBid ?? null,
    bestAsk:       market.bestAsk ?? null,
    endDate:       market.endDate,
    isOpportunity,
    acceptingOrders: market.acceptingOrders,
    // Price changes
    change1d:      market.oneDayPriceChange ?? 0,
    change1w:      market.oneWeekPriceChange ?? 0,
  };
}
