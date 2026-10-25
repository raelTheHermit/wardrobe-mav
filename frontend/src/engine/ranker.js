import { scoringConfig } from "../data/scoringConfig.js";
import { buildFitCompatibility } from "../utils/bodyProfile.js";
import { contextDetail } from "./contextMatch.js";
import { clamp01, hasProfileData, round } from "./garmentFeatures.js";
import { noveltyDetail } from "./novelty.js";
import { personalPreferenceDetail } from "./personalPreference.js";
import { silhouettePreferenceScore } from "./silhouette.js";
import { styleMatchDetail } from "./styleMatch.js";
import { templateFitDetail } from "./templateFit.js";
import { outfitCompatibility } from "./outfitCompatibility.js";

function safeFit(outfit, profile) {
  try {
    const result = buildFitCompatibility(outfit, profile);
    const value = typeof result === "number" ? result : result?.score;
    return Number.isFinite(value) ? clamp01(value) : null;
  } catch {
    return null;
  }
}

export function rankOutfit(
  outfit,
  context = "casual",
  preferences = {},
  history = [],
  profile = null,
  template = null,
) {
  const requestedAesthetic =
    preferences.aesthetic || preferences.favoriteAesthetic || null;

  const ctx = contextDetail(outfit, context);
  const style = requestedAesthetic
    ? styleMatchDetail(outfit, requestedAesthetic)
    : null;
  const personal = personalPreferenceDetail(outfit, preferences, context);
  const hist = noveltyDetail(outfit, history);

  // null = "no evidence for this factor". It is left out of the score and the breakdown shows it
  // as unavailable, instead of counting it as 0%.
  const values = {
    compatibility: outfitCompatibility(outfit, template?.rules),
    context: ctx.score,
    silhouette: silhouettePreferenceScore(outfit, preferences, profile),
    aesthetic: style && style.coverage > 0 ? style.score : null,
    personal: personal.active ? personal.score : null,
    fit: hasProfileData(profile) ? safeFit(outfit, profile) : null,
    novelty: hist.hasHistory ? hist.score : null,
    template: template ? templateFitDetail(outfit, template).score : null,
  };

  const all = scoringConfig.mainWeights;
  const active = Object.keys(all).filter((key) => values[key] !== null);
  const activeTotal = active.reduce((sum, key) => sum + all[key], 0);
  const weights = Object.fromEntries(
    active.map((key) => [key, round(all[key] / activeTotal, 4)]),
  );
  const score = active.reduce(
    (sum, key) => sum + values[key] * weights[key],
    0,
  );

  return {
    score: round(clamp01(score)),
    breakdown: values,
    weights,
    // Share of the full weight budget that was backed by real data.
    evidenceCoverage: round(
      activeTotal / Object.values(all).reduce((s, w) => s + w, 0),
      2,
    ),
    blocked: ctx.worst < scoringConfig.thresholds.hardFail,
  };
}
