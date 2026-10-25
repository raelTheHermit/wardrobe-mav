import { scoringConfig } from "../data/scoringConfig.js";
import { colorCompatibility } from "./colorCompatibility.js";
import {
  clamp01,
  getFeatures,
  round,
  symmetricLookup,
} from "./garmentFeatures.js";

function styleSimilarity(a, b) {
  if (!a.length || !b.length) return null; // unknown, not "different"
  let best = 0;
  for (const x of a) {
    for (const y of b) {
      const score =
        x === y
          ? 1
          : (symmetricLookup(scoringConfig.aestheticAffinity, x, y) ?? 0.25);
      best = Math.max(best, score);
    }
  }
  return best;
}

export function pairBreakdown(a, b) {
  const fa = getFeatures(a);
  const fb = getFeatures(b);
  const hasColors = fa.colors.length && fb.colors.length;
  return {
    color: hasColors ? colorCompatibility(a, b) : null,
    pattern:
      symmetricLookup(
        scoringConfig.patternCompatibilityTable,
        fa.pattern,
        fb.pattern,
      ) ?? scoringConfig.neutralScore,
    formality: clamp01(1 - Math.abs(fa.formality - fb.formality)),
    style: styleSimilarity(fa.aesthetics, fb.aesthetics),
  };
}

// Weighted mean of the parts we actually know. Missing data is skipped instead of scoring 0.
export function pairCompatibility(a, b) {
  if (!a || !b) return scoringConfig.neutralScore;
  const parts = pairBreakdown(a, b);
  let total = 0;
  let weight = 0;
  for (const [key, value] of Object.entries(parts)) {
    if (value === null) continue;
    const w = scoringConfig.pairwiseWeights[key];
    total += value * w;
    weight += w;
  }
  return round(weight ? total / weight : scoringConfig.neutralScore);
}
