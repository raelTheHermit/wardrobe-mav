import { scoringConfig } from "../data/scoringConfig.js";
import { clamp01, getFeatures, round } from "./garmentFeatures.js";

// Hand-tuned pairs from the config, merged so lookups are symmetric (A,B == B,A).
let tableCache = null;
function table() {
  if (tableCache) return tableCache;
  tableCache = new Map();
  for (const [a, row] of Object.entries(
    scoringConfig.colorCompatibilityTable,
  )) {
    for (const [b, value] of Object.entries(row)) {
      const key = [a, b].sort().join("|");
      const previous = tableCache.get(key);
      tableCache.set(
        key,
        previous === undefined ? value : (previous + value) / 2,
      );
    }
  }
  return tableCache;
}

const hueDistance = (a, b) => {
  const d = Math.abs(a - b) % 360;
  return d > 180 ? 360 - d : d;
};

// Fallback for any color the table does not list: neutrals and tone-on-tone work, analogous and
// complementary hues work, loud near-misses and two saturated colors clash.
function modelScore(a, b) {
  if (a.neutral && b.neutral)
    return clamp01(0.68 + 0.25 * Math.min(1, Math.abs(a.l - b.l) / 0.6));
  if (a.neutral || b.neutral) {
    const color = a.neutral ? b : a;
    const neutral = a.neutral ? a : b;
    let score = 0.8 + (Math.abs(color.l - neutral.l) > 0.25 ? 0.05 : 0);
    if (neutral.name === "black" && color.l < 0.25) score -= 0.08; // black on very dark color has little contrast
    return clamp01(score);
  }
  const d = hueDistance(a.h, b.h);
  let score;
  if (d < 20)
    score = Math.abs(a.l - b.l) > 0.15 ? 0.82 : 0.7; // tone on tone
  else if (d < 50)
    score = 0.78; // analogous
  else if (d >= 150)
    score = 0.7; // complementary
  else if (d >= 100) score = 0.55;
  else score = 0.45;
  if (a.s > 0.6 && b.s > 0.6) score -= 0.1; // two loud colors compete
  return clamp01(score);
}

export function pairColorScore(a, b) {
  const listed = table().get([a.name, b.name].sort().join("|"));
  return listed ?? modelScore(a, b);
}

export function colorCompatibility(a, b) {
  if (!a || !b) return scoringConfig.neutralScore;
  const left = getFeatures(a)?.colors || [];
  const right = getFeatures(b)?.colors || [];
  if (!left.length || !right.length) return scoringConfig.neutralScore;

  let total = 0;
  let weight = 0;
  for (const x of left) {
    for (const y of right) {
      const w = x.w * y.w; // primary colors count more than secondary ones
      total += pairColorScore(x, y) * w;
      weight += w;
    }
  }
  return round(weight ? total / weight : scoringConfig.neutralScore);
}
