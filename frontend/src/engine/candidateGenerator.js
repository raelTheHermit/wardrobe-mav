import { outfitTemplates } from '../data/outfitTemplates.js'
import { normalizeGarments, validateGarment } from './validation.js'

function dedupeOutfits(outfits) {
  const seen = new Set()
  return outfits.filter((outfit) => {
    const key = [...outfit].map((item) => item.id).sort().join('|')
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

export function generateCandidates(garments, maxPerCategory = 4) {
  const normalized = normalizeGarments(garments).filter(validateGarment)
  const byCategory = {
    top: [],
    bottom: [],
    footwear: [],
    shoe: [],
    outerwear: [],
    accessory: [],
  }

  normalized.forEach((garment) => {
    const family = garment.category?.family || garment.category
    const alias = family === 'shoe' || family === 'shoes' ? 'shoe' : family
    if (byCategory[alias]) byCategory[alias].push(garment)
    if (alias === 'shoe') byCategory.footwear.push(garment)
  })

  const outfits = []

  outfitTemplates.forEach((template) => {
    const topOptions = (byCategory.top || []).slice(0, maxPerCategory)
    const bottomOptions = (byCategory.bottom || []).slice(0, maxPerCategory)
    const footwearOptions = [...(byCategory.footwear || []), ...(byCategory.shoe || [])].slice(0, maxPerCategory)
    const outerwearOptions = (byCategory.outerwear || []).slice(0, Math.max(1, maxPerCategory / 2))
    const accessoryOptions = (byCategory.accessory || []).slice(0, Math.max(1, maxPerCategory / 2))

    topOptions.forEach((top) => {
      bottomOptions.forEach((bottom) => {
        const basePair = [top, bottom]
        const candidates = footwearOptions.length ? footwearOptions.map((footwear) => [...basePair, footwear]) : [basePair]

        candidates.forEach((candidateBase) => {
          const optional = []
          if (template.optional?.includes('outerwear') && outerwearOptions.length) {
            optional.push(outerwearOptions[0])
          }
          if (template.optional?.includes('accessory') && accessoryOptions.length) {
            optional.push(accessoryOptions[0])
          }

          const candidate = [...candidateBase, ...optional]
          if (candidate.length >= 2 && candidate.every((item) => item)) {
            outfits.push(candidate)
          }
        })
      })
    })
  })

  return dedupeOutfits(outfits)
}
