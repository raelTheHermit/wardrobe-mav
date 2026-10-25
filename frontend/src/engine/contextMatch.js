import { scoringConfig } from "../data/scoringConfig.js";
import { clamp01, getFeatures, lc, mean, round } from "./garmentFeatures.js";

const profiles = scoringConfig.contexts;

// Accepts 'casual' | 'formal' | 'warm' | 'cold' | 'rainy', or an object such as
// { occasion: 'formal', temperature: 31, formality_target: 0.9 }.
export function resolveContext(context) {
  if (context && typeof context === "object") {
    const base = profiles[lc(context.occasion)] || profiles.casual;
    let weather = base.weather;
    const temperature = Number(context.temperature);
    if (Number.isFinite(temperature))
      weather =
        temperature >= 27 ? "warm" : temperature <= 15 ? "cold" : weather;
    else if (typeof context.weather === "string") {
      const w = lc(context.weather);
      weather = /rain|wet|storm/.test(w)
        ? "rain"
        : /hot|warm|sun/.test(w)
          ? "warm"
          : /cold|cool|snow|winter/.test(w)
            ? "cold"
            : weather;
    }
    const target = Number(context.formality_target);
    return {
      ...base,
      weather,
      formality: Number.isFinite(target) ? clamp01(target) : base.formality,
    };
  }
  return profiles[lc(context)] || profiles.casual;
}

function weatherFit(climate, weather) {
  if (weather === "warm")
    return clamp01(0.5 + 0.5 * (climate.warm - climate.cold));
  if (weather === "cold")
    return clamp01(0.5 + 0.5 * (climate.cold - climate.warm));
  if (weather === "rain")
    return clamp01(0.5 + 0.5 * climate.rain - 0.25 * climate.warm);
  return null;
}

// Weather-only fit for one piece (null when the context has no weather). Used to keep, say,
// a winter scarf out of warm-weather outfits before they are generated.
export function weatherFitForItem(item, context = "casual") {
  return weatherFit(getFeatures(item).climate, resolveContext(context).weather);
}

export function contextItemScore(item, context = "casual") {
  const ctx = resolveContext(context);
  const f = getFeatures(item);
  const W = scoringConfig.contextWeights;

  const parts = [
    [
      clamp01(1 - Math.abs(f.formality - ctx.formality) / (ctx.tolerance * 2)),
      W.formality,
    ],
  ];
  const weather = weatherFit(f.climate, ctx.weather);
  if (weather !== null) parts.push([weather, W.weather]);
  parts.push([f.tags.some((t) => ctx.tags.includes(t)) ? 1 : 0.5, W.tags]); // no tag is neutral, not a miss

  const total = parts.reduce((s, [v, w]) => s + v * w, 0);
  const weight = parts.reduce((s, [, w]) => s + w, 0);
  return total / weight;
}

export function contextDetail(outfit, context = "casual") {
  if (!Array.isArray(outfit) || !outfit.length)
    return { score: 0.5, worst: 0.5 };
  const ctx = resolveContext(context);
  const features = outfit.map(getFeatures);

  let total = 0;
  let weight = 0;
  let worst = 1;
  outfit.forEach((item, i) => {
    const family = features[i].family;
    let w = scoringConfig.contextFamilyWeights[family] ?? 0.5;
    if (
      family === "outerwear" &&
      (ctx.weather === "cold" || ctx.weather === "rain")
    )
      w *= 1.4;
    const score = contextItemScore(item, context);
    total += score * w;
    weight += w;
    if (family !== "accessory") worst = Math.min(worst, score);
  });

  let score = total / weight;

  // Shorts with a winter scarf: warm-weather and cold-weather pieces in one outfit contradict each other.
  const maxWarm = Math.max(...features.map((f) => f.climate.warm));
  const maxCold = Math.max(...features.map((f) => f.climate.cold));
  score -= 0.25 * Math.min(maxWarm, maxCold);
  if (ctx.weather === "cold" && maxCold < 0.5) score -= 0.1; // nothing warm in a cold-weather outfit

  return { score: round(clamp01(score)), worst: round(worst) };
}

export function contextMatch(outfit, context = "casual") {
  return contextDetail(outfit, context).score;
}
