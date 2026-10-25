import { scoringConfig } from "../data/scoringConfig.js";
import { clamp01, round } from "./garmentFeatures.js";

const idsOf = (entry) => {
  const items =
    entry?.items ||
    entry?.outfit ||
    entry?.garmentIds ||
    (Array.isArray(entry) ? entry : []);
  return new Set(
    (Array.isArray(items) ? items : [items])
      .map((item) => item?.id ?? item)
      .filter(Boolean),
  );
};

function jaccard(a, b) {
  const union = new Set([...a, ...b]).size;
  if (!union) return 0;
  let intersection = 0;
  for (const id of a) if (b.has(id)) intersection += 1;
  return intersection / union;
}

// history: array of past outfits, newest first (timestamps are used to sort when present).
// Compares against each past outfit as a whole set, with recency decay, and also penalizes
// re-wearing the same garments within the last few outfits even in a new combination.
export function noveltyDetail(outfit, history = []) {
  if (!Array.isArray(outfit) || !outfit.length)
    return { score: 0.5, hasHistory: false };
  const entries = (history || []).filter(Boolean);
  if (!entries.length) return { score: 1, hasHistory: false };

  const sorted = entries.some((e) => e.timestamp)
    ? [...entries].sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0))
    : entries;
  const current = new Set(outfit.map((item) => item.id));

  let best = 0;
  sorted.forEach((entry, age) => {
    best = Math.max(
      best,
      jaccard(current, idsOf(entry)) * scoringConfig.noveltyDecay ** age,
    );
  });

  const recent = new Set(
    sorted.slice(0, 3).flatMap((entry) => [...idsOf(entry)]),
  );
  const repeated =
    [...current].filter((id) => recent.has(id)).length / current.size;

  return {
    score: round(clamp01(1 - Math.max(best, repeated * 0.5))),
    hasHistory: true,
  };
}

export function novelty(outfit, history = []) {
  return noveltyDetail(outfit, history).score;
}
