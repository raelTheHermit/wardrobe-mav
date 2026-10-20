export function getCategoryFamily(category) {
  if (!category) return 'unknown'
  if (typeof category === 'string') return category
  return category.family || 'unknown'
}

export function getCategoryLabel(category) {
  const family = getCategoryFamily(category)
  const map = {
    top: 'Top',
    bottom: 'Bottom',
    footwear: 'Footwear',
    shoe: 'Shoes',
    outerwear: 'Outerwear',
    accessory: 'Accessories',
  }
  return map[family] || family
}

export function getPrimaryColor(garment) {
  if (!garment) return 'unknown'
  return garment.visual_attributes?.primary_colors?.[0] || garment.color || 'unknown'
}

export function getStyleLabel(garment) {
  if (!garment) return 'varied'
  return garment.style_associations?.possible_aesthetics?.[0] || garment.style || 'varied'
}

export function garmentSummary(garment) {
  if (!garment) return 'Unavailable'
  return `${garment.name} · ${getPrimaryColor(garment)} · ${getStyleLabel(garment)}`
}

export function uniqueById(items) {
  return Array.from(new Map(items.map((item) => [item.id, item])).values())
}
