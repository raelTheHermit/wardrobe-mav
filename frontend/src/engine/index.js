import { scoringConfig } from "../data/scoringConfig.js";
import { generateCandidates } from "./candidateGenerator.js";
import { rankOutfit } from "./ranker.js";
import { normalizeGarments, validateOutfit } from "./validation.js";
import { getTemplate } from "../data/outfitTemplates.js";

const idsOf = (entry) => new Set(entry.outfit.map((item) => item.id));

function overlap(a, b) {
  let shared = 0;
  for (const id of a) if (b.has(id)) shared += 1;
  return shared / new Set([...a, ...b]).size;
}

// Greedy "maximal marginal relevance": take the best outfit, then keep choosing the one that
// scores well AND differs from what is already chosen, so results are not one look in 6 versions.
function diversify(entries, limit) {
  const pool = entries
    .slice(0, 250)
    .map((entry) => ({ entry, ids: idsOf(entry) }));
  const picked = [];
  while (picked.length < limit && pool.length) {
    let bestIndex = 0;
    let bestValue = -Infinity;
    pool.forEach((candidate, index) => {
      const similarity = picked.length
        ? Math.max(...picked.map((p) => overlap(candidate.ids, p.ids)))
        : 0;
      const value =
        candidate.entry.score - scoringConfig.diversityPenalty * similarity;
      if (value > bestValue) {
        bestValue = value;
        bestIndex = index;
      }
    });
    picked.push(pool.splice(bestIndex, 1)[0]);
  }
  return picked.map((p) => p.entry);
}

export function generateOutfits({
  garments,
  context = "casual",
  preferences = {},
  history = [],
  limit = 5,
  profile = null,
  template = null,
}) {
  const valid = normalizeGarments(garments);
  if (!valid.length) return [];
  const selectedTemplate = template ? getTemplate(template) : null;

  const ranked = generateCandidates(valid, { context, template: selectedTemplate })
    .filter((entry) => validateOutfit(Array.isArray(entry) ? entry : entry.items))
    .map((entry) => {
      const outfit = Array.isArray(entry) ? entry : entry.items;
      const templateIds = Array.isArray(entry) ? [] : entry.templateIds || [];
      return ({
      id: outfit
        .map((item) => item.id)
        .sort()
        .join("-"),
      outfit,
      templates: templateIds,
      ...rankOutfit(outfit, context, preferences, history, profile, selectedTemplate),
    });
    })
    .filter(
      (entry) =>
        !entry.blocked && entry.score >= scoringConfig.thresholds.minScore,
    )
    .sort((a, b) => b.score - a.score || a.id.localeCompare(b.id));

  return diversify(ranked, limit).map(
    ({ id, outfit, score, breakdown, weights, evidenceCoverage, templates }) => ({
      id,
      outfit,
      score,
      breakdown,
      weights,
      evidenceCoverage,
      templates,
    }),
  );
}

export { generateCandidates, rankOutfit, normalizeGarments };
