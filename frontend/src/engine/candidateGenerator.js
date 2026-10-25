import { outfitTemplates } from "../data/outfitTemplates.js";
import { scoringConfig } from "../data/scoringConfig.js";
import { contextItemScore, weatherFitForItem } from "./contextMatch.js";
import { getFeatures } from "./garmentFeatures.js";
import {
  normalizeGarments,
  validateGarment,
  validateOutfit,
} from "./validation.js";

const CORE = new Set(["top", "bottom", "onepiece"]);

const product = (lists) =>
  lists.reduce(
    (acc, list) =>
      acc.flatMap((prefix) => list.map((item) => [...prefix, item])),
    [[]],
  );

// Rules that make an outfit nonsensical no matter how well the colors match.
function coherent(items, template) {
  const gap = scoringConfig.thresholds.maxFormalityGap;
  const features = items.map(getFeatures);
  const range = template?.rules?.formality;
  if (range) {
    const coreItems = features.filter((feature) => CORE.has(feature.family));
    if (coreItems.some((feature) => feature.formality < range[0] || feature.formality > range[1])) return false;
  }
  const avoid = template?.rules?.avoid || [];
  if (avoid.some((pattern) => features.some((feature) => pattern.test(feature.text)))) return false;
  const maxChromatic = template?.rules?.maxChromatic;
  const chromaticHues = new Set(features.flatMap((feature) => feature.colors.filter((color) => !color.neutral).map((color) => color.family)));
  if (maxChromatic != null && chromaticHues.size > maxChromatic) return false;
  if (template?.rules?.maxSaturation != null && features.some((feature) => feature.colors.some((color) => !color.neutral && color.s > template.rules.maxSaturation))) return false;
  if (template?.rules?.needsStatement && !features.some((feature) => /print|floral|checked|striped/.test(feature.pattern) || feature.colors.some((color) => !color.neutral && color.s > 0.65))) return false;
  const core = features.filter((f) => CORE.has(f.family));
  for (let i = 0; i < core.length; i += 1) {
    for (let j = i + 1; j < core.length; j += 1) {
      if (Math.abs(core[i].formality - core[j].formality) > gap) return false;
    }
  }
  const shoes = features.find((f) => f.family === "footwear");
  if (
    shoes &&
    core.some((f) => Math.abs(f.formality - shoes.formality) > gap + 0.15)
  )
    return false;
  return true;
}

function groupByFamily(items) {
  const groups = {};
  for (const item of items)
    (groups[getFeatures(item).family] ||= []).push(item);
  return groups;
}

// Best `cap` pieces of a family for this context. Unlike the old slice(0, 4) this ranks the whole
// family, so pieces later in the list are no longer invisible.
function topFor(list = [], context, cap) {
  return [...list]
    .map((item) => ({ item, score: contextItemScore(item, context) }))
    .sort(
      (a, b) =>
        b.score - a.score || String(a.item.id).localeCompare(String(b.item.id)),
    )
    .slice(0, cap);
}

export function generateCandidates(garments, options = {}) {
  const opts =
    typeof options === "number" ? { maxPerFamily: options } : options;
  const {
    context = "casual",
    maxPerFamily = 8,
    maxOptionalPerFamily = 2,
    maxCandidates = 6000,
    template: selectedTemplate = null,
  } = opts;

  const items = normalizeGarments(garments).filter(validateGarment);
  const groups = groupByFamily(items);
  const seen = new Set();
  const outfits = [];

  const templates = selectedTemplate ? [selectedTemplate] : outfitTemplates;
  const templateIds = new Map();
  for (const template of templates) {
    // A template needs its families, but a closet without e.g. shoes should still get outfits.
    const required = (template.required || []).filter(
      (family) => groups[family]?.length,
    );
    if (!required.length) continue;

    const requiredLists = required.map((family) =>
      topFor(groups[family], context, maxPerFamily).map((entry) => entry.item),
    );
    const optionalLists = (template.optional || []).map((family) => [
      null,
      ...topFor(groups[family], context, maxOptionalPerFamily * 2)
        .filter((entry) => {
          const weather = weatherFitForItem(entry.item, context);
          return entry.score >= 0.45 && (weather === null || weather >= 0.35);
        })
        .slice(0, maxOptionalPerFamily)
        .map((entry) => entry.item),
    ]);

    for (const base of product(requiredLists)) {
      if (!coherent(base, template)) continue;
      for (const extras of product(optionalLists)) {
        const outfit = [...base, ...extras.filter(Boolean)];
        if (!validateOutfit(outfit) || !coherent(outfit, template)) continue;
        const key = outfit
          .map((item) => item.id)
          .sort()
          .join("|");
        if (seen.has(key)) continue;
        seen.add(key);
        if (!templateIds.has(key)) {
          templateIds.set(key, []);
          outfits.push({ items: outfit, templateIds: templateIds.get(key) });
        }
        if (!templateIds.get(key).includes(template.id)) templateIds.get(key).push(template.id);
        if (outfits.length >= maxCandidates) return outfits;
      }
    }
  }
  return outfits;
}
