import { scoringConfig } from "../data/scoringConfig.js";
import { pairCompatibility } from "./pairCompatibility.js";
import {
  clamp01,
  countChromaticHues,
  getFeatures,
  round,
} from "./garmentFeatures.js";

const CORE = new Set(["top", "bottom", "onepiece"]);

function importance(fa, fb) {
  const key = [fa.family, fb.family].sort().join("|");
  return scoringConfig.pairImportance[key] ?? 1;
}

// Whole-outfit checks that pair scores cannot see. A template can raise the tolerances
// (Alté welcomes clashing prints) or lower them (Old Money wants one quiet accent at most).
function outfitPenalties(
  features,
  { hueTolerance = 2, patternTolerance = 1.1 } = {},
) {
  let penalty = 0;

  const hues = countChromaticHues(features);
  if (hues > hueTolerance) penalty += 0.1 * (hues - hueTolerance);

  const loud = features.reduce(
    (sum, f) =>
      sum +
      (scoringConfig.patternLoudness[f.pattern] ?? 0) *
        (f.family === "accessory" ? 0.5 : 1),
    0,
  );
  if (loud > patternTolerance) penalty += (loud - patternTolerance) * 0.12;

  // Core pieces at very different dress codes.
  const core = features
    .filter((f) => CORE.has(f.family))
    .map((f) => f.formality);
  if (core.length > 1) {
    const spread = Math.max(...core) - Math.min(...core);
    if (spread > 0.35) penalty += (spread - 0.35) * 0.5;
  }
  return penalty;
}

export function outfitCompatibility(outfit, tolerance = {}) {
  if (!Array.isArray(outfit) || outfit.length < 2) return 0.5;

  const features = outfit.map(getFeatures);
  let total = 0;
  let weight = 0;
  for (let i = 0; i < outfit.length; i += 1) {
    for (let j = i + 1; j < outfit.length; j += 1) {
      const w = importance(features[i], features[j]);
      total += pairCompatibility(outfit[i], outfit[j]) * w;
      weight += w;
    }
  }
  const base = weight ? total / weight : 0.5;
  // Averages bunch near the middle; stretch them so good and bad outfits are easier to tell apart.
  const center = scoringConfig.contrastCenter;
  const stretched = center + (base - center) * scoringConfig.contrastStretch;
  return round(clamp01(stretched - outfitPenalties(features, tolerance)));
}
