import { clamp01, getFeatures, round } from "./garmentFeatures.js";
import { scoringConfig } from "../data/scoringConfig.js";

export function silhouetteAlignment(a, b) {
  if (!a || !b) return 0.5;
  const fa = getFeatures(a);
  const fb = getFeatures(b);
  return round(
    clamp01(
      (1 -
        Math.abs(fa.volume - fb.volume) +
        (1 - Math.abs(fa.length - fb.length))) /
        2,
    ),
  );
}

// Balanced proportions: one relaxed/voluminous piece against a more fitted one reads as intentional;
// two very voluminous pieces read as shapeless.
function balance(topVolume, bottomVolume) {
  const diff = Math.abs(topVolume - bottomVolume);
  if (Math.min(topVolume, bottomVolume) > 0.7) return 0.45;
  if (diff >= 0.2 && diff <= 0.5) return 0.95;
  if (diff < 0.15) return 0.75;
  return 0.7;
}

const volumeFromFit = (fit) =>
  scoringConfig.volumeMap[String(fit || "").toLowerCase()] ?? null;

export function silhouettePreferenceScore(
  outfit,
  preferences = {},
  profile = null,
) {
  if (!Array.isArray(outfit) || !outfit.length) return 0.5;

  const features = outfit.map(getFeatures);
  const top = features.find((f) => f.family === "top");
  const bottom = features.find((f) => f.family === "bottom");
  if (!top || !bottom) return 0.7; // one-piece outfits have no top/bottom balance to judge

  let score = balance(top.volume, bottom.volume);
  // Very long top over very short bottom (tunic + shorts) loses the waist line.
  if (top.length > 0.7 && bottom.length < 0.3) score -= 0.2;

  // Preferred fits from the body profile (or explicit preferences), when the user has set them.
  const wantedTop = volumeFromFit(
    profile?.fitPreferences?.tops ?? preferences.topFit,
  );
  const wantedBottom = volumeFromFit(
    profile?.fitPreferences?.bottoms ?? preferences.bottomFit,
  );
  const wanted = [
    [wantedTop, top.volume],
    [wantedBottom, bottom.volume],
  ].filter(([w]) => w !== null);
  if (wanted.length) {
    const match =
      wanted.reduce(
        (sum, [w, actual]) =>
          sum + (1 - Math.min(1, Math.abs(w - actual) / 0.5)),
        0,
      ) / wanted.length;
    score = score * 0.6 + match * 0.4;
  }
  return round(clamp01(score));
}
