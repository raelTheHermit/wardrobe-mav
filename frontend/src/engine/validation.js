import { familyOf, getFeatures } from "./garmentFeatures.js";

// Cleans one garment without inventing data. The old version filled in ivory / minimal / cotton /
// medium-volume defaults, which made every unedited garment look identical to the scorers.
function normalizeGarment(item) {
  if (!item || typeof item !== "object" || Array.isArray(item)) return null;
  if (!item.id || !item.name || item.deleted_at) return null;

  const family = familyOf(item);
  if (!family) return null;

  const category =
    typeof item.category === "object" && item.category ? item.category : {};
  const normalized = {
    ...item,
    category: {
      ...category,
      family,
      type: category.type || item.type || "unknown",
      subtype: category.subtype ?? item.subtype ?? null,
    },
    status: item.status || "available",
    visual_attributes: item.visual_attributes?.primary_colors?.length
      ? item.visual_attributes
      : {
          ...(item.visual_attributes || {}),
          primary_colors: item.color ? [item.color] : [],
          secondary_colors: item.visual_attributes?.secondary_colors || [],
          pattern: item.visual_attributes?.pattern || item.pattern || "solid",
        },
    fit_and_proportions: item.fit_and_proportions || {
      apparent_fit: item.fit,
      silhouette: item.silhouette,
    },
    style_associations: item.style_associations?.possible_aesthetics
      ? item.style_associations
      : { possible_aesthetics: [item.aesthetic, item.style].filter(Boolean) },
  };

  // Resolve formality once (explicit value, legacy 1-5 scale, or inferred from the name).
  const resolved = getFeatures(normalized);
  normalized.attributes = {
    visual_weight_estimate: 0.5,
    seasonal_suitability:
      item.season && item.season !== "all" ? [item.season] : [],
    functional_tags: item.tags || [],
    ...item.attributes,
    formality_estimate: resolved.formality,
  };
  return normalized;
}

export function validateGarment(item) {
  const garment = normalizeGarment(item);
  return Boolean(garment) && garment.status !== "unavailable";
}

const UNIQUE_FAMILIES = ["top", "bottom", "onepiece", "footwear"];

export function validateOutfit(outfit) {
  if (!Array.isArray(outfit) || !outfit.length) return false;

  const ids = new Set();
  const counts = {};
  for (const item of outfit) {
    const family = familyOf(item);
    if (!item?.id || !family || ids.has(item.id)) return false;
    ids.add(item.id);
    counts[family] = (counts[family] || 0) + 1;
  }
  if (UNIQUE_FAMILIES.some((family) => counts[family] > 1)) return false;
  if (counts.onepiece) return !counts.top && !counts.bottom;
  return Boolean(counts.top && counts.bottom);
}

export function normalizeGarments(items) {
  const source = Array.isArray(items) ? items : items?.items || [];
  return source
    .map(normalizeGarment)
    .filter((item) => item && item.status !== "unavailable");
}
