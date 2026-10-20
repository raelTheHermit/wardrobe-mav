import { scoringConfig } from '../data/scoringConfig.js'

function normalizeColorName(value) {
  if (!value) return ''
  return String(value).trim().toLowerCase()
}

function colorList(item) {
  const attrs = item?.visual_attributes || {}
  const values = [...(attrs.primary_colors || []), ...(attrs.secondary_colors || [])]
  if (values.length) return values.map(normalizeColorName).filter(Boolean)

  const legacy = item?.color || item?.baseColor || item?.primary_color
  return legacy ? [normalizeColorName(legacy)] : []
}

export function colorCompatibility(a, b) {
  if (!a || !b) return scoringConfig.neutralScore

  const aColors = colorList(a)
  const bColors = colorList(b)
  const table = scoringConfig.colorCompatibilityTable || {}

  if (!aColors.length || !bColors.length) return scoringConfig.neutralScore

  const scores = []
  for (const left of aColors) {
    for (const right of bColors) {
      const row = table[left] || {}
      const value = row[right] ?? scoringConfig.neutralScore
      scores.push(value)
    }
  }

  if (!scores.length) return scoringConfig.neutralScore
  return Number((scores.reduce((sum, value) => sum + value, 0) / scores.length).toFixed(3))
}
