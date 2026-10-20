export function personalPreference(outfit, preferences = {}) {
  if (!Array.isArray(outfit) || outfit.length === 0) return 0.5

  const preferredStyles = (preferences.styles || []).map((style) => String(style).toLowerCase())
  const preferredColors = (preferences.colors || []).map((color) => String(color).toLowerCase())
  const preferredMaterials = (preferences.materials || []).map((material) => String(material).toLowerCase())
  const excludedColors = (preferences.excludedColors || []).map((color) => String(color).toLowerCase())
  const formalityBias = Number(preferences.formalityBias || 3)

  const itemScores = outfit.map((item) => {
    const primaryColors = item?.visual_attributes?.primary_colors || [item?.color || '']
    const styleTags = item?.style_associations?.possible_aesthetics || [item?.style || '']
    const material = item?.material?.primary || item?.material || ''
    const itemFormality = item?.attributes?.formality_estimate ?? item?.formality ?? 0.5

    let score = 0.5

    if (preferredStyles.length && styleTags.some((tag) => preferredStyles.includes(String(tag).toLowerCase()))) score += 0.25
    if (preferredColors.length && primaryColors.some((color) => preferredColors.includes(String(color).toLowerCase()))) score += 0.25
    if (preferredMaterials.length && preferredMaterials.includes(String(material).toLowerCase())) score += 0.2
    if (itemFormality <= formalityBias / 5) score += 0.1

    if (excludedColors.length && primaryColors.some((color) => excludedColors.includes(String(color).toLowerCase()))) score -= 0.4

    return Math.min(Math.max(score, 0), 1)
  })

  const average = itemScores.reduce((sum, value) => sum + value, 0) / itemScores.length
  return Number(Math.min(Math.max(average, 0), 1).toFixed(3))
}
