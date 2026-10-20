export function styleMatch(outfit, aestheticPreference = 'minimal') {
  if (!Array.isArray(outfit) || outfit.length === 0) return 0.5

  const requested = String(aestheticPreference).toLowerCase()
  const scores = outfit.map((item) => {
    const tags = item?.style_associations?.possible_aesthetics || []
    const normalized = tags.map((tag) => String(tag).toLowerCase())

    if (!normalized.length) return 0.5
    if (normalized.includes(requested)) return 1
    if (normalized.some((tag) => tag.includes(requested))) return 0.8
    return 0.55
  })

  return Number((scores.reduce((sum, value) => sum + value, 0) / scores.length).toFixed(3))
}
