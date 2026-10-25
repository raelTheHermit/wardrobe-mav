import { scoringConfig } from "../data/scoringConfig.js";
import {
  clamp01,
  getFeatures,
  lc,
  round,
  symmetricLookup,
} from "./garmentFeatures.js";

const WEIGHTS = {
  top: 1,
  bottom: 1,
  onepiece: 1.2,
  outerwear: 0.7,
  footwear: 0.6,
  accessory: 0.3,
};

export function canonicalAesthetic(value) {
  const key = lc(value);
  return scoringConfig.aestheticAliases[key] ?? key;
}

// Returns { score, coverage }. coverage is the share of the outfit (by weight) that has any style
// tag at all; with zero coverage the ranker leaves the aesthetic factor out instead of scoring it.
export function styleMatchDetail(outfit, aestheticPreference = "minimal") {
  if (!Array.isArray(outfit) || !outfit.length)
    return { score: 0.5, coverage: 0 };
  const wanted = canonicalAesthetic(aestheticPreference);

  let total = 0;
  let known = 0;
  let all = 0;
  for (const item of outfit) {
    const f = getFeatures(item);
    const w = WEIGHTS[f.family] ?? 0.5;
    all += w;
    if (!f.aesthetics.length) continue; // unknown is skipped, not punished
    known += w;
    const best = Math.max(
      ...f.aesthetics.map((tag) =>
        tag === wanted
          ? 1
          : (symmetricLookup(scoringConfig.aestheticAffinity, tag, wanted) ??
            0.3),
      ),
    );
    total += best * w;
  }
  return {
    score: known ? round(clamp01(total / known)) : 0.5,
    coverage: all ? round(known / all) : 0,
  };
}

export function styleMatch(outfit, aestheticPreference = "minimal") {
  return styleMatchDetail(outfit, aestheticPreference).score;
}
