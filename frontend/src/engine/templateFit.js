import { clamp01, getFeatures, mean, round } from "./garmentFeatures.js";

export function templateFitDetail(outfit, template) {
  const rules = template?.rules || {};
  const patterns = rules.prefer || [];
  const aesthetics = new Set((rules.aesthetics || []).map((item) => item.toLowerCase()));
  const scores = outfit.map((item) => {
    const feature = getFeatures(item);
    const text = `${feature.text} ${feature.aesthetics.join(" ")}`;
    const preferred = patterns.some((pattern) => pattern.test(text)) || feature.aesthetics.some((tag) => aesthetics.has(tag));
    return preferred ? 1 : 0.55;
  });
  return { score: round(clamp01(mean(scores) ?? 0.5)) };
}
