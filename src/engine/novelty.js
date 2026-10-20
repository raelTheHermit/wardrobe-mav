export function novelty(outfit, history = []) {
  if (!Array.isArray(outfit) || outfit.length === 0) return 0.5

  if (!history || !history.length) return 0.5

  const outfitIds = new Set(outfit.map((item) => item.id))
  const past = history
    .map((entry) => entry.items || entry.outfit || [])
    .flatMap((items) => (Array.isArray(items) ? items : [items]))
    .map((item) => item.id || item)

  const bestSimilarity = past.reduce((max, previousId) => {
    const previousSet = new Set(Array.isArray(previousId) ? previousId.map((entry) => entry.id || entry) : [previousId])
    const intersection = [...outfitIds].filter((id) => previousSet.has(id)).length
    const union = new Set([...outfitIds, ...previousSet]).size
    const score = union ? intersection / union : 0
    return Math.max(max, score)
  }, 0)

  return Number((1 - bestSimilarity).toFixed(3))
}
