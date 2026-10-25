import {
  clamp01,
  getFeatures,
  lc,
  mean,
  resolveColor,
  round,
  symmetricLookup,
} from "./garmentFeatures.js";
import { scoringConfig } from "../data/scoringConfig.js";
import { canonicalAesthetic } from "./styleMatch.js";
import { resolveContext } from "./contextMatch.js";

const ITEM_WEIGHT = { accessory: 0.5, footwear: 0.8 };

function colorMatch(itemColors, wanted) {
  if (!itemColors.length) return 0.5;
  let total = 0;
  let weight = 0;
  for (const c of itemColors) {
    const best = Math.max(
      ...wanted.map((w) =>
        w.name === c.name ? 1 : w.family === c.family ? 0.7 : 0.2,
      ),
    );
    total += best * c.w;
    weight += c.w;
  }
  return total / weight;
}

// Returns { score, active }. active is false when the user has told us nothing, so the ranker
// can leave this factor out instead of scoring everyone 0.5.
export function personalPreferenceDetail(
  outfit,
  preferences = {},
  context = "casual",
) {
  if (!Array.isArray(outfit) || !outfit.length)
    return { score: 0.5, active: false };

  const styles = (preferences.styles || []).map(canonicalAesthetic);
  const colors = (preferences.colors || []).map(resolveColor).filter(Boolean);
  const materials = (preferences.materials || []).map(lc).filter(Boolean);
  const excluded = (preferences.excludedColors || [])
    .map(resolveColor)
    .filter(Boolean);
  const bias = Number(preferences.formalityBias);
  // The formality bias describes everyday dressing, so it must not drag a formal-occasion outfit casual.
  const everyday = resolveContext(context).formality < 0.7;
  const biasTarget =
    everyday && Number.isFinite(bias) && bias >= 1
      ? (Math.min(5, bias) - 1) / 4
      : null;
  const favorites = new Set(preferences.favoriteGarmentIds || []);
  const disliked = new Set(preferences.dislikedGarmentIds || []);

  const active = Boolean(
    styles.length ||
    colors.length ||
    materials.length ||
    biasTarget !== null ||
    favorites.size ||
    disliked.size,
  );
  if (!active) return { score: 0.5, active: false };

  let total = 0;
  let weight = 0;
  for (const item of outfit) {
    const f = getFeatures(item);
    const parts = [];

    if (styles.length) {
      parts.push(
        f.aesthetics.length
          ? Math.max(
              ...styles.flatMap((s) =>
                f.aesthetics.map((tag) =>
                  tag === s
                    ? 1
                    : (symmetricLookup(
                        scoringConfig.aestheticAffinity,
                        tag,
                        s,
                      ) ?? 0.3),
                ),
              ),
            )
          : 0.5,
      );
    }
    if (colors.length) parts.push(colorMatch(f.colors, colors));
    if (materials.length)
      parts.push(
        f.material
          ? materials.some((m) => f.material.includes(m))
            ? 1
            : 0.35
          : 0.5,
      );
    if (biasTarget !== null)
      parts.push(clamp01(1 - Math.abs(f.formality - biasTarget) / 0.5)); // closeness, not "at most"

    let score = parts.length ? mean(parts) : 0.5;
    if (
      excluded.length &&
      f.colors.some(
        (c) =>
          c.w >= 0.5 &&
          excluded.some((e) => e.name === c.name || e.family === c.family),
      )
    )
      score -= 0.4;
    if (favorites.has(item.id)) score += 0.15;
    if (disliked.has(item.id)) score -= 0.3;

    const w = ITEM_WEIGHT[f.family] ?? 1;
    total += clamp01(score) * w;
    weight += w;
  }
  return { score: round(weight ? total / weight : 0.5), active: true };
}

export function personalPreference(
  outfit,
  preferences = {},
  context = "casual",
) {
  return personalPreferenceDetail(outfit, preferences, context).score;
}
