function normalizeFamily(value) {
  if (!value) return null
  const family = String(value).toLowerCase()
  if (family === 'shoe' || family === 'shoes' || family === 'footwear') return 'footwear'
  return family
}

function familyOf(item) {
  if (!item || typeof item !== 'object') return null
  const direct = item.category?.family || item.category || item.type || null
  return normalizeFamily(direct)
}

function normalizeLegacyGarment(item) {
  if (!item || typeof item !== 'object') return null
  if (Array.isArray(item)) return null

  const categoryFamily = normalizeFamily(item.category?.family || item.category || familyOf(item) || 'unknown')
  if (!item.id || !item.name || !categoryFamily) return null

  return {
    ...item,
    category: item.category?.family ? { ...item.category, family: categoryFamily } : { family: categoryFamily, type: item.type || 'unknown', subtype: item.subtype || null },
    status: item.status || 'available',
    visual_attributes: item.visual_attributes || {
      primary_colors: item.color ? [item.color] : [],
      secondary_colors: [],
      pattern: item.pattern || 'solid',
      graphic_or_print: null,
      texture: item.material || 'smooth',
    },
    attributes: item.attributes || {
      formality_estimate: typeof item.formality === 'number' ? item.formality / 5 : 0.5,
      visual_weight_estimate: 0.5,
      seasonal_suitability: item.season ? [item.season] : [],
      functional_tags: item.tags || [],
    },
    fit_and_proportions: item.fit_and_proportions || {
      apparent_fit: item.fit || 'regular',
      silhouette: item.silhouette || 'straight',
      relative_length: 'regular',
      relative_volume: 'medium',
    },
    style_associations: item.style_associations || {
      possible_aesthetics: item.aesthetic ? [item.aesthetic] : item.style ? [item.style] : [],
    },
  }
}

export function validateGarment(item) {
  const garment = normalizeLegacyGarment(item)
  if (!garment) return false

  const family = familyOf(garment)
  if (!garment.id || !garment.name || !family) return false
  if (garment.status === 'unavailable') return false
  return true
}

export function validateOutfit(outfit) {
  if (!Array.isArray(outfit) || outfit.length === 0) return false
  const ids = new Set()

  for (const item of outfit) {
    const garment = normalizeLegacyGarment(item)
    if (!garment || ids.has(garment.id)) return false
    ids.add(garment.id)
  }

  const families = outfit.map((item) => familyOf(item) || item.category || '').filter(Boolean)
  const hasTop = families.includes('top')
  const hasBottom = families.includes('bottom')
  return hasTop && hasBottom
}

export function normalizeGarments(items) {
  const source = Array.isArray(items) ? items : items?.items || []
  return source
    .map((item) => normalizeLegacyGarment(item))
    .filter(Boolean)
    .filter((item) => item.status !== 'unavailable')
}
